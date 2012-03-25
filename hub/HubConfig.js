"use strict";

var fs        = require ("fs");
var path      = require ("path");
var FileUtils = require ("./FileUtils.js");

var HubConfig = function (event_manager) {

	this.path = null;

	this.event_manager = event_manager;

	// lic defaults
	this.data = {};

	// lic Core namespace
	this.data.Core = {};
	this.data.Core.socket = "/tmp/lic.sock";
};

HubConfig.prototype.location = path.join (FileUtils.home (), ".lic", "config.json");


HubConfig.prototype.load = function (callback) {
	var location;

	location = this.location;

	this.load_file (location, function (error) {
		if (error) {
			console.error ("Could not create configuration file: %s", location);
			process.exit ();
		}

		callback();
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
			self.data = JSON.parse (json);

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
HubConfig.prototype.write_file = function (file, callback) {
	var data, self = this;

	data = JSON.stringify (this.data, null, 4);

	fs.writeFile (file, data, 'utf8', function (error) {
		callback.call (self, error);
	});
};

/**
 * HubConfig#respond():
 * Responds to commands routed through the LicProvider.
 **/
HubConfig.prototype.respond = function (item, sender, command, args, success, error) {
	if (command.match (/^get$/i)) {
		this.get (item.replace (/^lic\/config\//, ""), function (value) {
			success (value);
		}, function (error) {
			error (error);
		});
	} else if (command.match (/^set$/i)) {
		this.set (item.replace (/^lic\/config\//, ""), args, function () {
			success (true);
		}, function (error) {
			error (error);
		});
	} else if (command.match (/^save$/i)) {
		this.write_file (this.location, function () { success (true); });
	} else if (command.match (/^load$/i)) {
		this.load_file (this.location, function () { success (true); });
	}
};

/**
 * HubConfig#get():
 * Retrieves a value specified by a forward slash-separated
 * path from the config.
 **/
HubConfig.prototype.get = function (path, success, error) {
	success = success || function () {};
	error   = error   || function () {};

	var key
	  , keys   = path.split ("/")
	  , object = this.data
	  ;

	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		if (object.constructor === Array) {
			if (key.match (/^\d+$/)) {
				if (object.hasOwnProperty (key)) {
					object = object[key];
				} else {
					return error ({type: "NotFound", description: "The requested configuration key could not be found."});
				}
			} else {
				return error ({type: "IndexError", description: "Attempted to access a non-numeric key of an array."});
			}
		} else if (typeof object === "object") {
			if (object.hasOwnProperty (key)) {
				object = object[key];
			} else {
				return error ({type: "NotFound", description: "The requested configuration key could not be found."});
			}
		} else {
			return error ({type: "IndexError", description: "Attempted to index through a non-object value."});
		}
	}

	success (object);
};

/**
 * HubConfig#set():
 * Sets a value specified by a forward slash-separated
 * path in the config, and notifies all subscribers of changes.
 **/
HubConfig.prototype.set = function (path, value, success, error) {
	success = success || function () {};
	error   = error   || function () {};

	var key
	  , keys   = path.split ("/")
	  , object = this.data
	  ;

	for (var i = 0; i < keys.length - 1; i++) {
		key = keys[i];
		if (object.constructor === Array) {
			if (key.match (/^\d+$/)) {
				if (object.hasOwnProperty (key)) {
					object = object[key];
				} else {
					object = object[key] = keys[i+1].match (/^\d+$/) ? [] : {};
				}
			} else {
				return error ({type: "IndexError", description: "Attempted to access a non-numeric key of an array."});
			}
		} else if (typeof object === "object") {
			if (object.hasOwnProperty (key)) {
				object = object[key];
			} else {
				object = object[key] = keys[i+1].match (/^\d+$/) ? [] : {};
			}
		} else {
			return error ({type: "IndexError", description: "Attempted to index through a non-object value."});
		}
	}

	key = keys[i];

	if (object.constructor === Array) {
		if (key.match (/^\d+/)) {
			object = object[key] = value;
		} else {
			return error ({type: "IndexError", description: "Attempted to access a non-numeric key of an array."});
		}
	} else if (typeof object === "object") {
		object = object[key] = value;
	} else {
		return error ({type: "IndexError", description: "Attempted to index through a non-object value."});
	}

	// First we must notify all descendants of the key we just modified
	// if the value is an object or array.
	if (typeof object === "object") {
		(function walk (object, path) {
			for (k in object) {
				if (object.hasOwnProperty (k)) {
					this.event_manager.publish ("lic/config/" + (path ? path + "/" : "") + k, "update", object[k]);
					if (typeof object[k] === "object") {
						walk (object[k], path + "/" + k);
					}
				}
			}
		}) (object, path);
	}

	// Prior to the next step, we need to build up a list of values
	// for each part of the path.
	var values = [this.data];
	for (var i = 0; i < keys.length; i++) {
		values.push (values[values.length - 1][keys[i]]);
	}

	// We must then walk backwards and notify all parents of the key (but
	// not their children).
	while (true) {
		this.event_manager.publish ("lic/config" + (keys.length > 0 ? "/" : "") + keys.join ("/"), "update", values.pop ());
		if (keys.length > 0) {
			keys.pop ();
		} else {
			break;
		}
	}

	success (true);
};

module.exports = HubConfig;
