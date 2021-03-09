const axios = require('axios').default;
const https = require('https');
const fs = require('fs');

const { SPACE_ID, API_KEY } = require("./config");
const { IP, PORT } = require("./ip");
const MAP_ID = "custom-entrance";

const PIC1_GOLD = "https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/uploads/HSzvXHgwIAW8yq5Q/Nyq9wbFt2xYdUkDxW1IyMP";

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
    //oldMapData = JSON.parse(JSON.stringify(mapData));

    let newObjects = response.data.objects;
    newObjects[0].normal = PIC1_GOLD;

    return axios.post("https://gather.town/api/setMap", {
      apiKey: API_KEY,
      spaceId: SPACE_ID,
      mapId: MAP_ID,
      mapContent: Object.assign(mapData, {
        objects: newObjects,
      }),
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
  fs.readFile(__dirname + req.url, function (err,data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
  
  writeMap();
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});