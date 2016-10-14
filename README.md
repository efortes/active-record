## Intro
This module is not ready yet. Feel free to create pull requests at https://github.com/efortes/active-record .
This module allows you to accessing and manipulating data in a Mysql or LDAP database withough writing queries.

You can use it with promise or by callbacks.

### Set up
```
const activeRecord = require('active-record');
const SqlModel = activeRecord.SqlModel;
const LdapModel = activeRecord.LdapModel;

// Set config
activeRecord.setConfig({
  mysql: {
    logQuery: false
  },
  ldap: {
    ldapIgnoreSelfSignedCertificates: true,
    logQuery: false,
    manualLdapQueryTimeOut: 0 // 0 = No manual query timeout || milisec for the manual query timeoiut
  }
});

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

### SQL methods
```
const ExampleModel = ExampleModel; // Extends SqlModel

// Static methods
ExampleModel.destroyById(id, options);
ExampleModel.update(options);
ExampleModel.destroy(options);
ExampleModel.findById(id, options);
ExampleModel.findAll(options); // Find one or more records
ExampleModel.find(options); // Find single record
ExampleModel.count(options);
ExampleModel.query(options);

// Instance methods
const exampleModel = new ExampleModel({name: 'Nodejs', version: 'v0.9'});
exampleModel.get('name'); // WIll ouput Nodejs
exampleModel.set('version', 'v1.0'); // WIll ouput Nodejs
exampleModel.isValid('version'); // bool
exampleModel.getModified(); // modified fields
exampleModel.setDirty(); // Set fields dirty
exampleModel.isDirty('version'); // check if fields are dirty. If you pass the field it will check only the field
exampleModel.removeDirty(); // Remove dirty
exampleModel.getData(); // WIll ouput {name: 'Nodejs', version: 'v1.0'}
exampleModel.getRawData(); // WIll ouput {name: 'Nodejs', version: 'v1.0'} but without converting etc.
exampleModel.erase(options); // WIll delete the record
exampleModel.getField(fieldName); // Instance of FieldModel
ExampleModel.save(options); // Save instance to DB

```
### LDAP methods
// Static methods
ExampleModel.generateUniqueAttribute(options);  // Generate an unique key for a new record. override this method to gerenate your own unique keys
ExampleModel.destroy(options);
ExampleModel.findById(id, options);
ExampleModel.findByDn(dn, options);
ExampleModel.findAll(options); // Find one or more records
ExampleModel.find(options); // Find single record
ExampleModel.count(options);
ExampleModel.query(options);
ExampleModel.getBaseDn(options);
ExampleModel.getParentDn(options);

// Instance methods
const exampleModel = new ExampleModel({name: 'Nodejs', version: 'v0.9'});
exampleModel.get('name'); // WIll ouput Nodejs
exampleModel.set('version', 'v1.0'); // WIll ouput Nodejs
exampleModel.isValid('version'); // bool
exampleModel.getModified(); // modified fields
exampleModel.setDirty(); // Set fields dirty
exampleModel.isDirty('version'); // check if fields are dirty. If you pass the field it will check only the field
exampleModel.removeDirty(); // Remove dirty
exampleModel.getData(); // WIll ouput {name: 'Nodejs', version: 'v1.0'}
exampleModel.getRawData(); // WIll ouput {name: 'Nodejs', version: 'v1.0'} but without converting etc.
exampleModel.erase(options); // WIll delete the record
exampleModel.getField(fieldName); // Instance of FieldModel
ExampleModel.save(options); // options should always specify a parentDn attr (root lvl to search)

### SQL model Example
const activeRecord = require('active-record');
const SqlModel = activeRecord.SqlModel;
const LdapModel = activeRecord.LdapModel;

```
class Service extends activeRecord.SqlModel {

  constructor(data) {
    super(data);

    this.init({
    	fields: [SqlModel.createField({
        	name: "id"
        }), SqlModel.createField({
        	name: "name"
        })],
    	Model: Service,
    	data: data,
		associations: [
           { type: 'hasOne',  Model:Background,      name: 'background' },
           { type: 'hasOne',  Model:Language,        name: 'language' },
           { type: 'hasMany', Model:ServiceComment,  name: 'serviceComments' },
        ]
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
  const service = new Service{{name: 'Javascript'}};

	service.set('name', 'NodeJS')

	if (service.isDirty()) {
		 // Save service cb
		service.save({
		  callback: (err, result) => {
			if (err) return callback(err);

			callback();
		  }
		});

		 // Save service promise
		service.save().then(service => {

		}).catch(err => {

		});
	}

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
	  	fields: [LdapModel.createField({
			name: "dn",
		}),LdapModel.createField({
			name: "cn",
		}),LdapModel.createField({
			name: "name",
		})],
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