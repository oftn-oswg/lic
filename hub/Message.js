var Message = module.exports = function(type, data) {
	this.type = type;

	for (var key in data) {
		if (data.hasOwnProperty (key)) {
			this[key] = data[key];
		}
	}
};

Message.prototype.stringify = function() {
	return JSON.stringify (this);
};
