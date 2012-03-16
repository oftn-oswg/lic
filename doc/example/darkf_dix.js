var darkf_dix = module.exports = function (hub) {
	var self    = this;
	this.hub    = hub;

	// We register ourself as darkf_dix and are returned a handle that
	// allows us to subscribe to or unsubscribe from events.
	hub.register (this, "darkf_dix", function (handle) {
		// The first argument specifies what item to subscribe to events from.
		// If null or undefined, the default is "*". The second argument
		// specifies what kind of events to accept. If left null or undefined,
		// it defaults to the special event kind "*", which matches any kind of
		// event.
		handle.subscribe ("irc/*", "message", function (e) { self.irc_message (e) });
	});
};

darkf_dix.prototype.irc_message = function (e) {
	if (e.data.from.match (/^darkf/)) {
		if (e.data.body.match (/\bdicks\b/i)) {
			// Don't propagate the message if it contains the whole word 'dicks'.
		} else {
			e.data.body = "dicks dicks dicks dicks dicks";
			e.next ();
		}
	} else {
		e.next ();
	}
};
