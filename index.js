'use strict';

const MasterModel = require('./lib/master-model');
const SqlModel = require('./lib/sql-model');
const LdapModel = require('./lib/ldap-model');
const FieldModel = require('./lib/field-model');
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
   * FieldModel (used in the SqlModel and LdapModel
   */
  FieldModel: FieldModel,

  /**
   * Override default module config
   * @param newConfig
   */
  setConfig: (newConfig) => {
    Object.assign(config, newConfig);
  },

  /**
   * This will create a ldap connection based on the ldapjs module (http://ldapjs.org) with some extra functionality
   * ldapConfig {
   *  @param <url>	A valid LDAP URL (proto/host/port only)
   *  @param <socketPath>	Socket path if using AF_UNIX sockets
   *  @param <log>	Bunyan logger instance (Default: built-in instance)
   *  @param <timeout>	Milliseconds client should let operations live for before timing out (Default: Infinity)
   *  @param <connectTimeout>	Milliseconds client should wait before timing out on TCP connections (Default: OS default)
   *  @param <tlsOptions>	Additional options passed to TLS connection layer when connecting via ldaps:// (See: The TLS docs for node.js)
   *  @param <idleTimeout>	Milliseconds after last activity before client emits idle event
   *  @param <strictDN>	Force strict DN parsing for client methods (Default is true)
   *  @param <Object> ldapConfig See http://ldapjs.org/client.html for the available options
   * }
   * @returns {LdapClient}
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
