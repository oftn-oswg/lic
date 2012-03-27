"use strict";

var HubConfig      = require ("./HubConfig.js");
var Server         = require ("./Server.js");
var EventManager   = require ("./EventManager.js");
var CommandManager = require ("./CommandManager.js");

var Hub = function () {
	this.petals          = {};
	this.event_manager   = new EventManager (this);
	this.command_manager = new CommandManager (this);
	this.config          = new HubConfig (this.event_manager);
};

/**
 * Hub.prototype.init():
 * This is the main entry-point for the hub.
 *
 * It starts by loading the config file.
 **/
Hub.prototype.init = function () {

	var self = this;

	this.config.load (function () {
		self.config.get ("lic/config/lic/routes", function (t) { self.event_manager.load_tree (t) });
		self.start_server ();
	});

};

/**
 * Hub.prototype.start_server():
 * This opens up a local socket and applies listeners.
 **/
Hub.prototype.start_server = function () {
	/*
	console.log ("Starting up hub server");

	this.server = new Server (this.config);
	this.server.listen ();
	*/
};

Hub.prototype.shutdown = function () {

	console.log ("Shutting down");

	// Tell each petal to disconnect
	var num = this.managers.length;
	this.petals.forEach (function (petal) {
		petal.disconnect (function() {
			num--;
			if (!num) {
				exit();
			}
		});
	});

	setTimeout (function () { exit () }, 5000); // Exit forcefully if 5 s pass.

	// Final termination code
	function exit () {
		//this.server.close ();
		process.exit ();
	}
};

module.exports = Hub;
