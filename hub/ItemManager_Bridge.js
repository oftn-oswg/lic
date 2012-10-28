"use strict";

/**
  * ItemManager_Bridge:
  * this object gets created for every connection to the hub, and for every petal on the client
  * it keeps track of the subscriptions owned by that connection, and removes them when needed
  * refer to ItemManager documentation to see what all the functions do.
  */

var	ItemManager_Bridge = function ItemManager_Bridge(item_manager) {
	this.item_manager = item_manager;
	this.unsubscriptions = [];
	this.un_listens = [];
};

/**
  * ItemManager_Bridge#publish
  * should be fine
  */
ItemManager_Bridge.prototype.publish = function(item, type, data) {
	// not using call/apply is quite a whole lot faster.
	this.item_manager.publish(item, type, data);
};

/**
  * ItemManager_Bridge#subscribe:
  * like regular subscribe, but keeps track of subscriptions internally.
  */
ItemManager_Bridge.prototype.subscribe = function(item, type, listener, callback) {
	var self = this;
	this.item_manager.subscribe(item, type, listener, function(err, unsub) {
		if (err) {
			if (callback) {
				callback(err);
			}
		} else {
			/* add to unsub list */
			self.unsubscriptions.push(unsub);
			var was_subbed = true;
			if (callback) {
				callback(null, function() {
					// remove from unsub list
					// unless we already have.
					if (!was_subbed) {
						return;
					}
					self.unsubscriptions.splice(self.unsubscriptions.indexOf(unsub), 1);
					unsub.apply(this, arguments);
					was_subbed = false;
				});
			}
		}
	});
};

/**
  * ItemManager_Bridge#listen
  * TODO: actual logic, but there's no un_listen in ItemManager yet.
  */
ItemManager_Bridge.prototype.listen = function(items, listener, callback) {
	this.item_manager.listen(items, listener, callback);
};

/**
  * ItemManager_Bridge#command
  * should be fine
  */
ItemManager_Bridge.prototype.command = function() {
	this.item_manager.command.apply(this.item_manager, arguments);
};

/**
  * ItemManager_Bridge#cleanup
  * calls all of the stored unsubscribe functions
  */
ItemManager_Bridge.prototype.cleanup = function(callback) {
	var unsub_length = this.unsubscriptions.length;

	function try_callback() {
		if (callback) {
			callback();
		}
	}

	if (unsub_length == 0) {
		try_callback();
	}

	this.unsubscriptions.forEach(function(unsub) {
		unsub(function() {
			unsub_length--;
			if (unsub_length === 0) {
				try_callback();
			}
		});
	});
};

/**
  * ItemManager_Bridge#to_dnode
  * returns an object suitable for passing to a client
  * dnode does not pass along prototype methods
  * and it also binds everything to itself, IIRC
  */
ItemManager_Bridge.prototype.to_dnode = function() {
	var res = {}, self = this;
	["publish", "subscribe", "listen", "command"].forEach(function(n) {
		res[n] = self[n].bind(self);
	});
	return res;
};

module.exports = ItemManager_Bridge;
