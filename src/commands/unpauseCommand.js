const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('unpause')
		.setDescription('Unpauses the paused song.'),


    async execute(interaction) {
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }
        if (currentQueue.player.state.status !== ('paused' || 'autoPaused')) {
            return await interaction.reply("There is not a song paused right now.");
        } 
        currentQueue.player.unpause();
        return await interaction.reply("Song unpaused.");
    },
};
