"use strict";

var util      = require ("util");
var rl        = require ("readline");

var Petal     = require ("./lib/Petal.js");


var TestInterface = function (item_manager) {
	Petal.apply (this, arguments);

	this.start_test_interface();
	// the hub can do this better, even after shutdown is called
	// but we need to do this if we're a different process
	if (require.main == module) {
		this.item_manager.subscribe(['*'], "*", this.verbose_event);
	}
};

util.inherits (TestInterface, Petal);

TestInterface.prototype.name = "testinterface";

module.exports = TestInterface;

TestInterface.prototype.verbose_event = function(e) {
	console.log ("\x1b[0;35m%s\x1b[0m \x1b[0;34m%s\x1b[0m: %s", e.item.join("/"), e.type, JSON.stringify(e.data));
	e.next(e);
}

TestInterface.prototype.shutdown = function(cb) {
	if (this.interface) this.interface.close();
	cb();
}

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
		if (require.main != module)
			self.item_manager.command (["lic", "hub"], "shutdown");
		else {
			self.local_quit();
		}
	});

	self.interface = i;

	function handle(input) {
		var item, command, argument;
		var match, regex = /^(?:(\S+):)?([-a-z0-9_]+)\s*(?:\((.*)\))?$/i;

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
