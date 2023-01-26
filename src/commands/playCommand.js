const { SlashCommandBuilder } = require('discord.js');
const { checkValidUser, attemptJoinServer, play  } = require('../helperFunctions');
const { Worker } = require('worker_threads');
const queueData = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Searches YouTube for a song matching the input and either plays or puts it into the queue')
        .addStringOption(option =>
			option.setName('song')
				.setDescription('Song to look up')
				.setRequired(true)),


    async execute(interaction) {     


        const searchString = interaction.options.getString('song');





        const serverData = await attemptJoinServer(interaction);
        if (!serverData) {
            return await interaction.reply("Error joining voice channel.");
        }

        let validity = checkValidUser(interaction);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }

        //let result = await yTubeSearch(searchString);
        //if (result === false) {
         //   return await interaction.reply("Song not found");
        //}

        let currentQueue = (serverData[0]);
        currentQueue.songImportQueued = true;
        let songAndArtistList = [];
        songAndArtistList.push(searchString);
        
        
        const worker = new Worker('./Worker.js', {
          workerData: {
            value: songAndArtistList,
            path: './Worker.js'
          }
        });
  
        worker.on('message', async (result) => {
            let currentQueue = queueData.queueList.get(interaction.guildId);
            if (!currentQueue) {
              return console.log("import finished but bot is not in server.");
            }
            if (result.length > 0) {
                for (const song of result) {
                    await interaction.reply("Song added to queue: " + song.title);
                    currentQueue.songs.push(song);
                  }
            }
            else {
                await interaction.reply("Could not find " + searchString);
            }
            if (currentQueue.player.state.status === 'idle') {
              currentQueue.currentSong = currentQueue.songs.shift();
              play(currentQueue.currentSong, interaction.channel);
            }
            currentQueue.songImportQueued = false;
        });
        worker.on('exit', (code) => {
          if (code !== 0)
            console.log(new Error(`Worker stopped with exit code ${code}`));
        });





        /*
        if (!(serverData[1])) {            
            serverData[0]
            .songs.push(result);
            await interaction.reply("Search result was: " + serverData[0].songs[0].title);
            serverData[0].currentSong = serverData[0].songs.shift();
            play(serverData[0].currentSong, serverData[0].currentTextChannel);
        } else {
            serverData[0]
            .songs.push(result);
            await interaction.reply("Song added to queue: " + serverData[0].songs[0].title);
        }
        */
    },
};
