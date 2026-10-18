# Overview

`llm-chat-drawio` renders `.drawio` diagrams to images headlessly, without a
browser, X server, or the draw.io desktop app. It exposes one `llm-chat` tool,
`export_drawio`, and a `ToolPackage` bundling it.

Rendering runs in-process: [maxGraph](https://github.com/maxGraph/maxGraph) (the
maintained successor of mxGraph, draw.io's rendering core) draws the diagram on
a `jsdom` DOM, and [@resvg/resvg-js](https://github.com/yisibl/resvg-js)
rasterises the SVG for PNG output.

## Navigation

- [Architecture](architecture.md): design overview
- [API Reference](api-reference.md): full tool and class documentation
- [Quick Start](quickstart.md): getting started guide

## License

MIT. See [`LICENSE`](https://github.com/johanneslatzel/llm-chat-drawio/blob/main/LICENSE).
