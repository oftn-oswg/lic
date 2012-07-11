Function.prototype.trace = Function.prototype.call;

/*function() {
	var stdout = process.stdout, r;
	
	stdout.write (this.name + " (" + [].slice.call(arguments, 1).map(function(a) { return JSON.stringify(a); }).join(", ") + ")");
	stdout.write (" => " + JSON.stringify(r = this.call.apply (this, arguments)) + "\n");
	return r;
};
*/

Array.prototype.sum = function() {
	var s = 0, n, i = 0, l = this.length;
	while (i < l) {
		n = Number(this[i]);
		if (!isNaN(n)) {
			s += n;
		}
		i++;
	}
	return s;
};

String.prototype.repeat = function(i) {
	var d = '', t = this;
	while (i > 0) {
		if (i & 1) {
			d += t;
		}
		t += t;
		i >>= 1;
	}
	return d;
};

var Table = function(data) {
	if (data) {
		this.setData(data);
	}
	this.width = "auto";
	this.column_width = [];
}

Table.prototype.border = 1;
Table.prototype.spacing = 0;
Table.prototype.padding = 0;

Table.prototype.setData = function(data) {
	/* Make into multi-dim array of strings */
	if (!Array.isArray(data)) {
		data = [data];
	}
	if (!Array.isArray(data[0])) {
		data.forEach(function(item, nth) {
			data[nth] = [String(item)];
		});
	}
	this.data = data;
	return this.data;
};


Table.prototype.distributeWidths = function(columns, delta, min) {
		var total, num, distributed;

		total = columns.sum();
		num = columns.length;

		var shrinking = delta < 0;

		distributed = 0;
		columns.forEach(function(column, i) {
			var update = Math.floor(column / total * delta);
			columns[i] += update;
			distributed += update;
		});
		delta -= distributed;

		var i = -1, index;
		if (delta > 0) {
			while (delta--) { index = (i--) % num; columns[index]++; }
		} else {
			while (delta++) { index = (i--) % num; columns[index]--; }
		}

		return columns;
};


Table.prototype.calculateWidths = function(space) {

	space = (space == null) ? Infinity : space;

	/**
	 * This gives a maximum and minimum width
	 * for each column.
	 **/
	var self = this;
	var data = this.data;
	var column_widths = {
		min: [],
		max: [],
		used: []
	};

	data.forEach(function(row) {

		/**
		 * For each column, determine a maximum
		 * and minimum column width from the cells
		 * that span only that column. The minimum
		 * is that required by the cell with the
		 * largest minimum cell width (or the
		 * column 'width', whichever is larger).
		 * The maximum is that required by the
		 * cell with the largest maximum cell width
		 * (or the column 'width', whichever is larger).
		 **/

		row.forEach(function(cell, position) {

			/**
			 * Calculate the minimum content width of
			 * each cell: the formatted content may span
			 * any number of lines but may not overflow
			 * the cell box. If the specified 'width' of
			 * the cell is greater than the minimum
			 * content width, the specified width is the
			 * minimum cell width.
			 **/

			var min = self.getMinimumWidth(cell);
			column_widths.min[position] = Math.max(
				column_widths.min[position] || 0,
				self.column_width[position] || 0,
				min
			);

			/**
			 * Also, calculate the "maximum" cell width
			 * of each cell: formatting the content
			 * without breaking lines other than where
			 * explicit line breaks occur.
			 **/

			var max = self.getMaximumWidth(cell);
			column_widths.max[position] = Math.max(
				column_widths.max[position] || 0, max);

		});
	});

	var columns = column_widths.min.length;

	var borders = (columns + 1) * this.border;
	var spacing = (columns - 1) * this.spacing;
	var padding = (columns * 2) * this.padding;

	var total;
	var total_min = column_widths.min.sum() + spacing + borders + padding;
	var total_max = column_widths.max.sum() + spacing + borders + padding;

	/**
	 * If the table has a width of "auto", the used
	 * width is the greater of the table's containing
	 * width and total_min.
	 *
	 * However, if total_max is less than that of the
	 * containing block, use total_max.
	 *
	 * If the table's `width` property has a value
	 * other than "auto", the used width is the greater
	 * of `width` and total_min.
	 **/

	if (this.width === "auto") {
		total = Math.min(Math.max(space, total_min), total_max);
	} else {
		total = Math.max(this.width, total_min);
	}

	/**
	 * If the used width is greater than total_min,
	 * the extra width should be distributed over the columns.
	 **/

	if (total > total_min) {
		column_widths.used = this.distributeWidths (
			column_widths.max,
			total - total_max,
			column_widths.min);
	} else {
		column_widths.used = column_widths.min;
	}

	return {
		total: total,
		columns: column_widths.used
	};
};

Table.prototype.renderCell = function(string, width) {
	var out = [""];

	var left = width;
	var regex = /(\S+)(\s*)/ig;
	var result;
	var last = 0;

	while (result = regex.exec(string)) {
		var word = result[1].length;
		var space = result[2].length;
		if (word > left) {
			out.push (result[0]);
			left = width - (word + space);
			last++;
		} else {
			out[last] += result[0];
			left -= word + space;
		}
	}

	// Normalize, add necessary padding
	out.forEach(function(line,i) {
		line = line.trim();
		out[i] = line + " ".repeat(width - line.length);
	});

	return out;
};

Table.prototype.render = function(space) {
	var sizes, data, text;

	data = this.data;
	sizes = this.calculateWidths.trace(this, space);

	var sep = "+" + (sizes.columns.map(function(s) { return "-".repeat(s) + "+"; }).join("")) + "\n";
	text = sep;

	for (var r = 0, rlen = data.length; r < rlen; r++) {
		var row = data[r];
		var out = [];
		var lines = 0;
		for (var c = 0, clen = row.length; c < clen; c++) {
			var cell = this.renderCell(row[c], sizes.columns[c]);
			if (cell.length > lines) {
				lines = cell.length;
			}
			out[c] = cell;
		}
		for (var i = 0; i < lines; i++) {
			text += "|";
			for (var a = 0, len = out.length; a < len; a++) {
				if (out[a][i]) {
					text += out[a][i];
				} else {
					text += " ".repeat(sizes.columns[a]);
				}
				text += "|";
			}
			text += "\n";
		}
		text += sep;
	}
	return text;

};

/**
 * Finds the length of the longest non-breakable segment
 * in the string.
 **/
Table.prototype.getMinimumWidth = function getMinimumWidth(string) {
	string = String(string);
	
	var nonbreak = /\S+/ig;
	var result, length = 0;

	while (result = nonbreak.exec(string)) {
		if (result[0].length > length) {
			length = result[0].length;
		}
	}

	return length;
};

/**
 * Finds the length of the longest line in the string.
 **/
Table.prototype.getMaximumWidth = function getMaximumWidth(string) {
	string = String(string);

	var line = /.+/g;
	var result, length = 0;

	while (result = line.exec(string)) {
		if (result[0].length > length) {
			length = result[0].length;
		}
	}

	return length;
};

Table.prototype.setWidth = function(column, width) {
	column = Math.floor(Number(column));
	width = Math.floor(Number(width));

	if (isNaN(column) || isNaN(width)) {
		throw new RangeError("Arguments must be interpretable as a number");
	}

	if (column < 0 || width < 0) {
		throw new RangeError("Arguments must be non-negative");
	}

	this.column_width[column] = width;
};

module.exports = Table;
