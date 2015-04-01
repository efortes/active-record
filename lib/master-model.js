var FieldModel = require("./field-model");
var validator = require('validator');
var extend = require('extend');
/**
 * Master model
 * 
 * Associations example:
 *    var associations = [
 *       {type: 'hasOne', model: LanguageModel,  name: 'language'},
 *       {type: 'hasMany', model: PortalLanguage, name: 'portalLanguage'}
 *   ]
 * @author Elvin fortes
 * 
 */
class MasterModel {
	
	/**
	 * Class system does not support static vars jet
	 */
  static initConfig(config) {
  	var _config = extend({
  		primaryKey: null,
  		table: null,
  		adapter: null,
  		connection: null,
  		fields: [] //TODO NOT IMPLEMENTED JET. Can't get this to work with the instance
		}, config);
  	
  	for (var key in _config) {
  		this[key] = _config[key];
  	}
  }	
	
  constructor(data, options) {
  	this.data = {};
  	this.fields = {};
  	this.associations = [];
  	this.dirty = false;
  	
  	/**
     * modified key/value pairs of all fields whose values have changed.
     * The value is the original value for the field.
     */
    this.modified = {};  	
  	this.model = null;
  }
  
  /**
   * Get the current Object Class
   */
  getModel() {
  	return this.model;
  }

  /**
   * Init model
   */
  init(data, fields, associations, model) {

    if ( associations && !Array.isArray( associations ) ) {
      // no associations, the 3rd param is the model
      model = associations;
      associations = null;
    }
    
  	if (!associations) {
  		associations = [];
  	}

  	this.fields = fields;
  	this.data = {};
    // TODO: isDirty wordt hier dus niet gezet
  	this.setData(data, false);
  	this.setRawData(data);
  	this.setAssociations(associations);
  	this.model = model;

  }
  
  /**
   * Set the associations
	 * Associations example:
	 * The <name> field coresponds with the field names.
	 *    var associations = [
	 *       {type: 'hasOne', model: LanguageModel,  name: 'language'},
	 *       {type: 'hasMany', model: PortalLanguage, name: 'portalLanguage'}
	 *   ]
   */
  setAssociations(associations) {
  	this.associations = associations;
  }
  
  /**
   * Get the associations
   */
  getAssociations() {  	
  	return this.associations;
  }
  
  /**
   * Get asscociation object by name
   * @param <String> name
   */
  getAssociation(name) {
  	var record = null;  	
  	this.getAssociations().forEach(function(ass, i) {
  		if (ass.name == name) {
  			record = ass;
  		}
  	});  	
  	return record;
  }  
  
  /**
   * Get the field value by name
   * @param <String> fieldName field name to return
   * @param <Boolean> returnConverted return the converted value. The convert method is defined in the field definition.
   */
  get(fieldName, returnConverted) { 
  	var _this = this;
  	
  	var val = this.data[fieldName];
  	
  	//Get converted
  	if (returnConverted) {
    	var field = this.getField(fieldName);
    	if (!field) {
    		return val;
    	}  
    	val = field.convert(val, this);
  	}
  	
  	var ass = this.getAssociation(fieldName);
  	//If its an associated field we know that it should auto init 
  	//Disabled for now
  	if (ass && 1 > 2) {
  		if (ass.type == "hasOne") {
  			var whereField = _this.table + "Id";  //TODO change Id to pk in the association pk
  			var model = null;
  			var where = {};
  			where[whereField.valueOf()] = _this.get("id");
  			ass.model.find({
  				where: where,
  				callback: function(err, modelInstance) {
  					if (err) {
  						return console.log(err);
  					}
  					//console.log(modelInstance);
  				}
  			});
  			
  		}
  	}
  	
  	return val; 	
  }
  
  /**
   * Set the dirty state when a sync field is edited
   */
  setDirty() {  
  	var _this = this;
  	this.getFields().forEach(function(field, index) {
  		if (field.sync) {
  			_this.dirty = true;
  			_this.modified[field.name] = _this.get(name);
  		}
  	});
  }

  /**
   * Set field value
   * @param <string> fieldName 
   * @param <ALL> value 
   */
  set(fieldName, value) {
  	var _this = this;
  	var field = this.getField(fieldName);
  	if (!field) {
  		return;
  	}
    
	// temp csave current val
	var currentValue = this.data[fieldName];
	
	// Set the value
	this.data[fieldName] = value;
	
	var Model = this.model;
	
	// Mark dirty
	if (!Model) {
		return; // implement error
	}
	if (!Model.isEqual(currentValue, value)) {
		if (_this.modified.hasOwnProperty(field.name)) {
			if (!Model.isEqual(_this.rawData[field.name], value)) {
				
				// This field is no longer dirty
			delete modified[field.name];
			
			// Set the model dirty state to false
			_this.dirty = false;
			
			// Loop and check if the there are any modifications. If so mark the model dirty again
				for (key in _this.modified) {
				  if (_this.modified.hasOwnProperty(key)) {
					_this.dirty = true;
					  break;
				  }
				}					
			}
		} else {
			_this.dirty = true;
			_this.modified[fieldName] = currentValue;
		}
	}
  }
  
  /**
   * Check if the model or a field is marked dirty
   */
  isDirty(fieldName) {
  	if (fieldName) {  		
  		if (this.modified.hasOwnProperty(fieldName)) {
  			return true;
  		}
  	}
  	return this.dirty
  }
  
  /**
   * Check if 2 vars are the same
   */
  static isEqual(a, b){
  	//TODO check whether the objects are dates
  	var isDate = function(d) {
  		return false;
  	};
    if (isDate(a) && isDate(b)) {
        return a.getTime() === b.getTime();
    }
    return a === b;
  }
  
  push(fieldName, data) {
  	var field = this.getField(fieldName);
  	if (!field) {
  		return;
  	}
  	
  	//TODO add array check in field definition
  	if (Array.isArray(this.data[fieldName])) {
  		this.data[fieldName].push(data);
  	}	
  };
  
  /**
   * Get field by fieldName
   * @param <String> fieldName
   */
  getField(fieldName) {
  	var returnField = null;
  	this.getFields().forEach(function(field, index) {
  		if (field.name == fieldName) {
  			returnField = field;
  		}
  	});
  	return returnField;
  } 
  
  /**
   * Get fields
   * @param <Array> fieldNames If empty all fields will be returned
   */
  getFields(fieldNames) {
  	if (Array.isArray(fieldNames)) {
  		if (fieldNames.length > 0) {  			
  			var res = [];
  			this.getFields().forEach(function(field, index) {
  				if (fieldNames.indexOf(field.name) !== -1) {
  					res.push(field);
  				}
  			});
  			return res;  	
  		}
  	}
//  	var funcNameRegex = /function (.{1,})\(/;
//  	var results = (funcNameRegex).exec((this).constructor.toString());
//  	var InstanceName = ((results && results.length > 1) ? results[1] : "");
  	
  	//console.log(this);
  	
//  	if (this.fields.length > 0) {
//  	}
  	return this.fields;
  	
//  	return MasterModel.fields;
  }
  
  /**
   * Set raw data
   */
  setRawData(data) {
  	this.rawData = data;
  }
  
  /**
   * Set raw data
   */
  getRawData(data) {
  	return this.rawData;
  }
  
  /**
   * Set data
   */
  setData(data, isDirty) {
    if ( isDirty === undefined ) {
      isDirty = true;
    }
  	if (typeof(data) == "undefined") {
  		data = {};
  	}
  	var me = this;
  	this.getFields().forEach(function(field, index) {
  		var fieldName = field.name;
  		if (!(fieldName in data)) {
  			me.data[fieldName] = (field.defaultValue != null && typeof(field.defaultValue) !== "undefined"? field.defaultValue : "");
  		} else {			
  			me.data[fieldName] = data[fieldName];  			
  		}
  		me.set(fieldName, me.data[fieldName], isDirty);
  	});
  }
  
  /**
   * Get data values
   * @param <Boolean> returnConverted return teh converted value that is defined in the field definition
   * @return <Array>
   */
  getData(returnConverted) {

  	var _this = this;
  	var data = extend({}, this.data);
  	
  	//Get data for each associated model
  	this.getAssociations().forEach(function(ass, i) {
  		var subDataSet = null;
  		if (Array.isArray(data[ass.name])) {
  			subDataSet = [];
  			data[ass.name].forEach(function(subModel, e) {
  				subDataSet.push(subModel.getData());
  			});
  		} else {
  			subDataSet = data[ass.name].getData();  			
  		}  		
  		data[ass.name] = subDataSet;
  	});
  	
  	//Return converted values
  	if (returnConverted) {
  		//Convert all fields when needed
  		this.getFields().forEach(function(field, index) {
  			var fieldName = field.name;
  			if (fieldName in data) {
  				data[fieldName] = field.convert(data[fieldName], _this);
  			}
  		});  		
  	} 	
  	
  	return data;
  }
  
  /**
   * Check if the object is valid
   * @return <Boolean>
   */
  isValid(fieldName) {
  	if (fieldName) {
  		var field = this.getField(fieldName);
  		if (field) {  			
  			return (this.validateField(field).length > 0 ? false : true);
  		}
  		return false; //Return false because field does not exist
  	}
  	return (this.validate().length > 0 ? false : true);
  }
  
  /**
   * Validate field by name
   * @return <Array> errors
   */
  validateField(field) {
  	var errors = [];
		var fieldName = field.name;	
		var value = this.data[fieldName];
		
		//Mandatory check
		if (!field.validations.allowEmpty) {
			if (!value || value.length < 1) {
				errors.push(fieldName + " is a mandatory field");
			}			
		} 
		
		//Matcher check
		if (field.validations.matcher != null) {

			//TODO this matcher is not working jet
			if (!validator.matches(value, field.validations.matcher) ) {
				errors.push(fieldName + " does not match");
			}			
		} 
		
		
		return errors;
  }
  
  /**
   * Validate object
   * @return <Array> errors
   */
  validate() {
  	var me = this;
  	var errors = [];
  	this.getFields().forEach(function(field, index) {
  		var fieldErrors = me.validateField(field);
  		if (fieldErrors.length > 0) {
  			errors.push(fieldErrors);
  		}
  	});
  	return errors;
  }
  
  /*-------------------------- instance methods ---------------------*/
  save(options) {

    var _this = this;
    
  	var _options = extend({
  		callback: function (err) {}
  	}, options);

    if ( !_this.model ) {
      _options.callback('No model found')
    }

    var fields = _this.getFields()
    var data   = _this.getData()

    var savedata = {};

    fields.forEach(function(field){
      if ( field.isDirty ) {
        // TODO: wil je hier nog valideren? lijkt me wel; zowel per veld (update) als het hele object (insert)
        if ( field.sync && field.name != _this.model.primaryKey ) {
          savedata[field.name] = _this.get(field.name);
        }
      }
    });

    if ( !Object.keys(savedata).length ) {
      _options.callback('Nothing to save')
    }

    var statement = '';
    var bindvars  = [];
    // TODO: primary key zou ook moeten kunnen omgaan met multiples, maar dat geldt door dit hele object heen
    // TODO: het zou mooier zijn om dit te doen met een 'gevonden in db' paramater die wordt gezet in de fetch
    if ( _this.get( _this.model.primaryKey ) ) {
      statement += 'UPDATE ' + _this.model.table + ' SET ';
      var setdata = [];
      Object.keys(savedata).forEach(function(key){
        setdata.push( '`' + key + '` = ? ' );
        bindvars.push( savedata[key].toString() )
      })
      statement = statement + setdata.join(', ');
      statement = statement + ' WHERE ' + _this.model.primaryKey + ' = ' + _this.get( _this.model.primaryKey );
    } else {
      statement += 'INSERT INTO `' + _this.model.table + '` (`';
      statement = statement + Object.keys(savedata).join('`, `');
      statement = statement + '`) VALUES (';
      statement = statement + Object.keys(savedata).map( function(key)  { return '?' } ).join(', ');
      Object.keys(savedata).map( function(key)  { bindvars.push( savedata[key].toString() ) } );
      statement = statement + ')';
    }

    console.log('SAVE:')
    console.log(statement)
    console.log(bindvars)

    _this.model.connection.query(
      statement,
      bindvars,
      _options.callback
    )

  }
  
//  fetch(referenceId, callback) {
//  	var _options = extend({
//  		callback: function (err, model) {
//  			
//  		}
//  	}, options);  	
//  }
  
  erase(options) {
  	var _options = extend({
  		callback: function (err) {
  			
  		}
  	}, options);    
  	//TODO DELETE by pk
  }
  

  /*-------------------------- static methods ---------------------*/
//  static initConfig(config) {
//  	var _config = extend({
//  		primaryKey: null,
//  		table: null,
//  		adapter: null,
//  		connection: null
//		}, config);
//  	
//  	for (var key in _config) {
//  		this[key] = _config[key];
//  	}
//  }
  
  
  /**
   * Static method for field creation (Prevent extra field class include)
   */
  static createField(data) {
  	return new FieldModel(data);
  }
  
  /**
   * Get by reference Id
   * @param <String/integer> 
   * @param <Object>  
   */
  static findById(id, options) {
  	var _options = extend({
  		where: {
  			[this.primaryKey.valueOf()]: id
  		}
  		
  	}, options);
  	
  	this.find(_options);
  }  
  
  static findAll(options) {
  	var _options = extend({
  		offset: 0,
  		limit: 20,
  		where: {},
  	}, options); 	
  	
  	this.query(_options);
  }
  
  static find(options) {
  	var _options = extend({
  		where: {},
  		single: true,
  	}, options); 	
  	this.query(_options); 	
  }
  
  
  /**
   * Find all objects
   * @param <Object>  
   */  
  static query(options) {
  	var _options = extend({
  		offset: null,
  		limit: null,
  		where: {},
  		single: false,
  		count: false,
  		include: [],
  		rawData: false,
  		fields: null,
  		callback: function (err, model) {
  			
  		}
  	}, options);
  	
  	var _this = this;

    switch(this.adapter) {

    case 'mysql':
  		var sqlParams = [];
  		
  		
  		//TODO at the moment the fields are dfined within the constructor. So we need to init the model :(
  		var model = new _this();
  		var associations = model.getAssociations();
  		
  		var queryFields = [];
  		var queryJoins = [];
  		
  		var includeModelFields = function(Model, fields) {
  			fields.forEach(function(field, index) {
  				if (!field.sync) {
  					return;
  				}  				
  				queryFields.push(Model.table + "." + field.name + " AS " + Model.table + "_" + field.name);
  			});  			
  		}
  		
  		var capitalize = function(s) {
  		    return s[0].toUpperCase() + s.slice(1);
  		}  		
  		
//  		var getObjName = function(obj) {
//  		   var funcNameRegex = /function (.{1,})\(/;
//  		   var results = (funcNameRegex).exec((obj).constructor.toString());
//  		   return (results && results.length > 1) ? results[1] : "";
//  		}
  		//Select the default fields
  		includeModelFields(_this, model.getFields());
  		
  		//Add the joins
  		_options.include.forEach(function(name, i) {
  			
  			var association = model.getAssociation(name);
  			if (!association) {
  				return;
  			}
  			
  			var JoinModel = association.model;
  			
  			var instance = new JoinModel();
  			includeModelFields(JoinModel, instance.getFields());
  			associations.forEach(function(ass, assIndex) {  				
  				
					if (ass.model.table == JoinModel.table) {
						switch(ass.type) {
						case "hasOne":
							queryJoins.push("LEFT JOIN " + JoinModel.table + " ON " + JoinModel.table + ".id = " + _this.table + "." + JoinModel.table + capitalize("id"));
							break;
						case "hasMany":
							queryJoins.push("LEFT JOIN " + JoinModel.table + " ON " + JoinModel.table + "." + _this.table + "Id =" + _this.table + ".id");
							break;
						}
					}
				});  			

  		});

  		var sql = "SELECT " + queryFields.join(",")  + " FROM " + this.table + " ";
  		
  		
  		if (_options.include.length > 0) {
  			sql += queryJoins.join(" ") + " ";
  		}
  		
  		if (Object.keys(_options.where).length > 0) {
  			sql += "WHERE ";
  		}
  		
  		//TODO WHERE as array and then join by and
  		
  		Object.keys(_options.where).forEach(function(key, i) {
  			sqlParams.push(_options.where[key]);
  			
  			//In statement
  		  if (Array.isArray(_options.where[key]) ) {
  		    sql += _this.table + "." + key + " IN ( ? ) ";
  		  } else {
  		    sql += _this.table + "." + key + " = ? ";
  		  }
  		  
  			if ((i + 1) < Object.keys(_options.where).length) {  				
  				sql += "AND ";
  			}
  		});
  		
  		
  		
  		if (_options.offset != null && _options.limit != null) {
  			sqlParams.push(_options.offset);
  			sqlParams.push(_options.limit);
  			sql += " limit ?,?";
  		}
  		
  		this.connection.query(sql, sqlParams, function(err, results, fields) {
  			if (err) {
  				return _options.callback(err);
  			}
  			
  			
  			//On single return
  			if (_options.single) {
  				if (results.length < 1) {
  					return _options.callback(err, null);
  				}		
    			
  				var modelData = _this.fromPrefix(results[0], _this.table + "_");
    			results.forEach(function(rec, i) {
	  				modelData = _this.buildJoinModel(rec, modelData, associations);	  				
    			});
  				var newModel = new _this(modelData);
  				return _options.callback(err, newModel);
  			}
  			
  			var res = [];
  			if (results.length > 0) {
  				results.forEach(function(rec, i) {
  					
  					var modelData = _this.fromPrefix(rec, _this.table + "_");
  					
  					modelData = _this.buildJoinModel(rec, modelData, associations);
  					
  					var newModel = new _this(modelData);
  					res.push(newModel);
  				});
  			}  			
  			_options.callback(err, res);
  			
  		});
      break;

    case 'ldap':
  		var result = [];
  		result.push(new _this());
  		_options.callback(null, result);
      break;

    default:
  			_options.callback(''); // TODO: how should this error be formatted?
    }
  	
  }  
  
  static buildJoinModel(rec, modelData, associations) {
  	var _this = this;
		associations.forEach(function(ass, i) {
			if (ass.type == "hasOne") {
				modelData[ass.name] = new ass.model(_this.fromPrefix(rec, ass.model.table + "_"));
			}
			if (ass.type == "hasMany") {
				if (!Array.isArray(modelData[ass.name])) {
					modelData[ass.name] = [];
				}
				modelData[ass.name].push(new ass.model(_this.fromPrefix(rec, ass.model.table + "_")));
			}
		});  
		return modelData;
  }
  
  /**
   * add result from prefix (example: portal_language (prefix = portal_
   * @param <object> data
   * @param <String> prefix
   */
  static fromPrefix(obj, prefix) {
  	var res = {};
  	Object.keys(obj).forEach(function(key, i) {
  		var list = key.split(prefix);
  		if (list.length > 0) {
  			res[list[1]] = obj[key];
  		}
  	});
  	return res;
  }
}

MasterModel.primaryKey = null;
MasterModel.table = null;
MasterModel.adapter = null;
MasterModel.connection = null;

module.exports = MasterModel;
