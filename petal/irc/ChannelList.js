var User = require ("./User.js");
var Channel = require ("./Channel.js");

/*
 * ChannelList is responsible for
 *  - Keeping track of joined channels
 *  - Keeping track of channel nicklists
 *  - Keeping track of channel properties
 */

var ChannelList = function(bundle) {
	var server = bundle.connection, self = this;

	this.channels = {};

	server.on ("JOIN", function(data) {
		var channel, parse, user;

		parse = User.parse(data.prefix);
		channel = self.get(data.params[0]);

		if (parse.nick === this.nickname) {
			channel.joined = false;
			channel.parted = false;
			channel.synced = false;
			channel.nicklist.clear();
		}

		user = channel.nicklist.insert(parse.nick, false, false, false);
		user.include(parse);
	});

	server.on ("PART", function(data) {
		var channel, parse;

		parse = User.parse(data.prefix);
		channel = self.get(data.params[0]);

		if (parse.nick === this.nickname) {
			channel.joined = false;
			channel.parted = true;
			channel.synced = false;
			channel.nicklist.clear();
		} else {
			channel.nicklist.remove(parse.nick);
		}
	});

	server.on ("QUIT", function(data) {
		var parse;

		parse = User.parse(data.prefix);
		Object.keys(self.channels).forEach(function(channel) {
			channel = self.channels[channel];
			if (channel.nicklist.get(parse.nick)) {
				channel.nicklist.remove(parse.nick);
			}
		});
	});

	server.on ("NICK", function(data) {
		var parse;

		parse = User.parse(data.prefix);
		Object.keys(self.channels).forEach(function(channel) {
			channel = self.channels[channel];
			channel.nicklist.rename(parse.nick, data.message);
		});
	});

	server.on ("MODE", function(data) {
		var channel, modes;

		if (Channel.is_channel(data.params[0])) {
			// Parse channel modes
			channel = self.get(data.params[0]);

			modes = Channel.parse_modes(data.params[1], data.params.slice(2), "ov");
			modes.forEach(function(mode) {
				var user;

				user = channel.nicklist.get(mode[1]);
				if (user) {
					switch (mode[0]) {
					case "+o": user.op = true; break;
					case "-o": user.op = false; break;
					case "+v": user.voice = true; break;
					case "-v": user.voice = false; break;
					}
				}
			});

		} else {
			// Parse user modes
		}
		
	});
	
	// Names list
	server.on ("353", function (data) {
		var names, channel;
		
		channel = self.get(data.params[2]);
		names = data.message.split(/\s+/);

		names.forEach(function(name) {
			var nick, op, halfop, voice;

			// Remove non-nick chars as defined:
			// https://git.freenode.net/redmine/projects/ircd-seven/repository/revisions/master/entry/src/match.c
			nick = name.replace (/[^-0-9A-Z\[\\\]\^_`{|}]/gi, "");
			op = name.indexOf ("@") >= 0;
			halfop = name.indexOf ("%") >= 0;
			voice = name.indexOf ("+") >= 0;

			channel.nicklist.insert(nick, op, halfop, voice);
		});
	});

	// End of names list
	server.on ("366", function (data) {
		var channel;

		channel = self.get(data.params[1]);
		channel.joined = true;

		server.send("WHO " + channel.name);
	});

	// No topic
	server.on ("331", function (data) {
		var channel;

		channel = self.get(data.params[1]);
		channel.topic = "";
		channel.topic_by = null;
		channel.topic_time = null;
	});

	// Topic
	server.on ("332", function (data) {
		var channel;

		channel = self.get(data.params[1]);
		channel.topic = data.message;
	});

	server.on ("333", function (data) {
		var channel;

		channel = self.get(data.params[1]);
		channel.topic_by = User.parse(data.params[2]);
		channel.topic_time = Number(data.params[3]);
	});

	server.on ("TOPIC", function (data) {
		var channel;

		channel = self.get(data.params[0]);
		channel.topic = data.message;
		channel.topic_by = User.parse(data.prefix);
		channel.topic_time = Math.floor(Date.now() / 1000);
	});

	// WHO reply
	server.on ("352", function (data) {
		// data.params = [me, channel, user, host, server, nick, <H|G>[*][@|+]]
		// data.message = hopcount + " " + realname
		var channel, user, extra_info;

		if (!Channel.is_channel(data.params[1])) {
			return;
		}

		channel = self.get(data.params[1]);
		user = channel.nicklist.get(data.params[5]);

		if (user) {
			extra_info = {
				user: data.params[2],
				host: data.params[3],
				real: data.message.replace(/^\d+\s+/, "")
			};
			user.include(extra_info);
		}
	});

	// End of WHO list
	server.on ("315", function (data) {
		var channel;

		if (!Channel.is_channel(data.params[1])) {
			return;
		}

		channel = self.get(data.params[1]);
		channel.synced = true;
	});

	this.server = server;
};

ChannelList.prototype.get = function(name) {
	var channel;
	
	channel = this.channels[name];
	if (!channel) {
		channel = this.channels[name] = new Channel(name);
	}

	return channel;
};

ChannelList.prototype.join = function(name) {
	var channel;

	channel = this.get (name);
	if (channel.joined) {
		return;
	}

	this.server.send ("JOIN " + name);
};

ChannelList.prototype.part = function(name) {
	var channel;

	channel = this.get (name);
	if (channel.parted) {
		return;
	}

	this.server.send ("PART " + name);
};

module.exports = ChannelList;
