// Temporary instrumentation to catch negative arguments passed to String.prototype.repeat.
// Remove this file once the underlying bug is fixed.
const originalRepeat = String.prototype.repeat;
String.prototype.repeat = function patchedRepeat(count) {
  if (typeof count === 'number' && count < 0) {
    const error = new Error(`String.repeat called with count=${count}`);
    // eslint-disable-next-line no-console
    console.error('\n[String.repeat] Negative repeat detected');
    // eslint-disable-next-line no-console
    console.error('Input string preview:', String(this).slice(0, 40));
    // eslint-disable-next-line no-console
    console.error(error.stack);
  }
  return originalRepeat.call(this, count);
};

try {
  // Clamp invalid code-frame columns so errors can still render.
  const codeFrame = require('next/dist/compiled/babel/code-frame');
  const originalCodeFrameColumns = codeFrame.codeFrameColumns;
  codeFrame.codeFrameColumns = function safeCodeFrameColumns(source, loc, options) {
    const patchedLoc = { ...loc };
    if (patchedLoc.start) {
      patchedLoc.start = {
        ...patchedLoc.start,
        column: Math.max(patchedLoc.start.column ?? 1, 1),
        line: Math.max(patchedLoc.start.line ?? 1, 1),
      };
    }
    if (patchedLoc.end) {
      patchedLoc.end = {
        ...patchedLoc.end,
        column: Math.max(patchedLoc.end.column ?? 1, 1),
        line: Math.max(patchedLoc.end.line ?? 1, 1),
      };
    }
    return originalCodeFrameColumns.call(this, source, patchedLoc, options);
  };
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn('[debug-repeat] Unable to patch babel code-frame:', error?.message || error);
}
