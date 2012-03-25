var Connection = require ("./Connection.js");

var IRC = module.exports = function (link, name) {
	var self = this;

	this.name = name || "irc";
	this.link = link;
	this.connections = [];

	this.link.register (this.name, function () {

		// Respond to commands on items we own.
		self.link.provide (self.name, function (item, sender, command, args) {
			self.respond (item, sender, command, args);
		});

		var config_item = self.link.item ("lic/config/" + self.name);

		// Subscribe to any changes to our config.
		config_item.subscribe ("update", function (e) {
			self.config = e.data;
			e.next ();
		});

		// Grab the current state of the config.
		config_item.invoke ("get", null, function (config) {
			self.config = config;
		}, function (error) {
			// TODO: Include some defaults here.
			config_item.invoke ("set", self.config = {});
		});

		self.connect ();

	}, function (success) {

		self.disconnect (success);

	});
};

/* This function takes the server profile from the config and extends
 * it with the defaults from the config so that when the defaults
 * change or the server profile changes, it will updated as such
 */
IRC.prototype.create_profile = function (profile, defaults) {
	profile.__proto__ = defaults;
	return profile;
};

IRC.prototype.connect = function () {
	var connection, profile, servers, defaults;

	servers  = this.config.servers;
	defaults = this.config.default;

	for (var i = 0, len = servers.length; i < len; i++) {

		profile = this.create_profile (servers[i], defaults);
		connection = new Connection (profile, this.link);

		/* The following section is a massive hack, used temporarily as a testing interface.
		connection.on("001", function (message) {
			this.raw ("JOIN #oftn");
			var rl = require("readline");
			var i = rl.createInterface(process.stdin, process.stdout, null);
			i.on("line", function(line) {
				connection.send ("PRIVMSG #oftn :" + line.trim());
				doprmpt();
			});
			doprmpt();
			function doprmpt() {
				i.setPrompt ("<"+connection.nickname+"> ", connection.nickname.length + 3);
				i.prompt ();
			}
		});
		*/
	
		console.log ("[" + this.name + "] Connecting to IRC server \"%s\"", connection.name);
		connection.connect ();

		this.connections.push (connection);
	}
};

IRC.prototype.respond = function (item, sender, command, args) {
	// TODO: Respond to MESSAGE, JOIN, and PART commands.
	sender.error ({type: "NotSupported", description: "The requested method is not supported."});
};

IRC.prototype.disconnect = function (success) {
	var connections, self = this;

	// First we clone the connections array to use as a queue
	connections = this.connections.slice ();
	console.log ("[" + this.name + "] Waiting for servers to close connections...");

	(function next () {
		var c = connections.shift ();
		if (!c) {
			// There are no more connections to close.
			success ();
			return;
		}
		c.quit (next);
	}) ();
};
