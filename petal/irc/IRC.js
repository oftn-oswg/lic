var util = require ("util");

var Petal = require ("../lib/Petal.js");

var Connection = require ("./Connection.js");
var ChannelList = require ("./ChannelList.js");

var Manager = function (item_manager) {
	var self = this;

	Petal.call (this, item_manager);

	this.servers = {};

	item_manager.listen ([this.name, "*"], function(item, command) {
		var server, args, method;

		server = item[1];
		args = Array.prototype.slice.call (arguments, 2);

		if (server) {

			if (command === "trace") {
				try {
					var channel = self.servers[server].channellist.channels[args[0]];
					var list = channel.nicklist;
					Object.keys(list.list).forEach(function (nick) {
						var user = list.get(nick);
						if (user) {
							console.log("%s\top:%s\tho:%s\tvc:%s\t%s\t%s\t%s", nick, user.op, user.halfop, user.voice, user.host, user.user, user.real);
						} else {
							console.log(nick);
						}
					});
					console.log ("Topic: %s\nTopic set by %s on %s", channel.topic, channel.topic_by ? channel.topic_by.nick : "NOBODY", String(new Date(channel.topic_time*1000)));
					return;
				} catch (e) {
					console.error (e);
				}
			}

			if (self.servers.hasOwnProperty (server)) {
				method = Connection.prototype[command];
				if (typeof method === "function") {
					method.apply (self.servers[server].connection, args);
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

util.inherits (Manager, Petal);

Manager.prototype.name = "irc";

/* This function takes the server profile from the config and extends
 * it with the defaults from the config.
 */
Manager.prototype.create_profile = function (profile, defaults) {
	return Object.create(defaults, Object.getOwnPropertyNames(profile).reduce(function(desc, prop) {
		desc[prop] = Object.getOwnPropertyDescriptor(profile, prop);
		return desc;
	}, {}));
};

Manager.prototype.connect = function () {
	var self, connection, profile, servers, defaults, bundle;

	self = this;
	servers  = this.config.servers;
	defaults = this.config["default"];

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

				self.item_manager.publish (item, data.command, data);
			});

			connection.connect ();

			bundle = {};
			bundle.connection = connection;
			bundle.channellist = new ChannelList(bundle);

			this.servers[profile.name] = bundle;

		} else {
			console.error ("IRC already has connection called `%s`. Skipping duplicate.", profile.name);
		}
	}
};

Manager.prototype.shutdown = function(callback) {
	var connections, self = this;

	// First we clone the connections array to use as a queue
	connections = Object.getOwnPropertyNames (this.servers);
	console.log ("Waiting for IRC servers to close connections...");

	(function next () {
		var c = connections.shift ();
		if (!c) {
			callback.call (self);
			return;
		}
		self.servers[c].connection.quit (next);
	}());
};

if (require.main === module) {
	Petal.register (Manager);
}

module.exports = Manager;
