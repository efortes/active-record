'use strict';

const mysql = require('mysql');

function MysqlClient(config) {
  const poolConfig = Object.assign({}, {
    host: null,
    user: null,
    password: null,
    database: null,
    dateStrings: true,
    port: null
  }, config || {})

  return mysql.createPool(poolConfig);
};

module.exports = MysqlClient;