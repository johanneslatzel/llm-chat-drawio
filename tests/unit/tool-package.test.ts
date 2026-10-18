import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AccessType, DirectoryConfiguration, Workspace } from '@johannes.latzel/llm-chat-workspace';
import { DrawioToolPackage } from '../../src/packages/tool-package.js';
import { ExportDrawioTool } from '../../src/tools/export-drawio.js';
import { DrawioConfiguration } from '../../src/lib/config.js';
import { createTempDir, removeTempDir } from '../index.js';

describe('DrawioToolPackage', () => {
    let tmpDir: string;
    let ws: Workspace;

    beforeEach(() => {
        tmpDir = createTempDir();
        ws = new Workspace(new DirectoryConfiguration([{ type: AccessType.Write, path: tmpDir }]));
    });

    afterEach(() => {
        removeTempDir(tmpDir);
    });

    it('bundles the export tool', () => {
        const pkg = new DrawioToolPackage(ws);
        const tools = pkg.tools();
        expect(tools).toHaveLength(1);
        expect(tools[0]).toBeInstanceOf(ExportDrawioTool);
        expect(tools[0]?.name).toBe('export_drawio');
    });

    it('accepts a custom configuration', () => {
        const pkg = new DrawioToolPackage(ws, new DrawioConfiguration({ formats: ['png'] }));
        expect(pkg.tools()[0]).toBeInstanceOf(ExportDrawioTool);
    });

    it('has no tutorial', () => {
        const pkg = new DrawioToolPackage(ws);
        expect(pkg.tutorial()).toBeNull();
    });
});
