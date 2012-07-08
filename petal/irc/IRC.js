var util = require ("util");

var Petal = require ("../lib/Petal.js");
var Connection = require ("./Connection.js");

var IRCManager = function (item_manager) {
	var self = this;

	Petal.call (this, item_manager);

	this.servers = {};

	item_manager.listen ([this.name, "*"], function(item, command) {
		var server, args, method;

		server = item[1];
		args = Array.prototype.slice.call (arguments, 2);

		if (server) {
			if (self.servers.hasOwnProperty (server)) {
				method = Connection.prototype[command];
				if (typeof method === "function") {
					method.apply (self.servers[server], args);
					return true;
				}
			}
		}
		return false;
	});

	item_manager.command (["lic", "config"], "get", ["IRC"], function(error, values) {
		if (error) {
			console.error ("Could not retrieve configuration");
			return;
		}
		self.config = values[0];
		self.connect ();

		console.log ("Retreived configuration");
	});
};

util.inherits (IRCManager, Petal);

IRCManager.prototype.name = "irc";

/* This function takes the server profile from the config and extends
 * it with the defaults from the config so that when the defaults
 * change or the server profile changes, it will updated as such
 */
IRCManager.prototype.create_profile = function (profile, defaults) {
	profile.__proto__ = defaults;
	return profile;
};

IRCManager.prototype.connect = function () {
	var self, connection, profile, servers, defaults;

	self = this;
	servers  = this.config.servers;
	defaults = this.config.default;

	for (var i = 0, len = servers.length; i < len; i++) {

		profile = this.create_profile (servers[i], defaults);

		if (!this.servers.hasOwnProperty (profile.name)) {
			connection = new Connection (profile);

			console.log ("Connecting to IRC server `%s`", connection.name);
			connection.on ("message", function(data) {
				var item = [self.name, this.name];
				if (data.params[0]) {
					item.push (data.params[0]);
				}

				self.item_manager.command (item, data.command, data);
			});

			connection.connect ();

			this.servers[profile.name] = connection;

		} else {
			console.error ("IRC already has connection called `%s`. Skipping duplicate.", profile.name);
		}
	}
};

IRCManager.prototype.shutdown = function(callback) {
	var connections, self = this;

	// First we clone the connections array to use as a queue
	connections = Object.getOwnPropertyNames (this.servers)
	console.log ("Waiting for IRC servers to close connections...");

	(function next () {
		var c = connections.shift ();
		if (!c) {
			callback.call (self);
			return;
		}
		self.servers[c].quit (next);
	}) ();
};

if (require.main === module) {
	Petal.register (IRCManager);
}

module.exports = IRCManager;
