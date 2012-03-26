
/* EventManager:
 * This object is the main router for all of lic's events.
 */
var EventManager   = module.exports = function (hub) {
	this.hub         = hub;
	this.tree        = {};
	this.nonRoots    = {};
	this.subscribers = {};
};

EventManager.prototype.load_tree = function (tree) {
	// Grab a list of petals that are not at the top of the tree
	// and therefore should not recieve newly minted events. For
	// optimization purposes, this is an object. We use the object
	// for its ability to behave like a set.
	var nonRoots = {};

	for (var k in tree) {
		if (tree.hasOwnProperty (k) && tree[k].hasOwnProperty ('length')) {
			for (var i = 0; i < tree[k].length; i++) nonRoots[tree[k][i]] = true;
		}
	}

	this.tree     = tree;
	this.nonRoots = nonRoots;
};

EventManager.prototype.publish = function (item, type, data) {
	if (typeof data === "undefined") data = null;

	var itemMD = item.match (/^([^\/]*)(.*)$/);
	console.log ("\033[35m" + itemMD[1] + "\033[36m" + itemMD[2] + "\033[1;33m\t" + type + "\033[0m\t" + JSON.stringify (data));

	// Bash-style asterisk rules.
	function glob_match (glob, target) {
		// First we escape anything in the glob that has a special meaning
		// in regular expressions (except asterices), and then we replace
		// all double asterices with ".*" and all single asterices with "[^/]*".
		// We surround that with "^" and "$", and then we compile the new
		// regular expression matching our glob.
		return !!target.match (new RegExp ("^" + glob.replace (/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
		                                             .replace (/\*(?!\*)/g, "[^/]*")
		                                             .replace (/\*{2,}/g, + "$")));
	}

	// If the event is on lic/config/lic/routes we need to reload the tree
	if (item === "lic/config/lic/routes") {
		if (type === "update") {
			this.load_tree (data);
		} else if (type === "delete") {
			this.load_tree ({});
		}
	}

	for (var s_item in this.subscribers) {

		if (this.subscribers.hasOwnProperty (s_item) && glob_match (s_item, item)) {
			var o_item = this.subscribers[s_item];

			for (var s_type in o_item) {

				if (o_item.hasOwnProperty (s_type) && glob_match (s_type, type)) {
					for (var i = 0; i < o_item[s_type].length; i++) {
						var o = o_item[s_type][i];

						if (!this.nonRoots.hasOwnProperty (o.petal_name)) {
							console.log ("[DEBUG] sending to " + o.petal_name + " who requested " + s_item + "!" + s_type);
							o.handle (item, type, data);
						}
					}
				}
			}
		}
	}
};

EventManager.prototype.next = function (petal_name, item, type, data) {
	if (this.tree.hasOwnProperty (petal_name)) {
		var nexts = this.tree[petal_name];

		function glob_match (glob, target) {
			return !!target.match (new RegExp ("^" + glob.replace (/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
			                                             .replace (/\*(?!\*)/g, "[^/]*")
			                                             .replace (/\*{2,}/g, + "$")));
		}

		for (var s_item in this.subscribers) {

			if (this.subscribers.hasOwnProperty (s_item) && glob_match (s_item, item)) {
				var o_item = this.subscribers[s_item];

				for (var s_type in o_item) {

					if (o_item.hasOwnProperty (s_type) && glob_match (s_type, type)) {
						for (var i = 0; i < o_item[s_type].length; i++) {
							var o = o_item[s_type][i];

							if (nexts.indexOf (o.petal_name) > -1) {
								console.log ("[DEBUG] next() from " + petal_name + " to " + o.petal_name + " who requested " + s_item + "!" + s_type);
								o.handle (item, type, data);
							}
						}
					}
				}
			}
		}
	}
};

EventManager.prototype.subscribe = function (petal_name, item, type, handler) {
	item    = item    || "**";
	type    = type    || "**";
	handler = handler || function () {};

	console.log ("[DEBUG] " + petal_name + " subscribe: " + item + "!" + type);

	this.subscribers[item]       = this.subscribers[item]       || {};
	this.subscribers[item][type] = this.subscribers[item][type] || [];

	this.subscribers[item][type].push ({petal_name: petal_name, handle: handler});

	if (this.hub.petals.hasOwnProperty (petal_name)) {
		this.hub.petals[petal_name].subscriptions.push ({item: item, type: type});
	}
};

EventManager.prototype.unsubscribe = function (petal_name, item, type) {
	var i;

	console.log ("[DEBUG] " + petal_name + " unsubscribe: " + item + "!" + type);

	if (this.subscribers.hasOwnProperty           (item) &&
	    this.subscribers[item].hasOwnProperty     (type)) {

		var subs = this.subscribers[item][type];

		for (i = 0; i < subs.length; i++) {
			if (subs[i].petal_name === petal_name) {
				subs.splice (i, 1);
			}
		}
	}

	if (this.hub.petals.hasOwnProperty (petal_name)) {
		var subscriptions = this.hub.petals[petal_name].subscriptions;

		for (i = 0; i < subscriptions.length; i++) {
			if (subscriptions[i].item === item && subscriptions[i].type === type) {
				subscriptions.splice (i, 1);
			}
		}
	}
};
