var util = require ("util");

/**
 * ItemManager:
 * This object is the main router for all of lic's events.
 * Petals like the IRC manager will register all of its events
 * with the ItemManager instance belonging to the hub.
 * This is the main starting point for all of the events.
 **/
var ItemManager = function () {
	this.event_tree = {};
	this.command_tree = {};

	this.frozen = false;
};

ItemManager.prototype.freeze = function() {
	this.frozen = true;
};




// EVENTS ---------------------------------------

ItemManager.prototype.publish = function(item, type, data) {
	// TODO: To be implemented.
	console.log ("\x1b[0;35m%s\x1b[0m \x1b[0;34m%s\x1b[0m: %s", item.join("/"), type, JSON.stringify(data));
	//util.puts (util.inspect (event, false, 2, true));
};

ItemManager.prototype.subscribe = function(items) {
	// TODO: To be implemented.
};




// COMMANDS -------------------------------------

/**
 * ItemManager#listen:
 * This is used by item providers to
 * listen for commands on items they own.
 *
 * Multiple listeners can be attached to the
 * same item and from any petal, so care
 * should be taken.
 **/
ItemManager.prototype.listen = function(items, listener, callback) {

	function add_listener(item, listener) {
		var node = this.command_tree;
		var item_length = item.length;
		var part;

		for (var i = 0; i < item_length; i++) {
			part = item[i];
			if (typeof node[part] !== "object") {
				node[part] = {};
			}

			if (i === item_length-1) {
				// Append the listener
				if (node[part].listeners) {
					node[part].listeners.push (listener);
				} else {
					node[part].listeners = [listener];
				}
				break;
			}

			node = node[part];
		}
	}

	if (this.frozen) {
		return;
	}

	// If `listener` is an object, create a function that calls the object's methods
	if (typeof listener === "object") {
		listener = function(item, command) {
			if (typeof this[command] === "function") {
				this[command].apply(this, Array.prototype.slice.call (arguments, 2));
				return true;
			}
			return false;
		}.bind(listener);
	}

	// Create listeners on `items`
	if (Array.isArray (items)) {
		if (typeof items[0] === "string") {
			add_listener.call (this, items, listener);
		} else {
			items.forEach (function(item) {
				add_listener.call (this, item, listener);
			});
		}
	} else {
		if (callback) {
			callback.call (this, new Error("Invalid argument for listen"));
		}
	}
};

ItemManager.prototype.command = function(item, command) {
	if (this.frozen) {
		return;
	}

	var args, node, self = this, listeners = [];

	console.log ("\x1b[0;35m%s\x1b[0m:\x1b[0;31m%s\x1b[0m %s", item.map(encodeURIComponent).join("/"), command, JSON.stringify(Array.prototype.slice.call(arguments, 2)).replace(/^\[(.*)\]$/, "($1)"));
	
	node = this.command_tree;
	args = Array.prototype.slice.call (arguments);
	
	// Go through command_tree and add listeners to `listeners` array
	for (var i = 0, len = item.length; i < len; i++) {
		if (typeof node[item[i]] !== "object") {
			break;
		}

		node = node[item[i]];

		// Add wildcard item listeners
		if (node["*"]) {
			Array.prototype.push.apply (listeners, node["*"].listeners);
		}
	}

	Array.prototype.push.apply (listeners, node.listeners);

	if (listeners.length === 0) {
		console.error("No listeners for item " + item.join("/"));
	}

	// Call each listener
	listeners.forEach(function(listener) {
		listener.apply(self, args);
	});
};

module.exports = ItemManager;
