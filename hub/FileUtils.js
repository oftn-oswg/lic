"use strict";

var windows = (process.platform === "win32");

exports.get_home_dir = function() {
	var home = process.env.HOME;

	if (windows) {
		// Only believe HOME if it is an absolute path and exists
		if (home) {
			if (!(exports.path_is_absolute (home) &&
				exports.is_dir (home))) {
				home = null;
			}
		}

		// In case HOME is Unix-style (it happens), convert it to
		// Windows style.
		if (home) {
			home = home.replace (/\//g, "\\");
		}

		if (!home) {
			// USERPROFILE is probably the closest equivalent to $HOME?
			home = process.env.USERPROFILE;
		}
	}

	// I don't think we can use the getpwid function in Node.js very easily
	// If home still isn't set, we use the current dir I guess
	
	if (!home) home = ".";

	return home;
};


exports.path_is_absolute = function (filename) {
	if (filename == null) return false;

	if (exports.is_dir_seperator (filename[0])) {
		return true;
	}

	if (windows) {
		// Recognize drive letter on native Windows
		if (/^[a-z]:\//i.test(filename)) return true;
	}

	return false;
};

if (process.platform === "win32") {
	exports.dir_seperator = /\/\\/g;
} else {
	exports.dir_seperator = /\//g;
}

exports.is_dir_seperator = function(ch) {
	return exports.dir_seperator.test (ch);
};

exports.expand = function(path) {
	if (path.charAt (0) === "~")
		return path.replace ("~", exports.get_home_dir());

	return path;
};
