"use strict";

var fs = require ("fs");


var HubConfig = function(locations) {

	this.path = null;
	this.locations = locations;

	// Diaptoval defaults
	this.data = {};

	// Diaptoval Core namespace
	this.data.Core = {};
	this.data.Core.socket = "/tmp/diaptoval.sock";

	this.data.IRC = {};
	this.data.IRC.default = {};
	this.data.IRC.servers = [];
};


HubConfig.prototype.load = function(callback, self) {
	var locations, config = this;

	// Make a copy of the locations array
	locations = this.locations.slice ();
	
	// Continuation-passing style is the best
	(function retry() {

		if (!locations.length) {
			// We have no more locations to look
			console.error ("No configuration file found, using defaults");
			callback.call (self, config);
			return;
		}

		// Pop location off beginning of array
		var file = locations.shift ();

		config.load_file (file, function (success) {
			if (success) {
				config.path = file;
				callback.call (self, config);
			} else {
				retry ();
			}
		});

	})();

};


/**
 * HubConfig#load_file()
 * Read a Diaptoval configuration file into the object
 **/
HubConfig.prototype.load_file = function (filename, callback) {
	var self = this;

	fs.readFile(filename, "utf8", function (err, json) {
		var data;

		if (err) {
			callback.call (this, false);
			return;
		}

		console.log ("Reading configuration: %s", filename);

		try {
			// Try to parse the file as JSON
			data = JSON.parse (json);

			self.load_config_data (data);
			callback.call (this, true);
		} catch (e) {
			console.error (String(e));
			callback.call (this, false);
		}
	});
};

/**
 * HubConfig#write_file():
 * Save the configuration data as-is to disk.
 **/
HubConfig.prototype.write_file = function(file, callback) {
	var data, self = this;

	data = JSON.stringify (this.data, null, 4);

	if (!file) file = this.path;
	if (!file) throw new Error ("No place to save configuration");

	fs.writeFile(file, data, 'utf8', function(err) {
		var success = !err;
		callback.call (self, success);
	});
};


HubConfig.prototype.load_config_data = function (data) {

    var getOwn = Object.getOwnPropertyNames;

    (function extend (base, extension) {
	getOwn(extension).forEach(function (prop) {
	    if (typeof base[prop] === 'object') {
		if (typeof extension[prop] !== 'object') {
		    throw new Error('A ' + typeof extension[prop] + 
				    ' exists where an object is expected.');
		}
		extend(base[prop], extension[prop]);
	    }
	    else {
		base[prop] = extension[prop];
	    }
	});
    })(this.data, data);
};


module.exports = HubConfig;
