var ItemManager_Bridge = require('../../hub/ItemManager_Bridge');

var Petal = function(item_manager, connection) {
	this.item_manager = item_manager;
	this.hub_connection = connection;
};

Petal.prototype.id = "petal";
Petal.prototype.name = "Unnamed";
Petal.prototype.item_manager = null;

/**
 * Petal#shutdown:
 * This function is called by the hub when it is requested
 * to shutdown. The hub will terminate once each petal calls
 * the callback.
 *
 * It's important not to access the ItemManager while petals
 * are shutting down because the hub freezes them before
 * calling the shutdown functions.
 *
 * Default behavior is to immediately call callback.
 **/
Petal.prototype.shutdown = function (callback) {
	if (callback) {
		callback.call (this);
	}
};

/**
 * Petal#local_quit:
 * This function can be called by the petal, to shut down cleanly, without killing the hub.
 * Currently only when Petal#is_separate.
 * Calling local_quit on petals running inside the hub will not remove any subscription,
 * or unregister the petal.
 **/
Petal.prototype.local_quit = function (callback) {
	var self = this;
	this.shutdown(function() {
		function after_cleanup() {
			function after_after_cleanup() {
				if (callback) {
					callback.apply(self, arguments);
				}
			}
			if (self.unregister) {
				self.unregister(after_after_cleanup);
			} else {
				after_after_cleanup();
			}
		}
		if (self.item_manager.cleanup) {
			self.item_manager.cleanup(after_cleanup);
		} else {
			after_cleanup();
		}
	});
};

/**
  * Petal.register:
  * for now, this function connects to the hub over the default interface, and registers with it.
  **/

Petal.register = function register(Constructor) {
	var dnode = require("dnode");
	var conn = dnode.connect("/tmp/lic.sock");
	conn.on('remote', function(remote) {
		var p = new Constructor(new ItemManager_Bridge(remote.item_manager), conn);
		remote.register({shutdown: p.shutdown.bind(p)}, function register_callback(unregister) {
			p.unregister = function unregister_and_end(cb) {
				unregister(function end_conn() {
					conn.end();
					if (cb) {
						cb();
					}
				});
			};
		});
	});
};

module.exports = Petal;
