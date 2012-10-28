"use strict";

var util      = require ("util");
var rl        = require ("readline");

var Petal     = require ("./lib/Petal.js");


var TestInterface = function (item_manager) {
	Petal.apply (this, arguments);

	this.start_test_interface();
	this.shutting_down = false;
	// the hub can do this better, also after shutdown is called
	this.item_manager.subscribe(['*'], "*", this.verbose_event);
};

util.inherits (TestInterface, Petal);

TestInterface.prototype.name = "testinterface";

module.exports = TestInterface;

TestInterface.prototype.verbose_event = function(e) {
	console.log ("\x1b[0;35m%s\x1b[0m \x1b[0;34m%s\x1b[0m: %s", e.item.join("/"), e.type, JSON.stringify(e.data));
	e.next(e);
};

TestInterface.prototype.shutdown = function(cb) {
	// set this.shutting_down, this is checked in interface.on('close')
	// because this indirectly triggers interface.on('close'), but we don't
	// want to disconnect while we're shutting down, because the callback
	// won't have time to reach the hub.
	// because we're calling readline_interface *before* cb()
	// the alternative would be calling cb() before readline_interface
	// but I'm not really sure if that doesn't horribly violate the spirit
	// of callbacks, in some way.
	this.shutting_down = true;
	if (this.readline_interface) {
		this.readline_interface.close();
	}
	if (cb) {
		cb();
	}
};

TestInterface.prototype.start_test_interface = function() {
	var self = this;
	var default_item = ["lic"];

	var i = rl.createInterface (process.stdin, process.stdout, null);
	i.setPrompt ("% ", 2);
	i.prompt ();

	i.on ("line", function(line) {
		handle (line.trim ());
		i.prompt ();
	});

	i.on ("close", function() {
		if (!self.is_separate()) {
			self.item_manager.command (["lic", "hub"], "shutdown");
		} else if (!self.shutting_down) {
			self.local_quit();
		}
	});

	self.readline_interface = i;

	function handle(input) {
		var item, command, argument;
		var match, regex = /^(?:(\S+):)?([\-a-z0-9_]+)\s*(?:\((.*)\))?$/i;

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

			self.item_manager.command.apply (self.item_manager, [item, command].concat (argument));
		} else {
			console.error ("Syntax is: [item:]command [(arguments, ...)]");
		}
	}
};


if (require.main === module) {
	Petal.register (TestInterface);
}
