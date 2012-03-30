var Petal = function(item_manager) {
	this.item_manager = item_manager;
};

Petal.prototype.item_manager = null;

/** Petal#shutdown:
 * This function is called by the hub when it is requested
 * to shutdown. The hub will terminate once the callback is called.
 *
 * Default behavior is to immediately call callback.
 **/
Petal.prototype.shutdown = function (callback) {
	if (callback) {
		callback.call (this);
	}
};

Petal.register = function (constructor) {
	// TODO: Connect to hub over some protocol
	// TODO: Construct petal with ItemManager
	console.error ("Standalone petals are not implemented, yet.");
};

module.exports = Petal;
