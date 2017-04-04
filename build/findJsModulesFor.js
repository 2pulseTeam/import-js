Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findJsModulesFor;

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _lodash = require('lodash.sortby');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.uniqby');

var _lodash4 = _interopRequireDefault(_lodash3);

var _Configuration = require('./Configuration');

var _Configuration2 = _interopRequireDefault(_Configuration);

var _JsModule = require('./JsModule');

var _JsModule2 = _interopRequireDefault(_JsModule);

var _ModuleFinder = require('./ModuleFinder');

var _ModuleFinder2 = _interopRequireDefault(_ModuleFinder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function findImportsFromEnvironment(config, variableName) {
  return config.get('coreModules').filter(function (dep) {
    return dep.toLowerCase() === variableName.toLowerCase();
  }).map(function (dep) {
    return new _JsModule2['default']({
      importPath: dep,
      variableName: variableName
    });
  });
}

var PACKAGE_NAME_PATTERN = /\.\/node_modules\/([^/]+)\//;

function findJsModulesFromModuleFinder(config, normalizedName, variableName, finder, pathToCurrentFile) {
  return new Promise(function (resolve, reject) {
    var isWantedPackageDependency = Boolean;
    if (!config.get('importDevDependencies')) {
      var packageDependencies = config.get('packageDependencies');
      isWantedPackageDependency = function isWantedPackageDependency(packageName) {
        return packageDependencies.has(packageName);
      };
    }

    finder.find(normalizedName).then(function (exports) {
      var modules = exports.map(function (_ref) {
        var path = _ref.path,
            isDefault = _ref.isDefault;

        if (path.startsWith('./node_modules')) {
          var packageName = path.match(PACKAGE_NAME_PATTERN)[1];
          if (!isWantedPackageDependency(packageName)) {
            return undefined;
          }
          return new _JsModule2['default']({
            importPath: packageName,
            variableName: variableName,
            hasNamedExports: !isDefault
          });
        }

        // Filter out modules that are in the `excludes` config.
        if (config.get('excludes').some(function (glob) {
          return (0, _minimatch2['default'])(path, glob);
        })) {
          return undefined;
        }

        return _JsModule2['default'].construct({
          hasNamedExports: !isDefault,
          relativeFilePath: path,
          stripFileExtensions: config.get('stripFileExtensions', {
            pathToImportedModule: path
          }),
          makeRelativeTo: config.get('useRelativePaths', {
            pathToImportedModule: path
          }) && pathToCurrentFile,
          variableName: variableName,
          workingDirectory: config.workingDirectory
        });
      });
      resolve(modules.filter(Boolean));
    })['catch'](reject);
  });
}

function dedupeAndSort(modules) {
  // We might end up having duplicate modules here.  In order to dedupe
  // these, we remove the module with the longest path
  var sorted = (0, _lodash2['default'])(modules, function (module) {
    return module.importPath.length;
  });
  var uniques = (0, _lodash4['default'])(sorted, function (module) {
    return module.importPath;
  });
  return (0, _lodash2['default'])(uniques, function (module) {
    return module.displayName();
  });
}

var NON_PATH_ALIAS_PATTERN = /^[a-zA-Z0-9-_]+$/;

function findJsModulesFor(config, variableName, pathToCurrentFile) {
  return new Promise(function (resolve, reject) {
    var normalizedName = variableName;
    var alias = config.resolveAlias(variableName, pathToCurrentFile);
    if (alias) {
      if (NON_PATH_ALIAS_PATTERN.test(alias)) {
        // The alias is likely a package dependency. We can use it in the
        // ModuleFinder lookup.
        normalizedName = alias;
      } else {
        // The alias is a path of some sort. Use it directly as the moduleName
        // in the import.
        resolve([new _JsModule2['default']({ importPath: alias, variableName: variableName })]);
        return;
      }
    }

    var namedImportsModule = config.resolveNamedExports(variableName);
    if (namedImportsModule) {
      resolve([namedImportsModule]);
      return;
    }

    var matchedModules = [];

    matchedModules.push.apply(matchedModules, _toConsumableArray(findImportsFromEnvironment(config, variableName)));

    var finder = _ModuleFinder2['default'].getForWorkingDirectory(config.workingDirectory, {
      excludes: config.get('excludes'),
      ignorePackagePrefixes: config.get('ignorePackagePrefixes')
    });
    findJsModulesFromModuleFinder(config, normalizedName, variableName, finder, pathToCurrentFile).then(function (modules) {
      matchedModules.push.apply(matchedModules, _toConsumableArray(modules));
      resolve(dedupeAndSort(matchedModules));
    })['catch'](function (error) {
      reject(error);
    });
  });
}
module.exports = exports['default'];