'use strict';

const ActiveRecord = require('../../index');
const SqlModel = ActiveRecord.SqlModel;
const LdapModel = ActiveRecord.LdapModel;

// Mock Mysql obj
const mysqlConn = {
  query(statement, bindVars, callback) {
    return  callback(null, {insertId: 1111})
  },
  escape(val) {
    return `'${val}'`;
  }
}

const STATICS = {
  CONVERTED_EXTRA_VAL: 'converted',
  USER_BEFORFE_SAVE_VAL: 2000
}

/**
 * Background
 */
class Background extends ActiveRecord.SqlModel {

  constructor(data) {
    super(data);

    var fields = [SqlModel.createField({
      name: 'id'
    }), SqlModel.createField({
      name: 'portalId'
    }), SqlModel.createField({
      name: 'color'
    }), SqlModel.createField({
      name: 'userId'
    })];

    this.init({
      fields: fields,
      Model: Background,
      data: data
    });
  }
}

Background.primaryKey = 'id';
Background.table = 'background';
Background.adapter = 'mysql';
Background.connection = mysqlConn;

/**
 * Background
 */
class Car extends ActiveRecord.SqlModel {

  constructor(data) {
    super(data);

    var fields = [SqlModel.createField({
      name: 'id'
    }), SqlModel.createField({
      name: 'name'
    }), SqlModel.createField({
      name: 'price'
    }), SqlModel.createField({
      name: 'color',
      sync: false
    })];

    this.init({
      fields: fields,
      Model: Car,
      data: data
    });
  }
}

Car.initConfig({
  primaryKey: 'id',
  table: 'car',
  adapter: 'mysql',
  connection: mysqlConn
});



class ServiceComment extends ActiveRecord.SqlModel {

  constructor(data) {
    super(data);

    var fields = [SqlModel.createField({
      name: 'id',
      scimAttr: 'id',
      schema: 'urn:scim:schemas:extension:gripservice:1.0'
    }), SqlModel.createField({
      name: 'userId'
    }), SqlModel.createField({
      name: 'comment',
      schema: 'urn:scim:schemas:extension:gripservice:1.0'
    }), SqlModel.createField({
      name: 'lastModified',
      scimAttr: 'lastModified',
      schema: 'urn:scim:schemas:extension:gripservice:1.0'
    }), SqlModel.createField({
      name: 'comments',
      scimAttr: 'comments',
      schema: 'urn:scim:schemas:extension:gripservice:1.0',
      sync: false
    }), SqlModel.createField({
      name: 'user',
      sync: false
    })];

    this.init({
      fields: fields,
      Model: ServiceComment,
      data: data,
      lastModifiedField: 'updated',
      createdField: 'created'
    });
  }
}

ServiceComment.initConfig({
  primaryKey: 'id',
  table: 'comment',
  adapter: 'mysql',
  connection: mysqlConn
});


class User extends SqlModel {

  constructor(data) {
    super(data);

    this.init({
      fields: [SqlModel.createField({
        name: 'id'
      }), SqlModel.createField({
        name: 'name',
        convert: (val) => {
          return val + STATICS.CONVERTED_EXTRA_VAL;
        },
        validations: {

        }
      }), SqlModel.createField({
        name: 'email',
        convert: (val) => {
          return val + STATICS.CONVERTED_EXTRA_VAL;
        }
      }), SqlModel.createField({
        name: 'list',
        defaultValue: [],
        sync: false
      }), SqlModel.createField({
        name: 'street',
        defaultValue: 'Hozensstraat'
      }), SqlModel.createField({
        name: 'language',
        sync: false
      }), SqlModel.createField({
        name: 'backgroundId'
      }), SqlModel.createField({
        name: 'background',
        sync: false
      }), SqlModel.createField({
        name: 'serviceComments',
        defaultValue: 0,
        sync: false
      }), SqlModel.createField({
        name: 'background',
        defaultValue: 0,
        sync: false
      }), SqlModel.createField({
        name: 'created'
      })],
      Model: User,
      data: data,
      associations: [
        {type: 'hasOne', Model: Background, name: 'background'},
        {type: 'hasMany', Model: ServiceComment, name: 'serviceComments'}
      ]
    });
  }

  beforeSave(options) {
    super.beforeSave();
    this.set('updated', STATICS.USER_BEFORFE_SAVE_VAL);
    return options.callback(null);
  }
}

User.primaryKey = 'id';
User.table = 'user';
User.adapter = 'mysql';
User.connection = mysqlConn;

/**
 * LDAP LdapUser
 */
class LdapUser extends ActiveRecord.LdapModel {

  constructor(data) {
    super(data);

    this.init({
      fields: [LdapModel.createField({
        name: 'dn'
      }), LdapModel.createField({
        name: 'cn'
      }), LdapModel.createField({
        name: 'name'
      }), LdapModel.createField({
        name: 'gender',
        defaultValue: 'male'
      }), LdapModel.createField({
        name: 'displayName'
      }), LdapModel.createField({
        name: 'list'
      }), LdapModel.createField({
        name: 'list2'
      }), LdapModel.createField({
        name: 'credits',
        sync: false
      })],
      Model: LdapUser,
      data: data
    });
  }
}
LdapUser.objectClasses = ['cIDSUserObject', 'person', 'inetOrgPerson', 'organizationalPerson'];
LdapUser.uniqueAttribute = 'cn';
LdapUser.mandatoryAttributes = ['cn', 'name'];
LdapUser.connection = null;
LdapUser.baseDn = 'cn=%cn%,ou=%domain%,ou=Users,ou=%tenantOu%,ou=Tenants,dc=CIDS';

/**
 * LDAP LdapUser parent
 */
class LdapTenantUserParent extends ActiveRecord.LdapModel {

  constructor(data) {
    super(data);

    this.init({
      fields: [LdapModel.createField({
        name: 'dn'
      }), LdapModel.createField({
        name: 'ou'
      }), LdapModel.createField({
        name: 'description'
      })],
      Model: LdapTenantUserParent,
      data: data
    });
  }

  generateUniqueAttribute(options) {
    return options.callback(null, 'Users');
  }
}

LdapTenantUserParent.objectClasses = ['organizationalUnit', 'top'];
LdapTenantUserParent.mandatoryAttributes = [];
LdapTenantUserParent.uniqueAttribute = 'ou';
LdapTenantUserParent.connection = null;
LdapTenantUserParent.baseDn = 'ou=Users,ou=%tenantOu%,ou=Tenants,dc=CIDS';

module.exports = {
  Background: Background,
  User: User,
  Car: Car,
  ServiceComment: ServiceComment,
  LdapUser: LdapUser,
  LdapTenantUserParent: LdapTenantUserParent,
  STATICS: STATICS
};