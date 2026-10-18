import { ToolPackage } from '@johannes.latzel/llm-chat';
import type { Workspace } from '@johannes.latzel/llm-chat-workspace';
import { DrawioConfiguration } from '../lib/config.js';
import { ExportDrawioTool } from '../tools/export-drawio.js';

/**
 * Groups the draw.io export tools into a single {@link ToolPackage}.
 *
 * Provides the {@link ExportDrawioTool} for rendering `.drawio` diagrams to
 * SVG or PNG within the workspace.
 */
export class DrawioToolPackage extends ToolPackage {
    /**
     * @param workspace - Workspace for path resolution and access checks.
     * @param config - Export configuration (format allowlist and raster scale).
     */
    constructor(workspace: Workspace, config: DrawioConfiguration = new DrawioConfiguration()) {
        super([new ExportDrawioTool(workspace, config)]);
    }
}
