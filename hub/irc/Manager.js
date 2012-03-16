var Connection = require ("./Connection.js");

var IRCManager = function (config) {
	this.config = config;
	this.connections = [];
};

/* This function takes the server profile from the config and extends
 * it with the defaults from the config so that when the defaults
 * change or the server profile changes, it will updated as such
 */
IRCManager.prototype.create_profile = function (profile, defaults) {
	profile.__proto__ = defaults;
	return profile;
};

IRCManager.prototype.connect = function () {
	var connection, profile, servers, defaults;

	servers  = this.config.data.IRC.servers;
	defaults = this.config.data.IRC.default;

	for (var i = 0, len = servers.length; i < len; i++) {

		profile = this.create_profile (servers[i], defaults);
		connection = new Connection (profile);

		///*
		connection.on("raw", function (m) { console.log (m); });
		connection.on("001", function (message) {
			this.raw ("JOIN #oftn");
			var stdin = process.openStdin();
			stdin.on('data', function(chunk) { connection.send ("PRIVMSG #oftn :"+chunk); });
		});
		//*/
	
		console.log ("Connecting to IRC server \"%s\"", connection.name);
		connection.connect ();

		this.connections.push (connection);
	}
};

IRCManager.prototype.disconnect = function(callback) {
	var connections, self = this;

	// First we clone the connections array to use as a queue
	connections = this.connections.slice ();
	console.log ("Waiting for servers to close connections...");

	(function next () {
		var c = connections.shift ();
		if (!c) {
			callback.call (self);
			return;
		}
		c.quit (next);
	}) ();
};

module.exports = IRCManager;
