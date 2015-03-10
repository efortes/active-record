var traceur = require('traceur');
require('traceur-source-maps').install(traceur);
traceur.require.makeDefault(function(filename) {
  // don't transpile our dependencies, just our app
  return filename.indexOf('node_modules') === -1;
});
require("./index").run;