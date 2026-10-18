import { describe, it, expect } from 'vitest';
import { DrawioConfiguration, SUPPORTED_DRAWIO_FORMATS } from '../../src/lib/config.js';

describe('DrawioConfiguration', () => {
    it('defaults to every supported format and scale 1', () => {
        const config = new DrawioConfiguration();
        expect(config.formats).toEqual(Object.values(SUPPORTED_DRAWIO_FORMATS));
        expect(config.scale).toBe(1);
    });

    it('keeps only supported formats from the requested list', () => {
        const config = new DrawioConfiguration({ formats: ['png', 'gif', 'svg'] });
        expect(config.formats).toEqual(['png', 'svg']);
    });

    it('falls back to all formats when none requested are supported', () => {
        const config = new DrawioConfiguration({ formats: ['gif', 'webp'] });
        expect(config.formats).toEqual(Object.values(SUPPORTED_DRAWIO_FORMATS));
    });

    it('uses a positive scale', () => {
        expect(new DrawioConfiguration({ scale: 2 }).scale).toBe(2);
    });

    it('falls back to scale 1 for a non-positive scale', () => {
        expect(new DrawioConfiguration({ scale: 0 }).scale).toBe(1);
        expect(new DrawioConfiguration({ scale: -3 }).scale).toBe(1);
    });

    it('reports whether a format is enabled', () => {
        const config = new DrawioConfiguration();
        expect(config.allows('svg')).toBe(true);
        expect(config.allows('gif')).toBe(false);
    });
});
