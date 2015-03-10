require("extend");

class Polygon {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
}

class Square extends Polygon {
  constructor(sideLength) {
    super(sideLength, sideLength);
  }
  get area() {
    return this.height * this.width;
  }
  set sideLength(newLength) {
    this.height = newLength;
    this.width = newLength;
  }
}

var square = new Square(2);




/**
 * Model field class
 */
class ModelField {
	
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

class MasterModel {
  
  constructor(data) {
//		this.setData(data);
  } 
  
  init(data, fields) {
  	this.fields = fields;
  	this.data = {};
  	this.setData(data);
  }
  
  get(fieldName) { 
  	return this.data[fieldName];  	
  }

  set(fieldName, value) {  	
  	var field = this.getField(fieldName);
  	if (!field) {
  		console.log(fieldName + " --> error field");
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
  		if (field.mandatory) {
  			if (!me.data[fieldName]) {
  				errors.push(fieldName + " is a mandatory field");
  			}
  		}
  	});
  	return errors;
  }
}

class User extends MasterModel {
	
  constructor(data) {
    super(data);
    
    this.init(data, [new ModelField({
    	name: "userName", 
    	scimAttr: "scimUserName",
    	defaultValue: "My user name",
  	}), new ModelField({
    	name: "name",
    	convert: function(val, record) {
    		return val + " is my name";
    	},
    	defaultValue: "My name",
  	}), new ModelField({
    	name: "gender",
    	mandatory: true,
  	})
    
  ]);
    
  }
  
}


var user = new User({userName: "efortes", name: "Elvin Fortes"});
console.log(user.get("name"));
console.log(user.validate());
console.log(user.getData());
console.log(user.getFields());
console.log("Is valid: " + user.isValid());