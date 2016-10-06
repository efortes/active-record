'use strict';

const FieldModel = require('./field-model');
const validator = require('validator');
const extend = require('extend');
const MasterModel = require('./master-model');

const quickLog = require('quick-log');
const fileLogger = quickLog.fileLogger;
const config = require('../config');

const NODE_ENV = process.env.NODE_ENV || 'local';

const LdapHelper = require('./ldap-helper');


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
      callback: function(err, uniqueAttr) {
      }
    }, options);

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    const uniqueAttr = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
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
      parentDn: null, // Only mandatory by a new record
      uniqueAttrParams: {},
      callback: null
    }, options);

    if (!_this.Model) {
      _options.callback('No model found');
    }

    // Return a promise
    return new Promise((resolve, reject) => {
      const response = (err, result) => {
        LdapModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      const data = _this.getData();

      const uniqueAttributeId = _this.get(_this.Model.uniqueAttribute);

      // Validate before save
      const errors = _this.validate();
      if (errors.length > 0) {
        return response(errors.join(', '));
      }

      // Build dirty date
      const saveData = LdapHelper.buildDirtyDataForSave(_this);

      // If unique attribute exists the record should be edited
      if (uniqueAttributeId) {

        // Check if DN is set
        const dn = _this.get('dn');
        if (!dn) {
          return response('DN not set or not available in the field set');
        }

        // Build the changes to be saved
        const changes = LdapHelper.buildChangeListForSave(_this, saveData);

        const modifications = [];

        // Transform changes to LDAP changes
        changes.forEach((item) => {
          modifications.push(new _this.Model.connection.ldapjs.Change({
            operation: item.operation,
            modification: item.modification
          }));
        });

        // Validate mandatory fields
        const errorsMandatory = LdapHelper.validateMandatoryFieldsForSave(_this, data);
        if (errorsMandatory.length > 0) {
          return response(errorsMandatory.join(','));
        }

        // Log
        if (config.logQuery) {
          fileLogger.log('LDAP modify: ' + dn + '\n' + changes);
        }

        // Do save
        _this.Model.connection.modify(dn, modifications, function(err) {
          if (err) return response(err);

          // Remove dirty state
          _this.removeDirty();

          // Fetch the model again to be sure we we get the correct data
          _this.Model.findByDn(dn, {
            callback: response
          });
        });
        return null;
      }

      // Add the default items
      _this.generateUniqueAttribute({
        uniqueAttrParams: _options.uniqueAttrParams,
        parentDn: _options.parentDn,
        callback: function(err, uniqueAttr) {
          if (err) return response(err);

          // Update the save data
          LdapHelper.updateSaveDataForNewRecord(_this, saveData, uniqueAttr);

          // Validate mandatory fields
          const errorsMandatory = LdapHelper.validateMandatoryFieldsForSave(_this, saveData);

          if (!_options.parentDn) {
            errorsMandatory.push('parentDn not specified');
          }

          if (errorsMandatory.length > 0) {
            return response(errorsMandatory.join(','));
          }

          // Generate a new DN
          const newDn = LdapHelper.generateNewDn(_this, saveData, _options.parentDn);
          if (config.logQuery) {
            fileLogger.log('LDAP Add: ' + newDn + '\n' + data);
          }

          // Add new record
          _this.Model.connection.add(newDn, saveData, (saveErr) => {
            if (saveErr) return response(saveErr);

            // Find the new object
            _this.Model.findByDn(newDn, {
              callback: response
            });
          });
        }
      });

    });
  }

  /**
   * Remove instance
   * @param <Object> options
   */
  erase(options) {
    var _options = Object.assign({}, {
      callback: null
    }, options);

    const _this = this;

    // TODO remove dependency to the main config
    if (config.logQuery) {
      fileLogger.log('LDAP delete: ' + _this.get('dn'));
    }

    // Return a promise
    return new Promise((resolve, reject) => {
      const response = (err, result) => {
        LdapModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      _this.Model.connection.del(_this.get('dn'), function(err) {
        _this.data = {};
        _this.removeDirty();
        return response(err);
      });
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

    return this.find(_options);
  }

  /**
   * Get by DN
   * @param <String> DN
   * @param <Object> options
   */
  static findByDn(dn, options) {
    var _options = extend({
      baseDn: dn,
      scope: 'base'
    }, options);

    return this.find(_options);
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
      where: {}
    }, options);

    return this.query(_options);
  }

  /**
   * Find by options (Single result returned in the callback)
   * @param <String/integer>
   * @param <Object>
   */
  static find(options) {
    var _options = extend({
      where: {},
      single: true
    }, options);

    return this.query(_options);
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
      count: true
    }, options);

    return this.query(_options);
  }

  /**
   * Find all objects
   * @param <Object>
   */
  static query(options) {

    const _this = this;

    const _options = extend({
      offset: null,
      limit: null,
      where: {},
      whereNot: {}, // Key with array
      whereOr: {},
      whereLike: {},
      single: false,
      count: false,
      fields: null,
      debug: false,
      baseDn: null, // String or object. When baseDn is an object we will use the Model base dn to build the baseDn with the properties added to this object.
      filter: null, // TODO Not working jet
      raw: false,
      scope: 'sub',
      pagedResultsSize: null, // Paged result set used by the ldap client
      callback: null
    }, options);

    // Return a promise
    return new Promise((resolve, reject) => {
      const response = (err, result) => {
        LdapModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      if (typeof(_options.baseDn) === 'string') {
        _options.baseDn = _options.baseDn;
      } else {
        if (!this.baseDn) {
          return response('baseDN for this model is not defined');
        }

        if (typeof(_options.baseDn) === 'object') {
          _options.scope = 'base'; // Base because we are using the modelBaseDN
          _options.baseDn = this.baseDn.replace(/%([^%]+)%/g, function(a, b) {
            return _options.baseDn[b];
          });
        }
      }

      if (!_options.baseDn) {
        return response('DN not defined');
      }

      const filter = LdapHelper.buildQueryFilter(_this, _options);

      if (_options.debug) {
        console.log('Filter: ' + filter);
        console.log('DB: ' + _options.baseDn);
      }

      // Query
      _this.connection.gripSearch(_options.baseDn, {
        filter: filter,
        scope: _options.scope,
        attributes: _options.fields,
        pagedResultsSize: _options.pagedResultsSize,
        maxResultsSize: _options.maxResultsSize,
        returnType: (_options.single ? 'first' : 'list')
      }, function(err, result) {
        if (config.logQuery || _options.debug) {
          fileLogger.log('LDAP search result length: ' + ( result && result.length || 0 ));
        }
        if (err) return response(err);

        if (_options.count) {
          return response(null, result.length);
        }

        // Single value
        if (_options.single) {
          if (!result) {
            const error = new Error('LDAP record not found' + (NODE_ENV === 'local' || NODE_ENV === 'tst' ? ' - ' + _options.baseDn : ''));
            error.code = 404;
            return response(error);
          }
          let obj = result;
          if (!_options.raw) {
            obj = new _this(result);
          }
          return response(null, obj);
        }

        // Check if offset  / limit
        if (_options.offset !== null && _options.limit !== null) {
          // LDAP does not support offset. We need to get all the records and slice them
          const dataSet = result.slice(_options.offset, _options.offset + _options.limit);
          result = dataSet;
        }

        let results = [];
        if (!_options.raw) {
          result.forEach(function(record) {
            results.push(new _this(record));
          });
        } else {
          results = result;
        }
        return response(null, results);
      });
    });
  }
}

/**
 * Get baseDn
 * @params <Object> options with the values to replace
 * use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
 */
LdapModel.getBaseDn = function(opt) {
  const options = opt || {};
  return this.baseDn.replace(/%([^%]+)%/g, function(a, b) {
    return options[b];
  });
};

/**
 * Get parentDn based on the baseDn
 * @params <Object> options with the values to replace
 * use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
 */
LdapModel.getParentDn = function(opt) {
  const options = opt || {};

  let parentDn = null;
  const reg = new RegExp(',(.+)', 'g');
  const matches = reg.exec(this.baseDn);
  if (matches.length > 0) {
    parentDn = matches[1];
  }
  return parentDn.replace(/%([^%]+)%/g, function(a, b) {
    return options[b];
  });
};

LdapModel.objectClasses = [];
LdapModel.mandatoryAttributes = [];
LdapModel.uniqueAttribute = null; // Options: cn, ou
LdapModel.connection = null;
// baseDn. use vars %example% for dynamic data. Example: cn=%cn%,ou=ServiceInstances,ou=Groups,ou=%tenantOu%,ou=Tenants,dc=CIDS
LdapModel.baseDn = null;

module.exports = LdapModel;
