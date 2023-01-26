const { SlashCommandBuilder } = require('discord.js');
const { checkValidUser, attemptJoinServer, play  } = require('../helperFunctions');
const { Worker } = require('worker_threads');
var spotifyApi = require('../data').getSpotifyInstance();



module.exports = {
	data: new SlashCommandBuilder()
		.setName('play-spotify')
		.setDescription('Takes a Spotify playlist link and adds all the songs to the queue')
        .addStringOption(option =>
			option.setName('link')
				.setDescription('Spotify playlist link')
				.setRequired(true)),


    async execute(interaction) {     




      const searchString = interaction.options.getString('link');

      if (searchString.includes('spotify.com')) {
          var playlistId = searchString.substring(
            searchString.indexOf("list/") + 5, 
            searchString.lastIndexOf("?")
          );
      } else {
          return await interaction.reply("Not a Spotify playlist link.");
      }

      try {
          var data = await spotifyApi.getPlaylist(playlistId);
      }
      catch(err) {
          return await interaction.reply('Must be a valid Spotify playlist link');
      }


      const serverData = await attemptJoinServer(interaction);

      if (!serverData) {
        return await interaction.reply("Error joining voice channel.");
      }

      let validity = checkValidUser(interaction);
  
      if (validity !== null) {
          return await interaction.reply(validity);
      }

      let currentQueue = (serverData[0]);
      currentQueue.songImportQueued = true;
      let songAndArtistList = [];
      await Promise.all(data.body.tracks.items.map((element) => {
        let songAndArtist = element.track.name + " " + element.track.artists[0].name;
        songAndArtistList.push(songAndArtist);
      }));
      
      
      await interaction.reply("Playlist import started");
      const worker = new Worker('./Worker.js', {
        workerData: {
          value: songAndArtistList,
          path: './Worker.js'
        }
      });

      worker.on('message', async (result) => {
          await interaction.channel.send("Playlist imported");
          for (const song of result) {
            currentQueue.songs.push(song);
          }
          if (currentQueue.player.state.status === 'idle') {
            currentQueue.currentSong = currentQueue.songs.shift();
            play(currentQueue.currentSong, interaction.channel);
          }
          songImportQueued = false;
      });
      worker.on('exit', (code) => {
        if (code !== 0)
          console.log(new Error(`Worker stopped with exit code ${code}`));
      });
    },
};