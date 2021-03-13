
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const gdrive = require('./google-drive.js');
const gather = require('./gather.js');
const { getNgrokUrl } = require('./ngrok');

const { SPACE_ID, GOOGLE_DRIVE_BOUNDLESS_DIR_ID } = require(path.join(__dirname, '..', 'secrets','config'));

function printFilesAndSave(files) {
  if (files.length) {
    console.log('Contains the Files:');
    files.map((file) => {
      console.log(`${file.name} (${file.id})`);
    });
  } else {
    console.log('No Files found.');
  }
}

function printFoldersAndGetContents(folders){
  if (folders.length) {
    console.log('Folders:');
    folders.map((folders) => {
      console.log(`${folders.name} (${folders.id})`);
      gdrive.getFilesInDir(folders.id, files => printFilesAndSave(files));
    });
  } else {
    console.log('No Folders found.');
  }
}

gdrive.getFoldersInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, folders => printFoldersAndGetContents(folders));

//
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

//listen for 'u' and update the map whenever we get it
process.stdin.on('keypress', (key, data) => {
  if (data.ctrl && data.name === 'c') {
    process.exit();
  } else {
    if (key == 'u') {
      getNgrokUrl().then(url => gather.updateMap(url));

      //update the urls of the pieces
      //

    };
  }
});

