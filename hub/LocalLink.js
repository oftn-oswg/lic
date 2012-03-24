var LocalLink = function (hub, petal) {
	this.hub   = hub;
	this.petal = petal;
};

LocalLink.prototype.register = function (name, connect, disconnect)  {
	this.hub.registerPetal (name, connect, disconnect);
	this.petalName = name;
};

LocalLink.prototype.disconnect = function () {
	this.hub.disconnectPetal (this.petalName);
};

LocalLink.prototype.item = function (id) {
	return new Item (this.hub, this.petalName, id);
};

LocalLink.prototype.provide = function (namespace, handler) {
	this.hub.command_manager.defineProvider (this.petalName, namespace, handler);
};

LocalLink.prototype.unprovide = function (namespace) {
	// If the provider of the namespace is not the petal identified by
	// `petalName`, the provider will not be removed.
	this.hub.command_manager.removeProvider (this.petalName, namespace);
};

var Item = function (hub, petalName, id) {
	this.hub       = hub;
	this.petalName = petalName;
	this.id        = id;
};

Item.prototype.subscribe = function (type, handler) {
	this.hub.event_manager.addSubscription (this.petalName, this.id, type, handler);
};

Item.prototype.unsubscribe = function (type) {
	this.hub.event_manager.removeSubscription (this.petalName, this.id, type);
};

Item.prototype.invoke = function (command, args, success, error) {
	this.hub.command_manager.dispatch (this.id, { name:  this.petalName
	                                            , reply: success
	                                            , error: error }, command, args);
};

module.exports = LocalLink;
