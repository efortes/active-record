var extend = require("extend");
/**
 * Model field class
 * @author Elvin Fortes
 */
class FieldModel {
	
	constructor(data) { 
		
		/**
		 * Default properties
		 */
		//field name
		this.name = null;
		
		//default value for this field
		this.defaultValue = null;
		
		//false to exclude this field from being synchronized with the storage object (db)
		this.sync = true;
		
		//converts an value
		this.convert = function(val, record) { 
			return val;
		}		
		
		/**
		 * Validation properties
		 */
		this.mandatory = null;

		
		this.validations = {			
			mandatory: false,
			minLength: false,
			allowEmpty: true,           // don't allow empty strings
			isEmail: false,
			isArray: false,            // only allow arrays
			matcher: null 						// regexp
		};
		
		if (data.validations) {
			this.validations = extend(this.validations, data.validations);
			delete data.validations;
		}
		
		/**
		 * Add all keys as a property
		 */
		for (var key in data) {
			this[key.toString()] = data[key];
		};
	} 
}

module.exports = FieldModel;