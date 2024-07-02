/** Calculates the byte length of a string encoded as UTF8. */
function utf8Length(string: string): number {
    let len = 0;
    let c = 0;
    for (let i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if (
            (c & 0xFC00) === 0xD800 &&
            (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00
        ) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
}

/** Converts a string to an array of UTF8 bytes. */
function utf8Array(string: string): number[] {
    let offset = 0;
    let c1: number, c2: number;
    const buffer = new Array(utf8Length(string));
    for (let i = 0, k = string.length; i < k; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6 | 192;
            buffer[offset++] = c1 & 63 | 128;
        } else if (
            (c1 & 0xFC00) === 0xD800 &&
            ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00
        ) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18 | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6 & 63 | 128;
            buffer[offset++] = c1 & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12 | 224;
            buffer[offset++] = c1 >> 6 & 63 | 128;
            buffer[offset++] = c1 & 63 | 128;
        }
    }
    return buffer;
}

