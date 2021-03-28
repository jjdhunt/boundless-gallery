
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
  fs.readdirSync(piecesDirectory).forEach(pieceFolder => {
      var pieceDir = path.join(piecesDirectory, pieceFolder);
      var pageDir = path.join(pieceDir, 'page');
      if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, {recursive: true});
      var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
      if(!placement.hasOwnProperty('lastMetadataChangeTime')){
        placement.lastMetadataChangeTime = 0;
      }
      if(!placement.hasOwnProperty('curPieceName')){
        placement.curPieceName = '';
      }
      fs.writeFileSync(path.join(pieceDir, 'placement.json'), JSON.stringify(placement));
  });
}

//returns true if the google drive art for the placement is different from what we have locally
//updates the local art to match whats in the google drive
async function checkForNewArtFiles(placementID, gdriveFiles) {

  var pieceDir = path.join('public', 'pieces', placementID);
  
  var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));

  var gdriveFiles = gdriveFiles.filter(function(value, index, arr){return value.name != 'info.yml';});
  if (gdriveFiles.length) {
    //find the newest art file in the google drive placement folder
    var haveNewArt = false;
    var newestGDriveArtFile = gdriveFiles[0];
    gdriveFiles.map((file) => {
      if (Date.parse(file.createdTime) > Date.parse(newestGDriveArtFile.createdTime))
        newestGDriveArtFile = file;
        haveNewArt = true;
    });

    //check if this file is the same as what we reference locally. If it's different, replace whatever we have locally
    if (haveNewArt && placement.curPieceName!=newestGDriveArtFile.id) {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log(`Placement ${placementID} has a new art file on google drive called "${newestGDriveArtFile.name}"!`);
      // console.log(`Deleting local artwork for placement ${placementID}`);
      // fh.deleteAllFilesInDir(artLocalDir);
      // console.log(`Downloading "${newestGDriveArtFile.name}" from google drive for placement ${placementID}`);
      // await gdrive.downloadFile(newestGDriveArtFile.id, path.join(artLocalDir, newestGDriveArtFile.name));
      placement.curPieceName = newestGDriveArtFile.id;
      fs.writeFileSync(path.join(pieceDir, 'placement.json'), JSON.stringify(placement));
      return true;
    }
  }

  else { // there is no art file on the google drive
    if (placement.curPieceName != '') {
      console.log(`Artwork for placement ${placementID} has been deleted from google drive folder.`);
      // console.log(`Deleting local artwork for placement ${placementID}`);
      // fh.deleteAllFilesInDir(artLocalDir);
      placement.curPieceName = '';
      fs.writeFileSync(path.join(pieceDir, 'placement.json'), JSON.stringify(placement));
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
    
    //look for info.yml file
    var infoFileOnDrive = null;
    gdriveFiles.map((file) => {
      if (file.name == 'info.yml')
        infoFileOnDrive = file;
    });

    //if we have an info file, check if the info has been updated
    if (infoFileOnDrive != null) {
      var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
      if (Date.parse(infoFileOnDrive.modifiedTime) > Date.parse(placement.lastMetadataChangeTime)) {
        console.log('==============================================================');
        console.log(Date().toLocaleString());
        console.log(`Placement ${placementID} info.yml has been modified on google drive!`);
        console.log(`Deleting local info.yml for placement ${placementID}`);
        fh.deleteFileInDir(pieceDir, 'info.yml');
        console.log(`Downloading new info.yml from google drive for placement ${placementID}`);
        await gdrive.downloadFile(infoFileOnDrive.id, path.join(pieceDir, 'info.yml'));
        placement.lastMetadataChangeTime = infoFileOnDrive.modifiedTime;
        fs.writeFileSync(path.join(pieceDir, 'placement.json'), JSON.stringify(placement));
        return true;
      }
    }
  }
  return false;
}

async function checkFoldersForNewContent(gdriveFolders){
  var haveNewContent = false;
  if (gdriveFolders.length) {
    for (const gdriveFolder of gdriveFolders) {
      let gdriveFiles = await gdrive.getFilesInDir(gdriveFolder.id).catch(e => { console.log(e) });
      haveNewContent |= await checkForNewArtFiles(gdriveFolder.name, gdriveFiles);
      haveNewContent |= await checkForNewMetadata(gdriveFolder.name, gdriveFiles);
    }
  } else {
    console.log('No Google Drive placement folders found!');
  }

  return haveNewContent;
}

async function doItOnce() {
  let gdriveFolders = await gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID);
  var haveNewContent = await checkFoldersForNewContent(gdriveFolders);
  if (haveNewContent) {
    var url = await getNgrokUrl();
    await gather.updateMap(url);
  }
}

async function doItRepeadly() {
  try {
    await doItOnce();
    setTimeout(doItRepeadly, 10000);
  } catch(err) {
    console.log(err);
    setTimeout(doItRepeadly, 30000);
  }
  
}

// initialize //

initializePieceDir();


// go //
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
      gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID).then(folders => checkFoldersForNewContent(folders)).catch(e => { console.log(e) });
    } else if (key == 'h') {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log("Manually updating all webpages...");
      webpage.updateAllPictureWebpages();
    }

  }
});