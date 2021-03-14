
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const request = require('request');

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
  });
}

function findFile(directory, name) {
  foundFile = false;
  try {
  fs.readdirSync(directory).forEach(file => {
    if (file == name)
      foundFile = true;
  });
  return foundFile;
}
  catch {return false};
}

function deleteAllFilesInDir(directory) {
  fs.readdirSync(directory).forEach(file => {
    fs.unlinkSync(path.join(directory, file));
  });
}

function checkIfHaveFileOrReplace(placementID, gdriveFiles) {
  var pieceDir = path.join('public', 'pieces', placementID);
  var artLocalDir = path.join(pieceDir, 'page', 'art');

  if (gdriveFiles.length) {
    //find the newest file in the google drive placement folder
    var newestGDriveFile = gdriveFiles[0];
    gdriveFiles.map((file) => {
      if (Date.parse(file.createdTime) > Date.parse(newestGDriveFile.createdTime))
        newestGDriveFile = file;
    });

    //check if this file is the same as what we have locally. If it's different, replace whatever we have locally
    if (!findFile(artLocalDir, newestGDriveFile.name)) {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log(`Placement ${placementID} has a new art file on google drive called "${newestGDriveFile.name}"!`);
      console.log(`Deleting local artwork for placement ${placementID}`);
      deleteAllFilesInDir(artLocalDir);
      console.log(`Downloading "${newestGDriveFile.name}" from google drive for placement ${placementID}`);
      gdrive.downloadFile(newestGDriveFile.id, path.join(artLocalDir, newestGDriveFile.name), () => getNgrokUrl().then(url => gather.updateMap(url)))
    }
  }

  else {
    try {
      var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
    }catch {return;}

    if (placement.lastPieceName != null) {
      console.log(`No artwork files found in placement ${placementID} google drive folder.`);
      console.log(`Deleting local artwork for placement ${placementID}`);
      deleteAllFilesInDir(artLocalDir);
      getNgrokUrl().then(url => gather.updateMap(url));
    } 
  }
}

function lookInEachFolder(folders){
  if (folders.length) {
    folders.map((folder) => {
      gdrive.getFilesInDir(folder.id, gdriveFiles => checkIfHaveFileOrReplace(folder.name, gdriveFiles));
    });
  } else {
    console.log('No Google Drive placement folders found!');
  }
}

function doIt() {
  gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, folders => lookInEachFolder(folders));
  //setTimeout(doIt, 10000);
}

initializePieceDir();

webpage.updateAllPictureWebpages();

doIt();


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
      getNgrokUrl().then(url => gather.updateMap(url));
    } else if (key == 'h') {
      console.log('==============================================================');
      console.log(Date().toLocaleString());
      console.log("Manually updating all webpages...");
      webpage.updateAllPictureWebpages();
    }

  }
});