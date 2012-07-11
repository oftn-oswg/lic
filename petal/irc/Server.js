var User = require ("./User.js");
var Channel = require ("./Channel.js");
var Connection = require ("./Connection.js");
var ChannelList = require ("./ChannelList.js");

var Table = require ("./Table.js");

var Server = function(manager, profile) {
	this.connection = new Connection(profile);
	this.channellist = new ChannelList(this.connection);
	this.name = this.connection.name;

	this.connection.on ("message", function(data) {
		var item = [manager.name, this.name];

		switch (data.command) {
		case "NOTICE":
			if (data.params[0] === this.nickname) {
				var parse = User.parse(data.prefix);
				if (parse) {
					item.push(parse.nick);
				}
			} else if (data.params[0] !== "*") {
				item.push(data.params[0]);
			}
			break;
		case "MODE":
			if (data.params[0] !== this.nickname) {
				item.push(data.params[0]);
			}
			break;
		case "JOIN":
		case "PART":
		case "PRIVMSG":
			item.push(data.params[0]);
			break;
		case "315":
		case "328":
		case "332":
		case "333":
		case "352":
		case "366":
		case "404":
			item.push(data.params[1]);
			break;
		case "353":
			item.push(data.params[2]);
			break;
		}

		manager.item_manager.publish (item, data.command, data);
	});
};

Server.prototype.connect = function() {
	console.log ("Connecting to IRC server `%s`", this.name);
	this.connection.connect();
};

Server.prototype.join = function(channel) {
	this.channellist.join(channel);
};

Server.prototype.part = function(channel, message) {
	this.channellist.part(channel, message);
};

Server.prototype.send = function(message) {
	this.connection.send(message);
};

Server.prototype.say = function(channel, message) {
	channel = String(channel);
	message = String(message);

	this.connection.send("PRIVMSG " + channel + " :" + message);
};

Server.prototype.quit = function(message, callback) {
	this.connection.quit(message, callback);
};

Server.prototype.trace = function(channel) {
	if (Channel.is_channel(channel)) {
		channel = this.channellist.get(channel);
		if (channel.joined) {
			var list = channel.nicklist.list;
			var data = [];
			Object.getOwnPropertyNames(list).forEach(function(nick) {
				var user = list[nick];
				var mode = "";
				if (user.op || user.voice) {
					mode = "+" + (user.op ? "o" : "") + (user.voice ? "v" : "");
				}
				data.push([nick, user.user, user.host, mode, user.real]);
			});
			data.sort(function(a, b) {
				a = a[0].toLowerCase();
				b = b[0].toLowerCase();
				return a < b ? -1 : (a > b ? 1 : 0);
			});
			data.unshift(["Nick", "User", "Host", "Mode", "Real name"]);
			var table = new Table(data);
			table.width = "auto";
			console.log(table.render(150));
		} else {
			console.error("Not joined to channel");
		}
	} else {
		console.error("Server trace expects channel argument");
	}
};

module.exports = Server;
