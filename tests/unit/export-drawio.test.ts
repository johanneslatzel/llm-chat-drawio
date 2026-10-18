import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResultStatus, type ToolResult } from '@johannes.latzel/llm-chat';
import { AccessType, DirectoryConfiguration, Workspace } from '@johannes.latzel/llm-chat-workspace';
import * as fsp from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ExportDrawioTool } from '../../src/tools/export-drawio.js';
import { DrawioConfiguration } from '../../src/lib/config.js';
import { extractGraphModel } from '../../src/lib/parse.js';
import { renderDiagram } from '../../src/lib/render.js';
import { createTempDir, createTempFile, removeTempDir } from '../index.js';

vi.mock('node:fs/promises', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs/promises')>();
    return {
        ...mod,
        readFile: vi.fn(mod.readFile),
        writeFile: vi.fn(mod.writeFile),
        mkdir: vi.fn(mod.mkdir),
        stat: vi.fn(mod.stat),
    };
});

vi.mock('../../src/lib/parse.js', () => ({ extractGraphModel: vi.fn() }));
vi.mock('../../src/lib/render.js', () => ({ renderDiagram: vi.fn() }));

const mockParse = vi.mocked(extractGraphModel);
const mockRender = vi.mocked(renderDiagram);

describe('ExportDrawioTool', () => {
    let tmpDir: string;
    let ws: Workspace;
    let tool: ExportDrawioTool;

    beforeEach(() => {
        tmpDir = createTempDir();
        ws = new Workspace(new DirectoryConfiguration([{ type: AccessType.Write, path: tmpDir }]));
        tool = new ExportDrawioTool(ws, new DrawioConfiguration());
        vi.clearAllMocks();
        mockParse.mockReturnValue('<mxGraphModel/>');
        mockRender.mockResolvedValue({ data: Buffer.from('img'), width: 10, height: 20 });
    });

    afterEach(() => {
        removeTempDir(tmpDir);
    });

    async function call(args: Record<string, unknown>): Promise<ToolResult> {
        const [result] = (await tool.execute(args)) as [ToolResult];
        return result!;
    }

    it('exports with a default output path', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.status).toBe(ResultStatus.Success);
        expect(result.result).toContain('diagram.svg');
        expect(existsSync(path.join(tmpDir, 'diagram.svg'))).toBe(true);
    });

    it('exports to an explicit nested output path and passes the page through', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const result = await call({
            input: 'diagram.drawio',
            format: 'png',
            output: 'out/image.png',
            page: 1,
        });
        expect(result.status).toBe(ResultStatus.Success);
        expect(existsSync(path.join(tmpDir, 'out', 'image.png'))).toBe(true);
        expect(mockParse).toHaveBeenCalledWith(expect.any(String), 1);
    });

    it('accepts a page name', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const result = await call({ input: 'diagram.drawio', format: 'svg', page: 'Second' });
        expect(result.status).toBe(ResultStatus.Success);
        expect(mockParse).toHaveBeenCalledWith(expect.any(String), 'Second');
    });

    it('accepts a numeric page index passed as a string', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const result = await call({ input: 'diagram.drawio', format: 'svg', page: '1' });
        expect(result.status).toBe(ResultStatus.Success);
        expect(mockParse).toHaveBeenCalledWith(expect.any(String), 1);
    });

    it('rejects a missing input', async () => {
        expect(await call({ format: 'svg' })).toMatchObject({ status: ResultStatus.Error });
    });

    it('rejects a non-string input', async () => {
        const result = await call({ input: 42, format: 'svg' });
        expect(result.result).toContain('input must be');
    });

    it('rejects a blank input', async () => {
        const result = await call({ input: '   ', format: 'svg' });
        expect(result.result).toContain('input must be');
    });

    it('defaults to svg when format is omitted', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const result = await call({ input: 'diagram.drawio' });
        expect(result.status).toBe(ResultStatus.Success);
        expect(result.result).toContain('diagram.svg');
        expect(existsSync(path.join(tmpDir, 'diagram.svg'))).toBe(true);
        expect(mockRender).toHaveBeenCalledWith(expect.any(String), { format: 'svg', scale: 1 });
    });

    it('defaults to the first configured format when svg is disabled', async () => {
        const pngTool = new ExportDrawioTool(ws, new DrawioConfiguration({ formats: ['png'] }));
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const [result] = (await pngTool.execute({ input: 'diagram.drawio' })) as [ToolResult];
        expect(result!.status).toBe(ResultStatus.Success);
        expect(result!.result).toContain('diagram.png');
        expect(existsSync(path.join(tmpDir, 'diagram.png'))).toBe(true);
    });

    it('rejects a non-string format', async () => {
        const result = await call({ input: 'a.drawio', format: 42 });
        expect(result.result).toContain('format must be one of');
    });

    it('rejects a disallowed format', async () => {
        const result = await call({ input: 'a.drawio', format: 'gif' });
        expect(result.result).toContain('format must be one of');
    });

    it('rejects a blank output', async () => {
        const result = await call({ input: 'a.drawio', format: 'svg', output: '   ' });
        expect(result.result).toContain('output must be');
    });

    it('rejects a non-string output', async () => {
        const result = await call({ input: 'a.drawio', format: 'svg', output: 42 });
        expect(result.result).toContain('output must be');
    });

    it('rejects a non-number/string page', async () => {
        const result = await call({ input: 'a.drawio', format: 'svg', page: true });
        expect(result.result).toContain('page must be');
    });

    it('rejects an input outside the workspace', async () => {
        const result = await call({ input: '/etc/passwd', format: 'svg' });
        expect(result.result).toContain('Invalid or inaccessible');
    });

    it('rejects an input with an unsupported extension', async () => {
        const result = await call({ input: 'notes.txt', format: 'svg' });
        expect(result.result).toContain('must be a .drawio or .xml');
    });

    it('rejects an output outside the writable directories', async () => {
        const readDir = createTempDir();
        const readOnlyWs = new Workspace(
            new DirectoryConfiguration([
                { type: AccessType.Write, path: tmpDir },
                { type: AccessType.Read, path: readDir },
            ]),
        );
        const scopedTool = new ExportDrawioTool(readOnlyWs, new DrawioConfiguration());
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        const [result] = (await scopedTool.execute({
            input: 'diagram.drawio',
            format: 'svg',
            output: path.join(readDir, 'out.svg'),
        })) as [ToolResult];
        expect(result!.result).toContain('must be within writable');
        removeTempDir(readDir);
    });

    it('rejects an output whose extension does not match the format', async () => {
        const result = await call({ input: 'a.drawio', format: 'svg', output: 'a.png' });
        expect(result.result).toContain('output extension must be .svg');
    });

    it('rejects an input that is not a file', async () => {
        mkdirSync(path.join(tmpDir, 'dir.drawio'));
        const result = await call({ input: 'dir.drawio', format: 'svg' });
        expect(result.result).toContain('not a file');
    });

    it('reports a read error', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        vi.mocked(fsp.readFile).mockRejectedValueOnce(new Error('denied'));
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.result).toContain('Error reading input');
    });

    it('reports a parse or render error', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        mockParse.mockImplementationOnce(() => {
            throw new Error('bad diagram');
        });
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.result).toContain('bad diagram');
    });

    it('reports a render error', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        mockRender.mockRejectedValueOnce(new Error('render failed'));
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.result).toContain('render failed');
    });

    it('reports a mkdir error', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        vi.mocked(fsp.mkdir).mockRejectedValueOnce(new Error('mkdir failed'));
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.result).toContain('Error writing output');
    });

    it('reports a write error', async () => {
        createTempFile(tmpDir, 'diagram.drawio', '<mxfile/>');
        vi.mocked(fsp.writeFile).mockRejectedValueOnce(new Error('write failed'));
        const result = await call({ input: 'diagram.drawio', format: 'svg' });
        expect(result.result).toContain('Error writing output');
    });
});
