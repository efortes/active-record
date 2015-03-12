
var MasterModel = require("./lib/master-model");
//
//class User extends MasterModel {
//	
//  constructor(data) {
//    super(data, {
//    	adapter: "mysql",
//    	connection: null
//    });
//    
//    var fields = [MasterModel.createField({
//	    	name: "userName", 
//	    	scimAttr: "scimUserName",
//	    	defaultValue: "My user name",
//	  	}), MasterModel.createField({
//	    	name: "name",
//	    	convert: function(val, record) {
//	    		return val + " is my name";
//	    	},
//	    	defaultValue: "My name",
//	  	}), MasterModel.createField({
//	    	name: "gender",
//	    	mandatory: true,
//	  	})  
//  	];
//    
//    this.init(data, fields);    
//  }
//  
//}
//
//
//var user = new User({userName: "efortes", name: "Elvin Fortes"});
//console.log(user.get("name"));
//console.log(user.validate());
//console.log(user.getData());
//console.log(user.getFields());
//console.log("Is valid: " + user.isValid());

module.exports = {
		MasterModel: MasterModel
};