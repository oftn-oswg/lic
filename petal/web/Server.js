"use strict";

var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var http = require('http');

var connect = require('connect');
var dnode = require('dnode');
var shoe = require('shoe');
var ecstatic = require('ecstatic');
var browserify = require('browserify');


// todo: document
// todo: code duplication with Hub#Server.

function Server(interface_profile, hub_interface) {
	EventEmitter.call(this);

	this.interface_profile = interface_profile;

	if (!Array.isArray(this.interface_profile.listen)) {
		this.interface_profile.listen = [this.interface_profile.listen];
	}

	this.app = null;
	this.net_server = null;
	this.sock = null;

	this.connections = [];
	this.hub_interface = hub_interface;

	this.createServer(this.interface_profile.static, this.interface_profile.js);
	this.make_sock();
};

util.inherits(Server, EventEmitter);

module.exports = Server;

Server.prototype.createServer = function(static_dir, browserify_entry) {
	this.app = connect();
	this.app.use(browserify(path.join(__dirname, browserify_entry)));
	this.app.use(ecstatic(path.join(__dirname, static_dir)));
};

function make_dnode(self, socket) {
	var unregisters = [];

	// handle needs unregisters, so we can't do this from shoe(function(){...})
	self.handle(unregisters, socket);

	socket.shutdown_needed = 0;

	// the function we pass to dnode is called as a constructor and the resulting object is given to the other side
	return dnode(function(remote) {
		// expose register function, which calls self.hub.register, but with some changes to the callbacks
		// to make sure we store the registrations and can remove them when the client quits.
		// uses self, socket.id, and passes socket to self.handle, but nothing else.
		this.register = function register(name, shutdown_cb, callback) {
			// the shutdown logic is *very* ugly, but the server shutdown will kill our connections
			// before all the callbacks had a chance, otherwise. A better solution needs to be found
			// for this.
			function shutdown_server(cb) {
				shutdown_cb(function(client_cb) {
					cb();
					socket.shutdown_needed--;
					if (socket.shutdown_needed == 0) {
						socket.emit('petals_shutdown');
					}
				});
			}
			self.hub_interface.register(name, shutdown_server, function(item_manager, unregister) {
				socket.shutdown_needed++;
				unregisters.push(unregister);
				var is_registered = true;

				// change the unregister function to also remove from self.un_registers
				function unregister_client() {
					if (!is_registered) {
						return;
					}
					unregisters.splice(unregisters.indexOf(unregister), 1);
					is_registered = false;
					unregister.apply(null, arguments);
				}
				// the hub calls .cleanup when we use the unregister function
				var item_manager_client = item_manager.to_dnode ? item_manager.to_dnode() : item_manager;
				callback(item_manager_client, unregister_client);
			});
		};
	});
	
}

Server.prototype.make_sock = function() {
	var self = this;
	this.sock = shoe(function (stream) {
		var d = make_dnode(self, stream);

		d.pipe(stream).pipe(d);
	});
};

Server.prototype.handle = function(unregisters, socket) {
	console.log ("Petal connected");
	this.connections.push (socket);
	var self = this;
	socket.on('end', function() {
		console.log ("Petal disconnected");
		// that's ugly.
		unregisters.slice().forEach(function(unreg) {
			unreg();
		});
		self.connections.splice(self.connections.indexOf(socket), 1);
	});
}

Server.prototype.listen = function() {
	this.net_server = http.createServer(this.app);
	this.sock.install(this.net_server, '/dnode');
	this.net_server.listen.apply(this.net_server, this.interface_profile.listen);
};


// this will work eventually
// but it won't do so any time soon, because http keepalive hates you.
Server.prototype.shutdown = function (callback) {
	// we need to copy it, because .end() might fire up the .on('end') callback, removing it from the array
	var self = this;
	var connections_copy = this.connections.slice();

	var exited = false;
	function exit() {
		if (exited) {
			return;
		}
		exited = true;
		self.net_server.close(function() {

		})
		if (callback) {
			callback();
		}
	}

	function on_stream_end() {
		num--;
		if (num <= 0) {
			exit();
		}
	}

	var num = connections_copy.length;

	if (num === 0) {
		exit();
	}

	for (var i = 0, len = connections_copy.length; i < len; i++) {
		var conn = connections_copy[i];
		conn.once('end', on_stream_end);
		if (conn.shutdown_needed) {
			conn.once('petals_shutdown', function() {
				conn.end ();
			});
		} else {
			conn.end ();
		}
	}

};