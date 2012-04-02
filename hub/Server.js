"use strict";

var net = require ("net");

var Server = function (hub) {
	this.hub = hub;
	this.item_manager = hub.item_manager;
	this.connections = [];

	this.config = {};
};

/**
 * Server.prototype.listen():
 * Opens the port and starts listening for connections.
 **/
Server.prototype.listen = function () {
	var self, config;
	
	self = this;
	config = this.config;

	this.item_manager.command (["lic", "config"], "get", "Core.interfaces", function(error, values) {
		if (error || values[0] == null) {
			return;
		}

		if (typeof values[0] === "string") {
			config.interfaces = [values[0]];
		} else {
			config.interfaces = values[0];
		}

		for (var i = 0, len = config.interfaces.length; i < len; i++) {
			var connection = net.createServer ();
			connection.on ("connection", self.handle);
			connection.listen (config.interfaces[i]);

			self.connections.push (connection);
		}
	});
};

/**
 * Server.prototype.shutdown():
 * Terminates all connections and closes the port, refusing further connections.
 **/
Server.prototype.shutdown = function (callback) {
	for (var i = 0, len = this.connections.length; i < len; i++) {
		this.connections[i].close ();
	}

	if (callback) {
		callback.call (this);
	}
};

Server.prototype.handle = function(socket) {
	// TODO: Maintain a persistent connection.
	console.log ("Petal connected");
	socket.end  ("Hello.\nGoodbye.\n");
};

module.exports = Server;
