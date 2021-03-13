
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const request = require('request');

const gdrive = require('./google-drive.js');
const gather = require('./gather.js');
const { getNgrokUrl } = require('./ngrok');

const { SPACE_ID, GOOGLE_DRIVE_BOUNDLESS_DIR_ID } = require(path.join(__dirname, '..', 'secrets','config'));

function findFile(directory, name) {
  foundFile = false;
  fs.readdirSync(directory).forEach(file => {
    if (file == name)
      foundFile = true;
  });
  return foundFile;
}

function deleteAllFilesInDir(directory) {
  fs.readdirSync(directory).forEach(file => {
    fs.unlinkSync(path.join(directory, file));
  });
}

function checkIfHaveFileOrReplace(placementID, files) {
  if (files.length) {
    //console.log('Contains the Files:');
    files.map((file) => {
      //console.log(`${file.name} (${file.id})`);
      var artDir = path.join('public', 'pieces', placementID, 'page', 'art');
      if (!findFile(artDir, file.name)) {
        //clear out the art directory
        deleteAllFilesInDir(artDir);
        //then download the new art file from g drive
        gdrive.downloadFile(file.id, path.join(artDir, file.name))
        console.log(`Replaced placement ${placementID} with the new art file "${file.name}" from gdrive`);
      }
    });
  } else {
    console.log('No Files found.');
  }
}

function lookInEachFolder(folders){
  if (folders.length) {
    console.log('Folders:');
    folders.map((folder) => {
      //console.log(`${folder.name} (${folder.id})`);
      gdrive.getFilesInDir(folder.id, files => checkIfHaveFileOrReplace(folder.name, files));
    });
  } else {
    console.log('No Folders found.');
  }
}

gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, folders => lookInEachFolder(folders));

//
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

//listen for 'u' and update the map whenever we get it
process.stdin.on('keypress', (key, data) => {
  if (data.ctrl && data.name === 'c') {
    process.exit();
  } else {
    if (key == 'u') {
      gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, folders => lookInEachFolder(folders));
      
      getNgrokUrl().then(url => gather.updateMap(url));

      //update the urls of the pieces
      //

    };
  }
});

