var LicProvider = module.exports = function (hub) {
	this.hub = hub;
};

LicProvider.prototype.respond = function (item, command, data, success, error) {
	var md
	  , NotFound     = {type: "NotFound",     description: "The requested item does not exist."}
	  , NotSupported = {type: "NotSupported", description: "The requested method is not supported."}
	  ;

	if (item.match (/^lic\/config/)) {
		this.hub.config.respond (item, command, data, success, error);

	} else if (item === "lic/petals") {
		if (command.match (/^load$/i)) {
			this.hub.load_petal (data.toString (), function () {
				success (true);
			}, function (e) {
				error ({type: "LoadFailure", description: e.message});
			});

		} else if (command.match (/^list$/i)) {
			var petals = [];

			for (var petal in this.hub.petals)
				if (this.hub.petals.hasOwnProperty (petal))
					petals.push (petal.slice ());

			success (petals);

		} else {
			error (NotSupported);
		}

	} else if ((md = item.match (/^lic\/petals\/(.*)/)) && this.hub.petals.hasOwnProperty (md[1])) {
		if (command.match (/^disconnect$/)) {
			this.hub.disconnect_petal (md[1], function () {
				success (true);
			});

		} else {
			error (NotSupported);
		}

	} else if (item === "lic") {
		if (command.match (/^quit$/i)) {
			this.hub.shutdown ();
		} else {
			error (NotSupported);
		}
	} else {
		error (NotFound);
	}
};
