var util = require ("util");
var net  = require ("net");
var tls  = require ("tls");

var User = require ("./User.js");

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

var Connection = function (profile) {

	this.profile = profile;

	/* profile.host: The hostname of the IRC server to connect to */
	this.host = profile.host || "localhost";

	/* profile.port: The port in which the server is listening to */
	this.port = profile.port || 6667;

	/* profile.name: The special name used to identify the connection */
	this.name = profile.name || this.host;

	/* profile.nick: The IRC nickname */
	if (typeof profile.nick === "string") {
		this.nickname      = profile.nick;
		this.nickname_alts = [profile.nick];
	} else {
		this.nickname      = profile.nick[0];
		this.nickname_alts = profile.nick;
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

	this.on ("connect", function () { this.identify (); });
	this.on ("secureConnect", function () {
		if (this.connection.authorized) {
			this.emit ("connect");
		} else {
			console.log ("%s: Peer certificate was not signed by specified CA: %s", this.name, this.connection.authorizationError);
			this.connection.end ();
		}
	});

	var buffer = "";
	this.on ("data", function (chunk) {
		var offset, message;

		buffer += chunk;
		while (buffer) {
			offset = buffer.indexOf ("\r\n");
			if (offset < 0) {
				return;
			}

			message = buffer.substr (0, offset);
			buffer  = buffer.substr (offset + 2);

			this.emit ("raw", message);
		}
	});

	this.on ("raw", function (message) {
		var data;

		data = this.parse_message (message);
		if (data) {
			this.emit ("message", data);
			this.emit (data.command, data);
		}
	});

	this.on ("PING", function (data) {
		this.raw ("PONG :" + data.params[0]);
	});

	this.on ("001", function () { this.welcomed = true; }); // Welcome

	this.on ("NICK", function (data) {
		var parse;

		parse = User.parse (data.prefix);
		if (parse.nick === this.nickname) {
			this.nickname = data.params[0];
		}
	});
};

util.inherits (Connection, process.EventEmitter);

Connection.prototype.get_item_name = function(data) {
	// TODO: Make this specific to the items representing the channels.
	// For now, we will just return irc/<name>
	var item = ["irc", this.name];
	
	if (data.params[0] && data.params[0] !== "*") {
		item.push (data.params[0]);
	}

	return item;
};

Connection.prototype.connect = function() {
	var connection, self = this;

	function setup (connection) {
		connection.setEncoding (this.encoding);
		connection.setTimeout (this.timeout);

		// Node.js version 0.6.12 doesn't have the setKeepAlive function inherited for TLS connections.
		if (connection.setKeepAlive) {
			connection.setKeepAlive (true);
		}

		/* We need to tunnel the events to this Connection object */
		connection.on ("secureConnect", function() { self.emit ("secureConnect"); });
		connection.on ("connect",   function()     { self.emit ("connect"); });
		connection.on ("data",      function(data) { self.emit ("data", data); });
		connection.on ("close",     function(err)  { self.emit ("close", err); });
		connection.on ("error",     function()     { self.emit ("error"); });
		connection.on ("timeout",   function()     { self.emit ("timeout"); });

		self.connection = connection;
	}

	if (this.profile.ssl) {
		this.ssl_load (function (options) {
			connection = tls.connect (this.port, this.host, options);
			setup (connection);
		});
	} else {
		connection = net.createConnection (this.port, this.host);
		setup (connection);
	}
};

Connection.prototype.ssl_load = function (callback) {
	var options = {};

	/* TODO: Use asyncronous calls, allow keys/certs
	if (this.profile.ssl_key) {
		options.key = fs.readFileSync (this.profile.ssl_key);
	}

	if (this.profile.ssl_cert) {
		options.cert = fs.readFileSync (this.profile.ssl_cert);
	}
	*/
	
	callback.call (this, options);
};

/* Connection#quit(message):
 *
 * Ends the connection to the server after sending the quit command,
 * with the specified quit message from the config.
 *
 * We need to wait for the server to close the connection instead
 * of closing it manually or the quit message will not be displayed.
 * We will send the quit message and then set a timeout to end the
 * connection manually.
 */
Connection.prototype.quit = function (quit_message, callback) {
	var self = this;

	if (!quit_message) {
		quit_message = this.profile.quit_message;
	}

	if (!this.connection || this.connection.readyState !== "open") {
		if (callback) {
			callback.call (this);
		}
		return;
	}

	// If we didn't receive a 001 command,
	// then we should just end the connection
	if (!this.welcomed) {
		this.connection.end ();
		if (callback) {
			callback.call (this);
		}
		return;
	}

	this.send ("QUIT" + (quit_message ? " :" + quit_message : " :Client Quit"));

	this.connection.once ("end", function () {
		if (callback) {
			callback.call (self);
		}
	});

	setTimeout (function () {
		self.connection.end ();
		if (callback) {
			callback.call (self);
		}
	}, 10000);
};

Connection.prototype.parse_message = function(incoming) {
	var parse, match;

	parse = {};
	match = incoming.match(/^(?::(\S+)\s+)?(\S+)((?:\s+[^:]\S*)*)(?:\s+:(.*))?$/);

	if (match) {
		parse.command = match[2];
		parse.params = match[3].match(/\S+/g) || [];

		if (match[1] != null) {
			parse.prefix = match[1];
		}
		if (match[4] != null) {
			parse.params.push(match[4]);
		}
	}

	return parse;
};

/* Connection#send: Sends a message with flood control */
Connection.prototype.send = function(message) {
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
	if (this.message_queue.length === 1) {
		this.run_queue ();
	}
};

Connection.prototype.run_queue = function () {
	var now, last, delay, self = this;

	if (!this.message_queue.length) {
		return;
	}

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

/* Connection#raw: Sends a message directly to the server */
Connection.prototype.raw = function (message) {
	if (this.connection.readyState !== "open") {
		return false;
	}
	this.connection.write (message + "\r\n", this.encoding);

	console.log("\x1b[32m" + message + "\x1b[m");

	this.message_time = Date.now ();
	return true;
};

Connection.prototype.identify = function () {
	/**
	 * Picks another nickname from the list of alternates
	 * or generates a guest nick
	 **/
	var alts = this.nickname_alts, nickindex = 0;
	function nick_alt (data) {
		var nick;
		if (this.welcomed) {
			return;
		}

		// We have specified alternate nicknames
		nickindex++;
		if (alts[nickindex]) {
			nick = alts[nickindex];
		} else {
			// Generate guest nick randomly
			nick = "Guest" + Math.floor(Math.random() * 9999);
		}

		this.nick (nick);
		this.nickname = nick;
	}

	if (this.password) {
		this.pass (this.password);
	}
	this.nick (this.nickname);
	this.user (this.username, this.realname);

	this.on ("432", nick_alt); // Erroneous nickname
	this.on ("433", nick_alt); // Nickname in use
	this.on ("436", nick_alt); // Nickname collision
};

Connection.prototype.nick = function (nick) {
	this.send ("NICK " + nick);
};

Connection.prototype.pass = function (pass) {
	this.send ("PASS " + pass);
};

Connection.prototype.user = function (username, realname) {
	this.send ("USER " + username + " 0 * :" + realname);
};


module.exports = Connection;

/*var c = new Connection ({host: "irc.freenode.net", nick: "oftn-bot2"});
c.on ("raw", function (m) { console.log (m); });

require ('repl').start ().context.c = c;*/
