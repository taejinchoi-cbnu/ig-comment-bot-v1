/**
 * Resolve emitted relative .js imports to TypeScript only if the original is missing.
 * Real JavaScript (including dependency files) always takes precedence.
 * @param {string} request
 * @param {{ defaultResolver: (request: string, options: object) => string }} options
 * @returns {string}
 */
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (originalError) {
    if (request.startsWith('.') && request.endsWith('.js')) {
      try { return options.defaultResolver(request.slice(0, -3) + '.ts', options); }
      catch { /* Keep the original resolution error. */ }
    }
    throw originalError;
  }
};
