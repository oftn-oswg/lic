var util = require ("util");

/* ItemManager:
 * This object is the main router for all of lic's events.
 * Petals like the IRC manager will register all of its events
 * with the ItemManager instance belonging to the hub.
 * This is the main starting point for all of the events.
 */
var ItemManager = module.exports = function () {
};

ItemManager.prototype.send = function(event) {
	util.puts (util.inspect (event, false, 2, true));
};
