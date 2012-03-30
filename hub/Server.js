"use strict";

var net = require ("net");

var Server = function (item_manager) {
	this.item_manager = item_manager;
	this.connections = [];

	this.config = {};
};

/**
 * Server.prototype.listen():
 * Opens the port and starts listening for connections.
 **/
Server.prototype.listen = function () {
	var self = this;

	this.server = net.createServer ();

	this.server.on ("connection", function(socket) { self.connection (socket); });
	this.server.on ("listening", function() { self.listening (); });

	this.item_manager.command (["lic", "config"], "get", ["Core.socket"], function(error, values) {
		if (error) {
			console.error ("Could not retrieve configuration");
			return;
		}
		self.config.socket = values[0];
		self.server.listen (self.config.socket);
	});
};

/**
 * Server.prototype.close():
 * Terminates all connections and closes the port, refusing further connections.
 **/
Server.prototype.close = function () {
	this.connections.forEach (function (socket) {
		socket.end (); // TODO: Send proper notification of shutdown.
	});
	this.connections = [];

	this.server.close ();
};

Server.prototype.listening = function() {
	console.log ("Now listening at %s", this.config.socket);
};

Server.prototype.connection = function(socket) {
	// TODO: Maintain a persistent connection.
	console.log ("Petal connected");
	socket.end  ("Hello.\nGoodbye.\n");
};

module.exports = Server;
