var util = require ("util");

var Petal = require ("../lib/Petal.js");
var Incoming = require ("./Incoming.js");

var Server = require ("./Server.js");
var ChannelList = require ("./ChannelList.js");

var Manager = function (item_manager) {
	Petal.call (this, item_manager);

	var self = this;
	var incoming = new Incoming(this);

	this.list = {};

	item_manager.listen ([this.name, "*"], incoming.listen());
	item_manager.command (["lic", "config"], "get", ["IRC"], function(error, values) {
		if (error) {
			console.error ("Could not retrieve configuration");
			return;
		}
		self.config = values[0];
		self.connect ();
	});
}

util.inherits (Manager, Petal);

Manager.prototype.name = "irc";

/* This function takes the server profile from the config and extends
 * it with the defaults from the config.
 */
Manager.prototype.create_profile = function (profile, defaults) {
	return Object.create(defaults, Object.getOwnPropertyNames(profile).reduce(function(desc, prop) {
		desc[prop] = Object.getOwnPropertyDescriptor(profile, prop);
		return desc;
	}, {}));
};

Manager.prototype.connect = function () {
	var self, server, profile, servers, defaults, bundle;

	self = this;
	servers  = this.config.servers;
	defaults = this.config["default"];

	servers.forEach(function(profile) {
		profile = self.create_profile (profile, defaults);

		if (!self.list.hasOwnProperty (profile.name)) {
			bundle = {};

			bundle.manager = self;
			bundle.profile = profile;

			bundle.server = new Server(bundle);
			bundle.channellist = new ChannelList(bundle);

			bundle.server.connect();
			self.list[profile.name] = bundle;
		} else {
			console.error ("IRC already has connection called `%s`. Skipping duplicate.", profile.name);
		}
	});
};

Manager.prototype.shutdown = function(callback) {
	var connections, self = this;

	// First we clone the connections array to use as a queue
	connections = Object.getOwnPropertyNames (this.list);
	console.log ("Waiting for IRC servers to close connections...");

	(function next () {
		var c = connections.shift ();
		if (!c) {
			if (callback) {
				callback.call (self);
			}
			return;
		}
		self.list[c].server.quit (null, next);
	}());
};

if (require.main === module) {
	Petal.register (Manager);
}

module.exports = Manager;
