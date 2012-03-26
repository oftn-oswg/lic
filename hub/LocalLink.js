var LocalLink = function (hub, petal) {
	this.hub   = hub;
	this.petal = petal;
};

LocalLink.prototype.register = function (name, connect, disconnect)  {
	this.hub.register_petal (name, connect, disconnect);
	this.petal_name = name;
};

LocalLink.prototype.disconnect = function () {
	this.hub.disconnect_petal (this.petal_name);
};

LocalLink.prototype.item = function (id) {
	return new Item (this.hub, this.petal_name, id);
};

LocalLink.prototype.provide = function (namespace, handler) {
	var wrapped_handler = function (item, sender, command, args, success, error) {
		handler (item, {name: sender, reply: success, error: error}, command, args);
	};
	this.hub.command_manager.define_provider (this.petalName, namespace, wrapped_handler);
};

LocalLink.prototype.unprovide = function (namespace) {
	// If the provider of the namespace is not the petal identified by
	// `petalName`, the provider will not be removed.
	this.hub.command_manager.remove_provider (this.petalName, namespace);
};

var Item = function (hub, petal_name, id) {
	this.hub        = hub;
	this.petal_name = petal_name;
	this.id         = id;
};

Item.prototype.subscribe = function (type, handler) {
	var self = this;

	var wrapped_handler = function (item, type, data) {
		handler ({item: item, type: type, data: data, next: function () {
			self.hub.event_manager.next (self.petal_name, this.item, this.type, this.data);
		}});
	};
	this.hub.event_manager.subscribe (this.petal_name, this.id, type, wrapped_handler);
};

Item.prototype.unsubscribe = function (type) {
	this.hub.event_manager.unsubscribe (this.petal_name, this.id, type);
};

Item.prototype.publish = function (type, data) {
	this.hub.event_manager.publish (this.id, type, data);
};

Item.prototype.invoke = function (command, args, success, error) {
	this.hub.command_manager.dispatch (this.id, { name:  this.petal_name
	                                            , reply: success
	                                            , error: error }, command, args);
};

module.exports = LocalLink;
