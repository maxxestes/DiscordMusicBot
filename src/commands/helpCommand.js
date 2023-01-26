const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays slash commands'),


    async execute(interaction) {
        return await interaction.reply("Type \"/\" and click on Groovy v2 from the options on the left. This brings up all the slash commands");
    },
};
