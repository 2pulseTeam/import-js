Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findUndefinedIdentifiers;

var _visitIdentifierNodes = require('./visitIdentifierNodes');

var _visitIdentifierNodes2 = _interopRequireDefault(_visitIdentifierNodes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function findUndefinedIdentifiers(ast) {
  var globalVariables = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var result = new Set();
  (0, _visitIdentifierNodes2['default'])(ast.program, function (_ref) {
    var isReference = _ref.isReference,
        isJSX = _ref.isJSX,
        name = _ref.name,
        definedInScope = _ref.definedInScope;

    if (isJSX && !definedInScope.has('React')) {
      result.add('React'); // Implicit dependency
    }
    if (!isReference && !definedInScope.has(name)) {
      result.add(name);
    }
  }, {
    definedInScope: new Set(globalVariables)
  });
  return result;
}
module.exports = exports['default'];