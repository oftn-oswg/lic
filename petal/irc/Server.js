var User = require ("./User.js");
var Connection = require ("./Connection.js");
var ChannelList = require ("./ChannelList.js");

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
			item.push(data.params[1]);
			break;
		case "353":
			item.push(data.params[2]);
			break;
		}

		manager.item_manager.publish (item, data.command, data.prefix + " " + data.params.join(" ") + " :" + (data.message || ""));
	});
};

Server.prototype.connect = function() {
	console.log ("Connecting to IRC server `%s`", this.name);
	this.connection.connect();
};

Server.prototype.join = function(channel) {
	this.channellist.join(channel);
};

Server.prototype.part = function(channel) {
	this.channellist.part(channel);
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

module.exports = Server;
