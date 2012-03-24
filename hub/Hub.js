"use strict";

var net  = require ("net");
var util = require ("util");

var HubConfig  = require ("./HubConfig.js");
var Server     = require ("./Server.js");

var EventManager   = require ("./EventManager.js");
var CommandManager = require ("./CommandManager.js");

var Hub = function () {
	this.managers        = [];
	this.event_manager   = new EventManager();
	this.command_manager = new CommandManager();
};

/**
 * Hub.prototype.init():
 * This is the main entry-point for the hub.
 *
 * It starts by loading the config file.
 **/
Hub.prototype.init = function () {

	this.load_config (function (config) {
		this.config = config;
		this.start_server ();
	});

};


/**
 * Hub.prototype.load_config():
 * This will scan directories for the config file and load it into memory.
 * The callback function will be called with the configuration data.
 **/
Hub.prototype.load_config = function (callback) {
	var config;

	config = new HubConfig ();
	config.load (callback, this);
};

/**
 * Hub.prototype.start_server():
 * This opens up a local socket and applies listeners.
 **/
Hub.prototype.start_server = function () {
	console.log ("Starting up hub server");

	this.server = new Server (this.config);
	this.server.listen ();
};

Hub.prototype.shutdown = function () {

	console.log ("Shutting down");

	// Close petal connections
	this.server.close ();

	// Tell each manager to shut down
	var num = this.managers.length;
	this.managers.forEach (function (each) {
		each.disconnect (function() {
			num--;
			if (!num) {
				exit();
			}
		});
	});

	// Final termination code
	function exit () {
		process.exit ();
	}
};

module.exports = Hub;
