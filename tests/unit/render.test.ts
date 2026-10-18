import { describe, it, expect } from 'vitest';
import { renderDiagram } from '../../src/lib/render.js';
import { SUPPORTED_DRAWIO_FORMATS } from '../../src/lib/config.js';

const MODEL = `<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageWidth="850" pageHeight="1100">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Hello" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="World" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="240" y="40" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;" edge="1" parent="1" source="2" target="3">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`;

const EMPTY_MODEL =
    '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

describe('renderDiagram', () => {
    it('renders SVG text with labels and without foreignObject', async () => {
        const result = await renderDiagram(MODEL, { format: SUPPORTED_DRAWIO_FORMATS.Svg });
        const svg = result.data.toString('utf8');
        expect(svg).toContain('<svg');
        expect(svg).toContain('<text');
        expect(svg).toContain('Hello');
        expect(svg).toContain('World');
        expect(svg).not.toContain('foreignObject');
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
    });

    it('renders a PNG', async () => {
        const result = await renderDiagram(MODEL, { format: SUPPORTED_DRAWIO_FORMATS.Png });
        expect(result.data[0]).toBe(0x89);
        expect(result.data[1]).toBe(0x50);
        expect(result.data[2]).toBe(0x4e);
        expect(result.data[3]).toBe(0x47);
        expect(result.width).toBeGreaterThan(0);
    });

    it('scales raster output', async () => {
        const single = await renderDiagram(MODEL, {
            format: SUPPORTED_DRAWIO_FORMATS.Png,
            scale: 1,
        });
        const double = await renderDiagram(MODEL, {
            format: SUPPORTED_DRAWIO_FORMATS.Png,
            scale: 2,
        });
        expect(double.width).toBeGreaterThan(single.width);
    });

    it('renders an empty model at minimum size', async () => {
        const result = await renderDiagram(EMPTY_MODEL, { format: SUPPORTED_DRAWIO_FORMATS.Svg });
        expect(result.width).toBe(1);
        expect(result.height).toBe(1);
    });
});
