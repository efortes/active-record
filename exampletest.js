var MasterModel = require("./index").MasterModel;
var SqlModel = require("./index").SqlModel;
var TenantUser = require("../../grip-cids-objects").tenantUser;
var cidsObjects = require("../../grip-cids-objects");
var mysqlConn = require("../../../grip-bms/lib/mysql-connection");

var gripLog = require("../../grip-log");

var extend = require("extend");
var IDMQueueModel = require("../../grip-idm/models/queue");
var tracer = require('tracer').colorConsole();
var c = require('../../../grip-bms/config/grip-core')();

/**
 * LDAP tenant user
 */
/**
 * LDAP tenant user
 */
//class Tenant extends ActiveRecord.MasterModel {
//	
//  constructor(data) {
//    super(data);
//    
//    var fields = [MasterModel.createField({
//    	name: "cn"
//    }), MasterModel.createField({
//    	name: "displayName"
//    }), MasterModel.createField({
//    	name: "street"
//    })];   
//e
////     var associations = [
////       { type: 'hasOne',  model:Background,      name: 'background' },
////       { type: 'hasOne',  model:Language,        name: 'language' },
////       { type: 'hasMany', model:ServiceComment,  name: 'serviceComments' },
////     ];
//
//    this.init(data, fields, associations, User);
//  }  
//};



//Single
var testType = "includeSame";

switch(testType) {

case "includeSame":
	var WidgetTemplateModel = require('../../../grip-bms/models/widget-template');
	WidgetTemplateModel.findAll({
		include: ["parent"],
		debug: true,
		callback: function(err, results) {
    		if (err) return console.log(err)
    			console.log(results);
    }
  });	
	break;
case "findSub":
	console.log(cidsObjects.TenantGroupDivision.getBaseDn({tenantOu: 33333333}));
	cidsObjects.TenantGroupDivisionItem.findAll({
		baseDn: cidsObjects.TenantGroupDivision.getBaseDn({tenantOu: 33333333}),
		scope: 'sub',
		callback: function (err, results) {
			if (err) return callback(err)
			console.log(results);
		}
	});	
	break;
	
case "-------------":
	//"cn=%cn%,ou=%domain%,ou=Users,ou=%tenantOu%,ou=Tenants,dc=CIDS";
	TenantUser.find({
		where: {
			baseDn: {
				cn: "asd",
				domain: "asd",
				tenantOu: "asd",
			},
			place: "Dordrecht"
		},
		callback: function(err, item) {
			if (err) {
				return console.log("------> " + err);
			}
			
			console.log(arguments);

		}
	});	
	
	TenantUser.findByCn("asd",{
		baseDn: {
			domain: "asd",
			tenantOu: "asd",
		},
		where: {
			place: "Dordrecht"
		},
		callback: function(err, item) {
			if (err) {
				return console.log("------> " + err);
			}
			
			console.log(arguments);

		}
	});	
	
break;

	case "idmqueue":
	//	var q = IDMQueueModel.build();
		// Get queses
		IDMQueueModel.findAll({
			limit: 20,
			whereNot: {
				QueCrtCN: "331f22b4f7b711e39a93ba8326a06d26",
				QuePWS: "Elvin-asus",
			},
			where: {
				QueCrtCN: "331f22b4f7b711e39a93ba8326a06d26",
			},
			debug: true,
//			whereNo
			callback: function(err, queues) {
				console.log(err);
				console.log(queues.length);
			}
		});		
		break;
	case "errorlog":
		var model = gripLog.createErrorModel("33333333", {});
		model.set("ErrInstName", "hoiiiiiiii");
		tracer.info(model.get("ErrInstName"));
		break;
	case "objtest":
		Object.keys(cidsObjects).forEach(function(key) {
			//console.log(key);
			var t = new cidsObjects[key]();
			console.log(t.constructor.name);
		});
		break;
	case "ldapRemove":
		
		TenantUser.findById("be85a69d-af2b-249c-3045-a137e44dba60", {
			baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=CIDS",
			scope: "sub",
			callback: function(err, item) {
				if (err) {
					return console.log("------> " + err);
				}
				
				if (!item) {
					console.log("Item not found");
				}
				//console.log(arguments);
				item.set("givenName", "Hoiiii" + Math.random());
				item.set("mail", "ssssss@aswd.com");
				
				console.log(item.get("givenName"));
				
				item.erase({
					callback: function(err) {
						if (err) {
							return console.log("Delete ------> " + err);							
						}
						console.log("--- Removed ---")
						console.log(item.getData());
					}
				})
				
			}
		});	
		
	break;
	case "ldapNew":

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
		
		
	break;
	case "ldapSave":
		
		TenantUser.findById("afcb2640-9920-937c-3e3e-1a7acbe3a115", {
			baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=CIDS",
			//scope: "sub",
			callback: function(err, item) {
				if (err) {
					return console.log("------> " + err);
				}
				//console.log(arguments);
				item.set("givenName", "Hoiiii" + Math.random());
				item.set("mail", "ssssss@aswd.com");
				
				console.log(item.get("cIDSRoleMember"));
			
				
				item.set("cIDSRoleMember", ["cn=Grip-33333333-01-DefaultUser,ou=ServiceRoles,ou=Groups,ou=33333333,ou=Tenants,dc=CIDS", "cn=Grip-33333333-01-c-HdBMS,ou=ServiceRoles,ou=Groups,ou=33333333,ou=Tenants,dc=CIDS"]);
				
				//console.log(item.getModified());
				
				item.save({
					callback: function(err, savedItem) {
						if (err) {
							console.log("- ERROR ------");
							return console.log(err.toString());
						}
						console.log(savedItem);
						console.log("------------saved--------------");
					}
				});
			}
		});			
		
		break;

	case "sqlmodel":
		
		class Portal extends SqlModel {
			
		  constructor(data) {
		    super(data);
		    
		    var fields = [MasterModel.createField({
		    	name: "id"
		    }), MasterModel.createField({
		    	name: "tenantId"
		    }), MasterModel.createField({
		    	name: "url"
		    }), MasterModel.createField({
		    	name: "defaultBackgroundId"
		    }), MasterModel.createField({
		      name: "defaultLanguageId"
		    }), MasterModel.createField({
		      name: "timer",
		      scimAttr: "timer",
		      schema: "urn:scim:schemas:extension:portal:1.0"
		    }), MasterModel.createField({
		      name: "created"
		    }), MasterModel.createField({
		    	name: "lastModified"
		    }), MasterModel.createField({
		    	name: "footer",
		    	scimAttr: "footer",
		      schema: "urn:scim:schemas:extension:portal:1.0",
		    	sync: false
		    }), MasterModel.createField({
		    	name: "background",
		    	scimAttr: "background",
		      schema: "urn:scim:schemas:extension:portal:1.0",
		    	sync: false
		    }), MasterModel.createField({
		    	name: "language",
		    	scimAttr: "language",
		      schema: "urn:scim:schemas:extension:portal:1.0",
		    	sync: false
		    })];     
		  
		    this.init({
		    	fields: fields,
		    	Model: Portal,
		    	data: data
		    });
		    
		  }  
		};
	
		Portal.primaryKey = "id";
		Portal.table = "portal";
		Portal.adapter = "mysql";
		Portal.connection = mysqlConn;
	
		/**
		 * LDAP tenant user
		 */
		class Order extends SqlModel {
			
		  constructor(data) {
		    super(data);
		    
		    var fields = [MasterModel.createField({
		    	name: "id",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0"
		    }), MasterModel.createField({
		    	name: "portalId",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0"
		    }), MasterModel.createField({
		    	name: "serviceId",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0"
		    }), MasterModel.createField({
		    	name: "userId",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0"
		    }), MasterModel.createField({
		    	name: "parameters",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0",
		    	beforeSave: function(val, record) {
		    		
		    		//Check if the data is a json string
		    		var result = val;
						try {
							JSON.parse(str);
						} catch (e) {
							result = JSON.stringify(result);
						}
						return result;
		    	}
		    }), MasterModel.createField({
		    	name: "indicative",
		    	schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0",
		    }), MasterModel.createField({
		      name: "quantity",
		      schema: "urn:scim:schemas:extension:gripmarketplaceorder:1.0"
		    }), MasterModel.createField({
		      name: "portal",
		      sync: false
		    })];   
		    
		     var associations = [
	         { type: 'hasOne',  Model: Portal, name: 'portal' }
	       ];

		    
				this.init({
					fields: fields,
					Model: Order,
					data: data,
					associations: associations
				});
		  }  
		};

		Order.primaryKey = "id";
		Order.table = "order";
		Order.adapter = "mysql";
		Order.connection = mysqlConn;
		
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
		
		Order.findAll({
			debug: true,
			include: ['portal'],
			callback: function(err, orders) {
				if (err) {
					return console.log(err);					
				}
				console.log("Total: " + orders);
				
				orders.forEach(function(order) {
//					order.set("quantity", 200);
//					order.save({
//						callback: function(err, order) {
//							console.log(arguments);
//						}
//					});
				});
				orders[0].set("quantity", orders[0].get("quantity") + 1);
				orders[0].save({
					callback: function(err, order) {
						console.log(arguments);
					}
				});
				
				//	console.log(orders[0].getData());
				console.log(orders[0].get("portal").get("tenantId"));
			}
		});
		
	break;
	case "ldapFind":
		TenantUser.find({
			baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=cids",
			callback: function(err, items) {
				if (err) {
					return console.log("------> " + err);
				}
				return console.log(items);
			}
		});		
		break;
	case "ldapFindById":
		TenantUser.findById("331f1e38f7b711e39a93ba8326a06d26", {
			baseDn: "ou=Users,ou=33333333,ou=Tenants,dc=cids",
			callback: function(err, item) {
				if (err) {
					return console.log("------> " + err);
				}
				return console.log(item);
			}
		});		
		break;
	case "ldapFindAll":
		TenantUser.findAll({
			offset: 0,
			limit: 3,
			baseDn: "ou=Users,ou=33333333,ou=Tenants,dc=cids",
			callback: function(err, items) {
				if (err) {
					return console.log("------> " + err);
				}
				return console.log(items.length);
			}
		});		
		break;
	case "ldapCount":
		TenantUser.count({
			baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=cids",
			callback: function(err, total) {
				if (err) {
					return console.log("------> " + err);
				}
				return console.log("Toatl: " + total);
			}
		});		
		break;
	case "single":
		TenantUser.query({
			single: true,
			baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=cids",
			where: {
				cn: "0aaaaaaauyspuvarb2ntlnn9pkzofonx",
				cIDSMemberOf: "cn=Grip-33333333-01,ou=ServiceInstances,ou=Groups,ou=33333333,ou=Tenants,dc=CIDS",
				mail: "alexmoran@test.nl"
			},
			callback: function(err, tenantUser) {
				if (err) {
					return console.log("------> " + err);
				}
				console.log("--- SINGLE ---");
				if (tenantUser) {			
					console.log("--- SINGLE user found ---");
					return console.log(tenantUser.get("displayName"));
				}
				console.log("No user found");
			}
		});
		
		break;
	case "multi":
		TenantUser.query({
			baseDn: "ou=Users,ou=33333333,ou=Tenants,dc=cids",
			scope: "sub",
			where: {
				cIDSMemberOf: "cn=Grip-33333333-01,ou=ServiceInstances,ou=Groups,ou=33333333,ou=Tenants,dc=CIDS"
			},
			callback: function(err, tenants) {
				if (err) {
					return console.log("------> " + err);
				}
				console.log("--- MULTI ---");
				if (tenants.length > 0) {			
					console.log("--- MULTI ---");
					tenants.forEach(function(tenant) {
						
						return console.log(tenant.get("cn") + ": " + tenant.get("displayName"));
					});
					return;
				}
				console.log("No user found");
			}
		});		
		break;
}


//multi
//TenantUser.query({
//	baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=cids",
//	scope: "sub",
//	where: {
//		cn: "0aaaaaaauyspuvarb2ntlnn9pkzofonx"
//	},
//	callback: function(err, tenantUser) {
//		if (err) {
//			return console.log("------> " + err);
//		}
//		console.log("--- SINGLE ---");
//		console.log(tenantUser.get("cn"));
//	}
//});

//TenantUser.query({
//	//single: true,
//	baseDn: "ou=IDM,ou=Users,ou=33333333,ou=Tenants,dc=cids",
////	where: {
////		cn: "0aaaaaaauyspuvarb2ntlnn9pkzofonx"
////	},
//	callback: function(err, tenantUser) {
//		if (err) {
//			return console.log("------> " + err);
//		}
//		console.log("---");
//		console.log(tenantUser.get("cn"));
//	}
//});