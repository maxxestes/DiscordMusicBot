const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skips the current song in the queue.'),


    async execute(interaction) {
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }

        

        else if (currentQueue.songs.length == 0) {
            if (currentQueue.player.state.status === 'idle') {
                return await interaction.reply(
                    "There is no song that I could skip.");
            }
            else {
                currentQueue.currentSong = null;
                currentQueue.player.stop();
                return await interaction.reply(
                    "Song skipped, queue empty.");
            }
        }
        else {
          currentQueue.player.stop();
          return await interaction.reply("Song skipped, " + (currentQueue.songs.length - 1) + " songs left in queue.");
        }
    },
};
