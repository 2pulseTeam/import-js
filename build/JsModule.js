Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Configuration = require('./Configuration');

var _Configuration2 = _interopRequireDefault(_Configuration);

var _ImportStatement = require('./ImportStatement');

var _ImportStatement2 = _interopRequireDefault(_ImportStatement);

var _requireResolve = require('./requireResolve');

var _requireResolve2 = _interopRequireDefault(_requireResolve);

var _resolveImportPathAndMain = require('./resolveImportPathAndMain');

var _resolveImportPathAndMain2 = _interopRequireDefault(_resolveImportPathAndMain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO figure out a more holistic solution than stripping node_modules
function stripNodeModules(path) {
  if (path.startsWith('node_modules/')) {
    return path.slice(13);
  }

  return path;
}

// Class that represents a js module found in the file system

var JsModule = function () {
  _createClass(JsModule, null, [{
    key: 'construct',


    /**
     * @param {Boolean} hasNamedExports
     * @param {String|null} opts.makeRelativeTo a path to a different file which
     *   the resulting import path should be relative to.
     * @param {String} opts.relativeFilePath a full path to the file, relative to
     *   the project root.
     * @param {Array} opts.stripFileExtensions a list of file extensions to strip,
     *   e.g. ['.js', '.jsx']
     * @param {String} opts.variableName
     * @param {String} opts.workingDirectory
     * @return {JsModule}
     */
    value: function () {
      function construct() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            hasNamedExports = _ref.hasNamedExports,
            makeRelativeTo = _ref.makeRelativeTo,
            relativeFilePath = _ref.relativeFilePath,
            stripFileExtensions = _ref.stripFileExtensions,
            variableName = _ref.variableName,
            _ref$workingDirectory = _ref.workingDirectory,
            workingDirectory = _ref$workingDirectory === undefined ? process.cwd() : _ref$workingDirectory;

        var jsModule = new JsModule();
        jsModule.filePath = relativeFilePath;

        var importPathAndMainFile = (0, _resolveImportPathAndMain2['default'])(jsModule.filePath, stripFileExtensions, workingDirectory);
        var importPath = importPathAndMainFile[0];
        var mainFile = importPathAndMainFile[1];

        if (!importPath) {
          return null;
        }

        if (mainFile) {
          jsModule.filePath = _path2['default'].normalize(String(importPath) + '/' + String(mainFile));
        }

        jsModule.importPath = importPath;
        jsModule.mainFile = mainFile;
        jsModule.hasNamedExports = hasNamedExports;
        jsModule.variableName = variableName;
        if (makeRelativeTo) {
          jsModule.makeRelativeTo(makeRelativeTo);
        } else {
          jsModule.importPath = jsModule.importPath.replace(/^\.\//, '');
        }
        return jsModule;
      }

      return construct;
    }()
  }]);

  function JsModule() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        hasNamedExports = _ref2.hasNamedExports,
        importPath = _ref2.importPath,
        variableName = _ref2.variableName;

    _classCallCheck(this, JsModule);

    this.hasNamedExports = hasNamedExports;
    this.importPath = importPath;
    this.variableName = variableName;
  }

  _createClass(JsModule, [{
    key: 'makeRelativeTo',
    value: function () {
      function makeRelativeTo(makeRelativeToPath) {
        var importPath = _path2['default'].relative(_path2['default'].dirname(makeRelativeToPath), this.importPath);

        // `path.relative` will not add "./" automatically
        if (!importPath.startsWith('.')) {
          importPath = './' + String(importPath);
        }

        this.importPath = importPath;
      }

      return makeRelativeTo;
    }()
  }, {
    key: 'displayName',
    value: function () {
      function displayName() {
        // TODO figure out a more holistic solution than stripping node_modules
        var parts = [stripNodeModules(this.importPath)];
        if (this.mainFile) {
          parts.push(' (main: ' + String(this.mainFile) + ')');
        }
        return parts.join('');
      }

      return displayName;
    }()
  }, {
    key: 'resolvedFilePath',
    value: function () {
      function resolvedFilePath(pathToCurrentFile) {
        var workingDirectory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process.cwd();

        if (this.filePath) {
          return this.filePath;
        }

        // There is no filePath. This likely means that we are working with an
        // alias, so we want to expand it to a full path if we can.
        if (this.importPath.startsWith('.')) {
          // The import path in the alias starts with a ".", which means that it is
          // relative to the current file. In order to open this file, we need to
          // expand it to a full path.
          return _path2['default'].resolve(_path2['default'].dirname(pathToCurrentFile), this.importPath);
        }

        // If all of the above fails to find a path, we fall back to using
        // require.resolve() to find the file path.
        var unresolved = _path2['default'].join(workingDirectory, this.importPath);
        var resolved = (0, _requireResolve2['default'])(unresolved);
        if (unresolved !== resolved) {
          // We found a location for the import
          return resolved;
        }
        // as a last resort, assume it's a package dependency
        return (0, _requireResolve2['default'])(_path2['default'].join(workingDirectory, 'node_modules', this.importPath));
      }

      return resolvedFilePath;
    }()
  }, {
    key: 'toImportStatement',
    value: function () {
      function toImportStatement(config) {
        var namedImports = [];
        var defaultImport = '';
        if (this.hasNamedExports) {
          namedImports = [this.variableName];
        } else {
          defaultImport = this.variableName;
        }

        // TODO figure out a more holistic solution than stripping node_modules
        var pathToImportedModule = stripNodeModules(this.resolvedFilePath(config.pathToCurrentFile, config.workingDirectory));

        return new _ImportStatement2['default']({
          declarationKeyword: config.get('declarationKeyword', {
            pathToImportedModule: pathToImportedModule
          }),
          defaultImport: defaultImport,
          hasSideEffects: false,
          importFunction: config.get('importFunction', { pathToImportedModule: pathToImportedModule }),
          namedImports: namedImports,
          path: config.get('moduleNameFormatter', {
            pathToImportedModule: pathToImportedModule,
            // TODO figure out a more holistic solution than stripping node_modules
            moduleName: stripNodeModules(this.importPath)
          })
        });
      }

      return toImportStatement;
    }()
  }]);

  return JsModule;
}();

exports['default'] = JsModule;
module.exports = exports['default'];