const { Events } = require('discord.js');
const request = require("request");
const authOptions = require('../data').authOptions;
let spotifyApi = require('../data').getSpotifyInstance();
const {  refreshSpotifyToken  } = require('../helperFunctions');


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
		request.post(authOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
			  var token = body.access_token;
			  spotifyApi.setAccessToken(token);
			  setInterval(refreshSpotifyToken, 1000 * 60 * 50);
			}
		});
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};