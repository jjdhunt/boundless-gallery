var express = require('express');
const { ensureConnection } = require('./ngrok');
const port = process.env.PORT || 3000;

var app = express();

app.use(express.static('public/pieces'));

app.listen(port, async () => {
    console.log(`Listening on port ${port}`);
    await ensureConnection(url => {
      console.log(`Listerning to ${url}`);
    });
});