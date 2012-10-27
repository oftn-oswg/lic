"use strict";

var net = require ("net");

var dnode = require ("dnode");

var Server = function (hub) {
	this.hub = hub;
	this.item_manager = hub.item_manager;
	this.connections = [];

	this.config = {};
	this.registered_petals = {};
};

function make_itemmanager_interface(item_manager, client) {
	var res = {};
	client.unsubscriptions = [];
	client.on('end', function() {
		client.unsubscriptions.forEach(function(unsub) {
			unsub();
		})
	})
	res.subscribe = function(item, type, listener, callback) {
		item_manager.subscribe(item, type, listener, function(err, unsub) {
			if (err) {
				if (callback) {
					callback(err);
				}
			} else {
				/* add to unsub list */
				client.unsubscriptions.push(unsub);
				var was_subbed = true;
				if (callback) callback(null, function() {
					/* remove from unsub list */
					if (!was_subbed) return;
					client.unsubscriptions.splice(client.unsubscriptions.indexOf(unsub), 1);
					unsub();
					was_subbed = false;
				})
			}
		});
	};
	["publish", "listen", "command"].forEach(function (each) {
		res[each] = function() {
			item_manager[each].apply(item_manager, arguments);
		};
	})
	return res;
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

		for (var i = 0, len = config.interfaces.length; i < len; i++) {
			var connection = dnode(function(remote, socket) {
				this.item_manager = make_itemmanager_interface(self.item_manager, socket);

				this.register = function(petal) {
					self.hub.register_petal(petal);
					self.registered_petals[socket.id].push(petal);
				}

				self.registered_petals[socket.id] = [];
				self.handle(socket);
			});
			connection.listen (config.interfaces[i]);

			self.connections.push(connection);
		}
	});
};

/**
 * Server.prototype.shutdown():
 * Terminates all connections and closes the port, refusing further connections.
 **/
Server.prototype.shutdown = function (callback) {
	for (var i = 0, len = this.connections.length; i < len; i++) {
		this.connections[i].end ();
	}

	if (callback) {
		callback.call (this);
	}
};

Server.prototype.handle = function(socket) {
	console.log ("Petal connected");
	this.connections.push (socket);
	var self = this;
	socket.on('end', function() {
		// that's ugly.
		self.registered_petals[socket.id].forEach(function(petal) {
			self.hub.unregister_petal(petal);
		})
		self.connections.splice(self.connections.indexOf(socket), 1);
	});
};

module.exports = Server;
