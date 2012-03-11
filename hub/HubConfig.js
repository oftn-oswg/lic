"use strict";

var fs = require ("fs");
var FileUtils = require ("./FileUtils.js");

var HubConfig = function(locations) {

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

HubConfig.prototype.location = "~/.lic/config.json";


HubConfig.prototype.load = function(callback, self) {
	var location;

	location = this.location;

	this.load_file (location, function (success) {
		if (success) {
			callback.call (self, this);
		} else {
			console.error ("Could not create configuration file: %s", location);
			process.exit ();
		}
	});

};


HubConfig.prototype.create_config = function (filename, callback) {
	var dirs, path_current, self = this;

	dirs = filename.split (FileUtils.dir_seperator);
	path_current = [];

	(function next() {
		var dir, current;

		dir = dirs.shift ();
		path_current.push (dir);
		current = path_current.join("/");

		if (dir) {
			fs.stat(current, function(error, stats) {
				if (error) {
					if (!dirs.length) {
						self.write_file (current, callback);
					} else {
						fs.mkdir (current, function(error) {
							if (error) {
								callback.call (self, false);
							} else {
								next.call (self);
							}
						});
					}
				} else {
					if (stats.isDirectory()) {
						next.call (self);
					} else {
						if (!dirs.length) {
							callback.call (self, true);
						} else {
							callback.call (self, false);
						}
					}
				}
			});
		} else {
			next.call (self);
		}
	}).call(self);
};


/**
 * HubConfig#load_file()
 * Read a lic configuration file into the object
 **/
HubConfig.prototype.load_file = function (location, callback) {
	var home, filename, self = this;

	filename = FileUtils.expand (location);

	fs.readFile(filename, "utf8", function (err, json) {
		var data;

		if (err) {
			self.create_config (filename, function(success) {
				if (!success) {
					console.error ("Could not create configuration file: %s", filename);
					process.exit ();
					return;
				}
				callback.call (self, success);
			});
			return;
		}

		console.log ("Reading configuration: %s", filename);

		try {
			// Try to parse the file as JSON
			data = JSON.parse (json);

			self.load_config_data (data);
			callback.call (self, true);
		} catch (e) {
			console.error (String(e));
			callback.call (self, false);
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
