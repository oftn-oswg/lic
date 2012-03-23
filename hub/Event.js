var Event = module.exports = function (item, type, data) {
	this.item = item;
	this.type = type;

	for (var key in data) {
		if (data.hasOwnProperty (key)) {
			this[key] = data[key];
		}
	}
};

Event.prototype.stringify = function () {
	return JSON.stringify (this);
};
