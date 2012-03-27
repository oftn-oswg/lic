"use strict";

var HubConfig      = require ("./HubConfig.js");
var Server         = require ("./Server.js");
var EventManager   = require ("./EventManager.js");
var CommandManager = require ("./CommandManager.js");
var LocalLink      = require ("./LocalLink.js");

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
		self.load_petal ("../petal/irc/IRC.js");

		///* Test interface
		process.nextTick (function () {

			var rl = require ("readline");
			var i = rl.createInterface (process.stdin, process.stdout, null);
			var md, to = "lic";
			i.on("line", function (line) {
				if (!line.trim ()) {
				} else if (md = line.match (/^\/to (.*)/)) {
					to = md[1].trim ();
				} else if (md = line.match (/^\/([^ ]+)(?: (.*)|$)/)) {
					if (to) self.command_manager.dispatch (to, md[1].trim(), JSON.parse (md[2]||"null"));
				} else {
					if (to) self.command_manager.dispatch (to, "message", line.trim());
				}
				doprmpt ();
			});
			doprmpt ();
			function doprmpt () {
				i.setPrompt (" <"+to+"> ", to.length + 4);
				i.prompt ();
			}
		});
		//*/
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

Hub.prototype.register_petal = function (petal_name, connect, disconnect) {
	if (this.petals.hasOwnProperty (petal_name)) {
		return false;
	} else {
		console.log ("[DEBUG] petal registered: " + petal_name);
		this.petals[petal_name] = {connect: connect, disconnect: disconnect, subscriptions: []};

		process.nextTick (connect);

		return true;
	}
};

Hub.prototype.disconnect_petal = function (petal_name) {
	var self = this;

	if (this.petals.hasOwnProperty (petal_name)) {
		this.petals[petal_name].disconnect (function () {
			var subs = self.petals[petal_name].subscriptions.slice ();
			for (var i = 0; i < subs.length; i++) {
				self.event_manager.unsubscribe (petal_name, subs[i].item, subs[i].type);
			}

			delete self.petals[petal_name];

			console.log ("[DEBUG] petal disconnected: " + petal_name);
		});
	}
};

Hub.prototype.load_petal = function (path) {
	try {
		var link  = new LocalLink (this)
		  , petal = new (require (path)) (link, {})
		  ;
		link.petal = petal;
	} catch (e) {
		console.error ("[WARN] failed to load " + path + ": " + e);
	}
};

Hub.prototype.shutdown = function () {
	var self = this;

	console.log ("Shutting down");

	// Tell each petal to disconnect
	var num = 0;
	for (var petal in this.petals) {
		if (this.petals.hasOwnProperty (petal)) {
			num++;
			this.petals[petal].disconnect (function() {
				num--;
				if (!num) {
					exit ();
				}
			});
		}
	}

	setTimeout (function () { exit () }, 5000); // Exit forcefully if 5 s pass.

	// Final termination code
	function exit () {
		//self.server.close ();
		self.config.write_file (self.config.location, function () { process.exit () });
	}
};

module.exports = Hub;
