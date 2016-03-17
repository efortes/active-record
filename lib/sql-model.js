'use strict'

var FieldModel = require('./field-model');
var SqlHelper = require('./sql-helper');
var validator = require('validator');
var extend = require('extend');
var async = require('async');
var MasterModel = require('./master-model');
var fileLogger = require('../../../grip-log/lib/file-logger');
var mainConfig = require('../../../config/main');

/**
 * SqlModel
 * @author Elvin fortes
 *
 */
class SqlModel extends MasterModel {

  /**
   * Set the associations Associations example: The <name> field coresponds with the field names. var associations = [ {type: 'hasOne', model: LanguageModel, name: 'language'}, {type: 'hasMany',
	 * model: PortalLanguage, name: 'portalLanguage'} ]
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
   * SEE <MasterModel>
   */
  get(fieldName, returnConverted) {
    var val = super.get(fieldName, returnConverted);
    var ass = this.getAssociation(fieldName);
    // If its an associated field we know that it should auto init
    // Disabled for now
    if (ass && 1 > 2) {
      if (ass.type == "hasOne") {
        var whereField = _this.table + "Id";  // TODO change Id to pk in the association pk
        var model = null;
        var where = {};
        where[whereField.valueOf()] = _this.get("id");
        ass.Model.find({
          where: where,
          callback: function(err, modelInstance) {
            if (err) {
              return console.log(err);
            }
            // console.log(modelInstance);
          }
        });

      }
    }
    return val;
  }

  /**
   * Get data values
   * @param <Boolean> returnConverted return teh converted value that is defined in the field definition
   * @return <Array>
   */
  getData(returnConverted) {
    var data = super.getData(returnConverted);

    // Get data for each associated model
    this.getAssociations().forEach(function(ass, i) {
      var subDataSet = null;
      if (Array.isArray(data[ass.name])) {
        subDataSet = [];
        data[ass.name].forEach(function(subModel, e) {
          if (subModel) {
            if (typeof(data[ass.name]) == 'MasterModel') {
              subDataSet.push(subModel.getData());
            } else {
              subDataSet.push(subModel);
            }
          }
        });
      } else {
        if (data[ass.name]) {
          if (typeof(data[ass.name]) == 'MasterModel') {
            subDataSet = data[ass.name].getData();
          }
        }
      }
      data[ass.name] = subDataSet;
    });

    return data;
  }

  /**
   * Save instance
   * @param <object> options
   */
  save(options) {

    const _this = this;
    const _options = extend({
      callback: null
    }, options || {});


    let statement = '';
    const bindVars = [];

    if (!_this.Model) {
      return _options.callback('No model found');
    }

    // Return the promise
    return new Promise((resolve, reject) => {
      var response = (err, result) => {
        SqlModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // SHould stay null
        });
      };

      // Before save
      _this.beforeSave({
        callback: function(err) {
          if (err) return response(err);

          // Validate before save
          const errors = _this.validate();
          if (errors.length > 0) {
            return response(errors.join(', '));
          }

          // Build the save data
          const saveData = SqlHelper.buildSaveDataFromFields(_this);

          // Check if save action is needed
          if (Object.keys(saveData).length < 1) {
            return response(null, _this);
          }

          // TODO: primary key zou ook moeten kunnen omgaan met multiples, maar dat geldt door dit hele object heen
          // TODO: het zou mooier zijn om dit te doen met een 'gevonden in db' paramater die wordt gezet in de fetch
          if (_this.get(_this.Model.primaryKey)) {
            statement = SqlHelper.buildUpdateQueryStr(_this, bindVars, saveData);
          } else {
            statement = SqlHelper.buildCreateQueryStr(_this, bindVars, saveData);
          }

          // Execute query
          _this.Model.connection.query(statement, bindVars, function(queryErr, result) {
            if (mainConfig.loglevel >= 4 || _options.debug) { fileLogger.log('Query: ' + statement + ' - binds: ' + bindVars); }
            if (queryErr) return response(queryErr);

            let objId = _this.get(_this.Model.primaryKey);
            if (!objId) {
              objId = result.insertId;
            }
            _this.set(_this.Model.primaryKey, objId);

            // Remove dirty state
            _this.removeDirty();

            // TODO Do we really need to get the object again? Maybe an option to be able to disable this?
            _this.Model.findById(objId, {debug: _options.debug, callback: response});
          });
        }
      });
    });
  }

  /**
   * Before save - This is always called before the save method
   */
  beforeSave(options) {
    const _opt = Object.assign({}, {
      callback: () => {

      }
    }, options || {});
    return _opt.callback(null);
  }

  /**
   * Remove instance
   * @param <Object> options
   */
  erase(options) {
    const _this = this;

    var _options = extend({
      callback: null
    }, options);

    // Build sql
    const sql = 'DELETE FROM `' + this.Model.table + '` WHERE ' + this.Model.primaryKey + ' = ?;';

    // Set params
    const sqlParams = [this.get(this.Model.primaryKey)];

    return new Promise((resolve, reject) => {
      const response = (err, result) => {
        SqlModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      // Query sql
      this.Model.connection.query(sql, sqlParams, function(err, result) {
        if (mainConfig.loglevel >= 4 || _options.debug) { fileLogger.log('Query: ' + sql + ' - binds: ' + sqlParams + ' - result length: ' + ( result.affectedRows || 0 )); }
        if (err) return response(err);

        if (result.affectedRows < 1) {
          return response('Record does not exist');
        }
        return response(null);
      });
    });
  }

  /**
   * Destroy by id
   * @param <Multi> id
   * @param <Object> options
   */
  static destroyById(id, options) {
    const _this = this;
    var _options = extend({
      where: {
        [this.primaryKey.valueOf()]: id
      }
    }, options || {});

    return _this.destroy(_options);
  }

  /**
   * Destroy items
   */
  static destroy(options) {
    var _options = extend({
      where: {},
      callback: null
    }, options);

    var wheres = [];
    var sqlParams = [];

    return new Promise((resolve, reject) => {
      var response = (err, result) => {
        SqlModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      Object.keys(_options.where).forEach(function(key) {
        sqlParams.push(_options.where[key]);
        wheres.push('`' + key + '` = ?');
      });

      if (wheres.length < 1) {
        return response('Where statement not found for delete');
      }

      //Build sql
      var sql = 'DELETE FROM `' + this.table + '` WHERE ' + wheres.join(' AND ') + ';';

      //Query sql
      this.connection.query(sql, sqlParams, function(err, result) {
        if (mainConfig.loglevel >= 4 || _options.debug) { fileLogger.log('Query: ' + sql + ' - binds: ' + sqlParams); }
        if (err) return _options.callback(err);

        if (result.affectedRows < 1) {
          return response('Record does not exist');
        }
        return response(null);
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
        [this.primaryKey.valueOf()]: id
      }
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
      where: {},
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
   * @param <Object> options
   * options.fromToDate: {
  			from: null, //yyyy-mm-dd
  			to: null, //yyyy-mm-dd
  			field: null //db field
  	},
   * options.combine: This a
   * options.whereLike: {{name:"%test", x: "_test"}, y: ['%test1', '%test2%', 'test']}
   * options.combine: Should look like this
   * {
	 *	field: 'serviceCn',
	 *	single: true, //Optional. return the combine model as a single item or as an array
	 *  mandatory: true, //Optional
	 * 	parentDn: TenantGroupServiceInstanceItem.getBaseDn({
	 * 		cn: 'bla',
	 *     tenantOu: 3333333
	 * }), //When LDAP we need to send the parentDN
	 * }
   * TODO JOIN AND statements from array instead of strings
   *
   * @returns {Promise}
   */
  static query(options) {

    const _this = this;

    const _options = Object.assign({}, {
      offset: null,
      limit: null,
      where: {}, // WHere key: value || key = Array for an IN statement (WERE id IN [1,2,3])
      whereNot: {},
      whereOr: [], // Object array with key value.   || key = Array for an IN statement (WERE id IN [1,2,3] OR
      whereLike: {}, // Example: {{name:"%test", x: "_test"}, y: ['%test1', '%test2%', 'test']}
      single: false,
      count: false,
      include: [],
      fromToDate: {},
      rawData: false,
      fields: null,
      debug: null,
      orderBy: null, // array [{field:"test", sort: "ASC|DESC"}]
      combine: [],
      callback: null // When null only the promise will work
    }, options || {});

    const sqlParams = [];

    // Return a promise
    return new Promise((resolve, reject) => {
      const response = (err, result) => {
        SqlModel.sendResponse({
          reject: reject,
          resolve: resolve,
          error: err,
          result: result,
          callback: _options.callback // Should stay null
        });
      };

      // Build the sql string
      const sqlStr = SqlHelper.buildQuerySql(_this, sqlParams, _options);

      // Execute query
      _this.connection.query(sqlStr, sqlParams, function(err, results, fields) {
        if (mainConfig.loglevel >= 4 || _options.debug) {
          fileLogger.log('Query: ' + sqlStr + ' - binds: ' + sqlParams + ' - result length: ' + ( results && results.length || 0 ));
        }

        if (err) {
          return response(err);
        }

        // On count
        if (_options.count) {
          if (results.length < 1) {
            return response('Count error');
          }
          return response(null, results[0].total);
        }

        // On single return
        if (_options.single) {
          if (results.length < 1) {
            const findErr = new Error('Object not found');
            findErr.code = 404;
            return response(findErr);
          }

          var newModel = new _this(_this.fromPrefix(results[0], _this.table + '_'));
          results.forEach(function(rec, i) {
            SqlHelper.buildJoinModel(newModel, rec);
          });

          // Return combined models
          if (_options.combine.length > 0) {
            return SqlHelper.combineModel(_this, _options.combine, newModel, (combineErr) => {
              response(combineErr);
            });
          }
          return response(err, newModel);
        }

        var res = [];
        if (results.length > 0) {
          // build models
          results.forEach(function(rec, i) {
            const newModel = new _this(_this.fromPrefix(rec, _this.table + '_'));
            SqlHelper.buildJoinModel(newModel, rec);
            res.push(newModel);
          });
        }

        // If no combined found lets call the result callback
        if (_options.combine.length < 1) {
          return response(err, res);
        }

        // Build combined models
        var builParallels = [];
        res.forEach(function(buildModel) {
          builParallels.push(function(cb) {
            SqlHelper.combineModel(_this, _options.combine, buildModel, cb);
          });
        });

        // Execute combine
        async.parallel(builParallels, function(err, results) {
          response(err, res);
        });
      });
    });
  }

  /**
   * Init model
   */
  init(options) {
    super.init(options);

    // Set lastModifiedField
    this._options.lastModifiedField = (() => {
      if (options && options.lastModifiedField === false) {
        return false;
      }
      return (options.lastModifiedField ? options.lastModifiedField : 'lastModified');
    })();

    // Set createdField
    this._options.createdField = (() => {
      if (options && options.createdField === false) {
        return false;
      }
      return (options.createdField ? options.createdField : 'created');
    })();

    // Init associations
    const associations = (options.associations ? options.associations : []);
    this.setAssociations(associations);
  }

}

SqlModel.primaryKey = null;
SqlModel.table = null;
SqlModel.adapter = null;
SqlModel.connection = null;
SqlModel.settings = {};


module.exports = SqlModel;
