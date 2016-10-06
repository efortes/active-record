'use strict';

const MasterModel = require('./lib/master-model');
const SqlModel = require('./lib/sql-model');
const LdapModel = require('./lib/ldap-model');
const LdapClient = require('./lib/client/ldap-client');
const MysqlClient = require('./lib/client/mysql-client');
const config = require('./config');

module.exports = {

  /**
   * Master model
   */
  MasterModel: MasterModel,

  /**
   * Mysql model
   */
  SqlModel: SqlModel,

  /**
   * Ldap model
   */
  LdapModel: LdapModel,

  /**
   * Override default module config
   * @param newConfig
   */
  setConfig: (newConfig) => {
    Object.assign(config, newConfig);
  },

  /**
   * See https://www.npmjs.com/package/mysql#pool-options for the mysql pool options
   * @param <Object> sqlConfig
   * @returns {Pool}
   */
  createLdapConn(ldapConfig) {
    return new LdapClient(ldapConfig);
  },

  /**
   * See https://www.npmjs.com/package/mysql#pool-options for the mysql pool options
   * @param <Object> sqlConfig
   * @returns {Pool}
   */
  createMysqlConn(sqlConfig) {
    return new MysqlClient(ldapConfig);
  }
};
