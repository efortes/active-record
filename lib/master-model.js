var FieldModel = require("./field-model");
/**
 * Master model
 */
class MasterModel {
  
  constructor(data) {
  } 
  
  /**
   * Static method for field creation (Prevent extra field class include)
   */
  static createField(data) {
  	return new FieldModel(data);
  }
  
  init(data, fields) {
  	this.fields = fields;
  	this.data = {};
  	this.setData(data);
  }
  
  /**
   * Get field name
   */
  get(fieldName) { 
  	return this.data[fieldName];  	
  }

  /**
   * Set field value
   */
  set(fieldName, value) {  	
  	var field = this.getField(fieldName);
  	if (!field) {
  		return;
  	}
		this.data[fieldName] = field.convert(value, this);
  }
  
  /**
   * Get field by fieldName
   * @param <String> fieldName
   */
  getField(fieldName) {
  	var returnField = null;
  	this.fields.forEach(function(field, index) {
  		if (field.name == fieldName) {
  			returnField = field;
  		}
  	});
  	return returnField;
  } 
  
  /**
   * Get fields
   */
  getFields() {
  	return this.fields;
  }
  
  /**
   * Set data
   */
  setData(data) {
  	var me = this;
  	this.fields.forEach(function(field, index) {
  		var fieldName = field.name;
  		if (!(fieldName in data)) {
  			me.data.fieldName = (field.defaultValue != null && typeof(field.defaultValue) !== "undefined"? field.defaultValue : "");
  		} else {			
  			me.data.fieldName = data[fieldName];  			
  		}
  		me.set(fieldName, me.data.fieldName)
  	});  	
  }
  
  /**
   * Get data values
   * @return <Array>
   */
  getData() {
  	return this.data;
  }
  
  /**
   * Check if the object is valid
   * @return <Boolean>
   */
  isValid() {
  		return (this.validate().length > 0 ? false : true);
  }
  
  /**
   * Validate object
   * @return <Array> errors
   */
  validate() {
  	var me = this;
  	var errors = [];
  	this.fields.forEach(function(field, index) {
  		var fieldName = field.name;
  		
  		//Mandatory checj
  		if (field.mandatory) {
  			if (!me.data[fieldName]) {
  				errors.push(fieldName + " is a mandatory field");
  			}
  		}
  	});
  	return errors;
  }
  
  /*-------------------------- manipulation data ---------------------*/
  save(options) {
  	var _options = extend({
  		callback: function (err) {
  			
  		}
  	}, options);
  }
  
  load(referenceId, callback) {
  	var _options = extend({
  		callback: function (err, model) {
  			
  		}
  	}, options);  	
  }
  
  erase(options) {
  	var _options = extend({
  		callback: function (err) {
  			
  		}
  	}, options);    	
  }
}

module.exports = MasterModel;