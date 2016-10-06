'use strict';

const MasterModel = require('./lib/master-model');
const SqlModel = require('./lib/sql-model');
const LdapModel = require('./lib/ldap-model');
const config = require('./config');

module.exports = {
  MasterModel: MasterModel,
  SqlModel: SqlModel,
  LdapModel: LdapModel,
  setConfig: (newConfig) => {
    Object.assign(config, newConfig);
  }
};
