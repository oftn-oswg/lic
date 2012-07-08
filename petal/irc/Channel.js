var User = require ("./User.js");

/*
 * The Channel object represents a
 * channel on an IRC server and all its
 * associated properties, including:
 *  - Name
 *  - Topic
 *  - Topic by
 *  - Topic time
 *  - Nicklist
 *  - Mode
 */

var Nicklist = function() { this.clear(); };
Nicklist.prototype.get = function(nick) { return this.list[nick] || null; };
Nicklist.prototype.insert = function(nick, op, halfop, voice) {
	var user = this.list[nick];
	if (user) {
		user.op = op;
		user.halfop = halfop;
		user.voice = voice;
	} else {
		user = new User(nick, op, halfop, voice);
	}
	return this.list[nick] = user;
};
Nicklist.prototype.clear = function() { this.list = {}; };
Nicklist.prototype.rename = function(nick, change) {
	var user = this.list[nick];
	if (user) {
		this.remove(nick);
		this.list[change] = user;
		user.name = change;
	}
};
Nicklist.prototype.remove = function(nick) { delete this.list[nick]; };
Nicklist.prototype.count = function() { return Object.getOwnPropertyNames(this.list).length; };


var Channel = function(name) {
	this.name = name;
	this.nicklist = new Nicklist();
};

Channel.is_channel = function(name) {
	return "#&!+".indexOf(name.charAt(0)) >= 0;
};

Channel.parse_modes = function(modes, params, param_modes) {
	modes = Array.prototype.slice.call(String(modes));

	return modes.reduce(function(context, ch) {
		switch (ch) {
		case "+": case "-": context.dir = ch; break;
		default:
			if (context.hasOwnProperty("dir")) {
				var block = [context.dir + ch];
				if (param_modes.indexOf(ch) >= 0) {
					block.push(params.shift());
				}
				context.modes.push(block);
			}
		}
		return context;
	}, {modes: []}).modes;
};

Channel.prototype.joined = false;
Channel.prototype.parted = false;
Channel.prototype.synced = false;

Channel.prototype.topic = "";
Channel.prototype.topic_by = null;
Channel.prototype.topic_time = null;

Channel.prototype.mode = null;

module.exports = Channel;
