var util = require ("util");
var net  = require ("net");
var tls  = require ("tls");

/*
 * A special connection for handling the IRC protocol.
 * It is responsible for:
 *  -- Identifying with the server
 *  -- Handling pings
 *  -- Message throttling
 *
 * For information about the `profile` object,
 * consult the README.
 */

var IRCConnection = function (profile, link) {

	this.profile = profile;
	this.link    = link;

	/* profile.host: The hostname of the IRC server to connect to */
	this.host = profile.host || "localhost";

	/* profile.port: The port in which the server is listening to */
	this.port = profile.port || 6667;

	/* profile.name: The special name used to identify the connection */
	this.name = profile.name || this.host;

	/* profile.nick: The IRC nickname */
	if (typeof profile.nick === "string") {
		this.nickname      = profile.nick;
		this.nickname_alts = [];
	} else {
		this.nickname      = profile.nick[0];
		this.nickname_alts = profile.nick.slice (1);
	}

	/* profile.user: The IRC username */
	this.username   = profile.username || "guest";

	/* profile.realname: The real name used to identify the user */
	this.realname   = profile.realname || "Guest";

	/* profile.password: The IRC password, if any */
	this.password   = profile.password || null;

	/* profile.encoding: The encoding of the stream */
	this.encoding   = profile.encoding || "utf8";

	this.welcomed   = false;
	this.connected  = false;
	this.connection = null;
	this.timeout    = 0;

	/* Flood protection */
	this.message_queue = [];
	this.message_speed = profile.message_speed || 2200; // Time between messages in milliseconds
	this.message_time  = 0; // Time the last message was sent

	this.on ("connect", (function () { this.identify (); }).bind (this));
	this.on ("secureConnect", (function () {
		if (this.connection.authorized) {
			this.emit ("connect");
		} else {
			console.log ("%s: Peer certificate was not signed by specified CA: %s", this.name, this.connection.authorizationError);
			this.connection.end ();
		}
	}).bind (this));

	var buffer = "";
	this.on ("data", (function (chunk) {
		var offset, message;

		buffer += chunk;
		while (buffer) {
			offset = buffer.indexOf ("\r\n");
			if (offset < 0) return;

			message = buffer.substr (0, offset);
			buffer  = buffer.substr (offset + 2);

			this.emit ("raw", message);
		}
	}).bind (this));

	this.on ("raw", (function (message) {
		var data;

		data = this.parse_message (message);
		if (data) {
			//console.log (data);
			this.emit (data.command, data);

			if (data.command === "PRIVMSG") {
				var sender = data.prefix.match (/^[^!]+/)[0];
				this.link.item (this.get_item_name (data)).publish ("message", {sender: sender, body: data.message});
			} else if (data.command === "JOIN" || data.command === "PART") {
				var who = data.prefix.match (/^[^!]+/)[0];
				this.link.item (this.get_item_name (data)).publish (data.command.toLowerCase (), who);
			}
		}
	}).bind (this));

	this.on ("PING", function (data) {
		this.raw ("PONG :" + data.message);
	});

	this.on ("001", function () { this.welcomed = true; }); // Welcome
	this.on ("432", this.nick_alt); // Erroneous nickname
	this.on ("433", this.nick_alt); // Nickname in use
	this.on ("436", this.nick_alt); // Nickname collision
};

util.inherits (IRCConnection, process.EventEmitter);

IRCConnection.prototype.get_item_name = function(data) {
	// TODO: Make this specific to the items representing the channels.
	// For now, we will just return irc/<name>
	return "irc/" + this.name + "/" + data.params[0];
};

IRCConnection.prototype.connect = function() {
	var connection, options, self;

	self = this;
	
	if (this.profile.ssl) {
		this.ssl_load (function (options) {
			connection = tls.connect (this.port, this.host, options);
			setup (connection);
		});
	} else {
		connection = net.createConnection (this.port, this.host);
		setup (connection);
	}

	function setup (connection) {
		connection.setEncoding (this.encoding);
		connection.setTimeout (this.timeout);

		// Node.js version 0.6.12 doesn't have the setKeepAlive function inherited for TLS connections.
		if (connection.setKeepAlive) {
			connection.setKeepAlive (true);
		}

		/* We need to tunnel the events to this IRCConnection object */
		connection.on ("secureConnect", function() { self.emit ("secureConnect"); });
		connection.on ("connect",   function()     { self.emit ("connect"); });
		connection.on ("data",      function(data) { self.emit ("data", data); });
		connection.on ("close",     function(err)  { self.emit ("close", err); });
		connection.on ("error",     function(err)  { self.emit ("error", err); });
		connection.on ("timeout",   function()     { self.emit ("timeout"); });

		self.connection = connection;
	}
};

IRCConnection.prototype.ssl_load = function (callback) {
	var options = {};

	/* TODO: Use asyncronous calls, allow keys/certs
	if (this.profile.ssl_key) {
		options.key = fs.readFileSync (this.profile.ssl_key);
	}

	if (this.profile.ssl_cert) {
		options.cert = fs.readFileSync (this.profile.ssl_cert);
	}
	//*/
	
	callback.call (this, options);
};

/* IRCConnection#quit(message):
 *
 * Ends the connection to the server after sending the quit command,
 * with the specified quit message from the config.
 *
 * We need to wait for the server to close the connection instead
 * of closing it manually or the quit message will not be displayed.
 * We will send the quit message and then set a timeout to end the
 * connection manually.
 */
IRCConnection.prototype.quit = function (callback) {
	var quit_message, self = this;

	quit_message = this.profile.quit_message;

	if (this.connection.readyState !== "open") {
		callback.call (this);
		return;
	}

	// If we didn't receive a 001 command,
	// then we should just end the connection
	if (!this.welcomed) {
		this.connection.end ();
		callback.call (this);
		return;
	}

	this.raw ("QUIT" + (quit_message ? " :" + quit_message : ""));

	this.connection.once ("end", function () {
		callback.call (self);
	});

	setTimeout (function () {
		self.connection.end ();
		callback.call (self);
	}, 10000);
};

IRCConnection.prototype.parse_message = function(incoming) {
	var match = incoming.match (/^(?:(:[^\s]+) )?([^\s]+) (.+)$/);

	var msg, params = match[3].match (/(.*?) ?:(.*)/);
	if (params) {
		// Message segment
		msg = params[2];
		// Params before message
		params = params[1].split (" ");

	} else {
		params = match[3].split  (" ");
	}

	var prefix  = match[1];
	var command = match[2];

/*  // Convert the numeric commands to be actual number types
	var charcode = command.charCodeAt(0);
	if (charcode >= 48 && charcode <= 57 && command.length == 3) {
		command = parseInt (command, 10);
	}
*/

	return {prefix: prefix, command: command, params: params, message: msg};
};

/* IRCConnection#send: Sends a message with flood control */
IRCConnection.prototype.send = function(message) {
	var queue, now;
	
	now = Date.now ();
	queue = this.message_queue;

	/* If the last message was sent early enough... */
	if (this.message_time < (now - this.message_speed)) {
		/* Send it through without queueing it. */
		this.raw (message);
		return;
	}

	this.message_queue.push (message);
	if (this.message_queue.length === 1) this.run_queue ();
};

IRCConnection.prototype.run_queue = function () {
	var now, last, delay, self = this;

	if (!this.message_queue.length) return;

	now = Date.now ();
	last = this.message_time;
	delay = this.message_speed;

	setTimeout (function () {
		var queue;

		queue = self.message_queue;
		self.raw (queue.shift ());
		self.run_queue ();
	}, delay - now + last);
};

/* IRCConnection#raw: Sends a message directly to the server */
IRCConnection.prototype.raw = function (message) {
	if (this.connection.readyState !== "open") {
		return false;
	}
	this.connection.write (message + "\r\n", this.encoding);

	//console.log("\x1b[32m" + message + "\x1b[m");

	this.message_time = Date.now ();
	return true;
};

IRCConnection.prototype.identify = function () {
	this.nick (this.nickname);
	if (this.password) this.pass (this.password);

	this.user (this.username, this.realname);
};

IRCConnection.prototype.nick = function (nick) {
	this.raw ("NICK " + nick);
};

IRCConnection.prototype.pass = function (pass) {
	this.raw ("PASS " + pass);
};

IRCConnection.prototype.user = function (username, realname) {
	this.raw ("USER " + username + " 0 * :" + realname);
};

/* nick_alt:
 * Picks another nickname from the list of alternates
 * or generates a guest nick
 */
IRCConnection.prototype.nick_alt = function () {
	var alts;

	alts = this.nickname_alts;

	if (alts.length) {
		this.nickname = alts.shift ();
	} else {
		// Generate guest nick
		this.nickname = "Guest" + (Math.random() * 9999 | 0);
	}
	this.nick (this.nickname);
};

module.exports = IRCConnection;

/*var c = new IRCConnection ({host: "irc.freenode.net", nick: "oftn-bot2"});
c.on ("raw", function (m) { console.log (m); });

require ('repl').start ().context.c = c;*/
