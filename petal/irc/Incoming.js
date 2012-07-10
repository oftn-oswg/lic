var Manager = require ("./IRC.js");

var Channel = require ("./Channel.js");
var Server = require ("./Server.js");


var Incoming = function(manager) {
	this.manager = manager;

	this.map = {
		Manager: {
			self: manager,
			methods: {
				"shutdown": manager.shutdown
			}
		},
		Server: {
			self: function(item) { var bundle = manager.list[item[1]]; return bundle ? bundle.server : null; },
			methods: {
				"send": Server.prototype.send,
				"send_to": Server.prototype.send_to,
				"join": Server.prototype.join,
				"part": Server.prototype.part,
				"quit": Server.prototype.quit
			}
		},
		Channel: {
			self: function(item) {
				var server = this.Server.self(item);
				if (!server) return null;
				return { server: server, channel: item[2] }
			},
			methods: {
				"join": function() { this.server.join(this.channel); },
				"part": function() { this.server.part(this.channel); },
				"send": function(message) { this.server.send_to(this.channel, message); }
			}
		},
		User: {
			self: function(item) {
				var server = this.Server.self(item);
				if (!server) return null;
				return { server: server, user: item[2] };
			},
			methods: {
				"send": function(message) { this.server.send_to(this.user, message); }
			}
		}
	};
};

Incoming.prototype.listen = function() {
	var self = this;
	var manager = this.manager;

	return function(item, command) {

		var instance, method, object, args;

		object = self.get_object(item);
		if (object) {
			instance = object.self;
			if (typeof instance === "function") {
				instance = instance.call(self.map, item);
				if (!instance) {
					return;
				}
			}

			method = object.methods[command];
			if (method) {
				args = Array.prototype.slice.call(arguments, 2);
				method.apply(instance, args);
			}
		}
	};

	/*


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
	*/

};

Incoming.prototype.get_object = function(item) {
	switch (item.length) {
	case 0:
		return null;
	case 1:
		return this.map.Manager;
	case 2:
		// Server
		return this.map.Server;
	case 3:
		// Channel/user
		if (Channel.is_channel(item[2])) {
			return this.map.Channel;
		} else {
			return this.map.User;
		}
	};
};


module.exports = Incoming;
