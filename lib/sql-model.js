var FieldModel = require("./field-model");
var validator = require('validator');
var extend = require('extend');
var async = require('async');
var MasterModel = require('./master-model');
var fileLogger = require("../../../grip-log/lib/file-logger");
var mainConfig = require("../../../config/main");

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
    var data = super.getData();

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

    var _this = this;

    var _options = extend({
      callback: function(err) {
      }
    }, options);

    if (!_this.Model) {
      _options.callback('No model found')
    }


    //Before save
    _this.beforeSave({
      callback: function(err) {
        if (err) return _options.callback(err);

        var fields = _this.getFields()
        var data = _this.getData()

        var savedata = {};

        var objId = _this.get(_this.Model.primaryKey);

        //Validate before save
        var errors = _this.validate();
        if (errors.length > 0) {
          return _options.callback(errors.join(", "));
        }

        fields.forEach(function(field) {
          //If this is a new record we want to save everything
          if (!objId) {
            // TODO: wil je hier nog valideren? lijkt me wel; zowel per veld (update) als het hele object (insert)
            if (field.sync && field.name != _this.Model.primaryKey) {
              savedata[field.name] = field.beforeSave(_this.get(field.name), _this);
            }
          } else {

            if (_this.isDirty(field.name)) {
              // TODO: wil je hier nog valideren? lijkt me wel; zowel per veld (update) als het hele object (insert)
              if (field.sync && field.name != _this.Model.primaryKey) {
                savedata[field.name] = field.beforeSave(_this.get(field.name), _this);
              }
            }
          }
        });


        if (Object.keys(savedata).length) {

          var statement = '';
          var bindvars = [];
          // TODO: primary key zou ook moeten kunnen omgaan met multiples, maar dat geldt door dit hele object heen
          // TODO: het zou mooier zijn om dit te doen met een 'gevonden in db' paramater die wordt gezet in de fetch
          if (_this.get(_this.Model.primaryKey)) {
            if (_this._options.lastModifiedField) {
              var date = new Date();
              date = date.getFullYear() + '-' + ( date.getMonth() + 1 ) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
              savedata['lastModified'] = date;
            }

            statement += 'UPDATE `' + _this.Model.table + '` SET ';
            var setdata = [];
            Object.keys(savedata).forEach(function(key) {
              setdata.push('`' + key + '` = ? ');
              var bind = null;
              if (typeof savedata[key] !== 'undefined' && typeof savedata[key] !== 'number') {
                if (typeof savedata[key] == 'object') {
                  bind = JSON.stringify(savedata[key]);
                } else {
                  bind = savedata[key].toString();
                }
              } else {
                bind = savedata[key];
              }
              bindvars.push(bind);
            })
            statement = statement + setdata.join(', ');
            statement = statement + ' WHERE ' + _this.Model.primaryKey + ' = ?';
            bindvars.push(_this.get(_this.Model.primaryKey));
          } else {
            var date = new Date();
            date = date.getFullYear() + '-' + ( date.getMonth() + 1 ) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            if (_this._options.lastModifiedField) {
              savedata['lastModified'] = date;
            }
            if (_this._options.createdField) {
              savedata['created'] = date;
            }

            statement += 'INSERT INTO `' + _this.Model.table + '` (`';
            statement = statement + Object.keys(savedata).join('`, `');
            statement = statement + '`) VALUES (';
            statement = statement + Object.keys(savedata).map(function(key) {
                return '?'
              }).join(', ');

            // console.log(savedata);
            Object.keys(savedata).map(function(key) {
              var bind = null;
              if (typeof savedata[key] !== 'undefined' && typeof savedata[key] !== 'number' && savedata[key] != null) {
                if (typeof savedata[key] == 'object') {
                  bind = JSON.stringify(savedata[key]);
                } else {
                  bind = savedata[key].toString();
                }
              } else {
                bind = savedata[key];
              }
              bindvars.push(bind);
            });

            statement = statement + ')';
          }

          // log
          if (mainConfig.logoptions.sqlstatements) {
            fileLogger.log("Query: " + statement + " binds: " + bindvars);
          }

          _this.Model.connection.query(statement, bindvars, function(err, result) {
            if (err) return _options.callback(err);
            if (!objId) {
              objId = result.insertId;
            }
            _this.set(_this.Model.primaryKey, objId);

            //Remove dirty state
            _this.removeDirty();

            //TODO Do we really need to get the object again?
            var obj = _this.Model.findById(objId, {debug: _options.debug, callback: _options.callback});
          });

        } else {
          return _options.callback(null, _this);
        }

      }
    });

  }

  /**
   * Before save - This is always called before the save method
   */
  beforeSave(options) {
    return options.callback(null);
  }

  /**
   * Remove instance
   * @param <Object> options
   */
  erase(options) {
    var _options = extend({
      callback: function(err) {
      }
    }, options);

    var _this = this;

    //Build sql
    var sql = "DELETE FROM `" + this.Model.table + "` WHERE " + this.Model.primaryKey + " = ?;";

    //Set params
    var sqlParams = [this.get(this.Model.primaryKey)];

    if (mainConfig.loglevel >= 4) {
      fileLogger.log("Query: " + sql + " binds: " + sqlParams);
    }

    //Query sql
    this.Model.connection.query(sql, sqlParams, function(err, result) {
      if (err) return _options.callback(err);

      if (result.affectedRows < 1) {
        return _options.callback("Record does not exist");
      }
      return _options.callback(null);
    });
  }

  /**
   * Destroy by id
   * @param <Multi> id
   * @param <Object> options
   */
  static destroyById(id, options) {
    var _options = extend({
      where: {
        [this.primaryKey.valueOf()]: id
      }
    }, options);
    this.destroy(_options);
  }

  /**
   * Destroy items
   */
  static destroy(options) {
    var _options = extend({
      where: {},
      callback: function(err) {
      }
    }, options);

    var wheres = [];
    var sqlParams = [];
    Object.keys(_options.where).forEach(function(key) {
      sqlParams.push(_options.where[key]);
      wheres.push("`" + key + "` = ?");
    });

    if (wheres.length < 1) {
      return _options.callback("Where statement not found for delete");
    }

    //Build sql
    var sql = "DELETE FROM `" + this.table + "` WHERE " + wheres.join(" AND ") + ";";

    if (mainConfig.loglevel >= 4) {
      fileLogger.log("Query: " + sql + " binds: " + sqlParams);
    }

    //Query sql
    this.connection.query(sql, sqlParams, function(err, result) {
      if (err) return _options.callback(err);

      if (result.affectedRows < 1) {
        return _options.callback("Record does not exist");
      }
      return _options.callback(null);
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
   */
  static query(options) {

    var _this = this;

    var _options = extend({
      offset: null,
      limit: null,
      where: {}, //WHere key = value OR key = array for an or statement
      whereNot: {},
      whereLike: {}, //Example: {{name:"%test", x: "_test"}, y: ['%test1', '%test2%', 'test']}
      single: false,
      count: false,
      include: [],
      fromToDate: {},
      rawData: false,
      fields: null,
      debug: null,
      orderBy: null, //array [{field:"test", sort: "ASC|DESC"}]
      combine: [],
      callback: function(err, model) {
      }
    }, options);

    var sqlParams = [];

    // TODO at the moment the fields are dfined within the constructor. So we need to init the model :(
    var model = new this;
    var associations = model.getAssociations();

    var queryFields = [];
    var queryJoins = [];

    var includeModelFields = function(Model, fields) {
      if (_options.count) {
        return queryFields.push("COUNT(*) as total");
      }
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

    // Select the default fields
    includeModelFields(_this, model.getFields());

    // Add the joins
    _options.include.forEach(function(name, i) {

      var association = model.getAssociation(name);
      if (!association) {
        return;
      }

      var JoinModel = association.Model;

      var instance = new JoinModel();
      includeModelFields(JoinModel, instance.getFields());
      associations.forEach(function(ass, assIndex) {

        if (ass.Model.table == JoinModel.table) {
          switch (ass.type) {
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

    var sql = "SELECT " + queryFields.join(",") + " FROM `" + this.table + "` ";

    if (_options.include.length > 0) {
      sql += queryJoins.join(" ") + " ";
    }

    if (Object.keys(_options.where).length > 0 || Object.keys(_options.whereNot).length > 0 || ('field' in _options.fromToDate) || Object.keys(_options.whereLike).length > 0) { // || Object.keys(_options.whereOr).length > 0
      sql += "WHERE ";
    }

    //Check from to date range (Example: WHERE AudStamp BETWEEN '2015-06-19' AND ADDDATE('2015-06-22', INTERVAL 1 DAY))
    if (('field' in _options.fromToDate)) {
      sql += _this.table + "." + _options.fromToDate.field + " BETWEEN " + _this.connection.escape(_options.fromToDate['from']) + " AND ADDDATE(" + _this.connection.escape(_options.fromToDate['to']) + ", INTERVAL 1 DAY) ";
      if (Object.keys(_options.where).length > 0 || Object.keys(_options.whereNot).length > 0) {
        sql += "AND ";
      }
    }

    // TODO WHERE as array and then join by and
    //Where statement
    Object.keys(_options.where).forEach(function(key, i) {
      sqlParams.push(_options.where[key]);

      // In statement
      if (Array.isArray(_options.where[key])) {
        sql += _this.table + "." + key + " IN ( ? ) ";
      } else {
        sql += _this.table + "." + key + " = ? ";
      }

      if ((i + 1) < Object.keys(_options.where).length) {
        sql += "AND ";
      }
    });

    if (Object.keys(_options.where).length > 0 && Object.keys(_options.whereNot).length > 0) {
      sql += "AND ";
    }


    //Where not statement
    Object.keys(_options.whereNot).forEach(function(key, i) {
      sqlParams.push(_options.whereNot[key]);

      // In statement
      if (Array.isArray(_options.whereNot[key])) {
        sql += _this.table + "." + key + " NOT IN ( ? ) ";
      } else {
        sql += _this.table + "." + key + " != ? ";
      }

      if ((i + 1) < Object.keys(_options.whereNot).length) {
        sql += "AND ";
      }
    });

    // WhereLike  statement
    const likeCon = [];
    Object.keys(_options.whereLike).forEach(function(key, i) {
      if (Array.isArray(_options.whereLike[key])) {
        _options.whereLike[key].forEach(function(val) {
          likeCon.push(_this.table + '.' + key + ' LIKE ? ');
          sqlParams.push(val);
        });
      } else {
        likeCon.push(_this.table + '.' + key + ' LIKE ? ');
        sqlParams.push(_options.whereLike[key]);
      }
    });

    // Join likeCon
    if (likeCon.length > 0) {
      if (Object.keys(_options.where).length > 0 || Object.keys(_options.whereNot).length > 0 || ('field' in _options.fromToDate)) {
        sql += 'AND ';
      }
      sql += likeCon.join(' OR ');
    }

    // Order by example: [{field:"test", sort: "ASC|DESC"}]
    if (!_options.count) {
      if (Array.isArray(_options.orderBy)) {
        var orderBySql = []
        _options.orderBy.forEach(function(row) {
          if (row.field) {
            if (!row.sort) {
              row.sort = "ASC";
            }
            orderBySql.push(_this.table + "." + _this.connection.escape(row.field).replace(/'/g, '') + " " + _this.connection.escape(row.sort).replace(/'/g, ""));
          }
        });

        if (orderBySql.length > 0) {
          sql += " ORDER BY " + orderBySql.join(", ");
        }
      }
    }

    if (_options.offset != null && _options.limit != null && !_options.count) {
      if (_options.offset < 0) {
        return _options.callback("Offset error");
      }
      sqlParams.push(_options.offset);
      sqlParams.push(_options.limit);
      sql += " limit ?,?";
    }

    if (mainConfig.loglevel >= 5 || _options.debug) {
      fileLogger.log("Query: " + sql + " binds: " + sqlParams);
    }

    // Combine model with configured fields
    var combine = function(modelInstance, callback) {
      //Lets combine
      if (!_this.combine) {
        return callback("Combine error");
      }
      if (!_options.combine) {
        return callback("Combine error");
      }

      /**
       * Find Model combine config
       */
      var findCombineConfig = function(field) {
        var combineConfig = null;
        _this.combine.forEach(function(obj) {
          if (obj.field == field) {
            combineConfig = obj;
          }
        });
        return combineConfig;
      }

      var parallels = [];

      //Loop trough the combines
      _options.combine.forEach(function(combineObj) {

        //Set defaults
        var obj = extend({
          field: null,
          single: true,
          mandatory: true,
          parentDn: null,
        }, combineObj);

        //This is the current model configuration config
        var modelCombineConfig = findCombineConfig(obj.field);

        //Combine with
        switch (modelCombineConfig.type) {
          case "ldap":

            //Combine one by one
            parallels.push(function(cb) {

              //If the Where value == empty
              if (modelInstance.get(modelCombineConfig.field) == null || typeof(modelInstance.get(modelCombineConfig.field)) == "undefined") {
                if (obj.mandatory) {
                  return cb("Combine field is empty");
                } else {
                  return cb();
                }
              }

              //Lets fetch
              modelCombineConfig.CombineModel.findAll({
                baseDn: obj.parentDn,
                scope: "sub",
                where: {
                  [modelCombineConfig.combineLink.valueOf()]: modelInstance.get(modelCombineConfig.field)
                },
                callback: function(err, combineModels) {
                  if (err) return cb(err);
                  if (obj.mandatory && combineModels.length < 1) {
                    return cb("Combine reference not found");
                  }

                  var combineModel = null;

                  //On single lets return just one model. Else return array
                  if (obj.single) {
                    if (combineModels.length > 0) {
                      combineModel = combineModels[0];
                    }
                  } else {
                    combineModel = combineModels;
                  }

                  //Set the new value
                  modelInstance.set(modelCombineConfig.combineField, combineModel);
                  cb(null);
                }
              });
            });
            break;
          default:
            //No combine config found
            parallels.push(function(cb) {
              cb("Combine type error");
            });
        }
      });

      if (parallels.length < 1) {
        return callback(null, modelInstance);
      }

      //Execute
      async.parallel(parallels, function(err, results) {
        if (err) return callback(err);

        callback(null, modelInstance);
      });
    };

    // log
    if (mainConfig.logoptions.sqlstatements || _options.debug) {
      fileLogger.log("Query: " + sql + " binds: " + sqlParams);
    }

    //Execute query
    this.connection.query(sql, sqlParams, function(err, results, fields) {
      if (err) {
        return _options.callback(err);
      }

      //On count
      if (_options.count) {
        if (results.length < 1) {
          return _options.callback("Count error");
        }
        return _options.callback(null, results[0].total);
      }

      // On single return
      if (_options.single) {
        if (results.length < 1) {
          return _options.callback("Object not found");
        }

        var modelData = _this.fromPrefix(results[0], _this.table + "_");
        var newModel = new _this(modelData);
        results.forEach(function(rec, i) {
          _this.buildJoinModel(newModel, rec, modelData, associations);
        });

        //Return combined models
        if (_options.combine.length > 0) {
          return combine(newModel, _options.callback);
        }

        return _options.callback(err, newModel);
      }

      var res = [];
      if (results.length > 0) {
        //build models
        results.forEach(function(rec, i) {
          var modelData = _this.fromPrefix(rec, _this.table + "_");
          var newModel = new _this(modelData);
          _this.buildJoinModel(newModel, rec, modelData, associations);

          res.push(newModel);
        });
      }

      //If no combined found lets call the result callback
      if (_options.combine.length < 1) {
        return _options.callback(err, res);
      }

      //Build combined models
      var builParallels = [];
      res.forEach(function(model) {
        builParallels.push(function(cb) {
          combine(model, cb);
        });
      });

      //Execute combine
      async.parallel(builParallels, function(err, results) {
        _options.callback(err, res);
      });
    });
  }


  static buildJoinModel(currentModel, rec, modelData, associations) {
    var _this = this;
    associations.forEach(function(ass, i) {
      if (ass.type == "hasOne") {
        currentModel.set(ass.name, new ass.Model(_this.fromPrefix(rec, ass.Model.table + "_")));
      }
      if (ass.type == "hasMany") {
        var val = modelData[ass.name];
        if (!Array.isArray(val)) {
          val = [];
        }
        currentModel.set(ass.name, new ass.Model(_this.fromPrefix(rec, ass.Model.table + "_")));
      }
    });
    //return currentModel;
  }


  /**
   * Init model
   */
  init(options) {
    var _options = extend({
      lastModifiedField: "lastModified",
      createdField: "created",
    }, options);

    super.init(_options);


    //Init associations
    var associations = (_options.associations ? _options.associations : []);
    this.setAssociations(associations);
  }

}

SqlModel.primaryKey = null;
SqlModel.table = null;
SqlModel.adapter = null;
SqlModel.connection = null;
SqlModel.settings = {}


module.exports = SqlModel;
