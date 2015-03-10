/**
 * Model field class
 */
class FieldModel {
	
	constructor(data) { 
		
		/**
		 * Add all keys as a property
		 */
		for (var key in data) {
			this[key.toString()] = data[key];
		};
		
		/**
		 * Default properties
		 */
		this.name = data.name;
		this.defaultValue = data.defaultValue;
		this.mandatory = data.mandatory;
		if (!data.convert) {
			data.convert = function(val, record) { 
				return val;
			}
		}
		this.convert = data.convert;
	} 
}

module.exports = FieldModel;