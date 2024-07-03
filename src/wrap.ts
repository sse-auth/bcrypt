import * as crypto from 'crypto';

/**
 * @license bcrypt.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/bcrypt.js for details
 */

declare global {
    interface Window {
        dcodeIO?: {
            bcrypt?: typeof bcrypt;
        };
    }
}

const bcrypt = (function() {
    "use strict";

    return {};
})();

if (typeof define === 'function' && (define as any).amd) {
    define([], () => bcrypt);
} else if (typeof module === 'object' && module.exports) {
    module.exports = bcrypt;
} else {
    (window.dcodeIO = window.dcodeIO || {}).bcrypt = bcrypt;
}

export default bcrypt;

