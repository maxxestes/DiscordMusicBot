const { Events } = require('discord.js');
const open = require('open');
const app = require('../data').getExpressInstance();


/*
starts listening to the redirect
URI specified in the Spotify dev
portal to get the auth and refresh
tokens needed to use the Spotify API.
*/
module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		app.listen(8888);
		await open('http://localhost:8888/login');
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};