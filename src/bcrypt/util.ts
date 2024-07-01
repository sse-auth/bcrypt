/**
 * Continues with the callback on the next tick.
 * @function
 * @param {(...args: any[]) => void} callback Callback to execute
 * @inner
 */
let nextTick: (callback: (...args: any[]) => void) => void =
  typeof process !== 'undefined' && process && typeof process.nextTick === 'function'
    ? (typeof setImmediate === 'function' ? setImmediate : process.nextTick)
    : setTimeout;

//? include("util/utf8.ts");


/**
 * Converts a JavaScript string to UTF8 bytes.
 * @function
 * @param {string} str String
 * @returns {Uint8Array} UTF8 bytes
 * @inner
 */
let stringToBytes: (str: string) => Uint8Array;


//? include("util/base64.ts");


Date.now = Date.now || function() { return +new Date; };