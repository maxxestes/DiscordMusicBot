const { SlashCommandBuilder } = require('discord.js');
const {  checkValidUser  } = require('../helperFunctions');
const data = require('../data').getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-queue')
		.setDescription('Prints the current queue with position numbers.'),


    async execute(interaction) {
        let validity = checkValidUser(interaction);
        let currentQueue = data.queueList.get(interaction.guildId);
  
        if (validity !== null) {
            return await interaction.reply(validity);
        }

        if (currentQueue.songs.length > 0) {
            let songList = [];
            const characterLimit = 2000;
            let currentMessage = 0;
            currentQueue.songs.forEach((element, index) => {
              if ((songList[currentMessage] + (`${element.title}--------index: ${index}\n`)).length > characterLimit) {
                currentMessage += 1;
              }
              if (songList[currentMessage] !== undefined) {
                songList[currentMessage] = songList[currentMessage] + (`${element.title}--------index: ${index}\n`);
              }
              else {
                songList[currentMessage] = (`${element.title}--------index: ${index}\n`);
              }
              
            });
            interaction.channel.send("Current song: " + currentQueue.currentSong.title);
            songList.forEach(element => {
                interaction.channel.send(element);
            });
            return await interaction.reply("Queue sent.");
        }
        else {
        return await interaction.reply("The queue is empty");
        }
    },
};
