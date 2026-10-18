# Quick Start

## Installation

```bash
npm install @johannes.latzel/llm-chat-drawio
```

## Basic usage

```typescript
import { DrawioToolPackage, DrawioConfiguration } from '@johannes.latzel/llm-chat-drawio';

const pkg = new DrawioToolPackage(workspace, new DrawioConfiguration());
service.tools().add(pkg);
```

## Rendering a diagram

With the package registered, ask the agent to run the tool:

```
export_drawio(input: "docs/architecture.drawio")
export_drawio(input: "docs/architecture.drawio", format: "svg")
export_drawio(input: "docs/architecture.drawio", format: "png", output: "docs/architecture.png")
export_drawio(input: "docs/handbook.drawio", format: "png", page: "Network")
```

The input path is read and the output path is written, both relative to the
workspace root. `format` defaults to `svg`, so only `input` is mandatory. If
`output` is omitted the image is written next to the input with the format
extension.

## Full API

See the [API Reference](api-reference.md) for the full tool documentation.
