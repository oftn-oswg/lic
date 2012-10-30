/*var connect = require('connect');
var dnode = require('dnode');
var shoe = require('shoe');
var ecstatic = require('ecstatic');
var browserify = require('browserify');

var server = connect.createServer();

server.use(browserify(__dirname + '/js/entry.js'));
server.use(ecstatic(__dirname));
var sock = shoe(function (stream) {
    var d = dnode({
        transform : function (s, cb) {
            var res = s.replace(/[aeiou]{2,}/, 'oo').toUpperCase();
            cb(res);
        }
    });
    d.pipe(stream).pipe(d);
});


var server_conn = server.listen(9797); 
sock.install(server_conn, '/dnode');
*/


"use strict";

var util      = require ("util");

var Petal     = require ("../lib/Petal.js");

var Web_Server = require ("./Server.js");


var WebInterface = function (item_manager, hub_interface) {
	Petal.apply (this, arguments);

	this.config = null;
	this.servers = [];

	var self = this;

	item_manager.command (["lic", "config"], "get", ["web"], function(error, values) {
		if (error) {
			console.error ("Could not retrieve configuration");
			return;
		}
		self.config = values[0];
		self.listen ();
	});

	this.hub_interface = hub_interface;
};

util.inherits (WebInterface, Petal);

WebInterface.prototype.name = "webinterface";

module.exports = WebInterface;

WebInterface.prototype.listen = function() {
	var self, interfaces;

	self = this;
	interfaces  = this.config.interfaces;

	interfaces.forEach(function(iface) {
		console.log('listening on', iface);
		var s = new Web_Server(iface, self.hub_interface);
		self.servers.push(s);
		s.listen();
	});
};

WebInterface.prototype.shutdown = function(cb) {
	var exit = cb || function() {};
	var num = this.servers.length;
	if (num === 0) {
		exit();
	}
	this.servers.slice().forEach(function(server) {
		server.shutdown(function() {
			num--;
			if (num === 0) {
				exit();
			}
		});
	});
};
