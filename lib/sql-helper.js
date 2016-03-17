'use strict'

const async = require('async');
const MasterModel = require('./master-model');

class SqlHelper {

  /**
   * Build the create sql string
   * @param modelInstance
   * @param bindvars
   * @param saveData
   * @returns {string}
   */
  static buildCreateQueryStr(modelInstance, bindvars, saveData) {
    const statement = [];

    statement.push('INSERT INTO `' + modelInstance.Model.table + '` (`');
    statement.push(Object.keys(saveData).join('`, `'));
    statement.push('`) VALUES (');
    statement.push(Object.keys(saveData).map(function(key) {
      return '?';
    }).join(', '));

    // console.log(saveData);
    Object.keys(saveData).map(function(key) {
      var bind = null;
      if (typeof saveData[key] !== 'undefined' && typeof saveData[key] !== 'number' && saveData[key] !== null) {
        if (typeof saveData[key] === 'object') {
          bind = JSON.stringify(saveData[key]);
        } else {
          bind = saveData[key].toString();
        }
      } else {
        bind = saveData[key];
      }
      bindvars.push(bind);
    });

    statement.push(')');
    return statement.join('');
  }

  /**
   * Build the update sql string
   * @param modelInstance
   * @param bindvars
   * @param saveData
   * @returns {string}
   */
  static buildUpdateQueryStr(modelInstance, bindvars, saveData) {
    const statement = [];
    if (modelInstance.get(modelInstance.Model.primaryKey)) {
      if (modelInstance._options.lastModifiedField) {
        saveData[modelInstance._options.lastModifiedField] = SqlHelper.generateTimeStamp(new Date());
      }

      statement.push('UPDATE `' + modelInstance.Model.table + '` SET ');
      Object.keys(saveData).forEach(function(key) {
        statement.push('`' + key + '` = ? ');
        let bind = null;
        if (typeof saveData[key] !== 'undefined' && typeof saveData[key] !== 'number') {
          if (typeof saveData[key] === 'object') {
            bind = JSON.stringify(saveData[key]);
          } else {
            bind = saveData[key].toString();
          }
        } else {
          bind = saveData[key];
        }
        bindvars.push(bind);
      });

      statement.push(' WHERE ' + modelInstance.Model.primaryKey + ' = ?');
      bindvars.push(modelInstance.get(modelInstance.Model.primaryKey));
    }
    return statement.join('');
  }

  /**
   * Build the save data
   * @param <SqlModel> modelInstance
   * @returns {{}}
   */
  static buildSaveDataFromFields(modelInstance) {
    const date = new Date();
    const saveData = {};
    const fields = modelInstance.getFields();
    const objId = modelInstance.get(modelInstance.Model.primaryKey);

    // Loop trough the fields to set the data that will be saved
    fields.forEach(function(field) {

      // If this is a new record we want to save everything
      if (!objId) {
        if (field.sync && field.name !== modelInstance.Model.primaryKey) {
          saveData[field.name] = field.beforeSave(modelInstance.get(field.name), modelInstance);
        }
        return;
      }

      // On existing record lets set the data that changed
      if (modelInstance.isDirty(field.name)) {
        if (field.sync && field.name !== modelInstance.Model.primaryKey) {
          saveData[field.name] = field.beforeSave(modelInstance.get(field.name), modelInstance);
        }
      }
    });

    const formattedDate = SqlHelper.generateTimeStamp(date);
    if (modelInstance._options.lastModifiedField) {
      saveData[modelInstance._options.lastModifiedField] = formattedDate;
    }
    if (modelInstance._options.createdField) {
      saveData[modelInstance._options.createdField] = formattedDate;
    }

    return saveData;
  }

  static generateTimeStamp(date) {
    return date.getFullYear() + '-' + ( date.getMonth() + 1 ) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
  }

  /**
   * Returns the builded sql string based on the options
   * @param Model
   * @param sqlParams
   * @param queryOptions
   * @returns {string}
   */
  static buildQuerySql(Model, sqlParams, queryOptions) {

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
    }, queryOptions || {});

    const model = new Model();
    const associations = model.getAssociations();

    const queryFields = [];
    const queryJoins = [];

    const sql = []; // Main sql
    const andList = []; // And list where
    const orSQL = []; // Or sql statement
    const likeCon = []; // WhereLike statement

    // Add count when needed
    SqlHelper.pushCountSqlToList(_options.count, queryFields);

    // Push model fields
    if (!_options.count) {
      SqlHelper.pushModelFieldsToSqlList(queryFields, Model, model.getFields());
    }

    // Push include / joins
    SqlHelper.pushJoinModels(Model, model, queryFields, queryJoins, _options.include);

    // Select from table
    SqlHelper.pushToSql(sql, 'SELECT ' + queryFields.join(', ') + ' FROM `' + Model.table + '` ');

    // push include joins
    if (_options.include.length > 0) {
      SqlHelper.pushToSql(sql, queryJoins.join(' ') + ' ');
    }

    if (Object.keys(_options.where).length > 0 || Object.keys(_options.whereNot).length > 0 || ('field' in _options.fromToDate) || Object.keys(_options.whereLike).length > 0) { // || Object.keys(_options.whereOr).length > 0
      SqlHelper.pushToSql(sql, 'WHERE ');
    }

    // Check from to date range (Example: WHERE AudStamp BETWEEN '2015-06-19' AND ADDDATE('2015-06-22', INTERVAL 1 DAY))
    SqlHelper.pushFromToDateFilter(Model, andList, _options.fromToDate);

    // Handle where statement
    SqlHelper.toWhereSqlList(Model, _options.where, andList, sqlParams);

    // Handle where or
    SqlHelper.toWhereOrSqlList(Model, _options.whereOr, orSQL, sqlParams);

    if (orSQL.length > 0) {
      andList.push('(' + orSQL.join(' OR ') + ')');
    }

    // Where not statement
    SqlHelper.toWhereNotSqlList(Model, _options.whereNot, andList, sqlParams);

    // WhereLike  statement
    SqlHelper.toWhereLikeSqlList(Model, _options.whereLike, likeCon, sqlParams);

    // Join likeCon
    if (likeCon.length > 0) {
      andList.push(likeCon.join(' AND '));
    }

    // Push and
    SqlHelper.pushToSql(sql, andList.join(' AND '));

    // Push order by Order by example: [{field:"test", sort: "ASC|DESC"}]
    if (!_options.count) {
      SqlHelper.pushOrderBy(Model, sql, _options.orderBy);
    }

    // Check if offset / limit need to be added
    if (_options.offset !== null && _options.limit !== null && !_options.count) {
      SqlHelper.addOffsetLimitSqlList(sql, _options.offset, _options.limit, sqlParams);
    }

    return sql.join('');
  }

  /**
   * Push the model field to the sql str
   * @param <SqlModel> Model
   * @param <Array<FieldModel>>  fields
   * @returns {*}
   * @private
   */
  static pushModelFieldsToSqlList(list, Model, fields) {
    fields.forEach(function(field, index) {
      if (!field.sync) {
        return;
      }
      list.push(Model.table + '.' + field.name + ' AS ' + Model.table + '_' + field.name);
    });
  }

  /**
   * Push count selector to list
   * @param <Boolean> count
   * @param list
   */
  static pushCountSqlToList(count, list) {
    if (count) {
      list.push('COUNT(*) as total');
    }
  }

  /**
   * Add the where obj to an array
   * @param Model
   * @param where
   * @param andList
   * @param sqlParams
   */
  static toWhereSqlList(Model, where, list, sqlParams) {
    Object.keys(where).forEach(function(key, i) {
      sqlParams.push(where[key]);

      // In statement
      if (Array.isArray(where[key])) {
        list.push(Model.table + '.' + key + ' IN ( ? ) ');
      } else {
        list.push(Model.table + '.' + key + ' = ? ');
      }
    });
  }

  /**
   * To where Or - Object array with key value. || key = Array for an IN statement (WERE id IN [1,2,3] OR
   * @param Model
   * @param whereOr
   * @param list
   * @param sqlParams
   */
  static toWhereOrSqlList(Model, whereOr, list, sqlParams) {
    whereOr.forEach(function(orObj) {
      Object.keys(orObj).forEach(function(key, i) {
        if (Array.isArray(orObj[key])) {
          sqlParams.push(orObj[key]);
          list.push(Model.table + '.' + key + ' IN ( ? ) ');
        } else {
          sqlParams.push(orObj[key]);
          list.push(Model.table + '.' + key + ' = ? ');
        }
      });
    });
  }

  /**
   * To where Not
   * @param Model
   * @param whereNot
   * @param list
   * @param sqlParams
   */
  static toWhereNotSqlList(Model, whereNot, list, sqlParams) {
    Object.keys(whereNot).forEach(function(key, i) {
      sqlParams.push(whereNot[key]);

      // In statement
      if (Array.isArray(whereNot[key])) {
        list.push(Model.table + '.' + key + ' NOT IN ( ? ) ');
      } else {
        list.push(Model.table + '.' + key + ' != ? ');
      }
    });
  }

  /**
   * Tp where Like
   * @param Model
   * @param whereLike
   * @param list
   * @param sqlParams
   */
  static toWhereLikeSqlList(Model, whereLike, list, sqlParams) {
    Object.keys(whereLike).forEach(function(key, i) {
      if (Array.isArray(whereLike[key])) {
        whereLike[key].forEach(function(val) {
          list.push(Model.table + '.' + key + ' LIKE ? ');
          sqlParams.push(val);
        });
      } else {
        list.push(Model.table + '.' + key + ' LIKE ? ');
        sqlParams.push(whereLike[key]);
      }
    });
  }

  /**
   * Push to the main sql str
   * @param sqlList
   * @param sqlStr
   */
  static pushToSql(sqlList, sqlStr) {
    sqlList.push(sqlStr);
  }

  /**
   * Add offset, limit
   * @param sqlList
   * @param offset
   * @param limit
   * @param sqlParams
   */
  static addOffsetLimitSqlList(sqlList, offset, limit, sqlParams) {
    sqlParams.push(offset);
    sqlParams.push(limit);
    SqlHelper.pushToSql(sqlList, ' limit ?,?');
  }

  /**
   * Push order by
   * @param Model
   * @param sqlList
   * @param orderBy - array [{field:"test", sort: "ASC|DESC"}]
   */
  static pushOrderBy(Model, sqlList, orderBy) {
    const orderBySql = [];
    if (Array.isArray(orderBy)) {
      orderBy.forEach(function(row) {
        if (row.field) {
          if (!row.sort) {
            row.sort = 'ASC';
          }
          orderBySql.push(Model.table + '.' + Model.connection.escape(row.field).replace(/'/g, '') + ' ' + Model.connection.escape(row.sort).replace(/'/g, ''));
        }
      });

      if (orderBySql.length > 0) {
        sqlList.push(' ORDER BY ' + orderBySql.join(', '));
      }
    }
  }

  /**
   * Check from to date range (Example: WHERE AudStamp BETWEEN '2015-06-19' AND ADDDATE('2015-06-22', INTERVAL 1 DAY))
   * @param Model
   * @param sqlList
   * @param fromToDate
   * options.fromToDate: {
  			from: null, //yyyy-mm-dd
  			to: null, //yyyy-mm-dd
  			field: null //db field
  	},//
   */
  static pushFromToDateFilter(Model, sqlList, fromToDate) {
    if (('field' in fromToDate)) {
      sqlList.push(Model.table + '.' + fromToDate.field + ' BETWEEN ' + Model.connection.escape(fromToDate.from) + ' AND ADDDATE(' + Model.connection.escape(fromToDate.to) + ', INTERVAL 1 DAY) ');
    }
  }

  static capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  /**
   * Join models
   * @param Model
   * @param modelInstance
   * @param queryJoins - list to push to
   * @param include - array from include names (configured in the associations)
   */
  static pushJoinModels(Model, modelInstance, queryFields, queryJoins, include) {
    const associations = modelInstance.getAssociations();

    // Add the joins
    include.forEach(function(name, i) {

      var association = modelInstance.getAssociation(name);
      if (!association) {
        return;
      }

      const JoinModel = association.Model;
      const instance = new JoinModel();

      // Push model fields
      SqlHelper.pushModelFieldsToSqlList(queryFields, JoinModel, instance.getFields());

      associations.forEach(function(ass, assIndex) {

        if (ass.Model.table === JoinModel.table) {
          switch (ass.type) {
            case 'hasOne':
              queryJoins.push('LEFT JOIN ' + JoinModel.table + ' ON ' + JoinModel.table + '.id = ' + Model.table + '.' + JoinModel.table + SqlHelper.capitalize('id'));
              break;
            case 'hasMany':
              queryJoins.push('LEFT JOIN ' + JoinModel.table + ' ON ' + JoinModel.table + '.' + Model.table + 'Id = ' + Model.table + '.id');
              break;
          }
        }
      });
    });
  }

  /**
   * Find combine config
   * @param Model
   * @param field
   * @returns {*}
   */
  static getCombineConfig(Model, field) {
    var combineConfig = null;
    Model.combine.forEach(function(obj) {
      if (obj.field === field) {
        combineConfig = obj;
      }
    });
    return combineConfig;
  }

  /**
   * Adds associated data to a model.
   * @param currentModel -  Model to fill
   * @param rec - Data tat will be used to fill the associated data
   * @param associations - Associating config hasMany / hasOne
   * TODO unit testing
   */
  static buildJoinModel(currentModel, rec) {
    currentModel.getAssociations().forEach(function(ass, i) {
      if (ass.type === 'hasOne') {
        currentModel.set(ass.name, new ass.Model(MasterModel.fromPrefix(rec, ass.Model.table + '_')));
      }

      // Adds array of models to the configured property
      if (ass.type === 'hasMany') {
        let val = currentModel.get(ass.name);
        if (!Array.isArray(val)) {
          val = [];
        }
        val.push(new ass.Model(MasterModel.fromPrefix(rec, ass.Model.table + '_')));
        currentModel.set(ass.name, val);
      }
    });
  }

  /**
   *
   * Combine sql models with other model types. For example with LDAP models model with configured fields
   * @param Model
   * @param combines
   * @param modelInstance
   * @param callback
   * @returns {*}
   */
  combineModel(Model, combines, modelInstance, callback) {
    const parallels = [];

    // Lets combine
    if (!Model.combine) {
      return callback('Combine error');
    }
    if (!Model.combine) {
      return callback('Combine error');
    }

    // Loop trough the combines
    combines.forEach(function(combineObj) {

      // Set defaults
      const obj = Object.assign({}, {
        field: null,
        single: true,
        mandatory: true,
        parentDn: null
      }, combineObj);

      // This is the current model configuration config
      var modelCombineConfig = SqlHelper.getCombineConfig(obj.field);

      // Combine with
      switch (modelCombineConfig.type) {
        case 'ldap':

          // Combine one by one
          parallels.push(function(cb) {

            // If the Where value == empty
            if (modelInstance.get(modelCombineConfig.field) === null || typeof(modelInstance.get(modelCombineConfig.field)) === 'undefined') {
              if (obj.mandatory) {
                return cb('Combine field is empty');
              }
              return cb();
            }

            // Lets fetch
            modelCombineConfig.CombineModel.findAll({
              baseDn: obj.parentDn,
              scope: 'sub',
              where: {
                [modelCombineConfig.combineLink.valueOf()]: modelInstance.get(modelCombineConfig.field)
              },
              callback: function(err, combineModels) {
                if (err) return cb(err);
                if (obj.mandatory && combineModels.length < 1) {
                  return cb('Combine reference not found');
                }

                let combineModel = null;

                //On single lets return just one model. Else return array
                if (obj.single) {
                  if (combineModels.length > 0) {
                    combineModel = combineModels[0];
                  }
                } else {
                  combineModel = combineModels;
                }

                // Set the new value
                modelInstance.set(modelCombineConfig.combineField, combineModel);
                cb(null);
              }
            });
          });
          break;
        default:
          // No combine config found
          parallels.push(function(cb) {
            cb('Combine type error');
          });
      }
    });

    if (parallels.length < 1) {
      return callback(null, modelInstance);
    }

    // Execute
    async.parallel(parallels, function(err, results) {
      if (err) return callback(err);

      callback(null, modelInstance);
    });
  }
}
module.exports = SqlHelper;