"use strict";

var net = require ("net");
var util = require ("util");

var FileUtils = require ("./FileUtils.js");
var HubConfig = require ("./HubConfig.js");
var IRCManager = require ("./IRCManager.js");

var Hub = {};
Hub.managers = [];

/**
 * Hub.init():
 * This is the main entry-point for the hub.
 *
 * It starts by loading the config file.
 **/
Hub.init = function() {

	this.load_config (function(config) {
		this.config = config;
		this.start_server ();
		this.start_chat ();
	});

};


/**
 * Hub.load_config():
 * This will scan directories for the config file and load it into memory.
 * The callback function will be called with the configuration data.
 **/
Hub.load_config = function(callback) {
	var config, locations, self = this;

	// TODO: Non Windows-friendly URL
	locations = [
		FileUtils.get_home_dir() + "/.diaptoval/config.json",
		"/etc/diaptoval/config.json"
	];

	config = new HubConfig (locations);
	config.load (callback, this);
};

/**
 * Hub.start_server():
 * This opens up a local socket and applies listeners.
 **/
Hub.start_server = function() {
	var server, self = this;

	console.log ("Starting up hub server");
	server = net.createServer ();
	server.listen(this.config.data.Core.socket);

	server.on ("connection", function(socket) { self.connection (socket); });
	server.on ("listening", function() { self.listening (); });

	this.server = server;
};

Hub.listening = function() {
	console.log ("Now listening at %s", this.config.data.Core.socket);
};

Hub.connection = function(socket) {
	console.log ("Petal connected");
	socket.end ("Hello.\nGoodbye.\n");
};

Hub.shutdown = function() {

	console.log ("Shutting down");

	// Close petal connections
	this.server.close ();

	// Tell each manager to shut down
	this.managers.forEach(function (each) {
	    each.disconnect (exit);
	});

	// Final termination code
	function exit () {
		process.exit ();
	}
};

/**
 * Hub.start_chat():
 * This opens up the IRC connections from the config
 **/
Hub.start_chat = function() {
	var irc;
	
	irc = new IRCManager (this.config);
	irc.connect ();

	this.managers.push (irc);
};


Hub.init ();

process.on('SIGINT', function () {
	Hub.shutdown ();
});
