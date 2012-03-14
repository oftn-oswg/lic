"use strict";

var net  = require ("net");
var util = require ("util");

var HubConfig  = require ("./HubConfig.js");
var IRCManager = require ("./irc/Manager.js");
var Server     = require ("./Server.js");

var Hub = function() {
	this.managers = [];
};

/**
 * Hub.prototype.init():
 * This is the main entry-point for the hub.
 *
 * It starts by loading the config file.
 **/
Hub.prototype.init = function() {

	this.load_config (function(config) {
		this.config = config;
		this.start_server ();
		this.start_chat ();
	});

};


/**
 * Hub.prototype.load_config():
 * This will scan directories for the config file and load it into memory.
 * The callback function will be called with the configuration data.
 **/
Hub.prototype.load_config = function(callback) {
	var config;

	config = new HubConfig ();
	config.load (callback, this);
};

/**
 * Hub.prototype.start_server():
 * This opens up a local socket and applies listeners.
 **/
Hub.prototype.start_server = function() {
	console.log ("Starting up hub server");

	this.server = new Server (this.config);
	this.server.listen ();
};

Hub.prototype.shutdown = function() {

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
Hub.prototype.start_chat = function() {
	var irc;
	
	irc = new IRCManager (this.config);
	irc.connect ();

	this.managers.push (irc);
};

module.exports = Hub;
