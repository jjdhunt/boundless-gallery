
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const gdrive = require('./google-drive.js');
const gather = require('./gather.js');

const { SPACE_ID, GOOGLE_DRIVE_BOUNDLESS_DIR_ID } = require(path.join(__dirname, '..', 'secrets','config'));

gdrive.getFilesInDir(GOOGLE_DRIVE_BOUNDLESS_DIR_ID, files => {
  if (files.length) {
    console.log('Files:');
    files.map((file) => {
      console.log(`${file.name} (${file.id})`);
    });
  } else {
    console.log('No files found.');
  }
});

//
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (key, data) => {
  if (data.ctrl && data.name === 'c') {
    process.exit();
  } else {
    if (key == 'u') {
      gather.updateMap();
    };
  }
});

