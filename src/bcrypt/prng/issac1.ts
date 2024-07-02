import { AccumulatorModule } from './accumulator'; // Assuming the accumulator module is in a separate file

/* isaac module pattern */
const isaac = (() => {
    /* internal states */
    let m: number[] = new Array(256); // internal memory
    let acc = 0;        // accumulator
    let brs = 0;        // last result
    let cnt = 0;        // counter
    let r: number[] = new Array(256); // result array
    let gnt = 0;        // generation counter
    let isd = false;    // initially seeded

    /* 32-bit integer safe adder */
    function add(x: number, y: number): number {
        const lsb = (x & 0xffff) + (y & 0xffff);
        const msb = (x >>> 16) + (y >>> 16) + (lsb >>> 16);
        return (msb << 16) | (lsb & 0xffff);
    }

    /* initialisation */
    function reset(): void {
        acc = brs = cnt = 0;
        for (let i = 0; i < 256; ++i)
            m[i] = r[i] = 0;
        gnt = 0;
    }

    /* seeding function */
    function seed(s?: number | number[]): void {
        let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number;

        /* seeding the seeds of love */
        a = b = c = d = e = f = g = h = 0x9e3779b9; /* the golden ratio */

        if (s && typeof s === 'number')
            s = [s];

        if (s instanceof Array) {
            reset();
            for (i = 0; i < s.length; ++i)
                r[i & 0xff] += typeof s[i] === 'number' ? s[i] : 0;
        }

        /* private: seed mixer */
        function seed_mix(): void {
            a ^= b << 11; d = add(d, a); b = add(b, c);
            b ^= c >>> 2; e = add(e, b); c = add(c, d);
            c ^= d << 8; f = add(f, c); d = add(d, e);
            d ^= e >>> 16; g = add(g, d); e = add(e, f);
            e ^= f << 10; h = add(h, e); f = add(f, g);
            f ^= g >>> 4; a = add(a, f); g = add(g, h);
            g ^= h << 8; b = add(b, g); h = add(h, a);
            h ^= a >>> 9; c = add(c, h); a = add(a, b);
        }

        for (i = 0; i < 4; i++) /* scramble it */
            seed_mix();

        for (i = 0; i < 256; i += 8) {
            if (s) /* use all the information in the seed */
                a = add(a, r[i + 0]), b = add(b, r[i + 1]),
                c = add(c, r[i + 2]), d = add(d, r[i + 3]),
                e = add(e, r[i + 4]), f = add(f, r[i + 5]),
                g = add(g, r[i + 6]), h = add(h, r[i + 7]);
            seed_mix();
            /* fill in m[] with messy stuff */
            m[i + 0] = a; m[i + 1] = b; m[i + 2] = c; m[i + 3] = d;
            m[i + 4] = e; m[i + 5] = f; m[i + 6] = g; m[i + 7] = h;
        }
        if (s)
            /* do a second pass to make all of the seed affect all of m[] */
            for (i = 0; i < 256; i += 8)
                a = add(a, m[i + 0]), b = add(b, m[i + 1]),
                c = add(c, m[i + 2]), d = add(d, m[i + 3]),
                e = add(e, m[i + 4]), f = add(f, m[i + 5]),
                g = add(g, m[i + 6]), h = add(h, m[i + 7]),
                seed_mix(),
                /* fill in m[] with messy stuff (again) */
                m[i + 0] = a, m[i + 1] = b, m[i + 2] = c, m[i + 3] = d,
                m[i + 4] = e, m[i + 5] = f, m[i + 6] = g, m[i + 7] = h;
        prng(); /* fill in the first set of results */
        gnt = 256;  /* prepare to use the first set of results */
    }

    /* isaac generator, n = number of run */
    function prng(n?: number): void {
        let i: number, x: number, y: number;
        n = n && typeof n === 'number' ? Math.abs(Math.floor(n)) : 1;
        while (n--) {
            cnt = add(cnt, 1);
            brs = add(brs, cnt);
            for (i = 0; i < 256; i++) {
                switch (i & 3) {
                    case 0: acc ^= acc << 13; break;
                    case 1: acc ^= acc >>> 6; break;
                    case 2: acc ^= acc << 2; break;
                    case 3: acc ^= acc >>> 16; break;
                }
                acc = add(m[(i + 128) & 0xff], acc); x = m[i];
                m[i] = y = add(m[(x >>> 2) & 0xff], add(acc, brs));
                r[i] = brs = add(m[(y >>> 10) & 0xff], x);
            }
        }
    }

    /* return a random number between */
    return (): number => {
        if (!isd) { // seed from accumulator
            isd = true;
            AccumulatorModule.stop();
            seed(AccumulatorModule.fetch());
        }
        if (!gnt--) {
            prng();
            gnt = 255;
        }
        return r[gnt];
    };
})();

export default isaac;


