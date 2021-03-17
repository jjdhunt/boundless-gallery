
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const fh = require('./filesHelper.js');
const gdrive = require('./google-drive.js');
const gather = require('./gather.js');
const webpage = require('./webpage.js');
const { getNgrokUrl } = require('./ngrok');

const { SPACE_ID, GOOGLE_DRIVE_BOUNDLESS_DIR_ID } = require(path.join(__dirname, '..', 'secrets','config'));

function initializePieceDir() {
  piecesDirectory = path.join(__dirname, 'public', 'pieces');
  fs.readdirSync(piecesDirectory).forEach(pieceDir => {
      var pageDir = path.join(piecesDirectory, pieceDir, 'page');
      var artDir = path.join(pageDir, 'art');
      if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, {recursive: true});
      var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
      placement.lastMetadataChangeTime = 0;
      fs.writeFile(path.join(pieceDir, 'placement.json'), JSON.stringify(placement), function (err) {
        if (err) throw err;
      })
  });
}

//returns true if the google drive art for the placement is different from what we have locally
//updates the local art to match whats in the google drive
async function checkForNewArtFiles(placementID, gdriveFiles) {

  var pieceDir = path.join('public', 'pieces', placementID);
  var artLocalDir = path.join(pieceDir, 'page', 'art');

  if (gdriveFiles.length) {
    //find the newest art file in the google drive placement folder
    var newestGDriveArtFile = gdriveFiles[0];
    gdriveFiles.map((file) => {
      if (file.split('.').pop() != 'yml') {
        if (Date.parse(file.createdTime) > Date.parse(newestGDriveArtFile.createdTime))
          newestGDriveArtFile = file;
      }
    });

    //check if this file is the same as what we have locally. If it's different, replace whatever we have locally
    if (!fh.findFileByName(artLocalDir, newestGDriveArtFile.name)) {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log(`Placement ${placementID} has a new art file on google drive called "${newestGDriveArtFile.name}"!`);
      console.log(`Deleting local artwork for placement ${placementID}`);
      fh.deleteAllFilesInDir(artLocalDir);
      console.log(`Downloading "${newestGDriveArtFile.name}" from google drive for placement ${placementID}`);
      await gdrive.downloadFile(newestGDriveArtFile.id, path.join(artLocalDir, newestGDriveArtFile.name));
      return true;
    }

    //check if the metadatafile has been updated
    var newestGDriveArtFile = gdriveFiles[0];
    gdriveFiles.map((file) => {
      if (file.split('.').pop() != 'yml') {
        if (Date.parse(file.createdTime) > Date.parse(newestGDriveArtFile.createdTime))
          newestGDriveArtFile = file;
      }
    });
  }

  else { // there is no art file on the google drive
    if (fs.readdirSync(artLocalDir).length > 0) { //is there local content?
      console.log(`No artwork files found in placement ${placementID} google drive folder, but we have some local art stored.`);
      console.log(`Deleting local artwork for placement ${placementID}`);
      fh.deleteAllFilesInDir(artLocalDir);
      return true;
    }
  }

  return false;
}

//returns true if the google drive info.yml for the placement has been modified
//downloads it if it has been
async function checkForNewMetadata(placementID, gdriveFiles) {

  var pieceDir = path.join('public', 'pieces', placementID);
  var artLocalDir = path.join(pieceDir, 'page', 'art');

  if (gdriveFiles.length) {
    //check if the metadatafile has been updated
    var newestGDriveArtFile = gdriveFiles[0];
    gdriveFiles.map((file) => {
      if (file.split('.').pop() == 'yml') {
        var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
        if (Date.parse(file.modifiedTime) > Date.parse(placement.lastMetadataChangeTime)) {
          console.log('==============================================================');
          console.log(Date().toLocaleString());
          console.log(`Placement ${placementID} has a new art file on google drive called "${newestGDriveArtFile.name}"!`);
          console.log(`Deleting local info.yml for placement ${placementID}`);
          fs.unlinkSync(path.join(pieceDir, 'info.yml'));
          console.log(`Downloading new "info.yml" from google drive for placement ${placementID}`);
          await gdrive.downloadFile(newestGDriveArtFile.id, path.join(pieceDir, newestGDriveArtFile.name));
          return true;
        }
      }
    });
  }
  return false;
}

async function checkFoldersForNewArt(gdriveFolders){
  var haveNewContent = false;
  if (gdriveFolders.length) {
    for (const gdriveFolder of gdriveFolders) {
      let gdriveFiles = await gdrive.getFilesInDir(gdriveFolder.id).catch(e => { console.log(e) });
      haveNewContent |= await checkForNewArtFiles(gdriveFolder.name, gdriveFiles);
    }
  } else {
    console.log('No Google Drive placement folders found!');
  }

  return haveNewContent;
}

async function doItRepeadly() {
  try {
    let gdriveFolders = await gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID);
    var haveNewContent = await checkFoldersForNewArt(gdriveFolders);
    if (haveNewContent) {
      var url = await getNgrokUrl();
      await gather.updateMap(url);
    }
    setTimeout(doItRepeadly, 10000);
  } catch(err) {
    console.log(err);
    setTimeout(doItRepeadly, 30000);
  }
  
}

initializePieceDir();

webpage.updateAllPictureWebpages();

//gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, folders => checkFoldersForNewArt(folders));

doItRepeadly();


// listen for 'x' and update the map whenever we get it
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (key, data) => {
  if (data.ctrl && data.name === 'c') {
    process.exit();
  } else {
    if (key == 'x') {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log("Manually updating map...");
      gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID).then(folders => checkFoldersForNewArt(folders)).catch(e => { console.log(e) });
    } else if (key == 'h') {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log("Manually updating all webpages...");
      webpage.updateAllPictureWebpages();
    }

  }
});