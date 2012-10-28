"use strict";

var net = require ("net");

var dnode = require ("dnode");

var ItemManager_Bridge = require("./ItemManager_Bridge.js");

var Server = function (hub) {
	this.hub = hub;
	this.item_manager = hub.item_manager;
	this.connections = [];

	this.config = {};
	this.registered_petals = {};
};

function make_itemmanager_interface(item_manager, client) {
	var bridge = new ItemManager_Bridge(item_manager);
	client.on('end', function() {
		bridge.cleanup();
	});
	return bridge.to_dnode();
}

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

		var server_node = dnode(function(remote, socket) {
			this.item_manager = make_itemmanager_interface(self.item_manager, socket);

			this.register = function(petal, callback) {
				self.hub.register_petal(petal);
				self.registered_petals[socket.id].push(petal);
				if (callback) {
					callback(function unregister_petal(callback) {
						self.registered_petals[socket.id].splice(self.registered_petals[socket.id].indexOf(petal), 1);
						self.hub.unregister_petal(petal);
						if (callback) {
							callback();
						}
					});
				}
			};

			self.registered_petals[socket.id] = [];
			self.handle(socket);
		});
		for (var i = 0, len = config.interfaces.length; i < len; i++) {
			var connection = server_node.listen (config.interfaces[i]);

			self.connections.push(connection);
		}
	});
};

/**
 * Server.prototype.shutdown():
 * Terminates all connections and closes the port, refusing further connections.
 **/
Server.prototype.shutdown = function (callback) {
	// we need to copy it, because .end() might fire up the .on('end') callback, removing it from the array
	var connections_copy = this.connections.slice();

	function exit() {
		if (callback) {
			callback();
		}
	}

	function on_stream_end() {
		num--;
		if (num === 0) {
			exit();
		}
	}

	var num = connections_copy.length;

	if (num === 0) {
		exit();
	}

	for (var i = 0, len = connections_copy.length; i < len; i++) {
		var conn = connections_copy[i];
		if (conn.close) {
			conn.close(on_stream_end);
		} else {
			conn.once('end', on_stream_end);
			conn.end ();
		}
	}

};

Server.prototype.handle = function(socket) {
	console.log ("Petal connected");
	this.connections.push (socket);
	var self = this;
	socket.on('end', function() {
		console.log ("Petal disconnected");
		// that's ugly.
		self.registered_petals[socket.id].forEach(function(petal) {
			self.hub.unregister_petal(petal);
		});
		self.connections.splice(self.connections.indexOf(socket), 1);
	});
};

module.exports = Server;
