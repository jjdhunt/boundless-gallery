const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const SECRETS_DIR = path.join(__dirname, '..', 'secrets','googledrive');
const TOKEN_PATH = path.join(SECRETS_DIR,'token.json');

// Load client secrets from a local file.
// fs.readFile('google-api-credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Drive API.
//   //authorize(JSON.parse(content), listFiles);
//   authorize(JSON.parse(content), listFilesInDir);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Get a list of files in the specified folder and pass them to the
 * given callback function.
 * @param {Object} auth The authorization client credentials.
 * @param {Object} googleFolderId The ID of the folder to list the contents of.
 * @param {function} callback The callback to call with the authorized client.
 */
function listFilesInDir(auth, googleFolderId, callback) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    fields: 'files(id,name,createdTime,modifiedTime)',
    q: `'${googleFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
  }, (err, res) => {
    if (err) return console.log('The Google Drive API returned an error: ' + err);
    callback(err, res.data.files);
  })
}

/**
 * Get a list of folders in the specified folder and pass them to the
 * given callback function.
 * @param {Object} auth The authorization client credentials.
 * @param {Object} googleFolderId The ID of the folder to list the contents of.
 * @param {function} callback The callback to call with the authorized client.
 */
 function listFoldersInDir(auth, googleFolderId, callback) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    q: `'${googleFolderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`
  }, (err, res) => {
    if (err) return console.log('The Google Drive API returned an error: ' + err);
    callback(err, res.data.files);
  })
}

/**
 * Download a file
 * @param {Object} auth The authorization client credentials.
 * @param {Object} fileId The ID of the folder to list the contents of.
 * @param {string} saveFullFileName filename with full path to save to.
 */
function downloadFile(auth, fileId, saveFullFileName, callback) {
  const drive = google.drive({version: 'v3', auth});
  
  ////
  var dest = fs.createWriteStream(saveFullFileName);  // Please set the filename of the saved file.
  drive.files.get({fileId: fileId, alt: 'media'}, {responseType: 'stream'},
    function(err, res){
       res.data
       .on('end', () => {
          console.log('Done Downloading');
          callback(err, res);
       })
       .on('error', err => {
          console.log('The Google Drive API returned an error: ' + err);
          callback(err, res);
       })
       .pipe(dest);
    }
  );
 //// 
}

// full functionality export functions - these also handle creation of oauth 

/**
 * Download a file
 * @param {Object} googlefileId The ID of the folder to list the contents of.
 * @param {string} saveFullFileName filename with full path to save to.
 */
function downloadFileHelper(googlefileId, saveFullFileName, callback) {
  fs.readFile(path.join(SECRETS_DIR,'google-api-credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    //authorize(JSON.parse(content), listFiles);
    authorize(JSON.parse(content), auth => downloadFile(auth, googlefileId, saveFullFileName, callback));
  });

}

/**
 * Get a list of files in the specified folder and pass them to the
 * given callback function.
 * @param {Object} googleFolderId The ID of the folder to list the contents of.
 * @param {function} callback The callback to call with the authorized client.
 */
function getFilesInDirHelper(dirID, callback) {
  fs.readFile(path.join(SECRETS_DIR,'google-api-credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    //authorize(JSON.parse(content), listFiles);
    authorize(JSON.parse(content), auth => listFilesInDir(auth, dirID, callback));
  });

}

/**
 * Get a list of folders in the specified folder and pass them to the
 * given callback function.
 * @param {Object} googleFolderId The ID of the folder to list the contents of.
 * @param {function} callback The callback to call with the authorized client.
 */
 function getFoldersInDirHelper(dirID, callback) {
  fs.readFile(path.join(SECRETS_DIR,'google-api-credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    //authorize(JSON.parse(content), listFiles);
    authorize(JSON.parse(content), auth => listFoldersInDir(auth, dirID, callback));
  });

}


exports.downloadFile = util.promisify(downloadFileHelper);
exports.getFilesInDir = util.promisify(getFilesInDirHelper);
exports.getFoldersInDir = util.promisify(getFoldersInDirHelper);