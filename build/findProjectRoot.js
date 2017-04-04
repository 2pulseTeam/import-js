Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findProjectRoot;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var NODE_MODULES_PATTERN = /\/node_modules$/;

function findRecursive(directory) {
  if (directory === '/') {
    throw new Error('No project root found');
  }
  var pathToPackageJson = _path2['default'].join(directory, 'package.json');
  var pathToNodeModulesFolder = _path2['default'].join(directory, 'node_modules');
  var isPackageDependency = NODE_MODULES_PATTERN.test(_path2['default'].dirname(directory));
  if (_fs2['default'].existsSync(pathToPackageJson) && (_fs2['default'].existsSync(pathToNodeModulesFolder) || isPackageDependency)) {
    return directory;
  }
  return findRecursive(_path2['default'].dirname(directory));
}

function makeAbsolute(pathToFile) {
  if (pathToFile.startsWith('/')) {
    return pathToFile;
  }
  return _path2['default'].join(process.cwd(), pathToFile);
}

function findProjectRoot(pathToFile) {
  return findRecursive(_path2['default'].dirname(makeAbsolute(pathToFile)));
}
module.exports = exports['default'];