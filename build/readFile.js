Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = readFile;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function readFile(pathToFile) {
  if (!pathToFile.startsWith('/')) {
    return Promise.reject(new Error('File path not absolue: ' + String(pathToFile)));
  }
  return new Promise(function (resolve, reject) {
    _fs2['default'].readFile(pathToFile, 'utf-8', function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}
module.exports = exports['default'];