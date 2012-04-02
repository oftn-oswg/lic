var Petal = function(item_manager) {
	this.item_manager = item_manager;
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

Petal.register = function (constructor) {
	// TODO: Connect to hub over some protocol
	// TODO: Construct petal with ItemManager
	console.error ("Standalone petals are not implemented, yet.");
};

module.exports = Petal;
