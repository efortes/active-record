'use strict';

class Compare {

  /**
   * Check if 2 vars are the same
   */
  static isEqual(a, b) {

    /**
     * Check if date
     * @param d
     * @returns {boolean}
     */
    const isDate = function(d) {
      if (d instanceof Date) {
        return true;
      }
      return false;
    };

    // Array check
    const isArray = function(arr) {
      if (arr instanceof Array) {
        return true;
      }
      return false;
    };

    // Array check
    if (isArray(a) && isArray(b)) {
      if (JSON.stringify(a) === JSON.stringify(b)) {
        return true;
      }
      return false;
    }

    // Date check
    if (isDate(a) && isDate(b)) {
      return a.getTime() === b.getTime();
    }
    return a === b;
  }
}

module.exports = Compare;