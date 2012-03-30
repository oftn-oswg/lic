"use strict";

var fs        = require ("fs");
var path      = require ("path");
var util      = require ("util");

var Petal     = require ("./Petal.js");
var FileUtils = require ("./FileUtils.js");

/**
 * HubConfig:
 * This is actually an internal petal which creates
 * a special lic/config item. This item can be used by all
 * petals to access, update, and modify global configuration.
 **/

var HubConfig = function () {
	Petal.call (this);

	this.path = null;

	// lic defaults
	this.data = {};

	// lic Core namespace
	this.data.Core = {};
	this.data.Core.socket = "/tmp/lic.sock";

	this.data.IRC = {};
	this.data.IRC.default = {};
	this.data.IRC.servers = [];
};

util.inherits (HubConfig, Petal);

HubConfig.prototype.location = path.join (FileUtils.home (), ".lic", "config.json");


HubConfig.prototype.load = function (callback, self) {
	var location;

	location = this.location;

	this.load_file (location, function (error) {
		if (error) {
			console.error ("Could not create configuration file: %s", location);
			process.exit ();
		}

		callback.call (self, this);
	});

};


HubConfig.prototype.create_directory = function (dir, callback) {
	var self = this;

	path.exists (dir, function (exists) {
		if (exists) {
			callback.call (self, null);
		} else {
			fs.mkdir (dir, function (error) {
				if (error) {
					self.create_directory (path.dirname (dir), function(error) {
						if (error) {
							callback.call (self, error);
						} else {
							self.create_directory (dir, callback);
						}
					});
					return;
				}
				
				callback.call (self, null);
			});
		}
	});
};


HubConfig.prototype.create_config = function (filename, callback) {
	var dirs, path_current, self = this;

	console.log ("Creating configuration file: %s", filename);

	this.create_directory (path.dirname (filename), function (error) {
		if (error) {
			callback.call (self, error);
			return;
		}
		
		self.write_file (filename, callback);
	});
};


/**
 * HubConfig#load_file()
 * Read a lic configuration file into the object
 **/
HubConfig.prototype.load_file = function (filename, callback) {
	var self = this;

	fs.readFile (filename, "utf8", function (error, json) {
		var data;

		if (error) {
			self.create_config (filename, function(error) {
				if (error) {
					console.error ("Could not create configuration file: %s", filename);
					process.exit ();
					return;
				}
				callback.call (self, error);
			});
			return;
		}

		console.log ("Reading configuration: %s", filename);

		try {
			// Try to parse the file as JSON
			data = JSON.parse (json);

			self.load_config_data (data);
			callback.call (self, null);
		} catch (e) {
			console.error (String(e));
			callback.call (self, e);
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

	console.log ("Saving configuration: %s", file);

	fs.writeFile (file, data, 'utf8', function(error) {
		callback.call (self, error);
	});
};


HubConfig.prototype.load_config_data = function (data) {

	var getOwn = Object.getOwnPropertyNames;

	(function extend (base, extension) {
		getOwn (extension).forEach(function (prop) {
			if (typeof base[prop] === 'object') {
				if (typeof extension[prop] !== 'object') {
					throw new Error ('A ' + typeof extension[prop] + 
													 ' exists where an object is expected.');
				}
				extend (base[prop], extension[prop]);
	    } else {
				base[prop] = extension[prop];
	    }
		});
	}) (this.data, data);

};

/**
 * HubConfig#shutdown:
 * This command is called when the hub begins to shutdown.
 * It writes changes in the configuration to disk and calls the callback.
 **/
HubConfig.prototype.shutdown = function(callback) {
	this.write_file (this.location, function(error) {
		if (callback) {
			callback.call (this, error);
		}
	});
};

module.exports = HubConfig;
