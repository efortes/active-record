'use strict';

const MasterModel = require('./lib/master-model');
const SqlModel = require('./lib/sql-model');
const LdapModel = require('./lib/ldap-model');
module.exports = {
  MasterModel: MasterModel,
  SqlModel: SqlModel,
  LdapModel: LdapModel
};
