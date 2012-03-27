var LicProvider = require ("./LicProvider.js");

var CommandManager = function (hub) {
	this.hub       = hub;
	this.providers = {};

	this.licProvider   = new LicProvider (this.hub);
	this.providers.lic = this.licProvider.respond.bind (this.licProvider);
};

CommandManager.prototype.define_provider = function (namespace, handler) {
	this.providers[namespace] = handler;
};

CommandManager.prototype.remove_provider = function (namespace) {
	delete this.providers[namespace];
};

CommandManager.prototype.dispatch = function (item, command, data, success, error) {
	if (!success || success.constructor !== Function) success = function () {};
	if (!error   || error.constructor   !== Function) error   = function () {};

	var itemParts = item.match (/^([^\/]*)(.*)$/);

	function log_success (value) {
		console.log ("\033[35m"  + itemParts[1] + "\033[36m" + itemParts[2] + "\033[1;32m\t" + command +
		             "\033[0m\t" + JSON.stringify (data) + " \033[32m=>\033[0m " + JSON.stringify (value));

		success (value);
	}

	function log_error (value) {
		console.log ("\033[35m"  + itemParts[1] + "\033[36m" + itemParts[2] + "\033[1;31m\t" + command +
		             "\033[0m\t" + JSON.stringify (data) + " \033[31m=>\033[0m " + JSON.stringify (value));

		error (value);
	}

	if (this.providers.hasOwnProperty (itemParts[1])) {
		this.providers[itemParts[1]] (item, command, data, log_success, log_error);
	} else {
		log_error ({type: "NoProvider", description: "There is no connected petal capable of handling the request."});
	}
};

module.exports = CommandManager;
