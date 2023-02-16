const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Deletes the queue and stops the current song.'),


    async execute(interaction) {
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }
        else if (currentQueue.songs.length == 0 && !currentQueue.currentSong) {
            return await interaction.reply("There is no queue to stop.");
        }
        else {
            currentQueue.songs = [];
            currentQueue.connection.destroy();
            currentQueue.connection = null;
            currentQueue.player.pause();
            currentQueue.currentResource = null;
            currentQueue.songImportQueued = false;
            currentQueue.currentSong = null;
            data.queueList.delete(interaction.guildId);
            
            return await interaction.reply("Queue deleted");
        }
    },
};
