Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash.escaperegexp');

var _lodash2 = _interopRequireDefault(_lodash);

var _CommandLineEditor = require('./CommandLineEditor');

var _CommandLineEditor2 = _interopRequireDefault(_CommandLineEditor);

var _Configuration = require('./Configuration');

var _Configuration2 = _interopRequireDefault(_Configuration);

var _ImportStatement = require('./ImportStatement');

var _ImportStatement2 = _interopRequireDefault(_ImportStatement);

var _ImportStatements = require('./ImportStatements');

var _ImportStatements2 = _interopRequireDefault(_ImportStatements);

var _JsModule = require('./JsModule');

var _JsModule2 = _interopRequireDefault(_JsModule);

var _findCurrentImports2 = require('./findCurrentImports');

var _findCurrentImports3 = _interopRequireDefault(_findCurrentImports2);

var _findJsModulesFor = require('./findJsModulesFor');

var _findJsModulesFor2 = _interopRequireDefault(_findJsModulesFor);

var _findUndefinedIdentifiers = require('./findUndefinedIdentifiers');

var _findUndefinedIdentifiers2 = _interopRequireDefault(_findUndefinedIdentifiers);

var _findUsedIdentifiers = require('./findUsedIdentifiers');

var _findUsedIdentifiers2 = _interopRequireDefault(_findUsedIdentifiers);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function fixImportsMessage(removedItems, addedItems) {
  var messageParts = [];

  var firstAdded = addedItems.values().next().value;
  var firstRemoved = removedItems.values().next().value;

  if (addedItems.size === 1 && firstAdded) {
    messageParts.push('Imported `' + String(firstAdded) + '`.');
  } else if (addedItems.size) {
    messageParts.push('Added ' + String(addedItems.size) + ' imports.');
  }

  if (removedItems.size === 1 && firstRemoved) {
    messageParts.push('Removed `' + String(firstRemoved) + '`.');
  } else if (removedItems.size) {
    messageParts.push('Removed ' + String(removedItems.size) + ' imports.');
  }

  if (messageParts.length === 0) {
    return undefined;
  }
  return messageParts.join(' ');
}

var Importer = function () {
  function Importer(lines, pathToFile) {
    var workingDirectory = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : process.cwd();

    _classCallCheck(this, Importer);

    var pathToCurrentFile = pathToFile || '';
    this.editor = new _CommandLineEditor2['default'](lines);
    this.config = new _Configuration2['default'](pathToCurrentFile, workingDirectory);
    this.workingDirectory = workingDirectory;

    // Normalize the path to the current file so that we only have to deal with
    // local paths.
    this.pathToCurrentFile = pathToCurrentFile && pathToCurrentFile.replace(RegExp('^' + String((0, _lodash2['default'])(workingDirectory)) + '/'), '');

    this.messages = Array.from(this.config.messages);
    this.unresolvedImports = {};
    try {
      this.ast = (0, _parse2['default'])(this.editor.currentFileContent());
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.message('SyntaxError: ' + String(e.message));
        this.ast = (0, _parse2['default'])('');
      } else {
        throw new Error(e);
      }
    }
  }

  _createClass(Importer, [{
    key: 'results',
    value: function () {
      function results() {
        return {
          messages: this.messages, // array
          fileContent: this.editor.currentFileContent(), // string
          unresolvedImports: this.unresolvedImports };
      }

      return results;
    }()

    /**
     * Imports one variable
     */

  }, {
    key: 'import',
    value: function () {
      function _import(variableName) {
        var _this = this;

        return new Promise(function (resolve, reject) {
          _this.findOneJsModule(variableName).then(function (jsModule) {
            if (!jsModule) {
              if (!Object.keys(_this.unresolvedImports).length) {
                _this.message('No JS module to import for `' + String(variableName) + '`');
              }
              resolve(_this.results());
              return;
            }

            var jsModuleName = jsModule.displayName();
            if (jsModule.hasNamedExports) {
              _this.message('Imported `' + String(variableName) + '` from `' + String(jsModuleName) + '`');
            } else {
              _this.message('Imported `' + String(jsModuleName) + '`');
            }

            var oldImports = _this.findCurrentImports();
            var importStatement = jsModule.toImportStatement(_this.config);
            oldImports.imports.push(importStatement);
            _this.replaceImports(oldImports.range, oldImports.imports);

            resolve(_this.results());
          })['catch'](function (error) {
            reject(error);
          });
        });
      }

      return _import;
    }()
  }, {
    key: 'goto',
    value: function () {
      function goto(variableName) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
          (0, _findJsModulesFor2['default'])(_this2.config, variableName, _this2.pathToCurrentFile).then(function (jsModules) {
            var jsModule = _this2.resolveModuleUsingCurrentImports(jsModules, variableName);

            if (!jsModule) {
              // If the module couldn't be resolved using existing imports, we just
              // grab the first one. This isn't ideal if there are multiple matches,
              // but it's rare that we end up here, and falling back to the first
              // one simplifies things.
              jsModule = jsModules[0];
            }

            if (!jsModule) {
              // The current word is not mappable to one of the JS modules that we
              // found. This can happen if the user does not select one from the list.
              // We have nothing to go to, so we return early.
              _this2.message('No JS module found for `' + String(variableName) + '`');
              resolve(_this2.results());
              return;
            }

            var filePath = jsModule.resolvedFilePath(_this2.pathToCurrentFile, _this2.workingDirectory);
            var results = _this2.results();
            results.goto = filePath.startsWith('/') ? filePath : _path2['default'].join(_this2.workingDirectory, filePath);
            resolve(results);
          })['catch'](function (error) {
            reject(error);
          });
        });
      }

      return goto;
    }()

    // Removes unused imports and adds imports for undefined variables

  }, {
    key: 'fixImports',
    value: function () {
      function fixImports() {
        var _this3 = this;

        var undefinedVariables = (0, _findUndefinedIdentifiers2['default'])(this.ast, this.config.get('globals'));
        var usedVariables = (0, _findUsedIdentifiers2['default'])(this.ast);
        var oldImports = this.findCurrentImports();
        var newImports = oldImports.imports.clone();

        var unusedImportVariables = new Set();
        oldImports.imports.forEach(function (importStatement) {
          importStatement.variables().forEach(function (variable) {
            if (!usedVariables.has(variable)) {
              unusedImportVariables.add(variable);
            }
          });
        });
        newImports.deleteVariables(unusedImportVariables);

        var addedItems = new Set(this.injectSideEffectImports(newImports));

        return new Promise(function (resolve, reject) {
          var allPromises = [];
          undefinedVariables.forEach(function (variable) {
            allPromises.push(_this3.findOneJsModule(variable));
          });
          Promise.all(allPromises).then(function (results) {
            results.forEach(function (jsModule) {
              if (!jsModule) {
                return;
              }
              addedItems.add(jsModule.variableName);
              newImports.push(jsModule.toImportStatement(_this3.config));
            });

            _this3.replaceImports(oldImports.range, newImports);

            var message = fixImportsMessage(unusedImportVariables, addedItems);
            if (message) {
              _this3.message(message);
            }

            resolve(_this3.results());
          })['catch'](function (error) {
            reject(error);
          });
        });
      }

      return fixImports;
    }()
  }, {
    key: 'addImports',
    value: function () {
      function addImports(imports) {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          var oldImports = _this4.findCurrentImports();
          var newImports = oldImports.imports.clone();

          var variables = Object.keys(imports);
          var promises = variables.map(function (variableName) {
            return (0, _findJsModulesFor2['default'])(_this4.config, variableName, _this4.pathToCurrentFile).then(function (jsModules) {
              var importPath = imports[variableName];
              var foundModule = jsModules.find(function (jsModule) {
                return jsModule.importPath === importPath;
              });
              if (foundModule) {
                newImports.push(foundModule.toImportStatement(_this4.config));
              } else {
                newImports.push(new _JsModule2['default']({
                  importPath: importPath,
                  variableName: variableName
                }).toImportStatement(_this4.config));
              }
            })['catch'](reject);
          });

          Promise.all(promises).then(function () {
            if (variables.length === 1) {
              _this4.message('Added import for `' + String(variables[0]) + '`');
            } else {
              _this4.message('Added ' + String(variables.length) + ' imports');
            }

            _this4.replaceImports(oldImports.range, newImports);

            resolve(_this4.results());
          });
        });
      }

      return addImports;
    }()
  }, {
    key: 'rewriteImports',
    value: function () {
      function rewriteImports() {
        var _this5 = this;

        var oldImports = this.findCurrentImports();
        var newImports = new _ImportStatements2['default'](this.config);

        return new Promise(function (resolve, reject) {
          var variables = [];
          var sideEffectOnlyImports = [];
          oldImports.imports.forEach(function (imp) {
            if (imp.variables().length) {
              variables.push.apply(variables, _toConsumableArray(imp.variables()));
            } else if (imp.hasSideEffects) {
              // side-effect imports don't have variable names. Tuck them away and just pass
              // them through to the end of this operation.
              sideEffectOnlyImports.push(imp);
            }
          });
          var promises = variables.map(function (variable) {
            return (0, _findJsModulesFor2['default'])(_this5.config, variable, _this5.pathToCurrentFile);
          });

          Promise.all(promises).then(function (results) {
            results.forEach(function (jsModules) {
              if (!jsModules.length) {
                return;
              }

              var variableName = jsModules[0].variableName;

              var jsModule = _this5.resolveModuleUsingCurrentImports(jsModules, variableName) || _this5.resolveOneJsModule(jsModules, variableName);

              if (!jsModule) {
                return;
              }

              newImports.push(jsModule.toImportStatement(_this5.config));
            });

            newImports.push.apply(newImports, sideEffectOnlyImports);

            _this5.replaceImports(oldImports.range, newImports);
            resolve(_this5.results());
          })['catch'](function (error) {
            reject(error);
          });
        });
      }

      return rewriteImports;
    }()
  }, {
    key: 'message',
    value: function () {
      function message(str) {
        this.messages.push(str);
      }

      return message;
    }()
  }, {
    key: 'findOneJsModule',
    value: function () {
      function findOneJsModule(variableName) {
        var _this6 = this;

        return new Promise(function (resolve, reject) {
          (0, _findJsModulesFor2['default'])(_this6.config, variableName, _this6.pathToCurrentFile).then(function (jsModules) {
            if (!jsModules.length) {
              resolve(null);
              return;
            }
            resolve(_this6.resolveOneJsModule(jsModules, variableName));
          })['catch'](function (error) {
            reject(error);
          });
        });
      }

      return findOneJsModule;
    }()
  }, {
    key: 'replaceImports',
    value: function () {
      function replaceImports(oldImportsRange, newImports) {
        var _this7 = this;

        var importStrings = newImports.toArray();

        // Ensure that there is a blank line after the block of all imports
        if (importStrings.length && this.editor.get(oldImportsRange.end) !== '') {
          this.editor.insertBefore(oldImportsRange.end, '');
        }

        // Delete old imports, then add the modified list back in.
        for (var i = oldImportsRange.end - 1; i >= oldImportsRange.start; i -= 1) {
          this.editor.remove(i);
        }

        if (importStrings.length === 0 && this.editor.get(oldImportsRange.start) === '') {
          // We have no newlines to write back to the file. Clearing out potential
          // whitespace where the imports used to be leaves the file in a better
          // state.
          this.editor.remove(oldImportsRange.start);
          return;
        }

        importStrings.reverse().forEach(function (importString) {
          // We need to add each line individually because the Vim buffer will
          // convert newline characters to `~@`.
          if (importString.indexOf('\n') !== -1) {
            importString.split('\n').reverse().forEach(function (line) {
              _this7.editor.insertBefore(oldImportsRange.start, line);
            });
          } else {
            _this7.editor.insertBefore(oldImportsRange.start, importString);
          }
        });

        while (this.editor.get(0) === '') {
          this.editor.remove(0);
        }
      }

      return replaceImports;
    }()
  }, {
    key: 'findCurrentImports',
    value: function () {
      function findCurrentImports() {
        return (0, _findCurrentImports3['default'])(this.config, this.editor.currentFileContent(), this.ast);
      }

      return findCurrentImports;
    }()
  }, {
    key: 'resolveOneJsModule',
    value: function () {
      function resolveOneJsModule(jsModules, variableName) {
        var _this8 = this;

        if (jsModules.length === 1) {
          var jsModule = jsModules[0];
          return jsModule;
        }

        if (!jsModules.length) {
          return undefined;
        }

        this.unresolvedImports[variableName] = jsModules.map(function (jsModule) {
          return {
            displayName: jsModule.displayName(),
            importPath: jsModule.importPath,
            filePath: jsModule.resolvedFilePath(_this8.pathToCurrentFile, _this8.workingDirectory)
          };
        });

        return undefined;
      }

      return resolveOneJsModule;
    }()
  }, {
    key: 'resolveModuleUsingCurrentImports',
    value: function () {
      function resolveModuleUsingCurrentImports(jsModules, variableName) {
        var _this9 = this;

        if (jsModules.length === 1) {
          return jsModules[0];
        }

        // Look at the current imports and grab what is already imported for the
        // variable.
        var matchingImportStatement = void 0;
        this.findCurrentImports().imports.forEach(function (ist) {
          if (variableName === ist.defaultImport || ist.namedImports && ist.namedImports.indexOf(variableName) !== -1) {
            matchingImportStatement = ist;
          }
        });

        if (!matchingImportStatement) {
          return undefined;
        }

        if (jsModules.length > 0) {
          // Look for a module matching what is already imported
          var _matchingImportStatem = matchingImportStatement,
              matchingPath = _matchingImportStatem.path;

          return jsModules.find(function (jsModule) {
            return matchingPath === jsModule.toImportStatement(_this9.config).path;
          });
        }

        // We couldn't resolve any module for the variable. As a fallback, we
        // can use the matching import statement. If that maps to a package
        // dependency, we will still open the right file.
        var hasNamedExports = false;
        if (matchingImportStatement.hasNamedImports()) {
          hasNamedExports = matchingImportStatement.namedImports.indexOf(variableName) !== -1;
        }

        var matchedModule = new _JsModule2['default']({
          importPath: matchingImportStatement.path,
          hasNamedExports: hasNamedExports,
          variableName: variableName
        });

        return matchedModule;
      }

      return resolveModuleUsingCurrentImports;
    }()
  }, {
    key: 'injectSideEffectImports',
    value: function () {
      function injectSideEffectImports(importStatements) {
        var _this10 = this;

        var addedImports = [];
        this.config.get('moduleSideEffectImports').forEach(function (path) {
          var sizeBefore = importStatements.size();
          importStatements.push(new _ImportStatement2['default']({
            namedImports: [],
            defaultImport: '',
            hasSideEffects: true,
            declarationKeyword: _this10.config.get('declarationKeyword'),
            importFunction: _this10.config.get('importFunction'),
            path: path
          }));
          if (importStatements.size() > sizeBefore) {
            // The number of imports changed as part of adding the side-effect
            // import. This means that the import wasn't previously there.
            addedImports.push(path);
          }
        });
        return addedImports;
      }

      return injectSideEffectImports;
    }()
  }]);

  return Importer;
}();

exports['default'] = Importer;
module.exports = exports['default'];