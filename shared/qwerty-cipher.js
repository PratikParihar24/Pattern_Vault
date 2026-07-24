/*
 * QWERTY cipher contract shared by the browser and Node.js server.
 * Keep all pattern derivation rules in this file.
 */
(function exposeQwertyCipher(root, factory) {
    const cipher = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = cipher;
    }

    root.QwertyCipher = cipher;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createQwertyCipher() {
    'use strict';

    const PATTERN_LENGTH = 5;
    const FALLBACK_LETTERS = 'abcde';
    const map = Object.freeze({
        q: 'A', w: 'A', e: 'A', r: 'A', t: 'A',
        y: 'B', u: 'B', i: 'B', o: 'B', p: 'B',
        a: 'C', s: 'C', d: 'C', f: 'C', g: 'C', z: 'C', x: 'C', c: 'C', v: 'C',
        h: 'D', j: 'D', k: 'D', l: 'D', b: 'D', n: 'D', m: 'D'
    });

    function getCleanLetters(value) {
        let letters = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!letters) letters = FALLBACK_LETTERS;

        while (letters.length < PATTERN_LENGTH) {
            letters += letters;
        }

        return letters.slice(0, PATTERN_LENGTH);
    }

    function getPattern(value) {
        return getCleanLetters(value).split('').map((character) => map[character]);
    }

    function isValidPattern(pattern) {
        return Array.isArray(pattern)
            && pattern.length === PATTERN_LENGTH
            && pattern.every((value) => typeof value === 'string' && /^[A-D]$/.test(value));
    }

    return Object.freeze({
        PATTERN_LENGTH,
        map,
        getCleanLetters,
        getPattern,
        isValidPattern
    });
}));
