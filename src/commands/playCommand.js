const { SlashCommandBuilder } = require('discord.js');
const { yTubeSearch, checkValidUser, attemptJoinServer, play  } = require('../helperFunctions');
//const data = require('../musicBotRestSlash.js').getInstance();


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
        let result = await yTubeSearch(searchString);
        if (result === false) {
            return await interaction.reply("Song not found");
        }

        const serverData = await attemptJoinServer(interaction);
        if (!serverData) {
            return await interaction.reply("Error joining voice channel.");
        }

        let validity = checkValidUser(interaction);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }
        
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
    },
};
