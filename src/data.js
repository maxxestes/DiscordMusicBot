const { Client, GatewayIntentBits } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');
const { clientId, clientSecret, redirectUri } = require("./config.json");
const express = require('express');
const request = require("request");
var querystring = require('querystring');


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/*
An interval is set at initialization to call this function.
Refreshes access token to continue using Spotify API before
the current token expires.
*/
function refreshSpotifyToken() {
  let spotifyApi = module.exports.getSpotifyInstance();
  spotifyApi.refreshAccessToken().then(
      function(data) {
          console.log('The access token has been refreshed!');

          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
          console.log('The access token is ' + data.body['access_token']);
          console.log('The token expires in ' + data.body['expires_in']);
      },
      function(err) {
          console.log('Could not refresh access token', err);
      });
};

class QueueList {
    constructor() {
      this.queueList = new Map();
    }
}
let queueInstance = null;

class SpotifyAPI {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUri
    });
  }
}
let spotifyInstance = null;

class ExpressApp {
  constructor() {
    this.app = express();
    /*
    first callback function used. Gets the auth
    code from Spotify API.
    */
    this.app.get('/login', function(req, res) {

      var state = generateRandomString(16);
      var scope = 'user-read-private user-read-email';

      res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
          response_type: 'code',
          client_id: clientId,
          scope: scope,
          redirect_uri: redirectUri,
          state: state
        }));
    });
    /*
    Callback function after login. Gets/sets the
    access and refresh tokens to access the Spotify
    API.
    */
    this.app.get('/callback', function(req, res) {

      var code = req.query.code || null;
      var state = req.query.state || null;

      if (state === null) {
        res.redirect('/#' +
          querystring.stringify({
            error: 'state_mismatch'
          }));
      } else {
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          form: {
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          },
          headers: {
            'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
          },
          json: true
        };
        request.post(authOptions, function(error, response, body) {
          if (!error && response.statusCode === 200) {

            var access_token = body.access_token,
                refresh_token = body.refresh_token;


            let spotifyApi = module.exports.getSpotifyInstance();
            spotifyApi.setRefreshToken(refresh_token);
            spotifyApi.setAccessToken(access_token);

            refreshSpotifyToken();
            setInterval(refreshSpotifyToken, 1000 * 60 * 50);

          } else {
            res.redirect('/#' +
              querystring.stringify({
                error: 'invalid_token'
              }));
          }
        });
      }
    });
  }
}
let expressInstance = null;


class DiscordClient {
  constructor() {
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }
}
let discordInstance = null;


class Queue {
  constructor() {
    this.connection = null,
    this.songs = [],
    this.volume = 5,
    this.playing = false,
    this.currentResource = null,
    this.songImportQueued = false,
    this.currentTextChannel = null,
    this.player = null,
    this.currentSong = null;
  }
} 

  
module.exports = {
  /*
  constructer for queue object. Each
  server has one to keep track of
  and seperate unique properties.
  */


  getInstance() {
    if (!queueInstance) {
      queueInstance = new QueueList();
    }
    return queueInstance;
  },

  getDiscordInstance() {
    if (!discordInstance) {
      discordInstance = new DiscordClient();
    }
    return discordInstance.discordClient;
  },

  getSpotifyInstance() {
    if (!spotifyInstance) {
      spotifyInstance = new SpotifyAPI();
    }
    return spotifyInstance.spotifyApi;
  },

  getExpressInstance() {
    if (!expressInstance) {
      expressInstance = new ExpressApp();
    }
    return expressInstance.app;
  },


  Queue



}