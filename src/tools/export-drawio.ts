import {
    PartialToolResult,
    ResultStatus,
    Tool,
    ToolParameterProperty,
    ToolParameters,
} from '@johannes.latzel/llm-chat';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { Workspace } from '@johannes.latzel/llm-chat-workspace';
import { DrawioConfiguration, SUPPORTED_DRAWIO_FORMATS, type DrawioFormat } from '../lib/config.js';
import { extractGraphModel, type DrawioPageSelector } from '../lib/parse.js';
import { renderDiagram } from '../lib/render.js';

const INPUT_EXTENSIONS = ['.drawio', '.xml'];

/** Matches a page argument that is an unsigned integer, i.e. a page index. */
const PAGE_INDEX_PATTERN = /^\d+$/;

/**
 * Default export format for a call that omits `format`: `svg` when it is
 * enabled, otherwise the first configured format.
 *
 * @param config - The active export configuration.
 */
function defaultFormat(config: DrawioConfiguration): DrawioFormat {
    // The constructor never leaves `formats` empty, so index 0 is always defined.
    return config.allows(SUPPORTED_DRAWIO_FORMATS.Svg)
        ? SUPPORTED_DRAWIO_FORMATS.Svg
        : (config.formats[0] as DrawioFormat);
}

/**
 * Tool that exports a `.drawio`/`.xml` diagram to an image, within the allowed
 * workspace directories.
 *
 * The input is read and the output is written through the shared
 * {@link Workspace}, so both paths are confined to the configured read/write
 * access lists. Rendering is headless and in-process.
 */
export class ExportDrawioTool extends Tool {
    private readonly ws: Workspace;
    private readonly config: DrawioConfiguration;

    /**
     * @param workspace - Workspace for path resolution and access checks.
     * @param config - Export configuration (format allowlist and raster scale).
     */
    constructor(workspace: Workspace, config: DrawioConfiguration = new DrawioConfiguration()) {
        super(
            'export_drawio',
            'Exports a .drawio/.xml diagram file to an image. The input path is read and the ' +
                'output path is written, both relative to the workspace root. Format is chosen ' +
                `from ${config.formats.join('/')} and defaults to ${defaultFormat(config)}; ` +
                'output defaults to the input path with the format extension.',
            new ToolParameters(
                {
                    input: ToolParameterProperty.string(
                        'Path to the .drawio or .xml file (absolute, or relative to workspace root)',
                    ),
                    format: ToolParameterProperty.string(
                        `Output format, one of: ${config.formats.join(', ')} ` +
                            `(default: ${defaultFormat(config)})`,
                    ),
                    output: ToolParameterProperty.string(
                        'Output image path (absolute, or relative to workspace root). Defaults ' +
                            'to the input path with the format extension.',
                    ),
                    page: ToolParameterProperty.string(
                        'Page to export: zero-based index or page name (default: first page)',
                    ),
                },
                ['input'],
            ),
        );
        this.ws = workspace;
        this.config = config;
    }

    protected async onExecute(args: Record<string, unknown>): Promise<PartialToolResult> {
        const input = args.input;
        if (typeof input !== 'string' || !input.trim()) {
            return { result: 'input must be a non-empty string.', status: ResultStatus.Error };
        }
        const format = args.format === undefined ? defaultFormat(this.config) : args.format;
        if (typeof format !== 'string' || !this.config.allows(format)) {
            return {
                result: `format must be one of: ${this.config.formats.join(', ')}.`,
                status: ResultStatus.Error,
            };
        }

        let output: string;
        if (args.output === undefined) {
            output = `${input.trim().replace(/\.[^./\\]+$/, '')}.${format}`;
        } else if (typeof args.output === 'string' && args.output.trim()) {
            output = args.output.trim();
        } else {
            return {
                result: 'output must be a non-empty string when provided.',
                status: ResultStatus.Error,
            };
        }

        let page: DrawioPageSelector | undefined;
        if (args.page !== undefined) {
            const value = args.page;
            if (typeof value === 'number') {
                page = value;
            } else if (typeof value === 'string') {
                const selector = value.trim();
                page = PAGE_INDEX_PATTERN.test(selector) ? Number(selector) : selector;
            } else {
                return {
                    result: 'page must be a number or a string.',
                    status: ResultStatus.Error,
                };
            }
        }

        const resolvedInput = this.ws.normalize(input.trim());
        if (!this.ws.canRead(resolvedInput)) {
            return {
                result: `Invalid or inaccessible path${this.ws.pathHint(input.trim(), resolvedInput)}`,
                status: ResultStatus.Error,
            };
        }
        if (!INPUT_EXTENSIONS.includes(path.extname(resolvedInput).toLowerCase())) {
            return {
                result: `input must be a .drawio or .xml file: ${resolvedInput}`,
                status: ResultStatus.Error,
            };
        }

        const resolvedOutput = this.ws.normalize(output);
        if (!this.ws.canWrite(resolvedOutput)) {
            return {
                result: `Invalid or inaccessible path (must be within writable directory)${this.ws.pathHint(output, resolvedOutput)}`,
                status: ResultStatus.Error,
            };
        }
        if (path.extname(resolvedOutput).toLowerCase() !== `.${format}`) {
            return {
                result: `output extension must be .${format}: ${resolvedOutput}`,
                status: ResultStatus.Error,
            };
        }

        let content: string;
        try {
            const stat = await fsp.stat(resolvedInput);
            if (!stat.isFile()) {
                return {
                    result: `Path is not a file: ${resolvedInput}`,
                    status: ResultStatus.Error,
                };
            }
            content = await fsp.readFile(resolvedInput, 'utf-8');
        } catch (error) {
            return {
                result: `Error reading input: ${(error as Error).message}`,
                status: ResultStatus.Error,
            };
        }

        let rendered: Awaited<ReturnType<typeof renderDiagram>>;
        try {
            const graphModel = extractGraphModel(content, page);
            rendered = await renderDiagram(graphModel, { format, scale: this.config.scale });
        } catch (error) {
            return { result: (error as Error).message, status: ResultStatus.Error };
        }

        try {
            await fsp.mkdir(path.dirname(resolvedOutput), { recursive: true });
            await fsp.writeFile(resolvedOutput, rendered.data);
        } catch (error) {
            return {
                result: `Error writing output: ${(error as Error).message}`,
                status: ResultStatus.Error,
            };
        }

        return {
            result: `Exported ${resolvedOutput} (${format}, ${rendered.width}x${rendered.height}).`,
            status: ResultStatus.Success,
        };
    }
}
