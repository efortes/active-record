'use strict';

const configMain = require('../../config');
const ldapjs = require('ldapjs');
const parseFilter = ldapjs.parseFilter;
const extend = require('extend');
const async = require('async');
const NODE_ENV = process.env.NODE_ENV || 'local';
const quickLog = require('quick-log');
const fileLogger = quickLog.fileLogger;

const Ldap = {

  /**
   * Create an LDAP client
   * @param config <object>
   */
  LdapClient(config) {

    const _this = this;

    const _config = extend({
      url: null,
      timeout: 0,
      maxConnections: 20,
      checkInterval: 6000,
      idleTimeout: 20000,
      noIdlePrevent: false
    }, config);

    // This ignores bad or self signed certificates and should not be here
    if (configMain.ldap.ldapIgnoreSelfSignedCertificates) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    let client = doConnect(_config, _config.callback);

    function doConnect(config, callback) {

      // we always want to use the callback variant of bind, so default a callback
      callback = (callback || function(err, result) {
        if (err) {
          console.log('LDAP error');
          console.log(err);
        }
      });

      // er is een callback; laten we het via een losse bind doen die dan de
      // callback aanroept
      client = ldapjs.createClient({
        url: config.url,
        timeout: config.timeout,
        maxConnections: config.maxConnections,
        checkInterval: config.checkInterval,
        idleTimeout: config.idleTimeout,
        bindDN: config.dn,
        bindCredentials: config.password,
        reconnect: ( typeof config.reconnect !== 'undefined' ? config.reconnect : 'true' ),
      });

      // catch errors to prevent crashes
      client.on('error', function(err, result) {
        if (configMain.ldap.logQuery) {
          console.log('LDAP connection error');
          console.log(err);
        }
        client.unbind(function(params) {
          if (configMain.ldap.logQuery) {
            console.log('LDAP unbound');
          }
        });
      });

      client.on('connect', function(params) {
        if (configMain.ldap.logQuery) {
          console.log('LDAP connected');
        }
      });

      // extra timer in case the bind does not work
      var timeout = 5000; // milliseconds
      var intervalvalue = 500;
      var currentlyElapsedTime = 0;
      var bindTimedOut;
      var isTimedOut = false; // milliseconds
      var bindTimer = setInterval(
        function() {
          currentlyElapsedTime += intervalvalue;
          if (currentlyElapsedTime >= timeout) {
            if (configMain.ldap.logQuery) console.log('LDAP bind took too long.')
            clearInterval(bindTimer);
            // TODO: dit is wel erg bot, maar een andere oplossing heb ik nog niet
            isTimedOut = true;
            client.unbind(function(params) {
              if (configMain.ldap.logQuery) {
                console.log('LDAP unbound');
              }
            });
            return callback('LDAP bind took too long', null);
          }
        },
        intervalvalue
      );

      // Bind the client
      client.bind(config.dn, config.password, function(err) {
        clearInterval(bindTimer);
        if (!isTimedOut) {
          return callback(err, null);
        }
      });

      client.config = _config;

      return client;
    }

    // reconnect function
    client.doReconnect = function doReconnect(config, callback) {
      var client = doConnect(config, function(err, result) {
        callback(err);
      });
    }

    /**
     * Delete ldap tree. Will also delete the base dn
     * @IMPORTANT Beware It will delete everything
     * @param <String> dn
     * @param <Function> callback
     */
    client.delTree = function(dn, callback) {
      client.fetch(dn, {
        scope: 'sub'
      }, function(err, result) {

        // order by the number of commas in the dn
        result = result.sort(function(a, b) {
          return a.dn.match(/(,)/g).length < b.dn.match(/(,)/g).length ? 1 : -1
        });

        async.whilst(function() {
          return result.length > 0;
        }, function(cb) {
          var entry = result.shift();

          //Delete by dn
          client.del(entry.dn, function(err, result) {
            cb(err);
          });
        }, callback);
      });
    }

    /**
     * Search
     * @param baseDN <string>
     * @param searchoptions <object> see ldapjs.search documentatie
     * @param callback <function>
     */
    client.fetch = function(baseDN, options, callback) {

      var _baseDN = baseDN;

      var _options = extend({
        scope: 'base', // one of base, one, or sub. Defaults to base.
        filter: null, // a string version of an LDAP filter (see below),
        // or a programatically constructed Filter object.
        // Defaults to (objectclass=*).
        attributes: null, // attributes to select and return (if these are
        // set, the server will return only these
        // attributes). Defaults to the empty set, which
        // means all attributes.
        attrsOnly: false, // on whether you want the server to only return
        // the names of the attributes, and not their
        // values. Borderline useless. Defaults to
        // false.
        sizeLimit: 0, // the maximum number of entries to return. Defaults
        // to 0 (unlimited).
        timeLimit: 180, // The maximum amount of time the server should take in responding, in seconds. Defaults to 10. Lots of servers will ignore this.
        returnType: 'list', //list, first,
//      cookie: null,
        pagedResultsSize: null,
        maxResultsSize: null,

      }, options);

      // when filter is an instanceof ldapjs.filters.EqualityFilter weassume it is made somewhere in this app and therefore legal. This should be extended with other types of filters, but for now this is the only one we use
      if (_options.filter !== null && !_options.filter instanceof ldapjs.filters.EqualityFilter) {
        try {
          _options.filter = parseFilter(_options.filter);
        } catch (e) {
          if (configMain.ldap.logQuery) {
            fileLogger.log('LDAP filter error: ', _options.filter, e);
          }
          return callback('Invalid filter'); // TODO many invalid filters seems to come trough without errors
        }
      }

      if (configMain.ldap.logQuery) {
        fileLogger.log('LDAP search on baseDn: ' + _baseDN + ' - Filter: ' + _options.filter, _options.filter);
      }


      // We willen maximaal 500 results terug; een werkelijke implementatie van pages doen we misschien later.
      // wat hier staat werkt als volgt:
      // 1. stuur je een parameter maxResultsSize mee dan wordt de pagesize daarop gemaximeerd, en als dat aantal is bereikt dan wordt er gestopt met verder zoeken
      // todo: dat stoppen lukt nog niet erg...
      // 2. stuur je die parameter niet mee dan gebruikt hij nog steeds paging, met als size 1000. Dat is voor searches die meer resultten geven dan ldap toestaat en wordt onder meer gebruikt door de CSE
      var controls = [];
      var pageSize = 1000;
      if (_options.maxResultsSize && _options.maxResultsSize < pageSize) {
        pageSize = _options.maxResultsSize
      }
      _options.paged = {
        pageSize: pageSize,
      };
      if (_options.maxResultsSize) {
        _options.paged.pagePause = true
      }
      _options.sizeLimit = pageSize + 1;

      client.search(_baseDN, _options, controls, function(err, res) {
        if (err) {
          return callback('Code: ' + err.code + ' - Message: ' + err.message);
        }

        let data = [];

        // Set a fail timeout to prevent
        if (config.ldap.manualLdapQueryTimeOut) {
          const intervalvalue = 500;
          let requestTimedOut = false;

          let currentlyElapsedTime = 0;
          var intervaltimer = setInterval(function() {
            currentlyElapsedTime += intervalvalue;
            if (currentlyElapsedTime >= config.ldap.manualLdapQueryTimeOut) {
              console.log('LDAPSEARCH timeout info:', currentlyElapsedTime, config.ldap.manualLdapQueryTimeOut, baseDN, options)
              clearInterval(intervaltimer);
              requestTimedOut = true;
              client.unbind(function(params) {
                if (configMain.ldap.logQuery) {
                  console.log('LDAP unbound');
                }
              });
              res.emit('end', {status: 'LDAPSEARCH timeout'});
            }
          }, intervalvalue);
        }

        let totalEntries = 0;
        res.on('searchEntry', function(entry) {
          totalEntries++;

          var result = {};
          Object.keys(entry.object).forEach(function(key) {
            result[key] = entry.object[key];
          });

          if (entry.raw.hasOwnProperty('objectGUID')) {
            result.objectGUID = formatGUID(entry.raw.objectGUID)
          }

          data.push(result);
        });

        res.on('page', function(pageres, cb) {
          if (cb) {
            if (_options.maxResultsSize && totalEntries >= _options.maxResultsSize) {
              return cb('Quit');
            }
            return cb();
          }
        });

        res.on('error', function(err) {
          data = [];
          if (_config.enableManualLdapTimeOut) {
            clearInterval(intervaltimer);
          }

          if (err && err.message.indexOf('missing paged control') > -1) {
            err.code = 404;
            err.message = 'Instance not found in LDAP';
          }

          if (configMain.ldap.logQuery) {
            console.log('LDAPSEARCH error:', err + (configMain.ldap.logQuery ? ' - ' + _baseDN : ''));
          }

          // Do not add the base DB on ACC or PRD
          err.message = (err.message ? err.message : err) + (configMain.ldap.logQuery ? ' - ' + _baseDN : '');

          return callback(err);
        });

        res.on('end', function(result) {
          if (_config.enableManualLdapTimeOut) {
            clearInterval(intervaltimer);
          }

          if (result.status) {
            return callback(new Error(result.status));
          }

          if (requestTimedOut) {
            // emit error does not end the search and so we must check again if that happened
            return callback(new Error('Request wat already timed out'));
          }

          if (_options.returnType === 'first') {
            //return null on no result
            return callback(null, (data.length > 0 ? data[0] : null));
          }

          return callback(null, data);

        });
      });
    };

    //Set the ldapjs object
    client.ldapjs = ldapjs;

    return client;
  },

  formatGUID(objectGUID) {
    var data = new Buffer(objectGUID, 'binary');

    // GUID_FORMAT_B
    var template = '{{3}{2}{1}{0}-{5}{4}-{7}{6}-{8}{9}-{10}{11}{12}{13}{14}{15}}';

    // check each byte
    for (var i = 0; i < data.length; i++) {
      // get the current character from that byte
      var dataStr = data[i].toString(16);
      dataStr = data[i] >= 16 ? dataStr : '0' + dataStr;

      // insert that character into the template
      template = template.replace(new RegExp('\\{' + i + '\\}', 'g'), dataStr);
    }
    return template;
  },
}



module.exports = Ldap.LdapClient;
