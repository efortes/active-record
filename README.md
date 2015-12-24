# Active record for LDAP and MYSQL

## SQL model Example
`
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
`

### SQL model - Combine models
`
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
		var serviceLdap = model.get("serviceLdap");
		
		console.log(serviceLdap);
	}
});
`