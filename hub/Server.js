"use strict";

var net = require ("net");

var Server = function (hub) {
	this.hub         = hub;
	this.servers     = {};
	this.connections = [];
};

/**
 * Server.prototype.listen_all():
 **/
Server.prototype.listen_all = function () {
	var self = this;

	this.hub.config.get ("lic/interfaces", function (interfaces) {
		interfaces.forEach (function (iface) {
			self.listen (iface, function () {}, function (e) {
				console.log ("[WARN] failed to bind to interface `" + iface + "`: " + e.description);
			});
		});
	});
};

/**
 * Server.prototype.listen():
 **/
Server.prototype.listen = function (iface, success, error) {
	var self = this, md, server, tempError;

	if (md = iface.match (/^(unix):(.+)$/) || iface.match(/^(tcp):([^:]+):(\d+)$/)) {
		server = net.createServer ();
	} else {
		return error ({type: "UnknownInterface", description: "I do not know how to bind to the specified interface."});
	}

	server.on ("error", tempError = function (e) {
		server.removeListener ("error", tempError);

		if (e.code === "EADDRINUSE") {
			error ({type: "AddressInUse",     description: "Address/port already in use; can not bind."});
		} else if (e.code === "EACCES") {
			error ({type: "PermissionDenied", description: "The user does not have permission to bind to the specified interface."});
		} else {
			error ({type: "SocketError",      description: "" + e});
		}
	});

	server.on ("listening",  function ()       { self.listening  (iface, server);
	                                             server.removeListener ("error", tempError);
	                                             success         (true); });
	server.on ("error",      function (e)      { self.failure    (iface, e); });
	server.on ("connection", function (socket) { self.connection (iface, socket); });

	if (md[1] === "unix") {
		server.listen (md[2]);
	} else if (md[1] === "tcp") {
		server.listen (parseInt (md[3], 10), md[2]);
	}
};

/**
 * Server.prototype.close():
 * Terminates all connections and closes the port, refusing further connections.
 **/
Server.prototype.close = function () {
	this.connections.forEach (function (socket) {
		socket.end ("z\n");
	});
	this.connections = [];

	for (var s in this.servers) {
		if (!this.servers.hasOwnProperty (s)) continue;

		this.servers[s].close ();
	}
};

Server.prototype.listening = function (iface, server) {
	this.servers[iface] = server;
	console.log ("[INFO] Now listening at %s", iface);
};

Server.prototype.failure = function (iface, e) {
	// TODO: Handle server failure (quite rare once the interfaces are bound)
};

Server.prototype.connection = function(iface, socket) {
	console.log ("[INFO] Client connected on %s", iface);

	this.connections.push (socket);

	socket.on ("data", function (data) {
		socket.write (data);
	});

	socket.on ("close", function () {
		var idx = self.connections.indexOf (socket);
		if (idx > -1) self.connections.splice (idx, 1);
		console.log ("[INFO] Client disconnected on %s", iface);
	});
};

module.exports = Server;
