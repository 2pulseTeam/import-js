Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findExports;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

var _requireResolve = require('./requireResolve');

var _requireResolve2 = _interopRequireDefault(_requireResolve);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function findESNamedExports(node) {
  if (node.type !== 'ExportNamedDeclaration') {
    return [];
  }

  if (node.specifiers.length) {
    return node.specifiers.map(function (_ref) {
      var exported = _ref.exported;
      return exported.name;
    });
  }

  if (!node.declaration) {
    return [];
  }

  if (node.declaration.type === 'FunctionDeclaration' || node.declaration.type === 'ClassDeclaration') {
    return [node.declaration.id.name];
  }

  var result = [];
  node.declaration.declarations.forEach(function (_ref2) {
    var id = _ref2.id;

    if (id.type === 'ObjectPattern') {
      // export const { foo, bar } = something();
      result.push.apply(result, _toConsumableArray(id.properties.map(function (_ref3) {
        var key = _ref3.key;
        return key.name;
      })));
    } else {
      result.push(id.name);
    }
  });
  return result;
}

function findCommonJSExports(node, _ref4) {
  var definedNames = _ref4.definedNames,
      absolutePathToFile = _ref4.absolutePathToFile,
      aliasesForExports = _ref4.aliasesForExports;

  if (node.type !== 'ExpressionStatement') {
    return [];
  }
  if (node.expression.type === 'CallExpression' && node.expression.callee.type === 'MemberExpression' && aliasesForExports.has(node.expression.callee.object.name) && node.expression.callee.property.name === 'use' && node.expression.arguments.length && node.expression.arguments[0].type === 'Identifier') {
    // exports.use(foo);
    return [node.expression.arguments[0].name];
  }
  var _node$expression = node.expression,
      left = _node$expression.left,
      right = _node$expression.right;

  if (!left || !right) {
    return [];
  }
  if (left.object && left.object.name === 'module' && left.property.name === 'exports' || aliasesForExports.has(left.name)) {
    if (right.type === 'CallExpression' && right.callee.name === 'require' && right.arguments.length === 1 && right.arguments[0].type === 'StringLiteral') {
      // module.exports = require('someOtherFile.js');
      var pathToRequiredFile = (0, _requireResolve2['default'])(_path2['default'].resolve(_path2['default'].dirname(absolutePathToFile), right.arguments[0].value));
      var requiredFileContent = _fs2['default'].readFileSync(pathToRequiredFile, 'utf8');
      // eslint-disable-next-line no-use-before-define

      var _findExports = findExports(requiredFileContent, pathToRequiredFile),
          named = _findExports.named;

      return named;
    }
    // module.exports = { foo: 'foo' };
    if (right.type === 'ObjectExpression') {
      return right.properties.map(function (_ref5) {
        var key = _ref5.key;
        return key.name;
      }).filter(Boolean);
    }
    if (right.type === 'Identifier') {
      return definedNames[right.name] || [];
    }
  }

  if (!left.object || !left.property) {
    return [];
  }

  if (left.object.type === 'MemberExpression' && left.object.object.name === 'module' && left.object.property.name === 'exports') {
    // module.exports.foo = 'bar';
    return [left.property.name];
  }

  if (left.type === 'MemberExpression' && left.object.type === 'Identifier' && aliasesForExports.has(left.object.name)) {
    // exports.foo = 'bar';
    return [left.property.name];
  }

  return [];
}

function findDefinedNames(node, definedNames) {
  if (node.type === 'ExpressionStatement') {
    var _node$expression2 = node.expression,
        left = _node$expression2.left,
        right = _node$expression2.right;

    if (left && right) {
      if (left.object) {
        (definedNames[left.object.name] || []).push(left.property.name);
      }
    }
  }
  if (node.type !== 'VariableDeclaration') {
    return;
  }
  node.declarations.forEach(function (_ref6) {
    var id = _ref6.id,
        init = _ref6.init;

    if (!init) {
      return;
    }
    if (init.type === 'ObjectExpression') {
      // eslint-disable-next-line no-param-reassign
      definedNames[id.name] = init.properties.map(function (_ref7) {
        var key = _ref7.key;
        return key && key.name;
      }).filter(Boolean);
    } else if (init.type === 'FunctionExpression') {
      definedNames[id.name] = []; // eslint-disable-line no-param-reassign
    }
  });
}

/**
 * This function will find variable declarations where `exports` is redefined as
 * something else. E.g.
 *
 * const moduleName = exports;
 */
function findAliasesForExports(nodes) {
  var result = new Set(['exports']);
  nodes.forEach(function (node) {
    if (node.type !== 'VariableDeclaration') {
      return;
    }
    node.declarations.forEach(function (_ref8) {
      var id = _ref8.id,
          init = _ref8.init;

      if (!init) {
        return;
      }
      if (init.type !== 'Identifier') {
        return;
      }
      if (init.name !== 'exports') {
        return;
      }
      // We have something like
      // var foo = exports;
      result.add(id.name);
    });
  });
  return result;
}

function findNamedExports(nodes, _ref9) {
  var absolutePathToFile = _ref9.absolutePathToFile,
      definedNames = _ref9.definedNames,
      aliasesForExports = _ref9.aliasesForExports;

  var result = [];
  nodes.forEach(function (node) {
    result.push.apply(result, _toConsumableArray(findESNamedExports(node)));
    result.push.apply(result, _toConsumableArray(findCommonJSExports(node, {
      definedNames: definedNames,
      absolutePathToFile: absolutePathToFile,
      aliasesForExports: aliasesForExports
    })));
  });
  return result;
}

function hasDefaultExport(nodes) {
  return nodes.some(function (node) {
    if (node.type === 'ExportDefaultDeclaration') {
      return true;
    }
    if (node.type !== 'ExpressionStatement') {
      return false;
    }
    // Potential CommonJS export
    var _node$expression3 = node.expression,
        left = _node$expression3.left,
        right = _node$expression3.right;

    if (!left || !right) {
      return false;
    }
    if (left.name === 'exports') {
      return true;
    }
    if (!left.object || !left.property) {
      // foo = 'bar';
      return false;
    }
    return left.object.name === 'module' && left.property.name === 'exports';
  });
}

var DEFAULT_EXPORT_PATTERN = /\smodule\.exports\s*=\s*(\w+)/;
function findRawDefaultExport(data) {
  var match = data.match(DEFAULT_EXPORT_PATTERN);
  if (match) {
    return match[1];
  }
  return undefined;
}

function findRawNamedExports(data) {
  var result = new Set();
  var pattern = /^exports\.(\w+)\s*=\s*[\w.]+;$/gm;
  var match = void 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(data)) !== null) {
    var name = match[1];
    if (name !== 'default') {
      result.add(name);
    }
  }
  return Array.from(result);
}

function findRootNodes(ast) {
  var realRootNodes = ast.program.body;
  if (realRootNodes.length > 1) {
    return realRootNodes;
  }
  try {
    // Try finding the function body from this case:
    //
    //   (function () {
    //     module.exports = { foo: 'foo' };
    //   }.call(this));
    //
    var callee = realRootNodes[0].expression.callee;

    if (callee.object) {
      return callee.object.body.body;
    }
    return callee.body.body;
  } catch (e) {
    // ignore
  }
  return realRootNodes;
}

function findExports(data, absolutePathToFile) {
  if (/\.json$/.test(absolutePathToFile)) {
    return {
      named: Object.keys(JSON.parse(data)),
      hasDefault: true
    };
  }
  var ast = (0, _parse2['default'])(data);
  var rootNodes = findRootNodes(ast);
  var aliasesForExports = findAliasesForExports(rootNodes);
  var definedNames = {};
  rootNodes.forEach(function (node) {
    findDefinedNames(node, definedNames);
  });
  var named = findNamedExports(rootNodes, {
    absolutePathToFile: absolutePathToFile,
    definedNames: definedNames,
    aliasesForExports: aliasesForExports
  });
  var hasDefault = hasDefaultExport(rootNodes) || aliasesForExports.size > 1;
  if (!hasDefault) {
    var rawExportedId = findRawDefaultExport(data);
    hasDefault = !!rawExportedId;
    if (!named.length) {
      named.push.apply(named, _toConsumableArray(definedNames[rawExportedId] || []));
    }
  }
  if (!named.length) {
    named.push.apply(named, _toConsumableArray(findRawNamedExports(data)));
  }
  return {
    named: named,
    hasDefault: hasDefault
  };
}
module.exports = exports['default'];