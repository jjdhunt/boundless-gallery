const axios = require('axios').default;
const https = require('https');
var url = require('url')
const fs = require('fs');

const { SPACE_ID, API_KEY, NOVELTY_TIMEOUT } = require("./config");
const { URL, IP, PORT } = require("./ip");
const MAP_ID = "custom-entrance";

const PEDESTAL_GOLD = "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/VZlQ222BXgcy3TPjiFsd77";
const PEDESTAL_SILVER = "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/mxR0MZjmEaLHNz4awHyBoC";
const PICFRAME0 = {normal: "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/RxeTQvOcFwUxmOO37L4j8H",
                   highlighted: "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/dH1VAp6RjSryTeLOpf82Ug"};
const PICFRAME1 = "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/1jBzlBF7XZh7Ully4oVKSW";
const PICFRAME2 = "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/XUiJQ0yJFQOJKmXogxfhho";

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

function findObject(mapData, placementID, name) {
  // Find the door object and change its image and store the old object

  let objIdx = -1;

  for (let idx = 0; idx < mapData.objects.length; idx++) {
    let object = mapData.objects[idx];
    if (object.properties.hasOwnProperty("placementID")){
      if (object.properties.placementID === placementID && object._name === name) {
        objIdx = idx;
      }
    }
  }
  return objIdx;
}

function createObject(mapData,x,y,objectType,placementID) {
  var object_template = {
    _name: "",
    type: 0,
    x: x,
    y: y,
    properties: {
      placementID: "",
    },
    width: 1,
    height: 1,
  };
  
  var url_object_template = {
    _name: "",
    type: 1,
    x: x,
    y: y,
    properties: {
      placementID: placementID,
      url: "",
    },
    distThreshold: 1,
    width: 1,
    height: 1,
  };

  if (objectType == "pedestal-novel"){
    mapData.objects.push(
      Object.assign(object_template, {
        _name: "pedestal-novel",
        normal: PEDESTAL_GOLD,
        highlighted: PEDESTAL_GOLD,
        properties: {
          placementID: placementID,
        },
      })
    );
  }

  else if (objectType == "pedestal-old"){
    mapData.objects.push(
      Object.assign(object_template, {
        _name: "pedestal-old",
        normal: PEDESTAL_SILVER,
        highlighted: PEDESTAL_GOLD,
        properties: {
          placementID: placementID,
        },
      })
    );
  }

  else if (objectType == "picture0"){
    mapData.objects.push(
      Object.assign(url_object_template, {
        _name: "picture",
        normal: PICFRAME0.normal,
        highlighted: PICFRAME0.highlighted,
        properties: {
          placementID: placementID,
          url: URL + "/pieces/" + placementID + "/piece.html",
        },
        distThreshold: 1,
      })
    );
  }

  return mapData;
}

const writeMap = async () => {

  axios.get("https://gather.town/api/getMap", {
      params: {
        apiKey: API_KEY,
        spaceId: SPACE_ID,
        mapId: MAP_ID,
      },
    })
  .then(function (response) {
    console.log(response);
    let mapData = response.data;
    var newObjects = mapData.objects;

    piecesDirectory = __dirname + "/pieces";
    fs.readdirSync(piecesDirectory).forEach(pieceDir => {
      var dir = piecesDirectory + "/" + pieceDir;
      imgFilename = findFile(dir, "png");

      //update image webpage, and create the webpage if it does not exist yet
      let page = "<img src=" + imgFilename + "></img>";
      fs.writeFile(piecesDirectory + "/" + pieceDir + "/" + 'piece.html', page, function (err) {
        if (err) throw err;
      });

      //update the locations of the placement objects for this image. create them if they don't exist. set novelty timing if the image has changed
      var placement = JSON.parse(fs.readFileSync(dir + '/placement.json'));

      //find the placement's objects and if they don't exist or arent in the right place, create them 
      var idx_pedgold = findObject(mapData, pieceDir, "pedestal-novel");
      if (idx_pedgold==-1){
        mapData = createObject(mapData, placement.x, placement.y, "pedestal-novel", pieceDir);
        idx_pedgold = mapData.objects.length-1;
      }else {
        mapData.objects[idx_pedgold].x = placement.x;
        mapData.objects[idx_pedgold].y = placement.y;
      }

      var idx_pedsilver = findObject(mapData, pieceDir, "pedestal-old");
      if (idx_pedsilver==-1){
        mapData = createObject(mapData, placement.x, placement.y, "pedestal-old", pieceDir);
        idx_pedsilver = mapData.objects.length-1;
      }else {
        mapData.objects[idx_pedsilver].x = placement.x;
        mapData.objects[idx_pedsilver].y = placement.y;
      }

      var idx_picture = findObject(mapData, pieceDir, "picture");
      if (idx_picture==-1){
        mapData = createObject(mapData, placement.x, placement.y, "picture" + placement.mountingType, pieceDir);
        idx_picture = mapData.objects.length-1;
      }else {
        mapData.objects[idx_picture].x = placement.x;
        mapData.objects[idx_picture].y = placement.y;
      }

      //set novelty timing if the image has changed
      if (placement.lastPieceName != imgFilename) {
        var startSec = Date.now() / 1E3;
        mapData.objects[idx_pedgold].objectStartTime = {_seconds: startSec, _nanoseconds: 0};
        mapData.objects[idx_pedgold].objectExpireTime = {_seconds: startSec + NOVELTY_TIMEOUT, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectStartTime = {_seconds: startSec + NOVELTY_TIMEOUT, _nanoseconds: 0};
        mapData.objects[idx_pedsilver].objectExpireTime = {_seconds: 99999999999, _nanoseconds: 0};
        placement.lastPieceName = imgFilename;
      }

      fs.writeFile(dir + '/placement.json', JSON.stringify(placement), function (err) {
        if (err) throw err;
      })
    });

    
    return axios.post("https://gather.town/api/setMap", {
      apiKey: API_KEY,
      spaceId: SPACE_ID,
      mapId: MAP_ID,
      mapContent: mapData,
    });

  })
  .catch(function (error) {
    console.log(error);
  })
  .then(function () {
    // always executed
  }); 
};

//// run server
const options = {
  key: fs.readFileSync('certificate/key.pem'),
  cert: fs.readFileSync('certificate/cert.pem')
};

const hostname = IP;
const port = PORT;

const server = https.createServer(options, (req, res) => {
  // res.statusCode = 200;
  // res.setHeader('Content-Type', 'text/plain');
  // res.end('Hello World');
  //find the png picture in the requested dir

  let urlParts = req.url.split('/');
  urlParts.shift();

  let numNew = 0;
  if (urlParts[0] == "UPDATE") {
    // piecesDirectory = __dirname + "/pieces";
    // fs.readdirSync(piecesDirectory).forEach(pieceDir => {
      
      // numNew++;

      writeMap();
    // });

    res.writeHead(200);
    res.end(numNew + " new pieces.");

  } 

  else {
    fs.readFile(__dirname + req.url, function (err,data) {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(data);
    });
  }

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});