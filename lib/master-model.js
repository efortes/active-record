'use strict'

const FieldModel = require('./field-model');
const validator = require('validator');
const Compare = require('./compare')
const extend = require('extend');

/**
 * Master model
 *
 * Associations example: var associations = [ {type: 'hasOne', model: LanguageModel, name: 'language'}, {type: 'hasMany', model: PortalLanguage, name: 'portalLanguage'} ]
 * @author Elvin fortes
 */
class MasterModel {

  /**
   * Class system does not support static vars jet
   */
  static initConfig(config) {
    const _config = Object.assign({}, {
      primaryKey: null,
      table: null,
      adapter: null,
      connection: null,
      fields: [] // TODO NOT IMPLEMENTED JET. Can't get this to work with the instance
    }, config);

    for (const key in _config) {
      if (_config[key]) {
        this[key] = _config[key];
      } else {
        this[key] = null;
      }
    }
  }

  /**
   * Constructor
   * @param data
   * @param options
   */
  constructor(data) {
    this._options = {};
    this.data = {};
    this.fields = {};
    this.associations = [];
    this.dirty = false;

    /**
     * modified key/value pairs of all fields whose values have changed. The value is the original value for the field.
     */
    this.modified = {};
    this.Model = null;
  }

  /**
   * Get modified fields
   * @returns {{}|*|Array}
   */
  getModified() {
    return this.modified;
  }

  /**
   * Get the current Object Class
   */
  getModel() {
    return this.Model;
  }

  /**
   * Init model
   */
  init(options) {
    this._options = Object.assign({}, {
      data: {},
      fields: [],
      Model: null
    }, options || {});

    this.fields = this._options.fields;
    this.data = {};
    this.modified = {};
    this.Model = this._options.Model;
    this.setData(this._options.data);
    this.setRawData(this._options.data);
    this.dirty = false;

    // Make sure dirty is disabled on init
    this.removeDirty();
  }

  /**
   * Get options
   * @returns {{}|*}
   */
  getOptions() {
    return this._options;
  }

  /**
   * Get the field value by name
   * @param <String> fieldName field name to return
   * @param <Boolean> returnConverted return the converted value. The convert method is defined in the field definition.
   */
  get(fieldName, returnConverted) {
    const _this = this;

    var val = this.data[fieldName];

    // Get converted
    if (returnConverted) {
      const field = this.getField(fieldName);
      if (!field) {
        return val;
      }
      val = field.convert(val, this);
    }

    return val;
  }

  /**
   * Get modified key val array
   * @returns {{}|*|Array}
   */
  getModified() {
    return this.modified;
  }

  /**
   * Set the dirty state when a sync field is edited
   */
  setDirty() {
    const _this = this;
    this.getFields().forEach(function(field) {
      if (field.sync) {
        _this.dirty = true;
        _this.modified[field.name] = _this.get(field.name);
      }
    });
  }

  /**
   * Set field value
   * @param <string> fieldName
   * @param <ALL> value
   */
  set(fieldName, value) {
    const _this = this;
    const field = this.getField(fieldName);
    if (!field) {
      return;
    }

    // temp csave current val
    const currentValue = this.data[fieldName];

    if (!Compare.isEqual(currentValue, value)) {
      _this.dirty = true;
      _this.modified[fieldName] = value;
    }

    // Set the value
    this.data[fieldName] = value;
  }

  /**
   * Remove model dirty state
   */
  removeDirty() {
    this.dirty = false;
    this.modified = [];
  }

  /**
   * Check if the model or a field is marked dirty
   * @param <string> fieldName
   * @param <ALL> value
   */
  isDirty(fieldName) {
    if (fieldName) {
      if (this.modified.hasOwnProperty(fieldName)) {
        return true;
      }
      return false;
    }
    return (Object.keys(this.modified).length > 0 ? true : false);
  }

  /**
   * Check if 2 vars are the same
   */
  static isEqual(a, b) {
    return Compare.isEqual(a, b);
  }

  /**
   * Push to array field
   */
  push(fieldName, data) {
    var field = this.getField(fieldName);
    if (!field) {
      return;
    }

    // TODO add array check in field definition + is dirty handling
    if (Array.isArray(this.data[fieldName])) {
      this.data[fieldName].push(data);
    }
  }

  /**
   * Get field by fieldName
   * @param <String> fieldName
   */
  getField(fieldName) {
    var returnField = null;
    this.getFields().forEach(function(field, index) {
      if (field.name === fieldName) {
        returnField = field;
      }
    });
    return returnField;
  }

  /**
   * Add new fields to the object.
   * Sync (db fields) fields should be added by the init method. This method is made for temp fields
   * @param <Array> fields
   */
  addFields(fields) {
    this.fields = this.fields.concat(fields);
  }

  /**
   * Add new field to the object.
   * Sync (db fields) fields should be added by the init method. This method is made for temp fields
   * @param <Array> field
   */
  addField(field) {
    this.addFields([field]);
  }

  /**
   * Get fields
   * @param <Array> fieldNames If empty all fields will be returned
   */
  getFields(fieldNames) {
    var res = [];
    if (Array.isArray(fieldNames)) {
      if (fieldNames.length > 0) {
        this.getFields().forEach(function(field, index) {
          if (fieldNames.indexOf(field.name) !== -1) {
            res.push(field);
          }
        });
        return res;
      }
    }
    return this.fields;
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
  getRawData(field) {
    if (field) {
      return this.rawData[field];
    }
    return this.rawData;
  }

  /**
   * Set data
   */
  setData(data) {
    const this_ = this;

    data = data || {};

    this.getFields().forEach(function(field, index) {
      var fieldName = field.name;
      var value = null;
      if (!(fieldName in data)) {
        // If default value is added lets add it
        if (field.defaultValue !== null && typeof(field.defaultValue) !== 'undefined') {
          value = field.defaultValue;
        }
      } else {
        value = data[fieldName];
      }
      if (value !== null && typeof(field.defaultValue) !== 'undefined') {
        this_.set(fieldName, value);
      }
    });
  }

  /**
   * Get data values
   * @param <Boolean> returnConverted return the converted value that is defined in the field definition
   * @return <Array>
   */
  getData(returnConverted) {

    var _this = this;
    var data = extend({}, this.data);

    // Return converted values
    if (returnConverted) {
      // Convert all fields when needed
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
      const field = this.getField(fieldName);
      if (field) {
        return (this.validateField(field).length > 0 ? false : true);
      }
      return false; // Return false because field does not exist
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

    // Mandatory check
    if (!field.validations.allowEmpty) {
      if (value === undefined) {
        errors.push(fieldName + ' is a mandatory field');
      } else {
        if (!value || value.length < 1) {
          errors.push(fieldName + ' is a mandatory field');
        }
      }
    }

    // Check if boolean
    if (field.validations.isBoolean) {
      if (typeof(value) !== 'boolean') {
        errors.push(fieldName + ' be a boolean');
      }
    }

    // Check if boolean
    if (field.validations.mandatory) {
      if (value === null || value === undefined ) {
        errors.push(fieldName + ' is mandatory');
      }
    }



    // Matcher check
    if (field.validations.matcher !== null) {

      // TODO this matcher is not working jet
      if (!validator.matches(value, field.validations.matcher)) {
        errors.push(fieldName + ' does not match');
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


  /**
   * Static method for field creation (Prevent extra field class include)
   */
  static createField(data) {
    return new FieldModel(data);
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

  /**
   * Handle promise response or callback. Based on config
   * @param promiseOpt
   * @returns {*}
   */
  static sendResponse(promiseOpt) {

    const _opt = Object.assign({}, {
      reject: () => {},
      resolve: () => {},
      error: null,
      result: null,
      callback: null // SHould stay null
    }, promiseOpt);

    // Return callback if is set
    if (typeof _opt.callback === 'function') {
      return _opt.callback(_opt.error, _opt.result);
    }

    // Handle promise
    if (_opt.error) {
      return _opt.reject(_opt.error);
    }
    return _opt.resolve(_opt.result);
  }

  /**
   *
   * @param options
   * @param err
   * @param res
   * @returns {*}
   */
  static callbackToPomiseResponse(options, err, res) {

    const _opt = Object.assign({}, {
      callback: null,
      promise: null
    }, options)

    if (typeof options.callback === 'function') {
      return options.callback(err, res);
    }

    return new Promise((resolve, reject) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  }
}

module.exports = MasterModel;
