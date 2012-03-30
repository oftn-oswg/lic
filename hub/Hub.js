"use strict";

var net  = require ("net");
var util = require ("util");
var path = require ("path");
var optimist = require ("optimist");

var FileUtils  = require ("./FileUtils.js");
var HubConfig  = require ("./HubConfig.js");
var Server     = require ("./Server.js");

var ItemManager = require ("./ItemManager.js");

var Hub = function () {
	this.petals = [];
	this.item_manager = new ItemManager();
};

/**
 * Hub.prototype.init():
 * This is the main entry-point for the hub.
 *
 * It starts by parsing options and loading the config file.
 **/
Hub.prototype.init = function () {
	var argv;

	argv = optimist.usage ("Usage: $0 [options]")

		.alias ("config", "c")
		.describe ("config", "Location of configuration file")
		.default("config", path.join (FileUtils.home (), ".lic", "config.json"))

		.alias ("petal", "p")
		.describe ("petal", "Path of lic petal to load")

		.alias ("help", "h")
		.describe ("help", "Print this usage").argv;


	if (argv.help) {
		optimist.showHelp (console.log);
		return;
	}

	var self = this;

	this.load_config (argv.config, function() {
		if (argv.petal) {
			self.load_petals (argv.petal);
		}
		self.start_server ();
	});

};


/**
 * Hub.prototype.load_config():
 * This will scan directories for the config file and load it into memory.
 * The callback function will be called with the configuration data.
 **/
Hub.prototype.load_config = function (path, callback) {
	var config;

	config = new HubConfig (this.item_manager, path);
	config.load (callback);
};

/**
 * Hub.prototype.load_petals(petals):
 * This will load each petal in-process.
 * The function accepts a string location
 * or an array of locations.
 **/
Hub.prototype.load_petals = function(petals) {
	var self = this;

	if (typeof petals === "string") {
		load (petals);
	} else {
		petals.forEach (load);
	}

	function load(petal) {
		var Petal;
		try {
			Petal = require (petal);
			self.petals.push (new Petal(self.item_manager));
		} catch (e) {
			console.error (e);
		}
	}
};

/**
 * Hub.prototype.start_server():
 * This opens up a local socket and applies listeners.
 **/
Hub.prototype.start_server = function () {
	console.log ("Starting up hub server");

	this.server = new Server (this);
	this.server.listen ();
};

Hub.prototype.shutdown = function () {

	console.log ("Shutting down");

	// Close petal connections
	this.server.close ();

	// Tell each petal to shut down
	var num = this.petal.length;
	this.petal.forEach (function (each) {
		each.shutdown (function() {
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
