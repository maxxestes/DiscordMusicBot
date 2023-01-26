const { Client, GatewayIntentBits } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');
const { clientId, clientSecret, redirectUri } = require("./config.json");



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

var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
    },
    form: {
        grant_type: 'client_credentials'
    },
    json: true
};

  
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


  Queue,

  authOptions



}