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
			self: function(item) { return manager.list[item[1]]; },
			methods: {
				"send": Server.prototype.send,
				"say": Server.prototype.say,
				"join": Server.prototype.join,
				"part": Server.prototype.part,
				"quit": Server.prototype.quit
			}
		},
		Channel: {
			self: function(item) {
				var server = this.Server.self(item);
				if (!server) {
					return null;
				} else {
					return { server: server, channel: item[2] };
				}
			},
			methods: {
				"join": function() { this.server.join(this.channel); },
				"part": function() { this.server.part(this.channel); },
				"say": function(message) { this.server.say(this.channel, message); }
			}
		},
		User: {
			self: function(item) {
				var server = this.Server.self(item);
				if (!server) {
					return null;
				} else {
					return { server: server, user: item[2] };
				}
			},
			methods: {
				"say": function(message) { this.server.say(this.user, message); }
			}
		}
	};
};

Incoming.prototype.listen = function() {
	var self = this;
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
	}
};


module.exports = Incoming;
