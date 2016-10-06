## Intro
This module is not ready yet. Feel free to create pull requests at https://github.com/efortes/active-record .
This module allows you to accessing and manipulating data in a Mysql or LDAP database withough writing queries.

### Set up
```
const activeRecord = require('active-record');
const SqlModel = activeRecord.SqlModel;
const LdapModel = activeRecord.LdapModel;
// Set config
activeRecord.setConfig({
    logQuery: true
})

// Mysql connection See https://www.npmjs.com/package/mysql#pool-options for the mysql pool options
const mysqlConn = activeRecord.createMysqlConn({
    host: null,
    user: null,
    password: null,
    database: null,
    port: null
});

//Ldap connection. See http://ldapjs.org/client.html
const ldapConn = activeRecord.createLdapConn({
    url: 'ldap://url'
})

```
### SQL model Example
const activeRecord = require('active-record');
const SqlModel = activeRecord.SqlModel;
const LdapModel = activeRecord.LdapModel;

```
class Service extends activeRecord.SqlModel {

  constructor(data) {
    super(data);

    var fields = [SqlModel.createField({
    	name: "id"
    }), SqlModel.createField({
    	name: "serviceCn"
    })];

     var associations = [
       { type: 'hasOne',  Model:Background,      name: 'background' },
       { type: 'hasOne',  Model:Language,        name: 'language' },
       { type: 'hasMany', Model:ServiceComment,  name: 'serviceComments' },
     ];

    this.init({
    	fields: fields,
    	Model: Service,
    	data: data,
			associations: associations
    });
  }
};

Service.primaryKey = "id";
Service.table = "service";
Service.adapter = "mysql";
Service.connection = mysqlConn;
```
### SQL model - find with associations
TODO

### SQL model save example
```
TODO
```
### SQL count
```
ServiceModel.count({
	include: ['language'],
	callback: function(err, total) {
		if (err) {
			return console.log(err);
		}
		console.log("Total count: " + total);
	}
});
```


## LDAP model Example
```
class LdapUser extends LdapModel {

	constructor(data) {
	  super(data);

	  var fields = [LdapModel.createField({
	  	name: "dn",
	  }),LdapModel.createField({
	  	name: "cn",
	  }),LdapModel.createField({
	  	name: "name",
	  })];

	  this.init({
	  	fields: fields,
	  	Model: LdapUser,
	  	data: data
	  });
	}

  generateUniqueAttribute(options) {
  	return options.callback(null, "1000000");
  }
};

LdapUser.objectClasses = ["user"];
LdapUser.mandatoryAttributes = [];
LdapUser.uniqueAttribute = "ou";
LdapUser.connection = ldapConn;
LdapUser.baseDn = "ou=User,dc=CIDS";
```
### LDAP model save example
```
var ldapUser = new LdapUser({
	cn: "test" + Math.random(),
	name: "test" + Math.random(),
});

ldapUser.set("name", "test2" + Math.random());

ldapUser.save({
	parentDn: LdapUser.getBaseDn(),
	callback: function(err, newModel) {
		if (err) {
			console.log("- ERROR ------");
			return console.log(err.toString());
		}
		console.log(newModel);
	}
});
```


This implementation is NOT final and subject to change.