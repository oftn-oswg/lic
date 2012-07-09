/*
 * The User object represents a
 * user in an IRC channel and all h(is|er)
 * associated properties, including:
 *  - Nickname
 *  - Username
 *  - Host
 */

var User = function(nick, op, halfop, voice) {
	this.name = nick;
	this.op = op;
	this.halfop = halfop;
	this.voice = voice;
};

User.is_nick = function(nick) {
	return /^[A-Z\[\\\]\^_`{|}][-0-9A-Z\[\\\]\^_`{|}]{,15}$/i.test(nick);
};

User.parse = function(prefix) {
	var match = prefix.match(/^:?(.*)!(\S+)@(\S+)/);
	if (match) {
		return {
			nick: match[1],
			user: match[2],
			host: match[3]
		};
	} else {
		return null;
	}
};

User.prototype.user = null;
User.prototype.host = null;

User.prototype.include = function(parse) {
	if (parse.user) { this.user = parse.user; }
	if (parse.host) { this.host = parse.host; }
	if (parse.real) { this.real = parse.real; }
};

module.exports = User;
