import globalJsdom from 'global-jsdom';
import { Resvg } from '@resvg/resvg-js';
import { SUPPORTED_DRAWIO_FORMATS, type DrawioFormat } from './config.js';

/** Options for {@link renderDiagram}. */
export interface RenderDiagramOptions {
    /** Output format. */
    format: DrawioFormat;
    /** Scale factor for raster output. Defaults to `1`. */
    scale?: number;
}

/** A rendered diagram and its intrinsic pixel dimensions. */
export interface RenderedDiagram {
    /** Encoded image bytes (UTF-8 SVG text or PNG). */
    data: Buffer;
    /** Diagram width in pixels. */
    width: number;
    /** Diagram height in pixels. */
    height: number;
}

let domInstalled = false;

/**
 * Installs a `jsdom` DOM on the Node globals, once per process.
 *
 * maxGraph depends on browser globals (`window`, `document`, `navigator`), so
 * this MUST run before `@maxgraph/core` is imported.
 */
function installDom(): void {
    if (domInstalled) {
        return;
    }
    globalJsdom('<!doctype html><html><body></body></html>');
    domInstalled = true;
}

/**
 * Renders an `<mxGraphModel>` document to an SVG or PNG image, headlessly.
 *
 * Rendering happens in-process on a `jsdom` DOM; no browser, X server or
 * subprocess is involved. HTML labels are disabled so labels are emitted as
 * SVG `<text>` (required for rasterisation and for renderers that do not
 * support `<foreignObject>`).
 *
 * @param mxGraphModelXml - The `<mxGraphModel>` XML of a single page.
 * @param options - Output format and optional raster scale.
 * @returns The encoded image and its pixel dimensions.
 * @throws {Error} When maxGraph cannot render the model.
 */
export async function renderDiagram(
    mxGraphModelXml: string,
    options: RenderDiagramOptions,
): Promise<RenderedDiagram> {
    installDom();
    const { Graph, GraphDataModel, ModelXmlSerializer } = await import('@maxgraph/core');

    const model = new GraphDataModel();
    new ModelXmlSerializer(model).import(mxGraphModelXml);

    const container = document.createElement('div');
    const graph = new Graph(container, model);
    graph.view.validate();

    const bounds = graph.getGraphBounds();
    const width = Math.max(1, Math.ceil(bounds.width));
    const height = Math.max(1, Math.ceil(bounds.height));

    const svgNode = graph.container.querySelector('svg')!;
    const svg =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${width}" height="${height}" viewBox="${bounds.x} ${bounds.y} ${width} ${height}">` +
        svgNode.innerHTML +
        '</svg>';

    if (options.format === SUPPORTED_DRAWIO_FORMATS.Svg) {
        return { data: Buffer.from(svg, 'utf8'), width, height };
    }

    const scale = options.scale ?? 1;
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: Math.max(1, Math.round(width * scale)) },
    });
    const rendered = resvg.render();
    return {
        data: Buffer.from(rendered.asPng()),
        width: rendered.width,
        height: rendered.height,
    };
}
