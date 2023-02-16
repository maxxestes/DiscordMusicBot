const { REST, Routes } = require('discord.js');
const { discClientId, picGuildID, token, puttClientId } = require('../config.json');



// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// and deploy your commands!
(async () => {
	rest.put(Routes.applicationCommands(discClientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
})();