import { describe, it, expect } from 'vitest';
import { deflateRaw } from 'pako';
import { extractGraphModel, listDrawioPages } from '../../src/lib/parse.js';

const MODEL =
    '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

function compress(xml: string, uriEncode = false): string {
    const base64 = Buffer.from(deflateRaw(xml)).toString('base64');
    return uriEncode ? encodeURIComponent(base64) : base64;
}

function mxfile(diagrams: { name?: string; content: string }[]): string {
    const inner = diagrams
        .map(
            (d) =>
                `<diagram${d.name === undefined ? '' : ` name="${d.name}"`} id="x">${d.content}</diagram>`,
        )
        .join('');
    return `<mxfile host="app.diagrams.net">${inner}</mxfile>`;
}

describe('listDrawioPages', () => {
    it('lists named and unnamed pages in order', () => {
        const content = mxfile([{ name: 'First', content: MODEL }, { content: MODEL }]);
        expect(listDrawioPages(content)).toEqual([
            { index: 0, name: 'First' },
            { index: 1, name: 'Page-2' },
        ]);
    });

    it('throws when there is no diagram element', () => {
        expect(() => listDrawioPages('<mxfile></mxfile>')).toThrow('no <diagram> element');
    });
});

describe('extractGraphModel', () => {
    it('returns an uncompressed first page by default', () => {
        expect(extractGraphModel(mxfile([{ content: `  ${MODEL}  ` }]))).toBe(MODEL);
    });

    it('selects a page by zero-based index', () => {
        const content = mxfile([{ content: MODEL }, { content: `${MODEL}<!--two-->` }]);
        expect(extractGraphModel(content, 1)).toBe(`${MODEL}<!--two-->`);
    });

    it('selects a page by name', () => {
        const content = mxfile([
            { name: 'A', content: MODEL },
            { name: 'B', content: `${MODEL}<!--b-->` },
        ]);
        expect(extractGraphModel(content, 'B')).toBe(`${MODEL}<!--b-->`);
    });

    it('decompresses a base64 raw-deflate page', () => {
        const content = mxfile([{ content: compress(MODEL) }]);
        expect(extractGraphModel(content)).toBe(MODEL);
    });

    it('decompresses a URI-encoded compressed page', () => {
        const content = mxfile([{ content: compress(MODEL, true) }]);
        expect(extractGraphModel(content)).toBe(MODEL);
    });

    it('throws for an out-of-range index', () => {
        const content = mxfile([{ content: MODEL }]);
        expect(() => extractGraphModel(content, 5)).toThrow('out of range');
    });

    it('throws for a non-integer index', () => {
        const content = mxfile([{ content: MODEL }]);
        expect(() => extractGraphModel(content, 1.5)).toThrow('out of range');
    });

    it('throws for a negative index', () => {
        const content = mxfile([{ content: MODEL }]);
        expect(() => extractGraphModel(content, -1)).toThrow('out of range');
    });

    it('throws for an unknown page name', () => {
        const content = mxfile([{ name: 'A', content: MODEL }]);
        expect(() => extractGraphModel(content, 'Missing')).toThrow("Unknown page 'Missing'");
    });

    it('throws for an empty page', () => {
        const content = mxfile([{ content: '   ' }]);
        expect(() => extractGraphModel(content)).toThrow('empty');
    });

    it('throws when a page cannot be decompressed', () => {
        // Malformed percent sequence forces the decodeURIComponent fallback,
        // and the remaining text is not valid raw-deflate data.
        const content = mxfile([{ content: '%E0%A4%A' }]);
        expect(() => extractGraphModel(content)).toThrow('Failed to decompress');
    });
});
