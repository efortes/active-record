'use strict'

var extend = require("extend");
/**
 * Model field class
 * @author Elvin Fortes
 */
class FieldModel {

  /**
   * Init
   * @param incomingData {
   *  name: 'test',
   *  defaultValue: 'test',
   *  sync: false,
   *  validations = {
        mandatory: false,
        isBoolean: false,
        minLength: false,
        allowEmpty: true,           // don't allow empty strings
        isEmail: false,
        isArray: false,            // only allow arrays
        matcher: null 						// regexp
      }: 'test',
   *  OwnValue: null, // You can add any value and it will be used as property
   *  name: 'test',
   * }
   */
  constructor(incomingData) {

    const data = incomingData || {};

    /**
     * Default properties
     */
    // field name
    this.name = null;

    // Default value for this field
    this.defaultValue = null;

    // False to exclude this field from being synchronized with the storage object (db)
    this.sync = true;

    /**
     * Validation properties
     */
    this.mandatory = null;


    this.validations = {
      mandatory: false,
      isBoolean: false,
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
    for (const key in data) {
      this[key.toString()] = data[key];
    }
  }

  /**
   * converts / transform an value if needed
   * @param val
   * @param record
   * @returns {*}
   */
  convert(val, record) {
    return val;
  }

  /**
   * Converts the field before saving the data to the datasource
   * @param val
   * @param record
   * @returns {*}
   */
  beforeSave(val, record) {
    return val;
  }
}

module.exports = FieldModel;