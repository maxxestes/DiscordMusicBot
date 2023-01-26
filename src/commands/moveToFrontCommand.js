const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('move-to-front')
		.setDescription('Moves the specified song to the front of the queue.')
        .addStringOption(option =>
			option.setName('position-in-queue')
				.setDescription('The position in queue for the song. Use showQueue command to see positions')
				.setRequired(true)),

    async execute(interaction) {
        const songIndex = interaction.options.getString('position-in-queue');
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }

        if (currentQueue.songs.length > 1) {
            
            let index = Number(songIndex);
          
          
          
            if (index > -1 && index < currentQueue.songs.length) { // only splice array when item is found
             let movedSong = currentQueue.songs.splice(index, 1)[0];
             currentQueue.songs.unshift(movedSong); // 2nd parameter means remove one item only
             return await interaction.reply(currentQueue.songs[0].title + " ----is now at the front of the queue");
            }
            else {
                return await interaction.reply("Invalid index.");
            }
        }
        else {
            return await interaction.reply('Only one song in queue');
        }
    },
};
