var express = require('express');
const { ensureConnection , getNgrokUrl } = require('./ngrok');
const gather = require('./gather.js');

const port = process.env.PORT || 3000;

var app = express();

app.use(express.static('public'));

app.listen(port, async () => {
    console.log(`Listening on port ${port}`);
    await ensureConnection(url => {
      console.log(`Listening to ${url}`);

      //update the urls of the pieces
      getNgrokUrl().then((v) => gather.updatePicturesUrlAsync(v))
    });
});