## Not ready
This package is for testing only. Not ready jet.

### SQL model Example
```
class Service extends ActiveRecord.SqlModel {
	
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
Service.combine = [{
	type: 'ldap',
	field: 'serviceCn',
	CombineModel: gripCidsObjects.TenantGroupServiceInstanceItem,
	combineLink: 'cn',
	combineField: 'serviceLdap'
}];
```
### SQL model - find with associations
TODO

### SQL model - Combine models with find
```
ServiceModel.find({
	where: {
		id: 2
	},
	combine: [{
		field: 'serviceCn',
		single: true,
		parentDn: gripCidsObjects.TenantGroupServiceInstance.getBaseDn({
			tenantOu: 33333333
		}),
	}],
	callback: function(err, model) {
		if (err) return next(err);
		var serviceCn = model.get("serviceCn");
		
		console.log(serviceCn);
	}
});
```
### SQL model save example
```
TODO
```
### SQL count
```
Order.count({
	debug: true,
	include: ['portal'],
	callback: function(err, total) {
		if (err) {
			return console.log(err);					
		}
		console.log("Total count: " + total);
	}
});
```
### SQL model - Combine models with findAll
```
ServiceModel.findAll({
	combine: [{
		field: 'serviceCn',
		single: true,
		mandatory: false,
		parentDn: gripCidsObjects.TenantGroupServiceInstance.getBaseDn({
			tenantOu: 33333333
		})
	}],
	callback: function(err, models) {
		if (err) return next(err);
		var result = [];
		models.forEach(function(model) {					
			var serviceLdap = model.get("serviceLdap");
			if (serviceLdap) {
				result.push(serviceLdap.get("dn"));
			} else {
				result.push(model.get("name_en") + " not found");						
			}
		});
		
		res.send(result.join(", "));
	}
});
```

## LDAP model Example
```
class UmbrellaOuParent extends ActiveRecord.LdapModel {	 
		
	constructor(data) {
	  super(data);
	  
	  var fields = [LdapModel.createField({
	  	name: "dn",
	  }),LdapModel.createField({
	  	name: "ou",
	  })];
	  
	  this.init({
	  	fields: fields,
	  	Model: UmbrellaOuParent,
	  	data: data
	  });    
	}
	
  generateUniqueAttribute(options) {
  	return options.callback(null, "Umbrellas");
  }
};

UmbrellaOuParent.objectClasses = ["organizationalUnit", "top"];
UmbrellaOuParent.mandatoryAttributes = [];
UmbrellaOuParent.uniqueAttribute = "ou";
UmbrellaOuParent.connection = ldapConn;
UmbrellaOuParent.baseDn = "ou=Umbrellas,dc=CIDS";
```
### LDAP model save example
```
var tenant = new TenantUser({
	sn: "test" + Math.random(),
	givenName: "test" + Math.random(),
	name: "test" + Math.random(),
	mail: "tester@asd.com" + Math.random(),
});

tenant.set("cIDSPrimaryLoginID", "test" + Math.random());		

tenant.save({
	parentDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=CIDS",
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