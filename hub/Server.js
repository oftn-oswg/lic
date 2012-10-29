"use strict";

var net = require ("net");

var dnode = require ("dnode");

var ItemManager_Bridge = require("./ItemManager_Bridge.js");

var Server = function (hub) {
	this.hub = hub;
	this.item_manager = hub.item_manager;
	this.connections = [];

	this.config = {};
	this.un_registers = {};

	this.make_server_dnode();
};

/**
  * Server.prototype.make_server_dnode
  * Makes a dnode instance, that we can call .listen on to listen to ports.
  */
Server.prototype.make_server_dnode = function () {
	var self = this;
	// the function we pass to dnode is called as a constructor and the resulting object is given to the other side
	this.server_dnode = dnode(function(remote, socket) {
		self.un_registers[socket.id] = [];
		self.handle(socket);

		// expose register function, which calls self.hub.register, but with some changes to the callbacks
		// to make sure we store the registrations and can remove them when the client quits.
		// uses self, socket.id, and passes socket to self.handle, but nothing else.
		this.register = function register(name, shutdown_cb, callback) {
			self.hub.register(name, shutdown_cb, function(item_manager, unregister) {
				self.un_registers[socket.id].push(unregister);
				var is_registered = true;

				// change the unregister function to also remove from self.un_registers
				function unregister_client() {
					if (!is_registered) {
						return;
					}
					self.un_registers[socket.id].splice(self.un_registers[socket.id].indexOf(unregister), 1);
					is_registered = false;
					unregister.apply(null, arguments);
				}
				// the hub calls .cleanup when we use the unregister function
				var item_manager_client = item_manager.to_dnode();
				callback(item_manager_client, unregister_client);
			});
		};
	});
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
			var connection = self.server_dnode.listen (config.interfaces[i]);
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
		self.un_registers[socket.id].slice().forEach(function(unreg) {
			unreg();
		});
		self.connections.splice(self.connections.indexOf(socket), 1);
	});
};

module.exports = Server;
