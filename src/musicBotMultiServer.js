const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioResource, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { prefix, token, clientId, clientSecret, redirectUri, COOKIE } = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require('yt-search');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');
const { Worker } = require('worker_threads');
const request = require("request");
const open = require('open');
const express = require('express');
var app = express();
var querystring = require('querystring');

/*
All intents needed for discord bot to function.
*/
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
});
/*
Spotify API object used to access
playlists and extract data.
*/
var spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
});



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
first callback function used. Gets the auth
code from Spotify API.
*/
app.get('/login', function(req, res) {

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
app.get('/callback', function(req, res) {

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

/*
An interval is set at initialization to call this function.
Refreshes access token to continue using Spotify API before
the current token expires.
*/
function refreshSpotifyToken() {
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

/*
constructer for player object
*/
function createPlayer(guildId) {
  let currentQueue = queueList.get(guildId);
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });
  //When the song ends or is skipped, idle is emmited. This handles the case.
  player.on("idle", () => {
    if (currentQueue.songImportQueued && !currentQueue.songs[0]) {
      return currentQueue.currentTextChannel.send("Importing playlist will play when done.");
    }
    else {
      currentQueue.currentSong = currentQueue.songs.shift();
      play(currentQueue.currentSong, currentQueue.currentTextChannel);
    }
  })
  return player;
}

/*
constructer for queue object. Each
server has one to keep track of
and seperate unique properties.
*/
function queue() {
  this.connection = null,
  this.songs = [],
  this.volume = 5,
  this.playing = false,
  this.currentResource = null,
  this.songImportQueued = false,
  this.currentTextChannel = null,
  this.player = null,
  this.currentSong = null
}

var queueList = new Map(); //Map of queues currently active in servers

/*
Checks to see if a user message for the bot
should be handled or ignored.
*/
function checkValidUser(message) {
  const voiceChannel = message.member.voice.channel;
  let thisChannelQueue = queueList.get(message.guild.id);
  if (!voiceChannel) {
    return "You need to be in a voice channel to give commands!";
  }
  else if (!voiceChannel.joinable) {
    return "I need the permissions to join and speak in your voice channel!";
  }
  else if (!thisChannelQueue) {
    return null;
  }
  else if (thisChannelQueue.connection && (voiceChannel.id !== thisChannelQueue.connection.joinConfig.channelId)){
    return "You need to be in the voice call with the bot to give commands!";
  }
  else {
    return null;
  }
}

/*
Checks to see if a bot is already in a server
voice channel. If it isn't, a new queue variable
is initialized, necessary variables are set,
and the queue is added to the queue list.
*/
async function attemptJoinServer(message) {
  if (!queueList.get(message.guildId)) {
    try {
      const voiceConnection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });
      let newQueue = new queue();
      newQueue.connection = voiceConnection;
      queueList.set(message.guild.id, newQueue);
      newQueue.player = createPlayer(message.guild.id);
      voiceConnection.subscribe(newQueue.player);
      newQueue.currentTextChannel = message.channel;
    } catch (err) {
      console.log(err);
      message.channel.send("Error while joining voice channel")
    }
    return false;
  }
  return true;
}


/*
Searches for a youtube video with the same
details as the song info from the spotify
API and adds it to the server's songs list.
*/
async function yTubeSearch(searchString, currentQueue) {
  const options = {search: searchString, category: 'music', pageStart: 1, pageEnd: 1 };
  let results = await ytSearch(options);

  if (!results?.videos?.length) {
    return false;
  }

  const song = {
    title: results.videos[0].title,
    url: results.videos[0].url,
  };

  for(const songResult of results.videos) {
    if (songResult.title.toLowerCase().includes("audio")) {
      song.title = songResult.title;
      song.url = songResult.url;
      break;
    }
  }
  currentQueue.songs.push(song);
  return true;
}


/*
starts listening to the redirect
URI specified in the Spotify dev
portal to get the auth and refresh
tokens needed to use the Spotify API.
*/
client.once("ready", () => {
  console.log("Ready!");
  app.listen(8888);
  open('http://localhost:8888/login');
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

/*
When a user puts a message into a chat, this
function checks if it's for the bot, and delegates
to the proper functions if it is.
*/
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;


  if (message.content.startsWith(`${prefix}play`)) {
    execute(message);
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message);
    return;
  } else if (message.content.startsWith(`${prefix}unpause`)) {
    unPause(message);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message);
    return;
  } else if (message.content.startsWith(`${prefix}add`)) {
    add(message);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    help(message);
    return;
  } else if (message.content.startsWith(`${prefix}queue`)) {
    showQueue(message);
    return;
  } else if (message.content.startsWith(`${prefix}move`)) {
    moveToFront(message);
    return;
  } 
  else {
    message.channel.send("You need to enter a valid command!");
  }
});
/*
Checks the message to see if it's valid before
Looking up the YouTube video and storing its
information in a song variable.
*/
async function execute(message) {

  let validity = checkValidUser(message);
  if (validity !== null) {
    return message.channel.send(validity);
  }



  let searchString = message.content.split(' ').slice(1).join(' ');
  if (!searchString) {
      return message.channel.send('No search string provided');
  }
  let wasInServer = await attemptJoinServer(message);
  let currentQueue = queueList.get(message.guild.id);
  if (searchString.includes('youtube.com')) {
    let songInfo;
    try {
      songInfo = await ytdl.getInfo(searchString);
    } catch(err) {
      return message.channel.send('invalid URL');
    }
    wasInServer = attemptJoinServer(message);
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };
    currentQueue.songs.push(song);
    console.log(song.title);
  }
  else {
    console.log()
    console.log(currentQueue);
    let result = await yTubeSearch(searchString, currentQueue);
    if (result === false) {
      return message.channel.send('Song not found');
    }
  }

  if (wasInServer) {
    return message.channel.send(`${currentQueue.songs[currentQueue.songs.length - 1].title} has been added to the queue!`);
  }
  else {
    currentQueue.currentSong = currentQueue.songs.shift();
    play(currentQueue.currentSong, message.channel);
  }
}

/*
Takes in a valid public spotify playlist link and retreives the data
for the songs from the spotify API. Uses worker threads to prevent
async work from pausing/stuttering the music player.
*/
async function add(message) {

  let validity = checkValidUser(message);
  
  if (validity !== null) {
    return message.channel.send(validity);
  }

  let searchString = message.content.split(' ').slice(1).join(' ');

  if (!searchString) {
      return message.channel.send('No search string provided');
  }
  else if (searchString.includes('spotify.com')) {
    var playlistId = searchString.substring(
      searchString.indexOf("list/") + 5, 
      searchString.lastIndexOf("?")
    );

    try {
          var data = await spotifyApi.getPlaylist(playlistId);
        }
    catch(err) {
          return message.channel.send('Must be a valid Spotify playlist link');
        }
    
    attemptJoinServer(message);
    let currentQueue = queueList.get(message.guildId);
    currentQueue.songImportQueued = true;
    let songAndArtistList = [];
    await Promise.all(data.body.tracks.items.map((element) => {
      let songAndArtist = element.track.name + " " + element.track.artists[0].name;
      songAndArtistList.push(songAndArtist);
    }));
    
    
    message.channel.send("Playlist import started");
    const worker = new Worker('./Worker.js', {
      workerData: {
        value: songAndArtistList,
        path: './Worker.js'
      }
    });

     
    worker.on('message', (result) => {
      message.channel.send("Playlist imported");
      for (const song of result) {
        currentQueue.songs.push(song);
      }
      if (currentQueue.player.state.status === 'idle') {
        currentQueue.currentSong = currentQueue.songs.shift();
        play(currentQueue.currentSong, message.channel);
      }
      songImportQueued = false;
    });
    worker.on('exit', (code) => {
      if (code !== 0)
        console.log(new Error(`Worker stopped with exit code ${code}`));
    });
  }
  else {
    return message.channel.send('Must be a valid Spotify playlist link');
  }

  
}
/*
Sends the list of songs in the queue to the
Discord text chat.
*/
function showQueue(message) {
  let currentQueue = queueList.get(message.guildId);
  if (currentQueue.songs.length > 0) {
    let songList = [];
    const characterLimit = 2000;
    let currentMessage = 0;
    currentQueue.songs.forEach((element, index) => {
      if ((songList[currentMessage] + (element.title + "\n")).length > characterLimit) {
        currentMessage += 1;
      }
      if (songList[currentMessage] !== undefined) {
        songList[currentMessage] = songList[currentMessage] + (`${element.title}--------index: ${index}\n`);
      }
      else {
        songList[currentMessage] = (`${element.title}--------index: ${index}\n`);
      }
      
    });
    message.channel.send("Current song: " + currentQueue.currentSong.title);
    songList.forEach(element => {
      message.channel.send(element);
    });
    return;
  }
  else {
    return message.channel.send("The queue is empty");
  }
}

/*
Gives instructions for using the bot to discord chat.
*/
function help(message) {
    return message.channel.send(
      "Use * before all commands. \n\"play title\" - search for a video on youtube with this title." +
      "\n\"add spotify-playlist-link\" - link any public spotify playlist to add all the songs to the queue." +
      "\n\"skip\" - Skip the current song. \n\"pause\" - pause the current song." +
      "\n\"unpause\" - unpause the current song.\n\"stop\" - clears the current queue and disconnects the bot" +
      "\n\"queue\" - Prints the current queue. \n\"move INDEX\" - moves the song at given index to the front of the queue."
      );
}

/*
Skips the current song.
*/
function skip(message) {
  let currentQueue = queueList.get(message.guildId);
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (currentQueue.songs.length == 0)
    return message.channel.send("There is no song that I could skip!");
  else {
    currentQueue.player.stop();
    return message.channel.send("Song skipped, " + (currentQueue.songs.length - 1) + " songs left in queue!");
  }
}

function moveToFront(message) {
  let currentQueue = queueList.get(message.guildId);
  if (currentQueue.songs.length > 1) {

  
  let index = message.content.split(' ').slice(1).join(' ');
  
  if (!index) {
      return message.channel.send('No song index provided');
  }
  index = Number(index);



  if (index > -1 && index < currentQueue.songs.length - 1) { // only splice array when item is found
   let movedSong = currentQueue.songs.splice(index, 1);
   currentQueue.songs.unshift(movedSong[0]); // 2nd parameter means remove one item only
   message.channel.send(currentQueue.songs[0].title + " ----is now at the front of the queue");
  }
  else {
    message.channel.send("Invalid index.");
  }
}
}

/*
Stops the player, clears the queue, and has the bot
leave the voice channel.
*/
function stop(message) {
  let currentQueue = queueList.get(message.guildId);
  if (!message.member.voice.channel) {
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  }
  if (currentQueue.songs.length == 0) {
    return message.channel.send("There is no queue to stop!");
  }

  currentQueue.songs = [];
  inServer = false;
  currentQueue.connection.destroy();
  currentQueue.connection = null;
  currentQueue.player.pause();
  currentQueue.currentResource = null;
  currentQueue.songImportQueued = false;
  currentQueue.currentSong = null;
  queueList.delete(message.guildId);
  
  return message.channel.send("Queue deleted");
}

/*
pauses the player if it's playing.
*/ 
function pause(message) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to pause the music!"
    );
    let currentQueue = queueList.get(message.guildId);

  if (currentQueue.player.state.status !== 'playing') {
    return message.channel.send("There is not a song playing right now.");
  }
    
  currentQueue.player.pause();
  return message.channel.send("Song paused.");
}

/*
Unpauses the player if it's paused.
*/
function unPause(message) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to pause the music!"
    );
    let currentQueue = queueList.get(message.guildId);

  if (currentQueue.state.status !== ('paused' || 'autoPaused')) {
    return message.channel.send("There is not a paused song right now.");
  }

  currentQueue.unpause();
  return message.channel.send("Song unpaused.");
}

/*
param: message - the message sent with the play request.
       song - The song to be played
       channel - A possible param if the play was sent
                 as an autoplay after the previous song
                 ended.
The function starts a download of a youtube video as an
mp3 and plays it on the player once done.
*/
async function play(song, channel) {
  let currentQueue = queueList.get(channel.guildId);
  if (!song) {
    currentQueue.connection.destroy();
    currentQueue.connection = null;
    inServer = false;
    currentQueue.player.pause();
    currentQueue.currentResource = null;
    channel.send('Song queue has ended.');
    return;
  }

  await new Promise((resolve) => {
    let dl;
    try {
      dl = ytdl(song.url, { quality: 'highestaudio', requestOptions: {
        headers: {
          cookie: COOKIE,
        },
      }});
    } catch (error) {
        console.log(error);
        resolve();
    }
    
    dl.pipe(fs.createWriteStream(`${channel.guild.name} song.mp3`))
        .on('close', () => {
            currentQueue.currentResource = createAudioResource(`${channel.guild.name} song.mp3`);
            currentQueue.player.play(currentQueue.currentResource);
            channel.send(`Now playing: **${song.title}**`);
            resolve();
        });
  })
}

client.login(token);

