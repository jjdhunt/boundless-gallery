const fs = require('fs');
const path = require('path');

function findFirstFile(directory) {
    foundFile = null;
    foundFile = fs.readdirSync(directory)[0];
    return foundFile;
  }

//webpage creation
function makeArtWebpage(pageSaveDir, artPageRelativeFileName) {
    let pageHtml = '<center><img src=art/' + artPageRelativeFileName + ' alt="' + artPageRelativeFileName + ' height="500" width="500"' + '></img></center>';
    fs.writeFile(path.join(pageSaveDir, 'piece.html'), pageHtml, function (err) {
    if (err) throw err;
});
}

// updates all the placement objects in the map
// creates new objects if they dont exist
function updateAllPictureWebpages() {
    piecesDirectory = path.join(__dirname, 'public', 'pieces');
    fs.readdirSync(piecesDirectory).forEach(pieceDir => {
        var pageDir = path.join(piecesDirectory, pieceDir, 'page');
        var artDir = path.join(pageDir, 'art');
        artFilename = findFirstFile(artDir);
        makeArtWebpage(pageDir, artFilename);
    });
}

exports.makeArtWebpage = makeArtWebpage;
exports.updateAllPictureWebpages = updateAllPictureWebpages;