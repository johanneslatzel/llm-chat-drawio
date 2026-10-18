import { inflateRaw } from 'pako';

/**
 * Selector for a page inside a multi-page `.drawio` file: either a zero-based
 * index or the exact page name.
 */
export type DrawioPageSelector = number | string;

/** A page entry found in a `.drawio` file. */
export interface DrawioPage {
    /** Zero-based position of the page in the file. */
    index: number;
    /** Page name as stored on the `<diagram>` element. */
    name: string;
}

interface RawPage {
    name: string;
    content: string;
}

const DIAGRAM_PATTERN = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g;
const NAME_PATTERN = /\bname="([^"]*)"/;

/**
 * Lists the pages of a `.drawio`/`.xml` file.
 *
 * @param content - Raw file content.
 * @returns One entry per `<diagram>` element, in file order. Unnamed pages get
 *   a `Page-<n>` fallback name.
 * @throws {Error} When no `<diagram>` element is present.
 */
export function listDrawioPages(content: string): DrawioPage[] {
    return parsePages(content).map((page, index) => ({ index, name: page.name }));
}

/**
 * Extracts the `<mxGraphModel>` XML of one page, decompressing the editor's
 * default (base64 + raw-deflate) representation when necessary.
 *
 * @param content - Raw `.drawio`/`.xml` file content.
 * @param page - Zero-based index or exact page name. Defaults to the first page.
 * @returns The page's `<mxGraphModel>` XML string.
 * @throws {Error} When the content is not a draw.io file, the page is unknown,
 *   or a compressed page cannot be inflated.
 */
export function extractGraphModel(content: string, page?: DrawioPageSelector): string {
    const pages = parsePages(content);
    const index = resolvePageIndex(pages, page);
    return toGraphModel(pages[index]!.content);
}

function parsePages(content: string): RawPage[] {
    const pages: RawPage[] = [];
    const pattern = new RegExp(DIAGRAM_PATTERN.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
        pages.push({
            name: extractName(match[1]!, pages.length),
            content: match[2]!,
        });
    }
    if (pages.length === 0) {
        throw new Error('Input is not a draw.io file: no <diagram> element found.');
    }
    return pages;
}

function extractName(attributes: string, index: number): string {
    const match = NAME_PATTERN.exec(attributes);
    return match?.[1] ?? `Page-${index + 1}`;
}

function resolvePageIndex(pages: RawPage[], page: DrawioPageSelector | undefined): number {
    if (page === undefined) {
        return 0;
    }
    if (typeof page === 'number') {
        if (!Number.isInteger(page) || page < 0 || page >= pages.length) {
            throw new Error(`Page index ${page} is out of range (0..${pages.length - 1}).`);
        }
        return page;
    }
    const index = pages.findIndex((candidate) => candidate.name === page);
    if (index === -1) {
        throw new Error(`Unknown page '${page}'.`);
    }
    return index;
}

function toGraphModel(content: string): string {
    const trimmed = content.trim();
    if (trimmed === '') {
        throw new Error('Selected page is empty.');
    }
    if (trimmed.startsWith('<')) {
        return trimmed;
    }
    return decompress(trimmed);
}

function decompress(data: string): string {
    let encoded = data;
    try {
        encoded = decodeURIComponent(data);
    } catch {
        // Not URI-encoded: fall back to the raw string.
    }
    try {
        const inflated = inflateRaw(Buffer.from(encoded, 'base64'));
        return new TextDecoder().decode(inflated);
    } catch (error) {
        throw new Error(`Failed to decompress diagram content: ${(error as Error).message}`, {
            cause: error,
        });
    }
}
