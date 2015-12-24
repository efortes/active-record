var FieldModel = require("./field-model");
var validator = require('validator');
var extend = require('extend');
var MasterModel = require('./master-model');

var fileLogger = require("../../../grip-log/lib/file-logger");
var mainConfig = require("../../../config/main");

var NODE_ENV = process.env.NODE_ENV || 'local';


/**
 * SqlModel
 * @author Elvin fortes
 *
 */
class LdapModel extends MasterModel {


  /**
	 * Init model
	 */
  init(options) {
  	super.init(options);
  }

  /**
   * Generate an unique key
   * This method can be overriden by the subclass if something else is needed
   * @param <Object> options
   */
  generateUniqueAttribute(options) {
  	var _options = extend({
  		params: {},
  		callback: function(err, uniqueAttr) {}
  	}, options);

  	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000)
  		.toString(16)
  		.substring(1);
  	}

  	var uniqueAttr = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
  	s4() + '-' + s4() + s4() + s4();

  	_options.callback(null, uniqueAttr);
  }

  /**
   * Save instance
   * @param <object> options
   */
  save(options) {
    var _this = this;
  	var _options = extend({
  		parentDn: null, //Only mandatory by a new record
  		uniqueAttrParams: {},
  		callback: function (err, model) {}
  	}, options);

    if (!_this.Model) {
      _options.callback('No model found')
    }

    var fields = _this.getFields(), data = _this.getData();

    var uniqueAttributeId = _this.get(_this.Model.uniqueAttribute);
    var saveData = {};

		//Validate before save
		var errors = _this.validate();
		if (errors.length > 0) {
			return _options.callback(errors.join(", "));
		}

    //Check if fields are dirty
    fields.forEach(function(field){
    	if (!uniqueAttributeId) {
    		if ( field.sync && field.name != _this.Model.primaryKey ) {
    			var val = field.beforeSave(_this.get(field.name), _this);
    			if (typeof(val) !== 'undefined' && val != null && val != "") {
    				saveData[field.name] = val;
    			}
    		}
    	} else {
    		if (_this.isDirty(field.name)) {
    			if (field.sync && field.name != _this.Model.primaryKey) {
    				var val = field.beforeSave(_this.get(field.name), _this);
    				if (typeof(val) !== 'undefined' && val != null) {
    					saveData[field.name] = val;
    				}
    			}
    		}
    	}
    });

    //If unique attrubute exists modify
    if (uniqueAttributeId) {

      var dn = _this.get("dn");
      if (!dn) {
      	console.log(this);
      	_options.callback('DN not set or not available in the field set')
      }

      //Set modifications
      var modifications = [];

      var logModifications = [];

      Object.keys(saveData).forEach(function(key) {

      	var operation = "add";
      	if (_this.getRawData(key) != null) {
      		operation = "replace";
      	}

      	//If the array is empty it should be deleted
      	if (Array.isArray(saveData[key])) {
      		if (saveData[key].length < 1) {
      			operation = "delete";
      		}
      	}

      	//If the length is < 1 we need to delete
      	if (saveData[key].length < 1 && _this.getRawData(key) != null) {
      		operation = "delete";
      	}

      	//We should place the old value back in to be able to delete
      	if (operation == "delete") {
      		saveData[key] = _this.getRawData(key);
      		if (typeof(saveData[key]) == "undefined") {
      			//If its empty then we cannot delete as it should have the original value
      			return;
      		}
      		if (saveData[key].length < 1) {
      			return;
      		}
      	}

      	//If its empty then we cannot add as it should have a value
      	if (operation == "add") {
      		if (saveData[key].length < 1) {
      			return;
      		}
      	}

      	var currentModification = {};
      	currentModification[key.valueOf()] = saveData[key];

      	logModifications.push({
      		operation: operation,
      		modification: currentModification
      	})

      	modifications.push(new _this.Model.connection.ldapjs.Change({
    			operation: operation,
    			modification: currentModification
    		}))
      });

      if (mainConfig.loglevel >= 4) {
      	fileLogger.log("LDAP modify: " + dn + "\n" + logModifications);
      }

	    _this.Model.connection.modify(dn, modifications, function(err) {
	    	if (err) return _options.callback(err);
	      //Remove dirty state
	      _this.removeDirty();

	    	_this.Model.findByDn(dn, {
	    		callback: _options.callback
	    	});
	    });
    } else {

    	//Add the default items
    	_this.generateUniqueAttribute({
    		uniqueAttrParams: _options.uniqueAttrParams,
    		parentDn: _options.parentDn,
    		callback: function(err, uniqueAttr) {
    			if (err) return _options.callback(err);

    			saveData[_this.Model.uniqueAttribute] = uniqueAttr;
    			saveData.objectClass = _this.Model.objectClasses;

    			//Validate object
    			var errors = [];

    			//Check if the mandatory attributes are set
    			_this.Model.mandatoryAttributes.forEach(function(attr) {
    				if (!(attr in saveData)) {
    					errors.push("Mandatory field '" + attr + "' is missing");
    				}
    			});

    			if (!_options.parentDn) {
    				errors.push("parentDn not specified");
    			}

    			if (errors.length > 0) {
    				return _options.callback(errors.join(","));
    			}

    			//New DN
    			var newDn = _this.Model.uniqueAttribute + "=" + saveData[_this.Model.uniqueAttribute] + "," + _options.parentDn
    			if (mainConfig.loglevel >= 4) {
    				fileLogger.log("LDAP Add: " + newDn + "\n" + data);
    			}

    			//Add new record
    			_this.Model.connection.add(newDn, saveData, function(err) {
    				if (err) return _options.callback(err);

    				//Find the new object
    				_this.Model.findByDn(newDn, {
    					callback: _options.callback
    				});
    			});
    		}
    	});
    }

    //return _options.callback('Nothing to save');
  }

  /**
   * Remove instance
   * @param <Object> options
   */
  erase(options) {
  	var _options = extend({
  		callback: function (err) {}
  	}, options);

  	var _this = this;

    if (mainConfig.loglevel >= 4) {
    	fileLogger.log("LDAP delete: " + _this.get("dn"));
    }

  	_this.Model.connection.del(_this.get("dn"), function(err) {
  		_this.data = {};
  		_this.removeDirty();
  	  return (err ? _options.callback(err) : _options.callback());
  	});
  }


  /**
	 * Get by reference Id (Single result returned in the callback)
	 * @param <String/integer>
	 * @param <Object>
	 */
  static findById(id, options) {
  	var _options = extend({
  		where: {
  			[this.uniqueAttribute.valueOf()]: id
  		}
  	}, options);

  	this.find(_options);
  }

  /**
   * Get by DN
   * @param <String> DN
   * @param <Object> options
   */
  static findByDn(dn, options) {
  	var _options = extend({
  		baseDn: dn,
  		scope: "base",
  	}, options);

  	this.find(_options);
  }

  /**
	 * Find all by options (array result returned in the callback)
	 * @param <String/integer>
	 * @param <Object>
   */
  static findAll(options) {
  	var _options = extend({
  		offset: null,
  		limit: null,
  		where: {},
  	}, options);

  	this.query(_options);
  }

  /**
	 * Find by options (Single result returned in the callback)
	 * @param <String/integer>
	 * @param <Object>
	 */
  static find(options) {
  	var _options = extend({
  		where: {},
  		single: true,
  	}, options);
  	this.query(_options);
  }

  /**
	 * Count by options (total integer returned in the callback)
	 * @param <String/integer>
	 * @param <Object>
	 */
  static count(options) {
  	var _options = extend({
  		offset: null,
  		limit: null,
  		count: true,
  	}, options);
  	this.query(_options);
  }

  /**
	 * Find all objects
	 * @param <Object>
	 */
  static query(options) {

		var _this = this;

		var _options = extend({
			offset: null,
			limit: null,
			where: {},
			whereNot: {}, //Key with array
			whereOr: {},
			whereLike: {},
			single: false,
			count: false,
			fields: null,
			debug: false,
			baseDn: null, //String or object. When baseDn is an object we will use the Model base dn to build the baseDn with the properties added to this object.
			filter: null, //TODO Not working jet
			raw: false,
			scope: "sub",
			pagedResultsSize: null, //Paged result set used by the ldap client
			callback: function (err, model) {

			}
		}, options);

		if (typeof(_options.baseDn) === "string") {
			_options.baseDn = _options.baseDn;
		} else {
			if (!this.baseDn) {
				return _options.callback("baseDN for this model is not defined");
			}

			if (typeof(_options.baseDn) === "object") {
        console.log(_options.baseDn);
				_options.scope = "base"; //Base because we are using the modelBaseDN
				_options.baseDn = this.baseDn.replace(/%([^%]+)%/g, function(a, b) {
					return _options.baseDn[b];
				});
			}
		}



		if (!_options.baseDn) {
			return _options.callback("DN not defined");
		}

		var result = [];

		//If the filter is set lets use it
		var filter = "";
		if (_options.filter) {
			//TODO this won't work jet
			filter = _options.filter;
		}

		var andFilter = [], whereNotFilter = [], whereOrFilter = [];

		//Check object classes
		_this.objectClasses.forEach(function(attr, index) {
			andFilter.push("(objectClass=" + attr + ")");
		});

		//Check object mandatory attr
		_this.mandatoryAttributes.forEach(function(attr, index) {
			andFilter.push("(" + attr + "=*)");
		});

		//Convert where to filter
		Object.keys(_options.where).forEach(function(key) {
			if (Array.isArray(_options.where[key])) {
				_options.where[key].forEach(function(where) {
					andFilter.push("(" + key + "=" + where + ")");
				});
			} else {
				andFilter.push("(" + key + "=" + _options.where[key] + ")");
			}
		});

		//Convert whereLike to the and filter. Just add the char * to it
		Object.keys(_options.whereLike).forEach(function(key) {
			andFilter.push("(" + key + "=" + _options.whereLike[key] + "*)");
		});

		//Convert whereNot to filter
		Object.keys(_options.whereNot).forEach(function(key) {
			if (Array.isArray(_options.whereNot[key])) {
				_options.whereNot[key].forEach(function(or) {
					whereNotFilter.push("(!(" + key + "=" + or + "))");
				});
			} else {
				whereNotFilter.push("(!(" + key + "=" + _options.whereNot[key] + "))");
			}
		});

		//Convert whereOr to filter
		var whereOr = "";
		Object.keys(_options.whereOr).forEach(function(key) {
			if (Array.isArray(_options.whereOr[key])) {
				_options.whereOr[key].forEach(function(or) {
					whereOr += "(" + key + "=" + or + ")";
				});
			} else {
				whereOr += "(" + key + "=" + _options.whereOr[key] + ")";
			}
		});

		if (whereOr.length > 0) {
			whereOr = "(|" + whereOr + ")";
		}

		if (andFilter.length > 0) {
			filter += "(&" + andFilter.join("") + whereNotFilter.join("") + whereOr + ")";
		}

		if (_options.debug) {
			console.log("Filter: " + filter);
			console.log("DB: " + _options.baseDn);
		}

		//Query
		_this.connection.gripSearch(_options.baseDn, {
			 filter: filter,
			 scope: _options.scope,
			 attributes: _options.fields,
			 pagedResultsSize: _options.pagedResultsSize,
			 maxResultsSize: _options.maxResultsSize,
			 returnType: (_options.single ? "first": "list")
		 }, function(err, result) {
			 if (err) {
				 err = (err.err ? err.err : err) + (NODE_ENV == "local" ||  NODE_ENV == "tst" ? " - " + _options.baseDn : "");
			 }
			 if (err)  return _options.callback(err);

			 if (_options.count) {
				 return _options.callback(null, result.length);
			 }

			 // Single value
			 if (_options.single) {
				 if (!result) {
					 return _options.callback("LDAP record not found" + (NODE_ENV == "local" ||  NODE_ENV == "tst" ? " - " + _options.baseDn : ""));
				 }
				 var obj = result;
				 if (!_options.raw) {
					obj = new _this(result);
				 }
				 return _options.callback(null, obj);
			 }

			 //Check if offset  / limit
			 if (_options.offset != null && _options.limit != null) {
				 //LDAP does not support offset. We need to get all the records and slice them
				 var dataSet = result.slice(_options.offset, _options.offset + _options.limit);
				 result = dataSet;
			 }

			 var results = [];
			 if (!_options.raw) {
				 result.forEach(function(record) {
					 results.push(new _this(record));
				 })
			 } else {
				 results = result;
			 }
			 return _options.callback(null, results);
		 });
  }
}

/**
 * Get baseDn
 * @params <Object> options with the values to replace
 * use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
 */
LdapModel.getBaseDn = function(options) {
	if (!options) {
		options = {};
	}
	return this.baseDn.replace(/%([^%]+)%/g, function(a, b) {
		return options[b];
	});
};

/**
 * Get parentDn based on the baseDn
 * @params <Object> options with the values to replace
 * use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
 */
LdapModel.getParentDn = function(options) {
	if (!options) {
		options = {};
	}

	var parentDn =  null;
	var reg = new RegExp(',(.+)', 'g');
	var matches = reg.exec(this.baseDn);
	if (matches.length > 0) {
		parentDn = matches[1];
	}
	return parentDn.replace(/%([^%]+)%/g, function(a, b) {
		return options[b];
	});
};

LdapModel.objectClasses = [];
LdapModel.mandatoryAttributes = [];
LdapModel.uniqueAttribute = null; //Options: cn, ou
LdapModel.connection = null;
//baseDn. use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
LdapModel.baseDn = null;

module.exports = LdapModel;
