Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports['default'] = visitIdentifierNodes;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var KEYS_USED_FOR_ASSIGNMENT = new Set(['id', 'imported', 'local', 'params']);
var KEYS_USED_IN_REFERENCE_TO_OBJECTS = new Set(['property']);

function normalizeNode(node, _ref) {
  var key = _ref.key,
      definedInScope = _ref.definedInScope,
      parent = _ref.parent;

  if (!parent) {
    return undefined;
  }

  if (node.type === 'JSXIdentifier') {
    if (key !== 'name' && key !== 'object') {
      return undefined;
    }
    if (parent.type === 'JSXOpeningElement' || parent.type === 'JSXMemberExpression' && parent.parent.type === 'JSXOpeningElement') {
      return {
        name: node.name,
        isJSX: true,
        definedInScope: definedInScope
      };
    }
  }

  if (parent.type === 'GenericTypeAnnotation') {
    if (!node.name) {
      return undefined;
    }
    // flow
    return {
      name: node.name,
      definedInScope: definedInScope
    };
  }

  if (node.type !== 'Identifier') {
    return undefined;
  }

  var isAssignment = KEYS_USED_FOR_ASSIGNMENT.has(key) || key === 'key' && parent.parent.type === 'ObjectPattern';
  if (isAssignment) {
    definedInScope.add(node.name);
  }

  var isReference = KEYS_USED_IN_REFERENCE_TO_OBJECTS.has(key) || key === 'key' && parent.parent.type !== 'ObjectPattern';

  return {
    isReference: isReference,
    isAssignment: isAssignment,
    definedInScope: definedInScope,
    name: node.name
  };
}

function visitIdentifierNodes(rootAstNode, visitor) {
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { definedInScope: new Set([]), key: 'root' };

  var queue = [{ node: rootAstNode, context: context }];
  var current = void 0;

  var _loop = function _loop() {
    current = queue.shift();
    if (Array.isArray(current.node)) {
      if (current.context.key === 'body') {
        // A new scope has started. Copy whatever we have from the parent scope
        // into a new one.
        current.context.definedInScope = new Set([].concat(_toConsumableArray(current.context.definedInScope)));
      }
      // eslint-disable-next-line no-loop-func
      var _itemsToAdd = current.node.map(function (node) {
        return {
          node: node,
          context: current.context
        };
      });
      queue.unshift.apply(queue, _toConsumableArray(_itemsToAdd));
      return 'continue'; // eslint-disable-line no-continue
    }
    var normalizedNode = normalizeNode(current.node, current.context);
    if (normalizedNode) {
      visitor(normalizedNode);
    }

    var itemsToAdd = [];
    // eslint-disable-next-line no-loop-func
    Object.keys(current.node).forEach(function (key) {
      if (!current.node[key] || _typeof(current.node[key]) !== 'object') {
        return;
      }
      var newContext = Object.assign({}, current.context, {
        key: key,
        parent: {
          type: current.node.type,
          parent: current.context.parent
        }
      });
      var itemToPush = {
        node: current.node[key],
        context: newContext
      };
      if (key === 'body') {
        // Delay traversing function bodies, so that we can finish finding all
        // defined variables in scope first.
        queue.push(itemToPush);
      } else {
        itemsToAdd.push(itemToPush);
      }
    });
    queue.unshift.apply(queue, itemsToAdd);
  };

  while (queue.length) {
    var _ret = _loop();

    if (_ret === 'continue') continue;
  }
}
module.exports = exports['default'];