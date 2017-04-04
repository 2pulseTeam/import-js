Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = requireResolve;


/**
 * Thin wrapper around `require.resolve()` to avoid errors thrown, and to make
 * it easier to mock in tests.
 */
function requireResolve(absolutePath) {
  if (!absolutePath.startsWith('/')) {
    throw new Error('Path must be absolute: ' + String(absolutePath));
  }
  try {
    return require.resolve(absolutePath);
  } catch (e) {
    if (/^Cannot find module/.test(e.message)) {
      return absolutePath;
    }
    throw e;
  }
}
module.exports = exports['default'];