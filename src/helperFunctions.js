const ytSearch = require('yt-search');
const ytdl = require("ytdl-core");
const { VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { COOKIE } = require("./config.json");
const fs = require('node:fs');
const request = require("request");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const data = require('./data').getInstance();
const Queue = require('./data').Queue;
const authOptions = require('./data').authOptions;
let spotifyApi = require('./data').getSpotifyInstance();



/*
Checks to see if a user message for the bot
should be handled or ignored.
*/
module.exports = {

  /*
An interval is set at initialization to call this function.
Refreshes access token to continue using Spotify API before
the current token expires.
*/
refreshSpotifyToken: function() {
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var token = body.access_token;
      spotifyApi.setAccessToken(token);
    }
  });
},


checkValidUser : function(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    let thisChannelQueue = data.queueList.get(interaction.guildId);
    if (!voiceChannel) {
      return "You need to be in a voice channel to give commands!";
    }
    else if (!voiceChannel.joinable && !thisChannelQueue) {
      return "I need the permissions to join and speak in your voice channel!";
    }
    else if (!thisChannelQueue) {
      return "The bot is not currently in your server. Search a song or playlist to bring it in.";
    }
    else if (thisChannelQueue.connection && (voiceChannel.id !== thisChannelQueue.connection.joinConfig.channelId)){
      return "You need to be in the voice call with the bot to give commands!";
    }
    else {
      return null;
    }
  },
  
  /*
  Checks to see if a bot is already in a server
  voice channel. If it isn't, a new queue variable
  is initialized, necessary variables are set,
  and the queue is added to the queue list.
  */
  attemptJoinServer : async function(interaction) {
   // if (!queueList.get(message.guildId)) {
    let returnVal = [data.queueList.get(interaction.guildId), true];
    if (!interaction.member.voice.channelId) {
      interaction.channel.send("User is not in a voice channel");
      return undefined;
    }
    if (!data.queueList.get(interaction.guildId)) {
      try {
        var voiceConnection = joinVoiceChannel({
          channelId: interaction.member.voice.channelId,
          guildId: interaction.guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });
        let newQueue = new Queue();
        data.queueList.set(interaction.guildId, newQueue);
        newQueue.connection = voiceConnection;
        newQueue.player = await module.exports.createPlayer(interaction.guildId, data.queueList);
        voiceConnection.subscribe(newQueue.player);
        newQueue.currentTextChannel = interaction.channel;
      } catch (err) {
        console.log(err);
        interaction.channel.send("Error while joining voice channel")
        return undefined;
      }
      voiceConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (error) {
          // Seems to be a real disconnect which SHOULDN'T be recovered from
          let currentQueue = data.queueList.get(interaction.guildId);
          currentQueue.songs = [];
          currentQueue.connection.destroy();
          currentQueue.connection = null;
          currentQueue.player.pause();
          currentQueue.currentResource = null;
          currentQueue.songImportQueued = false;
          currentQueue.currentSong = null;
          data.queueList.delete(interaction.guildId);
        }
      });



      return [data.queueList.get(interaction.guildId), false];
    } else {
      return returnVal;
    }
    
  },
  
  
  /*
  Searches for a youtube video with the same
  details as the song info from the spotify
  API and adds it to the server's songs list.
  */
    yTubeSearch : async function(searchString, currentQueue) {
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
    //currentQueue.songs.push(song);
    return song;
  },


/*
constructer for player object
*/
createPlayer : async function (guildId, queueList) {
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
      module.exports.play(currentQueue.currentSong, currentQueue.currentTextChannel);
    }
  })
  return player;
},

/*
param: message - the message sent with the play request.
       song - The song to be played
       channel - A possible param if the play was sent
                 as an autoplay after the previous song
                 ended.
The function starts a download of a youtube video as an
mp3 and plays it on the player once done.
*/
 play: async function (song, channel) {
  let currentQueue = data.queueList.get(channel.guildId);
  if (!song) {
    currentQueue.songs = [];
    currentQueue.connection.destroy();
    currentQueue.connection = null;
    currentQueue.player.pause();
    currentQueue.currentResource = null;
    currentQueue.songImportQueued = false;
    currentQueue.currentSong = null;
    data.queueList.delete(channel.guildId);
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





}
