const axios = require('axios').default;
const fs = require('fs');
const path = require('path');


const { NOVELTY_TIMEOUT } = require('./config');

const { SPACE_ID, GOOGLE_DRIVE_BOUNDLESS_DIR_ID } = require(path.join(__dirname, '..', 'secrets','config'));

var gatherCredentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets','gathertown','gather-api-credentials.json')));

const MAP_ID = 'custom-entrance';

const PEDESTAL_GOLD = 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/VZlQ222BXgcy3TPjiFsd77';
const PEDESTAL_SILVER = 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/mxR0MZjmEaLHNz4awHyBoC';
const PICFRAME0 = {normal: 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/RxeTQvOcFwUxmOO37L4j8H',
                   highlighted: 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/dH1VAp6RjSryTeLOpf82Ug'};
const PICFRAME1 = 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/1jBzlBF7XZh7Ully4oVKSW';
const PICFRAME2 = 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/XUiJQ0yJFQOJKmXogxfhho';

function findFile(directory, extension) {
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
  return foundFile;
}

//finds an object in mapData with the specified placementID in in its properties, and the specified _name
//returns the index of the object in the map's objects array
function findObject(mapData, placementID, name) {
  let objIdx = -1;

  for (let idx = 0; idx < mapData.objects.length; idx++) {
    let object = mapData.objects[idx];
    if (object.properties.hasOwnProperty('placementID')){
      if (object.properties.placementID === placementID && object._name === name) {
        objIdx = idx;
      }
    }
  }
  return objIdx;
}

//removes an object in mapData with the specified placementID in in its properties, and the specified _name
//returns the mapData with the object removed
function removeObject(mapData, placementID, name) {
  let objIdx = -1;

  for (let idx = 0; idx < mapData.objects.length; idx++) {
    let object = mapData.objects[idx];
    if (object.properties.hasOwnProperty('placementID')){
      if (object.properties.placementID === placementID && object._name === name) {
        objIdx = idx;
      }
    }
  }

  if (objIdx != -1){
    mapData.objects.splice(objIdx, 1);
  }

  return mapData;
}

//creates an object of type objectType in the map at the specified location. the created object will have 
// a 'placementID' field with value placementId added to to its properties
function createObject(mapData, x, y, objectType, placementID, serverUrl) {
  var object_template = {
    _name: '',
    type: 0,
    x: x,
    y: y,
    properties: {
      placementID: '',
    },
    width: 1,
    height: 1,
  };
  
  var url_object_template = {
    _name: '',
    type: 1,
    x: x,
    y: y,
    properties: {
      placementID: placementID,
      url: '',
    },
    distThreshold: 1,
    width: 1,
    height: 1,
  };

  if (objectType == 'pedestal-novel'){
    mapData.objects.push(
      Object.assign(object_template, {
        _name: 'pedestal-novel',
        normal: PEDESTAL_GOLD,
        highlighted: PEDESTAL_GOLD,
        properties: {
          placementID: placementID,
        },
      })
    );
  }

  else if (objectType == 'pedestal-old'){
    mapData.objects.push(
      Object.assign(object_template, {
        _name: 'pedestal-old',
        normal: PEDESTAL_SILVER,
        highlighted: PEDESTAL_GOLD,
        properties: {
          placementID: placementID,
        },
      })
    );
  }

  else if (objectType == 'picture0'){
    mapData.objects.push(
      Object.assign(url_object_template, {
        _name: 'picture',
        normal: PICFRAME0.normal,
        highlighted: PICFRAME0.highlighted,
        properties: {
          placementID: placementID,
          url: fullPieceUrl(serverUrl, placementID),
        },
        distThreshold: 1,
      })
    );
  }

  return mapData;
}

function fullPieceUrl(serverUrl, placementID) {
  return serverUrl + '/' + placementID + '/page/piece.html';
}

//set the server url of a picture
function setPictureUrl(mapData,idx_picture, placementID, serverUrl) {
  var fullurl = fullPieceUrl(serverUrl, placementID);
  mapData.objects[idx_picture].properties.url = fullurl;
  console.log('Set placement ' + placementID + ' url to: ' + fullurl);
  return mapData;
}

// updates all the placement objects in the map
// creates new objects if they dont exist
function updateAllPictureURLs(mapData, url) {
    piecesDirectory = path.join(__dirname, 'public', 'pieces');
    fs.readdirSync(piecesDirectory).forEach(pieceDir => {
      var idx_picture = findObject(mapData, pieceDir, 'picture');
      if (idx_picture!=-1){
        mapData = setPictureUrl(mapData,idx_picture,pieceDir,url);
      }
    });
    return mapData;
}

const updatePicturesUrlAsync = async (url) => {

  axios.get('https://gather.town/api/getMap', {
      params: {
        apiKey: gatherCredentials.API_KEY,
        spaceId: SPACE_ID,
        mapId: MAP_ID,
      },
    })
  .then(function (response) {
    let mapData = response.data;
    mapData = updateAllPictureURLs(mapData, url);
    
    return axios.post('https://gather.town/api/setMap', {
      apiKey: gatherCredentials.API_KEY,
      spaceId: SPACE_ID,
      mapId: MAP_ID,
      mapContent: mapData,
    });

  }).catch(function (error) {
    console.log(error);
  });
}

// updates all the placement objects in the map
// creates new objects if they dont exist
const updateMap = async (url) => {

  axios.get('https://gather.town/api/getMap', {
      params: {
        apiKey: gatherCredentials.API_KEY,
        spaceId: SPACE_ID,
        mapId: MAP_ID,
      },
    })
  .then(function (response) {
    let mapData = response.data;

    var numNewPieces = 0;
    var numNewPlacements = 0;
    piecesDirectory = path.join(__dirname, 'public', 'pieces');
    fs.readdirSync(piecesDirectory).forEach(placementName => {
      var pieceDir = path.join(piecesDirectory, placementName);
      var pageDir = path.join(pieceDir, 'page');
      var artDir = path.join(pageDir, 'art');
      
      artFilename = findFirstFile(artDir);

      //update image webpage, or create the webpage if it does not exist yet
      webpage.makeArtWebpage(pageDir, artFilename);

      //update the locations of the placement objects for this image. create them if they don't exist.
      var placement = JSON.parse(fs.readFileSync(path.join(pieceDir, 'placement.json')));
  
      var idx_pedgold = findObject(mapData, placementName, 'pedestal-novel');
      if (idx_pedgold==-1){
        mapData = createObject(mapData, placement.x, placement.y, 'pedestal-novel', placementName, url);
        idx_pedgold = mapData.objects.length-1;
      }else {
        mapData.objects[idx_pedgold].x = placement.x;
        mapData.objects[idx_pedgold].y = placement.y;
      }

      var idx_pedsilver = findObject(mapData, placementName, 'pedestal-old');
      if (idx_pedsilver==-1){
        mapData = createObject(mapData, placement.x, placement.y, 'pedestal-old', placementName, url);
        idx_pedsilver = mapData.objects.length-1;
      }else {
        mapData.objects[idx_pedsilver].x = placement.x;
        mapData.objects[idx_pedsilver].y = placement.y;
      }

      var idx_picture = findObject(mapData, placementName, 'picture');
      if (idx_picture==-1){
        mapData = createObject(mapData, placement.x, placement.y, 'picture' + placement.mountingType, placementName, url);
        idx_picture = mapData.objects.length-1;
        numNewPlacements++;
      }else {
        mapData.objects[idx_picture].x = placement.x;
        mapData.objects[idx_picture].y = placement.y;
      }

      //set novelty timing if the piece has changed
      if (placement.lastPieceName != artFilename) {
        var startSec = Date.now() / 1E3;
        mapData.objects[idx_pedgold].objectStartTime = {_seconds: startSec, _nanoseconds: 0};
        mapData.objects[idx_pedgold].objectExpireTime = {_seconds: startSec + NOVELTY_TIMEOUT, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectStartTime = {_seconds: startSec + NOVELTY_TIMEOUT, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectExpireTime = {_seconds: 99999999999, _nanoseconds: 0};
        numNewPieces++;
        placement.lastPieceName = artFilename;
      }

      //remove the picture if there is no artwork to display
      if (artFilename === null){
        mapData.objects[idx_pedgold].objectStartTime = {_seconds: 0, _nanoseconds: 0};
        mapData.objects[idx_pedgold].objectExpireTime = {_seconds: startSec, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectStartTime = {_seconds: startSec, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectExpireTime = {_seconds: 99999999999, _nanoseconds: 0};
        mapData = removeObject(mapData, placementName, 'picture');
      }

      fs.writeFile(path.join(pieceDir, 'placement.json'), JSON.stringify(placement), function (err) {
        if (err) throw err;
      })
    });

    console.log('Updated the Gather map. Made ' + numNewPlacements + ' new placements, and updated ' + numNewPieces + ' pieces.');
    
    return axios.post('https://gather.town/api/setMap', {
      apiKey: gatherCredentials.API_KEY,
      spaceId: SPACE_ID,
      mapId: MAP_ID,
      mapContent: mapData,
    });

  })
  .catch(function (error) {
    console.log(error);
  });
};

// Exports
exports.updateMap = updateMap;
exports.updatePicturesUrlAsync = updatePicturesUrlAsync;