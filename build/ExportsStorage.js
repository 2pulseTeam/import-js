Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sqlite = require('sqlite3');

var _sqlite2 = _interopRequireDefault(_sqlite);

var _lastUpdate = require('./lastUpdate');

var _lastUpdate2 = _interopRequireDefault(_lastUpdate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAX_CHUNK_SIZE = 100;

function normalizedExportName(string) {
  return string.toLowerCase().replace(/[-_.]/g, '');
}

function inParam(sql, values) {
  // https://github.com/mapbox/node-sqlite3/issues/721
  return sql.replace('?#', values.map(function () {
    return '?';
  }).join(','));
}

function arrayToChunks(array, chunkSize) {
  var chunks = [];
  for (var i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

var ExportsStorage = function () {
  function ExportsStorage() {
    _classCallCheck(this, ExportsStorage);
  }

  _createClass(ExportsStorage, [{
    key: 'init',
    value: function () {
      function init(dbFilename) {
        var _this = this;

        return new Promise(function (resolve, reject) {
          _this.db = new _sqlite2['default'].Database(dbFilename);
          _this.db.all('PRAGMA table_info(exports)', function (pragmaErr, result) {
            if (pragmaErr) {
              reject(pragmaErr);
              return;
            }
            if (result.length) {
              // DB has already been initialized
              resolve({ isFreshInstall: false });
              return;
            }
            _this.db.run('\n            CREATE TABLE exports (\n              name VARCHAR(100),\n              isDefault INTEGER,\n              path TEXT\n            )\n          ', function (err) {
              if (err) {
                reject(err);
                return;
              }

              _this.db.run('\n                CREATE TABLE mtimes (\n                  path TEXT,\n                  mtime NUMERIC\n                )\n              ', function (err) {
                if (err) {
                  reject(err);
                  return;
                }

                resolve({ isFreshInstall: true });
              });
            });
          });
        });
      }

      return init;
    }()
  }, {
    key: 'close',
    value: function () {
      function close() {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
          _this2.db.close(function (err) {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      }

      return close;
    }()
  }, {
    key: 'needsUpdate',
    value: function () {
      function needsUpdate(files) {
        var _this3 = this;

        if (files.length > MAX_CHUNK_SIZE) {
          // sqlite has a max number for arguments passed. We need to execute in
          // chunks if we exceed the max.
          var promises = arrayToChunks(files, MAX_CHUNK_SIZE).map(function (chunk) {
            return _this3.needsUpdate(chunk);
          });
          return Promise.all(promises).then(function (chunks) {
            return chunks.reduce(function (a, b) {
              return a.concat(b);
            });
          }); // flatten
        }

        return new Promise(function (resolve, reject) {
          var filePaths = files.map(function (_ref) {
            var p = _ref.path;
            return p;
          });
          _this3.db.all(inParam('\n            SELECT path, mtime FROM mtimes\n            WHERE (path IN (?#))\n          ', filePaths), filePaths, function (err, items) {
            if (err) {
              reject(err);
              return;
            }
            var mtimes = {};
            items.forEach(function (_ref2) {
              var pathToFile = _ref2.path,
                  mtime = _ref2.mtime;

              mtimes[pathToFile] = mtime;
            });
            var filtered = files.filter(function (_ref3) {
              var pathToFile = _ref3.path,
                  mtime = _ref3.mtime;
              return mtime !== mtimes[pathToFile];
            });
            resolve(filtered);
          });
        });
      }

      return needsUpdate;
    }()
  }, {
    key: 'allFiles',
    value: function () {
      function allFiles() {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          _this4.db.all('SELECT path FROM mtimes', function (err, files) {
            if (err) {
              reject(err);
              return;
            }
            resolve(files.map(function (_ref4) {
              var path = _ref4.path;
              return path;
            }));
          });
        });
      }

      return allFiles;
    }()
  }, {
    key: 'updateMtime',
    value: function () {
      function updateMtime(pathToFile, mtime) {
        var _this5 = this;

        return new Promise(function (resolve, reject) {
          _this5.db.get('SELECT mtime FROM mtimes WHERE (path = ?)', pathToFile, function (err, item) {
            if (err) {
              reject(err);
              return;
            }
            if (item) {
              _this5.db.run('UPDATE mtimes SET mtime = ? WHERE (path = ?)', mtime, pathToFile, function (err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              });
            } else {
              _this5.db.run('INSERT INTO mtimes (mtime, path) VALUES (?, ?)', mtime, pathToFile, function (err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              });
            }
          });
        });
      }

      return updateMtime;
    }()
  }, {
    key: '_insert',
    value: function () {
      function _insert(_ref5) {
        var _this6 = this;

        var name = _ref5.name,
            pathToFile = _ref5.pathToFile,
            isDefault = _ref5.isDefault;

        var exportName = isDefault ? normalizedExportName(name) : name;
        return new Promise(function (resolve, reject) {
          _this6.db.run('INSERT INTO exports (name, path, isDefault) VALUES (?, ?, ?)', exportName, pathToFile, isDefault, function (err) {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      }

      return _insert;
    }()
  }, {
    key: 'update',
    value: function () {
      function update(_ref6) {
        var _this7 = this;

        var names = _ref6.names,
            defaultNames = _ref6.defaultNames,
            pathToFile = _ref6.pathToFile,
            mtime = _ref6.mtime;

        return this.remove(pathToFile).then(function () {
          return _this7.updateMtime(pathToFile, mtime).then(function () {
            var promises = names.map(function (name) {
              return _this7._insert({ name: name, pathToFile: pathToFile, isDefault: false });
            });
            promises.push.apply(promises, _toConsumableArray(defaultNames.map(function (name) {
              return _this7._insert({ name: name, pathToFile: pathToFile, isDefault: true });
            })));
            return Promise.all(promises);
          });
        });
      }

      return update;
    }()
  }, {
    key: '_remove',
    value: function () {
      function _remove(pattern) {
        var _this8 = this;

        var operator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '=';

        return new Promise(function (resolve, reject) {
          _this8.db.run('DELETE FROM exports WHERE (path ' + String(operator) + ' ?)', pattern, function (err) {
            if (err) {
              reject(err);
              return;
            }
            _this8.db.run('DELETE FROM mtimes WHERE (path ' + String(operator) + ' ?)', pattern, function (mErr) {
              if (mErr) {
                reject(mErr);
                return;
              }
              resolve();
            });
          });
        });
      }

      return _remove;
    }()
  }, {
    key: 'remove',
    value: function () {
      function remove(pathToFile) {
        return this._remove(pathToFile);
      }

      return remove;
    }()
  }, {
    key: 'removeAll',
    value: function () {
      function removeAll(globPattern) {
        return this._remove(globPattern, 'GLOB');
      }

      return removeAll;
    }()
  }, {
    key: 'purgeDeadNodeModules',
    value: function () {
      function purgeDeadNodeModules(workingDirectory) {
        var _this9 = this;

        return new Promise(function (resolve, reject) {
          _this9.db.all('SELECT path FROM mtimes WHERE (path LIKE "./node_modules/%")', function (err, files) {
            if (err) {
              reject(err);
              return;
            }
            var promises = files.map(function (_ref7) {
              var pathToFile = _ref7.path;
              return new Promise(function (removeResolve) {
                (0, _lastUpdate2['default'])(pathToFile, workingDirectory).then(removeResolve)['catch'](function () {
                  return _this9.remove(pathToFile).then(removeResolve);
                });
              });
            });
            Promise.all(promises).then(resolve)['catch'](reject);
          });
        });
      }

      return purgeDeadNodeModules;
    }()
  }, {
    key: 'get',
    value: function () {
      function get(variableName) {
        var _this10 = this;

        return new Promise(function (resolve, reject) {
          _this10.db.all('\n          SELECT name, path, isDefault\n          FROM exports WHERE (\n            (name = ? AND isDefault = 0) OR\n            (name = ? AND isDefault = 1)\n          )\n        ', variableName, normalizedExportName(variableName), function (err, rows) {
            if (err) {
              reject(err);
              return;
            }
            resolve(rows.map(function (_ref8) {
              var name = _ref8.name,
                  path = _ref8.path,
                  isDefault = _ref8.isDefault;
              return {
                name: name,
                path: path,
                isDefault: !!isDefault
              };
            }));
          });
        });
      }

      return get;
    }()
  }]);

  return ExportsStorage;
}();

exports['default'] = ExportsStorage;
module.exports = exports['default'];