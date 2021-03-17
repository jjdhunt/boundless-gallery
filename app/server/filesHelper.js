const fs = require('fs');
const path = require('path');

function findFileByExtension(directory, extension) {
    foundFile = null;
    fs.readdirSync(directory).forEach(file => {
      if (file.split('.').pop() == extension)
      {
        foundFile = file;
      }
    });
  
    return foundFile;
}

function findFirstFile(directory) {
  foundFile = null;
  foundFile = fs.readdirSync(directory)[0];
  if (foundFile == undefined)
    foundFile = null;
  return foundFile;
}

function findFileByName(directory, name) {
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
    try {fs.unlinkSync(path.join(directory, file));}
    catch (err) {console.log(err);}
  });
}

function deleteFileInDir(directory, filename) {
  fs.readdirSync(directory).forEach(file => {
    try {fs.unlinkSync(path.join(directory, filename));}
    catch {return;}
  });
}

exports.findFileByExtension = findFileByExtension;
exports.findFirstFile = findFirstFile;
exports.findFileByName = findFileByName;
exports.deleteAllFilesInDir = deleteAllFilesInDir;
exports.deleteFileInDir = deleteFileInDir;