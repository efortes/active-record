module.exports = {
  mysql: {
    logQuery: false
  },
  ldap: {
    ldapIgnoreSelfSignedCertificates: true,
    logQuery: false,
    manualLdapQueryTimeOut: 0 // 0 = No manual query timeout || milisec for the manual query timeoiut
  }
}
