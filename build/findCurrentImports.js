Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findCurrentImports;

var _Configuration = require('./Configuration');

var _Configuration2 = _interopRequireDefault(_Configuration);

var _ImportStatement = require('./ImportStatement');

var _ImportStatement2 = _interopRequireDefault(_ImportStatement);

var _ImportStatements = require('./ImportStatements');

var _ImportStatements2 = _interopRequireDefault(_ImportStatements);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function convertToImportStatement(node) {
  if (node.type === 'ImportDeclaration') {
    var defaultSpecifier = node.specifiers.find(function (spec) {
      return spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier';
    });

    return new _ImportStatement2['default']({
      declarationKeyword: 'import',
      defaultImport: defaultSpecifier ? defaultSpecifier.local.name : undefined,
      hasSideEffects: node.specifiers.length === 0,
      namedImports: node.specifiers.map(function (spec) {
        if (spec.type !== 'ImportSpecifier') {
          return undefined;
        }
        return spec.local.name;
      }).filter(Boolean),
      path: node.source.value
    });
  }

  if (node.type === 'ExpressionStatement') {
    if (!node.expression.callee) {
      return undefined;
    }
    if (node.expression.callee.name !== 'require') {
      return undefined;
    }

    if (node.expression.arguments.length !== 1) {
      return undefined;
    }

    return new _ImportStatement2['default']({
      hasSideEffects: true,
      importFunction: 'require',
      path: node.expression.arguments[0].value
    });
  }

  if (node.type === 'VariableDeclaration') {
    if (!node.declarations || node.declarations.length > 1) {
      return undefined;
    }

    var declaration = node.declarations[0];
    if (!declaration.init) {
      // e.g. `let foo;`
      return undefined;
    }
    if (declaration.init.type !== 'CallExpression') {
      return undefined;
    }

    if (declaration.init.arguments.length !== 1) {
      return undefined;
    }

    if (declaration.init.arguments[0].type !== 'StringLiteral') {
      return undefined;
    }

    var defaultImport = declaration.id.type === 'Identifier' ? declaration.id.name : undefined;

    var namedImports = declaration.id.type === 'ObjectPattern' ? declaration.id.properties.map(function (p) {
      return p.value.name;
    }) : undefined;

    return new _ImportStatement2['default']({
      declarationKeyword: node.kind,
      defaultImport: defaultImport,
      hasSideEffects: false,
      importFunction: declaration.init.callee.name,
      namedImports: namedImports,
      path: declaration.init.arguments[0].value
    });
  }
  return undefined;
}

function findCurrentImports(config, currentFileContent, ast) {
  var result = {
    imports: new _ImportStatements2['default'](config),
    range: {
      start: ast.program.loc.end.line - 1,
      end: 0
    }
  };

  var done = false;
  ast.program.body.forEach(function (node) {
    if (done) {
      return;
    }
    result.range.start = Math.min(result.range.start, node.loc.start.line - 1);

    var importStatement = convertToImportStatement(node);
    if (!importStatement) {
      // We've reached the end of the imports block
      done = true;
      return;
    }

    importStatement.originalImportString = currentFileContent.slice(node.start, node.end);
    result.imports.push(importStatement);
    result.range.end = node.loc.end.line;
  });

  if (!result.range.end) {
    result.range.end = result.range.start;
  }
  return result;
}
module.exports = exports['default'];