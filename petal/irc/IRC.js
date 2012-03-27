var Connection = require ("./Connection.js");

var IRC = module.exports = function (link, options) {
	var self = this;

	this.name = options.name || "irc";
	this.link = link;
	this.connections = {};

	this.link.register (this.name, function () {

		// Respond to commands on items we own.
		self.link.respond (self.respond.bind (self));

		var config_item = self.link.item ("lic/config/" + self.name);

		// Subscribe to any changes to our config.
		config_item.subscribe ("update", function (e) {
			self.config = e.data;
			e.next ();
		});

		// Grab the current state of the config.
		config_item.invoke ("get", null, function (config) {
			self.config = config;
			self.connect ();
		}, function (error) {
			// TODO: Include some defaults here.
			config_item.invoke ("set", self.config = {});
		});

	}, function (success) {

		self.disconnect (success);

	});
};

/* This function takes the server profile from the config and extends
 * it with the defaults from the config so that when the defaults
 * change or the server profile changes, it will updated as such
 */
IRC.prototype.create_profile = function (name, profile, defaults) {
	profile.__proto__ = {name: name, __proto__: defaults};
	return profile;
};

IRC.prototype.connect = function () {
	var connection, profile, servers, defaults, link = this.link;

	servers  = this.config.servers;
	defaults = this.config.defaults;

	for (var name in servers) {
		if (!servers.hasOwnProperty (name)) continue;

		profile = this.create_profile (name, servers[name], defaults);
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

		connection.on ("001", function (message) {
			if (typeof profile.autojoin === 'object' && profile.autojoin.constructor === Array) {
				profile.autojoin.forEach (function (chan) {
					connection.raw ("JOIN " + chan.replace (/[\r\n ]/g, ""));
				});
			}
		});
	
		console.log ("[" + this.name + "] Connecting to IRC server \"%s\"", connection.name);
		connection.connect ();

		this.connections[connection.name] = connection;
	}
};

IRC.prototype.respond = function (item, command, data, success, error) {
	var itemChannel = item.match (/^[^\/]+\/([^\/]+)\/([^\/]+)$/);

	if (itemChannel && this.connections.hasOwnProperty (itemChannel[1])) {
		if (command.match (/^message$/i)) {
			if (data.toString ().trim ()) {
				this.connections[itemChannel[1]].send ("PRIVMSG " + itemChannel[2].trim() + " :" + data.toString ().trim ());
				success (true);
			} else {
				error ({type: "EmptyMessage", description: "The message is empty. Will not send."});
			}
		} else if (command.match (/^join$/i)) {
			this.connections[itemChannel[1]].send ("JOIN " + itemChannel[2].trim());
			success (true);
		} else if (command.match (/^part$/i)) {
			this.connections[itemChannel[1]].send ("PART " + itemChannel[2].trim());
			success (true);
		} else {
			error ({type: "NotSupported", description: "The requested method is not supported."});
		}
	} else {
		error ({type: "NotFound", description: "The requested item does not exist."});
	}
};

IRC.prototype.disconnect = function (success) {
	var connections, self = this;

	console.log ("[" + this.name + "] Waiting for servers to close connections...");

	connections = [];
	for (var c in this.connections) {
		if (this.connections.hasOwnProperty (c)) connections.push (c);
	}

	(function next () {
		var c = connections.shift ();
		if (!c) {
			// There are no more connections to close.
			self.connections = {};
			success ();
			return;
		}
		self.connections[c].quit (next);
	}) ();
};
