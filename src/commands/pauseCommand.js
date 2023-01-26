const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pauses the current song in the queue.'),


    async execute(interaction) {
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }

        if (currentQueue.player.state.status !== 'playing') {
            return await interaction.reply("There is not a song playing right now.");
        } 
        currentQueue.player.pause();
        return await interaction.reply("Song paused.");
    },
};
