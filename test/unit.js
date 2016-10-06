'use strict';

var assert = require('assert');
const Models = require('./mock/models');
const UserModel = Models.User;
const Car = Models.Car;
const BackgroundModel = Models.Background;
const LdapUser = Models.LdapUser;
const LdapTenantUserParent = Models.LdapTenantUserParent;
const MasterModel = require('../lib/master-model');
const SqlHelper = require('../lib/sql-helper');
const SqlModel = require('../lib/sql-model');
const LdapHelper = require('../lib/ldap-helper');
const FieldModel = require('../lib/field-model');
const config = require('../config');
config.logQuery = false;

describe('ActiveRecord', () => {

  describe('LDAP model', () => {

    const initNewUser = () => {
      return new LdapUser({
        // id: 1,
        cn: '00000000000000000000000000000003',
        name: 'Unit test user'
      });
    };

    it('LDAP - LdapHelper.pushObjectClassesToQuery(Model, andFilter)', () => {
      const andFilter = [];
      LdapHelper.pushObjectClassesToQuery(LdapUser, andFilter);
      assert.strictEqual(andFilter.toString(), '(objectClass=cIDSUserObject),(objectClass=person),(objectClass=inetOrgPerson),(objectClass=organizationalPerson)');
    });

    it('LDAP - LdapHelper.pushMandatoryFieldsToQuery(Model, andFilter)', () => {
      const andFilter = [];
      LdapHelper.pushMandatoryFieldsToQuery(LdapUser, andFilter);
      assert.strictEqual(andFilter.toString(), '(cn=*),(name=*)');
    });

    it('LDAP - LdapHelper.pushWhereFilterToQuery(where, andFilter)', () => {
      const andFilter = [];
      LdapHelper.pushWhereFilterToQuery({
        cn: 'test',
        name: ['Roger', 'Simone']
      }, andFilter);
      assert.strictEqual(andFilter.toString(), '(cn=test),(name=Roger),(name=Simone)');
    });

    it('LDAP - LdapHelper.pushWhereLikeFilterToQuery(whereLike, andFilter)', () => {
      const andFilter = [];
      LdapHelper.pushWhereLikeFilterToQuery({
        cn: 'test',
        name: ['Roger', 'Simone']
      }, andFilter);
      assert.strictEqual(andFilter.toString(), '(cn=*test*),(name=*Roger*),(name=*Simone*)');
    });

    it('LDAP - LdapHelper.pushWhereNotFilterToQuery(whereNot, andFilter)', () => {
      const andFilter = [];
      LdapHelper.pushWhereNotFilterToQuery({
        cn: 'test',
        name: ['Roger', 'Simone']
      }, andFilter);
      assert.strictEqual(andFilter.toString(), '(!(cn=test)),(!(name=Roger)),(!(name=Simone))');
    });

    it('LDAP - LdapHelper.buildWhereOrFilterToQuery(whereOr)', () => {
      const andFilter = [];
      const or = LdapHelper.buildWhereOrFilterToQuery({
        cn: 'test',
        name: ['Roger', 'Simone']
      }, andFilter);
      assert.strictEqual(or.toString(), '(|(cn=test)(name=Roger)(name=Simone))');
    });

    it('LDAP - LdapHelper.buildQueryFilter(Model, opts)', () => {
      const andFilter = [];
      const filter = LdapHelper.buildQueryFilter(LdapUser, {
        where: {
          cn: 'test',
          name: ['Roger', 'Simone']
        },
        whereNot: {
          cn: 'Alexander',
          name: ['Tom', 'Alex']
        },
        whereOr: {
          cn: 'bla',
          name: ['Elvin', 'Rodriguess']
        },
        whereLike: {
          cn: 'test',
          name: ['Bjorn', 'Nelly']
        }
      }, andFilter);

      assert.strictEqual(filter, '(&(objectClass=cIDSUserObject)(objectClass=person)(objectClass=inetOrgPerson)(objectClass=organizationalPerson)(cn=*)(name=*)(cn=test)(name=Roger)(name=Simone)(cn=*test*)(name=*Bjorn*)(name=*Nelly*)(!(cn=Alexander))(!(name=Tom))(!(name=Alex))(|(cn=bla)(name=Elvin)(name=Rodriguess)))');
    });

    it('LDAP - modelInstance.generateUniqueAttribute(options) ', (done) => {
      const user = initNewUser();
      user.generateUniqueAttribute({
        callback: (err, unique) => {
          if (err) return done(err);

          if (unique.length < 10) {
            throw new Error('Unique not generated');
          }
          done();
        }
      });
    });

    it('LDAP - LdapHelper.updateSaveDataForNewRecord(modelInstance, saveData, uniqueAttr)', () => {
      const user = initNewUser();
      const saveData = {name: 'bla'};
      const uniqueAttr = '0000000000000000myunique200';

      LdapHelper.updateSaveDataForNewRecord(user, saveData, uniqueAttr);
      assert.strictEqual(JSON.stringify(saveData), '{"name":"bla","cn":"0000000000000000myunique200","objectClass":["cIDSUserObject","person","inetOrgPerson","organizationalPerson"]}');
    });

    it('LDAP - LdapHelper.generateNewDn(modelInstance, saveData, parentDn)', () => {
      const user = initNewUser();
      const saveData = {name: 'bla', cn: '0000000000000000myunique200'};
      const parentDn = 'ou=Users,ou=%tenantOu%,ou=Tenants,dc=CIDS';

      LdapHelper.generateNewDn(user, saveData, parentDn);
      assert.strictEqual(LdapHelper.generateNewDn(user, saveData, parentDn), 'cn=0000000000000000myunique200,ou=Users,ou=%tenantOu%,ou=Tenants,dc=CIDS');
    });

    it('LDAP - LdapHelper.validateMandatoryFieldsForSave(modelInstance, saveData)', () => {
      const user = initNewUser();
      const saveData = {cn: '0000000000000000myunique200'};

      const errors = LdapHelper.validateMandatoryFieldsForSave(user, saveData);

      assert.strictEqual(errors[0], 'Mandatory field "name" is missing');
    });

    it('LDAP - LdapHelper.buildDirtyDataForSave(modelInstance)', () => {
      // Existing record
      const existUser = new LdapUser({
        cn: '00000000000000000000000000000003',
        name: 'hello',
        list: ['item1', 'item2']
      });
      // This will test 'add', 'replace', 'delete'  (strinsg and arrays)
      existUser.set('name', 'bla');
      existUser.set('displayName', 'bla');
      existUser.set('list', []);
      existUser.set('list2', ['tester2', 'tester3']);
      existUser.set('credits', 2000);

      const saveData = LdapHelper.buildDirtyDataForSave(existUser);

      assert.strictEqual(JSON.stringify(saveData), '{"name":"bla","displayName":"bla","list":[],"list2":["tester2","tester3"]}');
    });

    it('LDAP - LdapHelper.buildChangeListForSave(modelInstance, saveData)', () => {
      // Existing record
      const existUser = new LdapUser({
        cn: '00000000000000000000000000000003',
        name: 'hello',
        list: ['item1', 'item2'],
        credits: 10000
      });

      // This will test 'add', 'replace', 'delete'  (strinsg and arrays)
      existUser.set('name', 'bla');
      existUser.set('displayName', 'bla');
      existUser.set('list', []);
      existUser.set('list2', ['tester2', 'tester3']);

      const saveData = LdapHelper.buildDirtyDataForSave(existUser);
      const changes = LdapHelper.buildChangeListForSave(existUser, saveData);
      assert.strictEqual(JSON.stringify(changes), '[{"operation":"replace","modification":{"name":"bla"}},{"operation":"replace","modification":{"displayName":"bla"}},{"operation":"delete","modification":{"list":["item1","item2"]}},{"operation":"replace","modification":{"list2":["tester2","tester3"]}}]');
    });


  });

  describe('Master model ', () => {

    const initNewUser = () => {
      return new UserModel({
        // id: 1,
        userCn: '00000000000000000000000000000003',
        targetUrl: 'http://www.test.nl',
        background: '#ffffff',
        backgroundId: 1
      });
    };

    it('Get value: model.get(val)', () => {
      const user = initNewUser();
      var newColor = '#000';
      user.set('background', newColor);
      assert.strictEqual(user.get('background'), newColor);
    });

    it('Get converted value: model.get(val, true)', () => {
      const user = initNewUser();
      var newColor = '#000';
      user.set('name', newColor);
      assert.strictEqual(user.get('name', true), newColor + Models.STATICS.CONVERTED_EXTRA_VAL);
    });

    it('Set value: model.set(val, value)', () => {
      const user = initNewUser();
      var newColor = '#000';
      user.set('background', newColor);
      assert.strictEqual(user.get('background'), newColor);
    });

    it('Set value: model.setData(obj)', () => {
      const user = new UserModel();
      user.addField(new FieldModel({
        name: 'defaultTest',
        defaultValue: 'bla1'
      }));
      user.setData({
        name: 'Tom'
      });
      assert.strictEqual(user.get('name'), 'Tom');
      assert.strictEqual(user.get('defaultTest'), 'bla1');
    });

    it('Get value: model.getData(converted<true/false>)', () => {
      const user = new UserModel();
      user.set('name', 'Test');
      assert.strictEqual(user.getData().name, 'Test');
      assert.strictEqual(user.getData(true).name, 'Test' + Models.STATICS.CONVERTED_EXTRA_VAL);
    });

    it('Default value test model.get(a) == default value', () => {
      const user = initNewUser();
      assert.strictEqual(user.get('street'), 'Hozensstraat');
    });

    it('Get modified fields: model.getModified()', () => {
      const user = initNewUser();
      user.set('background', 'bla');
      const found = (Object.keys(user.getModified()).indexOf('background') === 0);
      assert.strictEqual(found, true);
    });

    it('Get modified fields: model.getRawData()', () => {
      const user = new UserModel({
        id: 1,
        userCn: '00000000000000000000000000000003',
        targetUrl: 'http://www.test.nl',
        background: '#ffffff'
      });

      user.set('background', 'bla');

      assert.strictEqual(user.getRawData().background, '#ffffff');
      assert.strictEqual(user.getRawData('background'), '#ffffff');
    });

    it('Remove dirty: model.getModified()', () => {
      const user = initNewUser();
      user.set('background', 'bla');
      const found = (Object.keys(user.getModified()).indexOf('background') === 0);
      assert.strictEqual(found, true);
    });

    it('Get dirty state: model.removeDirty()', () => {
      const user = initNewUser();
      var newColor = '#000';
      user.set('background', newColor);
      user.removeDirty();
      assert.strictEqual(Object.keys(user.getModified()).length < 1 && user.dirty === false, true);
    });

    it('Get dirty state: model.isDirty(val)', () => {
      const user = initNewUser();
      var newColor = '#000';
      user.set('background', newColor);
      assert.strictEqual(user.isDirty('background'), true);
    });

    it('Set all fields to dirty state: model.setDirty()', () => {
      const user = initNewUser();
      let totalModified = 0;
      let totalToModify = 0;

      user.setDirty();

      var modified = user.getModified();
      user.getFields().forEach((field) => {
        if (!field.sync) {
          return;
        }
        totalToModify++;
        if (Object.keys(modified).indexOf(field) === -1) {
          totalModified++;
        }
      });

      assert.strictEqual(totalModified, totalToModify);
    });

    it('Equal (String) model.isEqual(a, b)', () => {
      const user = initNewUser();
      assert.strictEqual(MasterModel.isEqual('bla', 'bla'), true);
    });

    it('Equal (Date) model.isEqual(a, b)', () => {
      const user = initNewUser();
      const a = new Date('2010-02-18');
      const b = new Date('2010-02-18');
      assert.strictEqual(MasterModel.isEqual(a, b), true);
    });

    it('Equal (Integer) model.isEqual(a, b)', () => {
      const user = initNewUser();
      const a = 1222;
      const b = 1222;
      assert.strictEqual(MasterModel.isEqual(a, b), true);
    });

    it('Test push to array model.push(field, data)', () => {
      const user = initNewUser();
      const toCheck = 2000;
      user.push('list', toCheck);
      assert.strictEqual((user.get('list').indexOf(toCheck) !== -1), true);
    });

    it('Get model field model.getField(fieldName)', () => {
      const user = initNewUser();
      const n = 'Elvin';
      const field = user.getField('name');
      user.set('name', n);
      assert.strictEqual(user.get(field.name), n);
    });

    it('Get model field model.getFields(fieldName)', () => {
      const user = initNewUser();
      const n = 'Elvin';
      const fields = user.getFields(['name', 'id']);
      fields.forEach((f) => {
        user.set(f.name, n);
      });
      assert.strictEqual(user.get('name'), n);
      assert.strictEqual(user.get('id'), n);
    });

    it('Add field model.addField(new FieldModel())', () => {
      const user = initNewUser();
      const n = 'bla';
      user.addField(new FieldModel({
        name: 'ageTest'
      }));
      user.set('ageTest', n);
      const field = user.getField('ageTest');
      assert.strictEqual(user.get('ageTest'), n);
    });

    it('Add field model.addFields([new FieldModel())]', () => {
      const user = initNewUser();
      const n = 'bla';
      user.addFields([new FieldModel({
        name: 'ageTest'
      })]);
      user.set('ageTest', n);
      const field = user.getField('ageTest');
      assert.strictEqual(user.get('ageTest'), n);
    });

    it('TODO model.isValid(fieldName)', () => {
      // TODO TEST THIS
    });
    it('TODO model.validateField(field)', () => {
      // TODO TEST THIS
    });
    it('TODO model.validate()', () => {
      // TODO TEST THIS
    });

    it('Create model field model.createField()', () => {
      const field = MasterModel.createField();
      assert.strictEqual(field instanceof FieldModel, true);
    });

    it('Data from prefix Model.fromPrefix()', () => {
      const data1 = {PREFIX_name: 'test'};
      const data2 = MasterModel.fromPrefix(data1, 'PREFIX_');
      assert.strictEqual(data2.name, 'test');
    });

    it('Return callback from Model.callbackToPomiseResponse(options, err, res)', (done) => {
      const callbackRes = MasterModel.callbackToPomiseResponse({
        callback: (err) => {
          assert.strictEqual(err, 'Error found');
          done();
        }
      }, 'Error found');
    });

    it('Return promise with result from Model.callbackToPomiseResponse(options, err, res)', (done) => {
      const promise = MasterModel.callbackToPomiseResponse({}, null, 2000);
      promise.then((res) => {
        assert.strictEqual(res, 2000);
        done();
      });
    });


    it('Return promise with error from Model.callbackToPomiseResponse(options, err, res)', (done) => {
      const promise = MasterModel.callbackToPomiseResponse({}, 'Error');
      promise.then((res) => {
        done('Wrong path');
      }).catch((err) => {
        assert.strictEqual(err, 'Error');
        done();
      });
    });

    // TODO
    it('Return callback from Model.sendResponse(options, err, res)', (done) => {
      const callbackRes = MasterModel.sendResponse({
        callback: (err) => {
          done();
        }
      }, 'Error found');
    });

    // TODO
    it('Return callback with err from Model.sendResponse(options, err, res)', (done) => {
      const tempErr = 'Errorcode';
      const callbackRes = MasterModel.sendResponse({
        error: tempErr,
        callback: (err) => {
          assert.strictEqual(err, tempErr);
          done();
        }
      }, 'Error found');
    });

    it('Execute promise resolve from Model.sendResponse(options, err, res)', (done) => {
      const result = 'bla';
      MasterModel.sendResponse({
        resolve: (res) => {
          assert.strictEqual(res, result);
          done();
        },
        result: result
      });
    });

    it('Execute promise reject from Model.sendResponse(options, err, res)', (done) => {
      const error = 'bla';
      MasterModel.sendResponse({
        reject: (err) => {
          assert.strictEqual(err, error);
          done();
        },
        error: error
      });
    });

    it('Execute callback with result from Model.sendResponse(options, err, res)', (done) => {
      const result = 'bla';
      MasterModel.sendResponse({
        callback: (err, res) => {
          assert.strictEqual(res, result);
          done();
        },
        result: result
      });
    });

    it('Execute promise reject from Model.sendResponse(options, err, res)', (done) => {
      const error = 'bla';
      MasterModel.sendResponse({
        reject: (err) => {
          assert.strictEqual(err, error);
          done();
        },
        error: error
      });
    });


  });

  describe('SQL model ', () => {
    const newUser = () => {
      return new UserModel({
        name: 'Elvin',
        backgroundId: 1
      });
    };

    const newCar = () => {
      return new Car({
        name: 'Elvin',
        price: 900
      });
    };

    describe('SQL helper methods ', () => {
      it('SQL - SqlHelper.pushModelFieldsToSqlList(list, Model, fields)', () => {
        const list = [];
        const car = newCar();
        SqlHelper.pushModelFieldsToSqlList(list, Car, car.getFields(['name', 'price', 'color']));
        assert.strictEqual(list.toString(), 'car.name AS car_name,car.price AS car_price');
      });

      it('SQL - SqlHelper.pushCountSqlToList(count, list)', () => {
        const list = [];
        const car = newCar();
        SqlHelper.pushCountSqlToList(true, list);
        assert.strictEqual(list.toString(), 'COUNT(*) as total');
      });

      it('SQL - SqlHelper.toWhereSqlList(Model, where, list, sqlParams)', () => {
        // Where
        let list = [];
        let sqlParams = [];

        const car = newCar();
        SqlHelper.toWhereSqlList(Car, {
          id: 12,
          name: 'bla',
          passenger_id: null
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id = ? ,car.name = ? ,car.passenger_id IS ? ');
        assert.strictEqual(sqlParams.join(','), '12,bla,');

        // Where as array
        list = [];
        sqlParams = [];

        SqlHelper.toWhereSqlList(Car, {
          id: [12, 10, 14],
          name: 'bla',
          passenger_id: [3,null,4]
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id IN ( ? ) ,car.name = ? ,car.passenger_id IN ( ? ) ');
        assert.strictEqual(sqlParams.join(','), '12,10,14,bla,3,,4');
      });

      it('SQL - SqlHelper.toWhereOrSqlList(Model, whereOr, list, sqlParams)', () => {
        // Where
        let list = [];
        let sqlParams = [];

        const car = newCar();
        SqlHelper.toWhereOrSqlList(Car, [{
          id: 12,
          name: 'bla'
        }], list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id = ? ,car.name = ? ');
        assert.strictEqual(sqlParams.join(','), '12,bla');

        // Where or as array
        list = [];
        sqlParams = [];

        SqlHelper.toWhereSqlList(Car, {
          id: [12, 10, 14],
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id IN ( ? ) ,car.name = ? ');
        assert.strictEqual(sqlParams.join(','), '12,10,14,bla');
      });

      it('SQL - SqlHelper.toWhereNotSqlList(Model, whereNot, list, sqlParams)', () => {
        // Where
        let list = [];
        let sqlParams = [];

        const car = newCar();
        SqlHelper.toWhereNotSqlList(Car, {
          id: 12,
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id != ? ,car.name != ? ');
        assert.strictEqual(sqlParams.join(','), '12,bla');

        // Where or as array
        list = [];
        sqlParams = [];

        SqlHelper.toWhereNotSqlList(Car, {
          id: [12, 10, 14],
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id NOT IN ( ? ) ,car.name != ? ');
        assert.strictEqual(sqlParams.join(','), '12,10,14,bla');
      });

      it('SQL - SqlHelper.toWhereLikeSqlList(Model, whereLike, list, sqlParams)', () => {
        // Where
        let list = [];
        let sqlParams = [];

        const car = newCar();
        SqlHelper.toWhereLikeSqlList(Car, {
          id: 12,
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id LIKE ? ,car.name LIKE ? ');
        assert.strictEqual(sqlParams.join(','), '12,bla');

        // Where or as array
        list = [];
        sqlParams = [];

        SqlHelper.toWhereLikeSqlList(Car, {
          id: [12, 10, 14],
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id LIKE ? ,car.id LIKE ? ,car.id LIKE ? ,car.name LIKE ? ');
        assert.strictEqual(sqlParams.join(','), '12,10,14,bla');
      });

      it('SQL - SqlHelper.toWhereNotLikeSqlList(Model, whereNotLike, list, sqlParams)', () => {
        // Where
        let list = [];
        let sqlParams = [];

        const car = newCar();
        SqlHelper.toWhereNotLikeSqlList(Car, {
          id: 12,
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id NOT LIKE ? ,car.name NOT LIKE ? ');
        assert.strictEqual(sqlParams.join(','), '12,bla');

        // Where or as array
        list = [];
        sqlParams = [];

        SqlHelper.toWhereNotLikeSqlList(Car, {
          id: [12, 10, 14],
          name: 'bla'
        }, list, sqlParams);

        assert.strictEqual(list.toString(), 'car.id NOT LIKE ? ,car.id NOT LIKE ? ,car.id NOT LIKE ? ,car.name NOT LIKE ? ');
        assert.strictEqual(sqlParams.join(','), '12,10,14,bla');
      });

      it('SQL - SqlHelper.pushToSql(sqlList, sqlStr)', () => {
        // Where
        const list = [];
        const sqlStr = 'my name = grip';
        const sqlStr2 = 'my name = grip2';

        SqlHelper.pushToSql(list, sqlStr)
        SqlHelper.pushToSql(list, sqlStr2)
        assert.strictEqual(list.join(''), sqlStr + sqlStr2);
      });

      it('SQL - SqlHelper.pushOrderBy(Model, sqlList, orderBy)', () => {
        // Where
        const list = [];
        const sqlParams = [];
        const offset = 10;
        const limit = 20;

        SqlHelper.pushOrderBy(Car, list, [{
          field: 'name',
          sort: 'ASC'
        }, {
          field: 'id',
          sort: 'DESC'
        }]);

        assert.strictEqual(list.join(''), ' ORDER BY car.name ASC, car.id DESC');
      });

      it('SQL - SqlHelper.pushFromToDateFilter(Model, sqlList, fromToDate))', () => {
        // Where
        const list = [];

        SqlHelper.pushFromToDateFilter(Car, list, {
          from: '2014-02-02',
          to: '2014-03-03',
          field: 'name'
        });

        assert.strictEqual(list.join(''), 'car.name BETWEEN \'2014-02-02\' AND ADDDATE(\'2014-03-03\', INTERVAL 1 DAY) ');
      });

      it('SQL - SqlHelper.pushJoinModels(Model, modelInstance, queryFields, queryJoins, include)', () => {
        // Where
        const queryJoins = [];
        const queryFields = [];

        const user = newUser();

        SqlHelper.pushJoinModels(UserModel, user, queryFields, queryJoins, ['background', 'serviceComments']);

        assert.strictEqual(queryJoins.join(' '), 'LEFT JOIN background ON background.id = user.backgroundId LEFT JOIN comment ON comment.userId = user.id');
        assert.strictEqual(queryFields.join(', '), 'background.id AS background_id, background.portalId AS background_portalId, background.color AS background_color, background.userId AS background_userId, comment.id AS comment_id, comment.userId AS comment_userId, comment.comment AS comment_comment, comment.lastModified AS comment_lastModified');
      });

      it('TODO SQL - SqlHelper.buildJoinModel(currentModel, rec, associations)', () => {
        var records = [{
          user_id: 1365,
          user_name: 'Elvin',
          user_email: null,
          user_street: 'Hozensstraat',
          user_backgroundId: 1,
          user_created: '2016-03-08 11:06:04',
          background_id: 1,
          background_portalId: null,
          background_color: 'blue',
          background_userId: null,
          comment_id: 49,
          comment_userId: 1365,
          comment_comment: null,
          comment_lastModified: '2016-03-08'
        }, {
          user_id: 1365,
          user_name: 'Elvin',
          user_email: null,
          user_street: 'Hozensstraat',
          user_backgroundId: 1,
          user_created: '2016-03-08 11:06:04',
          background_id: 1,
          background_portalId: null,
          background_color: 'blue',
          background_userId: null,
          comment_id: 50,
          comment_userId: 1365,
          comment_comment: null,
          comment_lastModified: '2016-03-08'
        }];


        const user = newUser();
        records.forEach((rec) => {
          SqlHelper.buildJoinModel(user, rec);
        });

        assert.strictEqual(user.get('background').get('color'), 'blue');
        assert.strictEqual(user.get('serviceComments')[0].get('userId'), 1365);
        assert.strictEqual(user.get('serviceComments')[1].get('userId'), 1365);
        assert.strictEqual(user.get('serviceComments')[1].get('id'), 50);
      });

      it('SQL - SqlHelper.pushAfterDateFilter(Model, sqlList, afterDate)', () => {
        const list = [];
        SqlHelper.pushAfterDateFilter(UserModel, list, {
          interval: 5,
          intervalType: 'MINUTE',
          field: 'created'
        });
        assert.strictEqual(list.join(''), 'user.created < DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
      });

      it('SQL - SqlHelper.buildQuerySql(Model, sqlParams, queryOptions)', () => {

        const queryOptions = {
          offset: 5,
          limit: 20,
          where: {
            name: 'testname'
          }, // WHere key: value || key = Array for an IN statement (WERE id IN [1,2,3])
          whereNot: {
            email: 'test@test.com',
            street: 'Groenweg'
          },
          whereOr: [{
            email: 'tester@gmail.com',
            street: 'Farmerstreet'
          }], // Object array with key value.   || key = Array for an IN statement (WERE id IN [1,2,3] OR
          whereLike: {
            name: '%test',
            email: '%test123@gmail.com%'
          }, // Example: {{name:"%test", x: "_test"}, y: ['%test1', '%test2%', 'test']}
          single: false,
          count: false,
          fromToDate: {
            from: '2006-12-01', //yyyy-mm-dd
            to: '2015-12-01', //yyyy-mm-dd
            field: 'created' //db field
          },
          rawData: false,
          fields: null,
          debug: null,
          orderBy: [{
            field: 'name',
            sort: 'DESC'
          }, {
            field: 'id',
            sort: 'ASC'
          }],
          combine: [],
          include: ['background', 'serviceComments'],
          callback: null // When null only the promise will work
        };

        const sqlParams = [];
        const sql = SqlHelper.buildQuerySql(UserModel, sqlParams, queryOptions);

        assert.strictEqual(sql, "SELECT user.id AS user_id, user.name AS user_name, user.email AS user_email, user.street AS user_street, user.backgroundId AS user_backgroundId, user.created AS user_created, background.id AS background_id, background.portalId AS background_portalId, background.color AS background_color, background.userId AS background_userId, comment.id AS comment_id, comment.userId AS comment_userId, comment.comment AS comment_comment, comment.lastModified AS comment_lastModified FROM `user` LEFT JOIN background ON background.id = user.backgroundId LEFT JOIN comment ON comment.userId = user.id WHERE user.created BETWEEN '2006-12-01' AND ADDDATE('2015-12-01', INTERVAL 1 DAY)  AND user.name = ?  AND (user.email = ?  OR user.street = ? ) AND user.email != ?  AND user.street != ?  AND user.name LIKE ?  AND user.email LIKE ?  ORDER BY user.name DESC, user.id ASC limit ?,?");
        assert.strictEqual(sqlParams.join(','), 'testname,tester@gmail.com,Farmerstreet,test@test.com,Groenweg,%test,%test123@gmail.com%,5,20');
      });

      it('SQL - SqlHelper.buildSaveDataFromFields(modelInstance)', () => {
        const user = new UserModel();
        user.set('name', 'Rachel');
        user.set('street', 'Santo juze street');
        user.set('email', 'email');

        user.getOptions().lastModifiedField = false;
        user.getOptions().createdField = false;

        const saveData = SqlHelper.buildSaveDataFromFields(user);
        assert.strictEqual(JSON.stringify(saveData), '{"name":"Rachel","email":"email","street":"Santo juze street"}');
      });

      it('SQL - SqlHelper.buildDestroyQueryStr(Model, sqlParams, whereObj)', () => {
        var sqlParams = [];
        const sql = SqlHelper.buildDestroyQueryStr(UserModel, sqlParams, {id: 1, name: 'Romero'});
        assert.strictEqual(sql, 'DELETE FROM `user` WHERE `id` = ? AND `name` = ?;');
        assert.strictEqual(sqlParams.join(','), '1,Romero');
      });

      it('SQL - SqlHelper.buildCreateQueryStr(modelInstance, bindvars, saveData)', () => {
        const user = new UserModel();
        user.set('name', 'Rachel');
        user.set('street', 'Santo juze street');
        user.set('email', 'email');

        user.getOptions().lastModifiedField = false;
        user.getOptions().createdField = false;

        const bindVars = [];
        const date = new Date();
        const saveData = SqlHelper.buildSaveDataFromFields(user);

        const sql = SqlHelper.buildCreateQueryStr(user, bindVars, saveData);
        assert.strictEqual(sql, 'INSERT INTO `user` (`name`, `email`, `street`, `backgroundId`, `created`) VALUES (?, ?, ?, ?, ?)');
        assert.strictEqual(bindVars.join(','), 'Rachel,email,Santo juze street,,');
      });

      it('SQL - SqlHelper.buildUpdateQueryStr(modelInstance, bindvars, saveData)', () => {
        const user = new UserModel();
        user.set('id', 12);
        user.set('name', 'Rachel');
        user.set('street', 'Santo juze street');
        user.set('email', 'email');

        user.getOptions().lastModifiedField = false;
        user.getOptions().createdField = false;

        const bindVars = [];
        const date = new Date();
        const saveData = SqlHelper.buildSaveDataFromFields(user);

        const sql = SqlHelper.buildUpdateQueryStr(user, bindVars, saveData);
        assert.strictEqual(sql, 'UPDATE `user` SET `name` = ? ,`email` = ? ,`street` = ?  WHERE id = ?');
        assert.strictEqual(bindVars.join(','), 'Rachel,email,Santo juze street,12');
      });

      it('SQL - SqlHelper.buildStaticUpdateQueryStr(Model, whereCondition, bindvars, saveData)', () => {
        const timestamp = SqlHelper.generateTimeStamp(new Date());
        const bindVars = [];
        const sql = SqlHelper.buildStaticUpdateQueryStr(UserModel, {name: 'Julian'}, bindVars, {
          name: 'Unknown name',
          street: 'Landerstreet 12',
          email: 'test@asd.com',
          lastModified: timestamp
        });
        assert.strictEqual(sql, 'UPDATE `user` SET `name` = ? ,`street` = ? ,`email` = ? ,`lastModified` = ?  WHERE `name` = ? ');
        assert.strictEqual(bindVars.join(','), `Unknown name,Landerstreet 12,test@asd.com,${timestamp},Julian`);
      });

    });
  });
});