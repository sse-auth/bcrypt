import { randomBytes } from 'crypto';


declare namespace bcrypt {
  export function setRandomFallback(random: (len: number) => number[]): void;
  export function genSaltSync(rounds?: number, seed_length?: number): string;
  export function genSalt(rounds?: number | ((err: Error | null, salt?: string) => void), seed_length?: number | ((err: Error | null, salt?: string) => void), callback?: (err: Error | null, salt?: string) => void): Promise<string>;
  export function hashSync(s: string, salt?: number | string): string;
  export function hash(s: string, salt?: number | string, callback?: (err: Error | null, hash?: string) => void, progressCallback?: (percentage: number) => void): Promise<string>;
  export function compareSync(s: string, hash: string): boolean;
  export function compare(s: string, hash: string, callback?: (err: Error | null, result?: boolean) => void, progressCallback?: (percentage: number) => void): Promise<boolean>;
  export function getRounds(hash: string): number;
  export function getSalt(hash: string): string;
  export function encodeBase64(b: number[], len: number): string;
  export function decodeBase64(s: string, len: number): number[];
}

let randomFallback: ((len: number) => number[]) | null = null;

function random(len: number): number[] {
  if (typeof module !== 'undefined' && module && module['exports']) {
    try {
      return randomBytes(len);
    } catch (e) {}
  }
  if (typeof self !== 'undefined' && (self['crypto'] || self['msCrypto'])) {
    try {
      const a = new Uint32Array(len);
      (self['crypto'] || self['msCrypto'])['getRandomValues'](a);
      return Array.prototype.slice.call(a);
    } catch (e) {}
  }
  if (!randomFallback) {
    throw Error("Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative");
  }
  return randomFallback(len);
}

let randomAvailable = false;
try {
  random(1);
  randomAvailable = true;
} catch (e) {}

randomFallback = function(len: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < len; ++i) {
    a[i] = ((0.5 + Math.random() * 2.3283064365386963e-10) * 256) | 0;
  }
  return a;
};

bcrypt.setRandomFallback = function(random: (len: number) => number[]): void {
  randomFallback = random;
};

bcrypt.genSaltSync = function(rounds?: number, seed_length?: number): string {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== 'number') {
    throw Error("Illegal arguments: " + (typeof rounds) + ", " + (typeof seed_length));
  }
  if (rounds < 4) {
    rounds = 4;
  } else if (rounds > 31) {
    rounds = 31;
  }
  const salt = [];
  salt.push("$2a$");
  if (rounds < 10) {
    salt.push("0");
  }
  salt.push(rounds.toString());
  salt.push('$');
  salt.push(base64_encode(random(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join('');
};

bcrypt.genSalt = function(rounds?: number | ((err: Error | null, salt?: string) => void), seed_length?: number | ((err: Error | null, salt?: string) => void), callback?: (err: Error | null, salt?: string) => void): Promise<string> {
  if (typeof seed_length === 'function') {
    callback = seed_length;
    seed_length = undefined;
  }
  if (typeof rounds === 'function') {
    callback = rounds;
    rounds = undefined;
  }
  if (typeof rounds === 'undefined') {
    rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  } else if (typeof rounds !== 'number') {
    throw Error("illegal arguments: " + (typeof rounds));
  }

  function _async(callback: (err: Error | null, salt?: string) => void): void {
    process.nextTick(function() {
      try {
        callback(null, bcrypt.genSaltSync(rounds));
      } catch (err) {
        callback(err);
      }
    });
  }

  if (callback) {
    if (typeof callback !== 'function') {
      throw Error("Illegal callback: " + typeof(callback));
    }
    _async(callback);
  } else {
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }
};

bcrypt.hashSync = function(s: string, salt?: number | string): string {
  if (typeof salt === 'undefined') {
    salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  }
  if (typeof salt === 'number') {
    salt = bcrypt.genSaltSync(salt);
  }
  if (typeof s !== 'string' || typeof salt !== 'string') {
    throw Error("Illegal arguments: " + (typeof s) + ', ' + (typeof salt));
  }
  return _hash(s, salt);
};

bcrypt.hash = function(s: string, salt?: number | string, callback?: (err: Error | null, hash?: string) => void, progressCallback?: (percentage: number) => void): Promise<string> {
  function _async(callback: (err: Error | null, hash?: string) => void): void {
    if (typeof s === 'string' && typeof salt === 'number') {
      bcrypt.genSalt(salt, function(err, salt) {
        _hash(s, salt, callback, progressCallback);
      });
    } else if (typeof s === 'string' && typeof salt === 'string') {
      _hash(s, salt, callback, progressCallback);
    } else {
      process.nextTick(callback.bind(this, Error("Illegal arguments: " + (typeof s) + ', ' + (typeof salt))));
    }
  }

  if (callback) {
    if (typeof callback !== 'function') {
      throw Error("Illegal callback: " + typeof(callback));
    }
    _async(callback);
  } else {
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }
};

function safeStringCompare(known: string, unknown: string): boolean {
  const diff = known.length ^ unknown.length;
  for (let i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}

bcrypt.compareSync = function(s: string, hash: string): boolean {
  if (typeof s !== "string" || typeof hash !== "string") {
    throw Error("Illegal arguments: " + (typeof s) + ', ' + (typeof hash));
  }
  if (hash.length !== 60) {
    return false;
  }
  return safeStringCompare(bcrypt.hashSync(s, hash.substr(0, hash.length - 31)), hash);
};

bcrypt.compare = function(s: string, hash: string, callback?: (err: Error | null, result?: boolean) => void, progressCallback?: (percentage: number) => void): Promise<boolean> {
  function _async(callback: (err: Error | null, result?: boolean) => void): void {
    if (typeof s !== "string" || typeof hash !== "string") {
      process.nextTick(callback.bind(this, Error("Illegal arguments: " + (typeof s) + ', ' + (typeof hash))));
      return;
    }
    if (hash.length !== 60) {
      process.nextTick(callback.bind(this, null, false));
      return;
    }
    bcrypt.hash(s, hash.substr(0, 29), function(err, comp) {
      if (err) {
        callback(err);
      } else {
        callback(null, safeStringCompare(comp, hash));
      }
    }, progressCallback);
  }

  if (callback) {
    if (typeof callback !== 'function') {
      throw Error("Illegal callback: " + typeof(callback));
    }
    _async(callback);
  } else {
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }
};

bcrypt.getRounds = function(hash: string): number {
  if (typeof hash !== "string") {
    throw Error("Illegal arguments: " + (typeof hash));
  }
  return parseInt(hash.split("$")[2], 10);
};

bcrypt.getSalt = function(hash: string): string {
  if (typeof hash !== 'string') {
    throw Error("Illegal arguments: " + (typeof hash));
  }
  if (hash.length !== 60) {
    throw Error("Illegal hash length: " + hash.length + " != 60");
  }
  return hash.substring(0, 29);
};

bcrypt.encodeBase64 = base64_encode;
bcrypt.decodeBase64 = base64_decode;

