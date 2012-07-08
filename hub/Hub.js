"use strict";

var net  = require ("net");
var util = require ("util");
var path = require ("path");
var optimist = require ("optimist");

var Utils  = require ("./Utils.js");
var Config = require ("./Config.js");
var Server = require ("./Server.js");

var ItemManager = require ("./ItemManager.js");

var Hub = function () {
	this.petals = [];
	this.item_manager = new ItemManager ();
};

/**
 * Hub.prototype.init():
 * This is the main entry-point for the hub.
 *
 * It starts by parsing options and loading the config file.
 **/
Hub.prototype.init = function () {
	var argv;

	console.log ("licd, version 1a\nCopyright (c) The ΩF:∅ Foundation\n");

	argv = optimist.usage ("Usage: $0 [options]")

		.alias ("config", "c")
		.describe ("config", "Location of configuration file")
		["default"]("config", path.join (Utils.home (), ".lic", "config.json"))

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

		self.start_test_interface ();
	});

};


/**
 * Hub.prototype.load_config(path, callback):
 * This loads the configuration petal with the given path to
 * the configuration file.
 **/
Hub.prototype.load_config = function (path, callback) {
	var config;

	config = new Config (this.item_manager, path);

	this.petals.push (config);
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

	function load(petal) {
		var Petal;
		try {
			Petal = require (path.join (process.cwd(), petal));
			self.petals.push (new Petal(self.item_manager));
		} catch (e) {
			console.error ("Could not load petal: %s", petal);
			console.error (e.stack);
		}
	}

	if (typeof petals === "string") {
		load (petals);
	} else {
		petals.forEach (load);
	}
};

/**
 * Hub.prototype.start_server():
 * This opens up servers allowing petals to be run
 * in a separate process.
 **/
Hub.prototype.start_server = function () {
	var server;

	server = new Server (this);
	server.listen ();

	this.server = server;
};

Hub.prototype.shutdown = function () {
	var self = this;

	// Final termination
	function exit () {
		self.server.shutdown (function() {
			process.exit ();
		});
	}

	console.log ("Shutting down");

	// Freeze ItemManager from further communication
	this.item_manager.freeze ();

	// Tell each petal to shut down
	var num = this.petals.length;
	this.petals.forEach (function (each) {
		each.shutdown (function() {
			num--;
			if (!num) {
				exit();
			}
		});
	});

	if (!num) {
		exit();
	}
};

Hub.prototype.start_test_interface = function() {
	var self = this;
	var rl = require ("readline");
	var default_item = ["lic"];

	var i = rl.createInterface (process.stdin, process.stdout, null);
	i.setPrompt ("% ", 2);
	i.prompt ();

	i.on ("line", function(line) {
		handle (line.trim ());
		i.prompt ();
	});

	i.on ("close", function() {
		self.shutdown ();
	});

	function handle(input) {
		var item, command, argument;
		var match, regex = /^(?:(\S+):)?([-a-z0-9]+)\s*(?:\((.*)\))?$/i;

		match = input.match (regex);
		if (match) {
			command = match[2];

			if (match[1]) {
				item = match[1].split("/");
				default_item = item;
			} else {
				item = default_item;
			}

			if (match[3]) {
				try {
					argument = JSON.parse ("[" + match[3] + "]");
				} catch (e) {
					console.error ("Could not parse arguments.");
					return;
				}
			} else {
				argument = [];
			}

			ItemManager.prototype.command.apply (self.item_manager, [item, command].concat (argument));
		} else {
			console.error ("Syntax is: [item:]command [(arguments, ...)]");
		}
	}
};

module.exports = Hub;
