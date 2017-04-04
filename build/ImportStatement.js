Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function isLineTooLong(line, maxLineLength) {
  return !!maxLineLength && line.length > maxLineLength;
}

function equalsAndValue(_ref) {
  var declarationKeyword = _ref.declarationKeyword,
      importFunction = _ref.importFunction,
      path = _ref.path;

  if (declarationKeyword === 'import') {
    return { equals: 'from', value: '\'' + String(path) + '\';' };
  }
  return { equals: '=', value: String(importFunction || 'require') + '(\'' + String(path) + '\');' };
}

/**
 * Class that represents an import statement, e.g.
 * `const foo = require('foo');`
 * `var foo = myCustomRequire('foo');`
 * `import foo from 'foo';`
 */

var ImportStatement = function () {
  function ImportStatement() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        assignment = _ref2.assignment,
        declarationKeyword = _ref2.declarationKeyword,
        defaultImport = _ref2.defaultImport,
        hasSideEffects = _ref2.hasSideEffects,
        importFunction = _ref2.importFunction,
        _ref2$namedImports = _ref2.namedImports,
        namedImports = _ref2$namedImports === undefined ? [] : _ref2$namedImports,
        originalImportString = _ref2.originalImportString,
        path = _ref2.path;

    _classCallCheck(this, ImportStatement);

    this.assignment = assignment;
    this.declarationKeyword = declarationKeyword;
    this.defaultImport = defaultImport;
    this.hasSideEffects = hasSideEffects;
    this.importFunction = importFunction;
    this.namedImports = namedImports;
    this.originalImportString = originalImportString;
    this.path = path;
  }

  /**
   * Deletes a variable from an already existing default import or set of
   * named imports.
   */


  _createClass(ImportStatement, [{
    key: 'deleteVariable',
    value: function () {
      function deleteVariable(variableName) {
        var touched = false;

        if (this.defaultImport === variableName) {
          delete this.defaultImport;
          touched = true;
        }

        if (this.hasNamedImports()) {
          var variableIndex = this.namedImports.indexOf(variableName);
          if (variableIndex !== -1) {
            this.namedImports.splice(variableIndex, 1);
            touched = true;
          }
        }

        if (touched) {
          this._clearImportStringCache();
        }
      }

      return deleteVariable;
    }()

    /**
     * @return {Boolean} true if there are named imports
     */

  }, {
    key: 'hasNamedImports',
    value: function () {
      function hasNamedImports() {
        return !!this.namedImports && this.namedImports.length > 0;
      }

      return hasNamedImports;
    }()

    /**
     * @return {Boolean} true if there is no default import, no named imports, and
     *   no side effects.
     */

  }, {
    key: 'isEmpty',
    value: function () {
      function isEmpty() {
        return !this.defaultImport && !this.hasNamedImports() && !this.hasSideEffects;
      }

      return isEmpty;
    }()

    /**
     * @return {Boolean} true if this instance was created through parsing an
     *   existing import and it hasn't been altered since it was created.
     */

  }, {
    key: 'isParsedAndUntouched',
    value: function () {
      function isParsedAndUntouched() {
        return !!this.originalImportString;
      }

      return isParsedAndUntouched;
    }()

    /**
     * @return {Array} an array that can be used in `sort` and `uniq`
     */

  }, {
    key: 'toNormalized',
    value: function () {
      function toNormalized() {
        if (!this.defaultImport && !this.hasNamedImports() && this.hasSideEffects) {
          return [this.path];
        }
        return [this.defaultImport || ''].concat(_toConsumableArray(this.namedImports || []));
      }

      return toNormalized;
    }()

    /**
     * @return {Array<String>} Array of all variables that this ImportStatement
     *   imports.
     */

  }, {
    key: 'variables',
    value: function () {
      function variables() {
        return [this.defaultImport].concat(_toConsumableArray(this.namedImports || [])).filter(Boolean);
      }

      return variables;
    }()
  }, {
    key: 'toImportStrings',
    value: function () {
      function toImportStrings(maxLineLength, tab) {
        if (this.originalImportString) {
          return [this.originalImportString];
        }

        if (this.hasSideEffects && !this.hasNamedImports() && !this.defaultImport) {
          // this is a side-effect import only
          return [this._assignmentLessImportString()];
        }

        if (this.declarationKeyword === 'import') {
          // ES2015 Modules (ESM) syntax can support default imports and
          // named imports on the same line.
          if (this.hasNamedImports()) {
            return [this._namedImportString(maxLineLength, tab)];
          }
          return [this._defaultImportString(maxLineLength, tab)];
        }

        // const/var
        var strings = [];
        if (this.defaultImport) {
          strings.push(this._defaultImportString(maxLineLength, tab));
        }
        if (this.hasNamedImports()) {
          strings.push(this._namedImportString(maxLineLength, tab));
        }
        return strings;
      }

      return toImportStrings;
    }()

    /**
     * Merge another ImportStatement into this one.
     */

  }, {
    key: 'merge',
    value: function () {
      function merge(importStatement) {
        if (importStatement.defaultImport && this.defaultImport !== importStatement.defaultImport) {
          this.defaultImport = importStatement.defaultImport;
          this._clearImportStringCache();
        }

        if (importStatement.hasSideEffects && this.hasSideEffects !== importStatement.hasSideEffects) {
          // If a module is ever thought to have side-effects, then assume it does.
          this.hasSideEffects = true;
          this._clearImportStringCache();
        }

        if (importStatement.hasNamedImports()) {
          this.namedImports = this.namedImports || [];
          var originalNamedImports = this.namedImports.slice(0); // clone array

          var importsSet = new Set([].concat(_toConsumableArray(this.namedImports), _toConsumableArray(importStatement.namedImports)).sort());

          // TODO We should probably just use Sets for namedImports instead of
          // converting back to arrays.
          this.namedImports = Array.from(importsSet);

          if (originalNamedImports !== this.namedImports) {
            this._clearImportStringCache();
          }
        }

        if (this.declarationKeyword !== importStatement.declarationKeyword) {
          this.declarationKeyword = importStatement.declarationKeyword;
          this._clearImportStringCache();
        }
      }

      return merge;
    }()
  }, {
    key: '_assignmentLessImportString',
    value: function () {
      function _assignmentLessImportString() {
        if (this.declarationKeyword === 'import') {
          return 'import \'' + String(this.path) + '\';';
        }

        return String(this.importFunction || 'require') + '(\'' + String(this.path) + '\');';
      }

      return _assignmentLessImportString;
    }()
  }, {
    key: '_defaultImportString',
    value: function () {
      function _defaultImportString(maxLineLength, tab) {
        var _equalsAndValue = equalsAndValue({
          declarationKeyword: this.declarationKeyword,
          importFunction: this.importFunction,
          path: this.path
        }),
            equals = _equalsAndValue.equals,
            value = _equalsAndValue.value;

        var line = String(this.declarationKeyword || '') + ' ' + String(this.defaultImport || '') + ' ' + String(equals) + ' ' + String(value);
        if (!isLineTooLong(line, maxLineLength)) {
          return line;
        }

        return String(this.declarationKeyword || '') + ' ' + String(this.defaultImport || '') + ' ' + String(equals) + '\n' + String(tab) + String(value);
      }

      return _defaultImportString;
    }()
  }, {
    key: '_namedImportString',
    value: function () {
      function _namedImportString(maxLineLength, tab) {
        var _equalsAndValue2 = equalsAndValue({
          declarationKeyword: this.declarationKeyword,
          importFunction: this.importFunction,
          path: this.path
        }),
            equals = _equalsAndValue2.equals,
            value = _equalsAndValue2.value;

        var prefix = '';
        if (this.declarationKeyword === 'import' && this.defaultImport) {
          prefix = String(this.defaultImport) + ', ';
        }

        var namedOneLine = '{ ' + String(this.namedImports.join(', ')) + ' }';
        var line = String(this.declarationKeyword || '') + ' ' + prefix + namedOneLine + ' ' + String(equals) + ' ' + String(value);
        if (!isLineTooLong(line, maxLineLength)) {
          return line;
        }

        var tabJoined = this.namedImports.join(',\n' + String(tab));
        var namedMultiLine = '{\n' + String(tab) + String(tabJoined) + ',\n}';
        return String(this.declarationKeyword || '') + ' ' + prefix + namedMultiLine + ' ' + String(equals) + ' ' + String(value);
      }

      return _namedImportString;
    }()
  }, {
    key: '_clearImportStringCache',
    value: function () {
      function _clearImportStringCache() {
        delete this.originalImportString;
      }

      return _clearImportStringCache;
    }()
  }]);

  return ImportStatement;
}();

exports['default'] = ImportStatement;
module.exports = exports['default'];