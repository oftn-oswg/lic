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
	//console.log ("\x1b[0;35m%s\x1b[0m \x1b[0;34m%s\x1b[0m: %s", item.join("/"), type, JSON.stringify(data));
	var event = {
		item: item,
		type: type,
		data: data
	};

	if (this.frozen) {
		return;
	}

	var node, self = this, subscriptions = [];
	
	node = this.event_tree;
	
	// Go through command_tree and add subscriptions to `subscriptions` array
	for (var i = 0, len = item.length; i < len; i++) {
		// Add wildcard item subscriptions
		if (node["*"]) {
			Array.prototype.push.apply (subscriptions, node["*"].subscriptions.filter(function(s) {return s.type === type || s.type === "*";}));
		}

		if (typeof node[item[i]] !== "object") {
			break;
		}

		node = node[item[i]];
	}
	if (node.subscriptions) {
		Array.prototype.push.apply (subscriptions, node.subscriptions.filter(function(s) {return s.type === type || s.type === "*";}));
	}

	if (subscriptions.length === 0) {
		//console.error("No subscriptions for item " + item.join("/"));
		return;
	}

	// Call each subscription
	// TODO: some dependency management?
	i = 0;
	function next(e) {
		if (i < subscriptions.length){
			subscriptions[i++].listener.call(self, event);
		}
	}
	event.next = next;
	next(event);
};

ItemManager.prototype.subscribe = function(item, type, listener, callback) {
	var self = this;
	if (typeof item === "string") {
		item = item.split("/");
	}
	if (!Array.isArray(item) || item.length === 0) {
		if (callback) {
			callback.call (this, new Error("Invalid argument for subscribe"));
		}
	} else {
		var node = this.event_tree;
		var item_length = item.length;
		var part;

		for (var i = 0; i < item_length; i++) {
			part = item[i];
			if (typeof node[part] !== "object") {
				node[part] = {};
			}
			node = node[part];
		}
		if (node.subscriptions) {
			node.subscriptions.push({listener: listener, type: type});
		} else {
			node.subscriptions = [{listener: listener, type: type}];
		}

		if (callback) {
			// give unsubscribe function back, we need this because we might be running over dnode.
			callback(null, function(callback) {
				self.unsubscribe(item, type, listener, callback);
			});
		}
	}

};

ItemManager.prototype.unsubscribe = function(item, type, listener, callback) {
	if (typeof item === "string") {
		item = item.split("/");
	}
	if (!Array.isArray(item) || item.length === 0) {
		if (callback) {
			callback.call (this, new Error("Invalid argument for subscribe"));
		}
	} else {
		var node = this.event_tree;
		var item_length = item.length;
		var part;
		var traversed_tree = new Array(item_length);
		var i;

		for (i = 0; i < item_length; i++) {
			part = item[i];
			traversed_tree[i] = node;
			if (typeof node[part] !== "object") {
				node = node[part];
				break;
			}
			node = node[part];
		}
		if (typeof node === "object") {
			if (node.subscriptions) {
				var subscr_length = node.subscriptions.length;
				for (i = 0; i < subscr_length; i++) {
					if (node.subscriptions[i].type === type && node.subscriptions[i].listener === listener) {
						node.subscriptions.splice(i, 1);
						break;
					}
				}
				// clean up a branch that has no subscriptions
				if (node.subscriptions.length === 0) {
					delete node.subscriptions;
					for (i = item_length-1; i >= 0; i--) {
						if (Object.keys(traversed_tree[i][item[i]]).length === 0) {
							delete traversed_tree[i][item[i]];
						}
					}
				}
			}
		}
		if (callback) {
			callback.call (this, null);
		}
	}
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
		if (callback) {
			callback.call (this, null);
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
