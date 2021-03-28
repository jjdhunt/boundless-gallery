const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function findFirstFile(directory) {
    foundFile = null;
    foundFile = fs.readdirSync(directory)[0];
    return foundFile;
  }

//webpage creation
function makeArtWebpage(pieceDir, artGDriveId) {
    let pageDir = path.join(pieceDir, 'page');
    let pageHtml = fs.readFileSync(path.join(__dirname, 'basePiece.html'), 'utf8');
    // pageHtml = pageHtml.replace("ART_FILE_NAME", 'art/' + artPageRelativeFileName);
    pageHtml = pageHtml.replace("ART_FILE_NAME", `https://drive.google.com/uc?id=` + artGDriveId);

    try {
        var info = yaml.load(fs.readFileSync(path.join(pieceDir, 'info.yml'), 'utf8'));
        pageHtml = pageHtml.replace("DIDACTIC_TEXT", info.name + "<br>" + info.artist + "<br>" + info.date);
        pageHtml = pageHtml.replace("DIDACTIC_LINK_URL", info.linkUrl);
        pageHtml = pageHtml.replace("DIDACTIC_LINK_TEXT", info.linkName);
        if (info.backgroundColor == 'black') {
            pageHtml = pageHtml.replace("STYLE_SHEET_NAME", 'black.css');
        } else {
            pageHtml = pageHtml.replace("STYLE_SHEET_NAME", 'white.css');
        }
    }
    catch {var info = null;}

    
    fs.writeFile(path.join(pageDir, 'piece.html'), pageHtml, function (err) {
    if (err) throw err;
});
}

// updates all the placement objects in the map
// creates new objects if they dont exist
function updateAllPictureWebpages() {
    piecesDirectory = path.join(__dirname, 'public', 'pieces');
    fs.readdirSync(piecesDirectory).forEach(placementName => {
        var pieceDir = path.join(piecesDirectory, placementName);
        var pageDir = path.join(pieceDir, 'page');
        var artDir = path.join(pageDir, 'art');
        artFilename = findFirstFile(artDir);
        makeArtWebpage(pieceDir, artFilename);
    });
}

exports.makeArtWebpage = makeArtWebpage;
exports.updateAllPictureWebpages = updateAllPictureWebpages;