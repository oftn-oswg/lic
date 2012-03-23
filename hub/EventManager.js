
/* EventManager:
 * This object is the main router for all of Diaptoval's events.
 * Managers like the IRC manager will register all of its events
 * with an EventManager instance. This is the main starting point
 * for all of the events.
 */
var EventManager = module.exports = function () {
};

EventManager.prototype.send = function(event) {
	console.log (event.stringify ());
};

//EventManager
