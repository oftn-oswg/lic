var LicProvider = module.exports = function (hub) {
	this.hub = hub;
};

LicProvider.prototype.respond = function (item, command, data, success, error) {
	if (item.match (/^lic\/config/)) {
		this.hub.config.respond (item, command, data, success, error);
	} else if (item === "lic" && command === "quit") {
		this.hub.shutdown ();
	} else {
		error ({type: "NotFound", description: "The requested item does not exist."});
	}
};
