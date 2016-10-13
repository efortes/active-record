'use strict'

const async = require('async');
const MasterModel = require('./master-model');

/**
 * LDAP helper
 */
class LdapHelper {

  /**
   * Update the save data for a new ldap record
   * @param modelInstance
   * @param saveData
   */
  static updateSaveDataForNewRecord(modelInstance, saveData, uniqueAttr) {
    saveData[modelInstance.Model.uniqueAttribute] = uniqueAttr;
    saveData.objectClass = modelInstance.Model.objectClasses;
  }

  /**
   * Generate new dn
   * @param modelInstance
   * @param parentDn
   * @returns {string}
   */
  static generateNewDn(modelInstance, saveData, parentDn) {
    return modelInstance.Model.uniqueAttribute + '=' + saveData[modelInstance.Model.uniqueAttribute] + ',' + parentDn;
  }

  /**
   * Validate mandatory fields
   * @param modelInstance
   * @param saveData
   * @returns {Array}
   */
  static validateMandatoryFieldsForSave(modelInstance, saveData) {
    const errors = [];
    // Check if the mandatory attributes are set
    modelInstance.Model.mandatoryAttributes.forEach(function(attr) {
      if (!(attr in saveData)) {
        errors.push('Mandatory field "' + attr + '" is missing');
      }
    });
    return errors;
  }

  /**
   *  Build ldap change list for teh ldap modify query
   * @param modelInstance
   * @param saveData
   * @returns {{modifications: Array, logModifications: Array}}
   */
  static buildChangeListForSave(modelInstance, saveData) {
    // Modifications
    const modifications = [];

    // Modification logging
    const logModifications = [];

    Object.keys(saveData).forEach(function(key) {

      var operation = 'add';
      if (modelInstance.getRawData(key) !== null) {
        operation = 'replace';
      }

      // If the array is empty it should be deleted
      if (Array.isArray(saveData[key])) {
        if (saveData[key].length < 1) {
          operation = 'delete';
        }
      }

      // If the length is < 1 we need to delete
      if (saveData[key].length < 1 && modelInstance.getRawData(key) !== null) {
        operation = 'delete';
      }

      // We should place the old value back in to be able to delete
      if (operation === 'delete') {
        saveData[key] = modelInstance.getRawData(key);
        if (typeof(saveData[key]) === 'undefined') {
          // If its empty then we cannot delete as it should have the original value
          return;
        }
        if (saveData[key].length < 1) {
          return;
        }
      }

      // If its empty then we cannot add as it should have a value
      if (operation === 'add') {
        if (saveData[key].length < 1) {
          return;
        }
      }

      const currentModification = {};
      currentModification[key.valueOf()] = saveData[key];

      modifications.push({
        operation: operation,
        modification: currentModification
      });
    });

    return modifications;
  }

  /**
   * Get all the fields and set the ones that need to be updated
   * @param modelInstance
   * @returns {{}}
   */
  static buildDirtyDataForSave(modelInstance) {
    const saveData = {};

    // get unique id
    const uniqueAttributeId = modelInstance.get(modelInstance.Model.uniqueAttribute);

    // Check if fields are dirty
    modelInstance.getFields().forEach(function(field) {

      // When not an update
      if (!uniqueAttributeId) {

        // Only add fields that are set as sync fields and do not update the unique key
        if (field.sync && field.name !== modelInstance.Model.primaryKey) {
          const val = field.beforeSave(modelInstance.get(field.name), modelInstance);
          if (typeof(val) !== 'undefined' && val !== null && val !== '') {
            saveData[field.name] = val;
          }
        }
        return;
      }

      // When an update lets check if the fields are modified
      if (modelInstance.isDirty(field.name)) {
        if (field.sync && field.name !== modelInstance.Model.primaryKey) {
          const val = field.beforeSave(modelInstance.get(field.name), modelInstance);
          if (typeof(val) !== 'undefined' && val !== null) {
            saveData[field.name] = val;
          }
        }
      }
    });
    return saveData;
  }

  /**
   * Add object classes to the and filter
   * @param Model
   * @param andFilter
   */
  static pushObjectClassesToQuery(Model, andFilter) {
    Model.objectClasses.forEach(function(attr, index) {
      andFilter.push('(objectClass=' + attr + ')');
    });
  }

  /**
   * Push mandatory fields to query
   * @param Model
   * @param andFilter
   */
  static pushMandatoryFieldsToQuery(Model, andFilter) {
    Model.mandatoryAttributes.forEach(function(attr, index) {
      andFilter.push('(' + attr + '=*)');
    });
  }

  /**
   * Push where filter
   * @param where
   * @param andFilter
   */
  static pushWhereFilterToQuery(where, andFilter) {
    Object.keys(where).forEach(function(key) {
      if (Array.isArray(where[key])) {
        where[key].forEach(function(whereItem) {
          andFilter.push('(' + key + '=' + whereItem + ')');
        });
      } else {
        andFilter.push('(' + key + '=' + where[key] + ')');
      }
    });
  }

  /**
   * Convert whereLike to the and filter. Just add the char * to it
   * @param Model
   * @param where
   * @param andFilter
   */
  static pushWhereLikeFilterToQuery(whereLike, andFilter) {
    Object.keys(whereLike).forEach(function(key) {
      if (Array.isArray(whereLike[key])) {
        whereLike[key].forEach(function(whereLikeSub) {
          andFilter.push('(' + key + '=*' + whereLikeSub + '*)');
        });
      } else {
        andFilter.push('(' + key + '=*' + whereLike[key] + '*)');
      }
    });
  }

  /**
   * Convert whereNot to filter
   * @param whereNot
   * @param whereNotFilter
   */
  static pushWhereNotFilterToQuery(whereNot, whereNotFilter) {
    Object.keys(whereNot).forEach(function(key) {
      if (Array.isArray(whereNot[key])) {
        whereNot[key].forEach(function(or) {
          whereNotFilter.push('(!(' + key + '=' + or + '))');
        });
      } else {
        whereNotFilter.push('(!(' + key + '=' + whereNot[key] + '))');
      }
    });
  }

  /**
   * Where or filter
   * @param whereOr
   * @param whereOrFilter
   */
  static buildWhereOrFilterToQuery(whereOr) {
    const whereOrFilter = [];
    Object.keys(whereOr).forEach(function(key) {
      if (Array.isArray(whereOr[key])) {
        whereOr[key].forEach(function(or) {
          whereOrFilter.push('(' + key + '=' + or + ')');
        });
      } else {
        whereOrFilter.push('(' + key + '=' + whereOr[key] + ')');
      }
    });

    let whereOrStr = '';
    if (whereOrFilter.length > 0) {
      whereOrStr = '(|' + whereOrFilter.join('') + ')';
    }
    return whereOrStr;
  }

  /**
   * Build ldap search filter
   * @param Model
   * @param _options
   * @returns {string}
   */
  static buildQueryFilter(Model, options) {
    const _options = Object.assign({}, {
      where: {},
      whereNot: {}, // Key with array
      whereOr: {},
      whereLike: {},
      debug: false
    }, options);

    let filter = '';
    const andFilter = [];
    const whereNotFilter = [];
    const whereOrFilter = [];

    // add object classes to filter
    LdapHelper.pushObjectClassesToQuery(Model, andFilter);

    // Check object mandatory attr
    LdapHelper.pushMandatoryFieldsToQuery(Model, andFilter);

    // Convert where to filter
    LdapHelper.pushWhereFilterToQuery(_options.where, andFilter);

    // Convert whereLike to the and filter. Just add the char * to it
    LdapHelper.pushWhereLikeFilterToQuery(_options.whereLike, andFilter);

    // Convert whereNot to filter
    LdapHelper.pushWhereNotFilterToQuery(_options.whereNot, whereNotFilter);

    // Convert whereOr to filter
    const whereOr = LdapHelper.buildWhereOrFilterToQuery(_options.whereOr);

    if (andFilter.length > 0 || whereNotFilter.length > 0 || whereOr) {
      filter += '(&' + andFilter.join('') + whereNotFilter.join('') + whereOr + ')';
    }

    return filter;
  }
}

module.exports = LdapHelper;