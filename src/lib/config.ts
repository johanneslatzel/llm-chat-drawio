/**
 * Image formats {@link DrawioConfiguration} can enable for export. Raster
 * formats are produced by rasterising the rendered SVG; `svg` is emitted
 * natively.
 */
export enum SUPPORTED_DRAWIO_FORMATS {
    /** SVG output, emitted natively. */
    Svg = 'svg',
    /** PNG output, rasterised from the rendered SVG. */
    Png = 'png',
}

/** An image format supported by the renderer. */
export type DrawioFormat = SUPPORTED_DRAWIO_FORMATS;

/** Options accepted by {@link DrawioConfiguration}. */
export interface DrawioConfigurationOptions {
    /** Formats that may be requested for export. Defaults to every supported format. */
    formats?: readonly string[];
    /** Scale factor applied to raster output. Defaults to `1`. */
    scale?: number;
}

/**
 * Configuration for the draw.io export tool.
 *
 * Holds the allowlist of export formats and the raster scale factor. The host
 * application owns the instance so settings can be changed at runtime.
 */
export class DrawioConfiguration {
    /** Formats that may be requested for export, in configuration order. */
    readonly formats: DrawioFormat[];

    /** Scale factor applied to raster (PNG) output. */
    readonly scale: number;

    /**
     * @param options - Optional overrides. Unknown formats are dropped; when no
     *   supported format remains the full {@link SUPPORTED_DRAWIO_FORMATS} list
     *   is used. A non-positive or missing scale falls back to `1`.
     */
    constructor(options: DrawioConfigurationOptions = {}) {
        const requested = options.formats ?? Object.values(SUPPORTED_DRAWIO_FORMATS);
        const supported: readonly string[] = Object.values(SUPPORTED_DRAWIO_FORMATS);
        const formats = requested.filter((format): format is DrawioFormat =>
            supported.includes(format),
        );
        this.formats = formats.length > 0 ? formats : Object.values(SUPPORTED_DRAWIO_FORMATS);
        this.scale = typeof options.scale === 'number' && options.scale > 0 ? options.scale : 1;
    }

    /**
     * Whether the given value is an enabled export format.
     *
     * @param format - The candidate format string.
     */
    allows(format: string): format is DrawioFormat {
        return (this.formats as readonly string[]).includes(format);
    }
}
