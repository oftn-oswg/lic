"use strict";

var path = require ("path");
var optimist = require('optimist');
var dnode = require("dnode");

var ItemManager_Bridge = require("../hub/ItemManager_Bridge");

var Petal_Client = function () {
	this.petals = [];
	this.hub_connection = null;
	this.hub_interface = null;
}

Petal_Client.prototype.init = function() {
	console.log ("lic, version 1a\nCopyright (c) The ΩF:∅ Foundation\n");
	var argv = optimist.usage ("Usage: $0 [options] hub_location")
		.demand(1)
		.alias ("petal", "p")
		.describe ("petal", "Path of lic petal to load")

		.alias ("help", "h")
		.describe ("help", "Print this usage").argv;


	if (argv.help) {
		optimist.showHelp (console.log);
		return;
	}

	var self = this;

	if (argv.petal) {
		/* we need petals to do anything */
		self.hub_connection = dnode.connect(argv._[0]);
		self.hub_connection.on("remote", function(remote) {
			self.hub_interface = remote;
			self.load_petals (argv.petal);
		});
	}
};

Petal_Client.prototype.load_petals = function (petals) {
	var self = this;

	function load(petal) {
		var Petal;
		var petal_instance;
		try {
			Petal = require (path.join (process.cwd(), petal));

			self.hub_interface.register("unname", function shutdown(c) {
				if (petal_instance) {
					petal_instance.shutdown.apply(petal_instance, arguments);
				} else {
					c();
				}
			}, function(handle, unregister) {
				petal_instance = new Petal(new ItemManager_Bridge(handle), self.hub_interface);
				petal_instance.unregister = function unregister_and_end(cb) {
					unregister(function end_conn() {
						self.unregister_petal(petal_instance);
						if (cb) {
							cb();
						}
					});
				}
			});
		} catch (e) {
			console.error ("Could not load petal: %s", petal);
			console.error (e.stack);
			/* check for quit */
		}
	}

	if (typeof petals === "string") {
		load (petals);
	} else {
		petals.forEach (load);
	}
};

Petal_Client.prototype.register_petal = function (petal) {
	this.petals.push(petal);
};

/** Petal_Client#unregister_petal
  * TODO: make sure to not quit when there are still petals to load
  */
Petal_Client.prototype.unregister_petal = function (petal) {
	var id = this.petals.indexOf(petal);
	if (id != -1) {
		this.petals.splice(id, 1);
	}
	if (this.petals.length == 0) {
		this.hub_connection.end();
	}
};

module.exports = Petal_Client;
