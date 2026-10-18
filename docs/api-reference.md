# API Reference

## ExportDrawioTool

Exports a `.drawio`/`.xml` diagram to an image, within the allowed workspace
directories.

**Tool name:** `export_drawio`

**Parameters:**

| Parameter | Type   | Required | Description                                                                                                                         |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `input`   | string | yes      | Path to the `.drawio`/`.xml` file (absolute, or relative to root).                                                                  |
| `format`  | string | no       | Output format, one of the configured formats (`svg`, `png`). Defaults to `svg` when enabled, otherwise the first configured format. |
| `output`  | string | no       | Output image path; defaults to the input path with the format extension.                                                            |
| `page`    | string | no       | Page to export: zero-based index or page name (default: first page).                                                                |

**Returns:** `"Exported <path> (<format>, <width>x<height>)."`

The input must be readable and the output writable under the workspace access
lists. The output extension must match `format`.

---

## `DrawioConfiguration`

Holds the format allowlist and raster scale factor.

```typescript
import { DrawioConfiguration } from '@johannes.latzel/llm-chat-drawio';

const config = new DrawioConfiguration({ formats: ['svg', 'png'], scale: 2 });
```

| Member      | Type             | Description                                     |
| ----------- | ---------------- | ----------------------------------------------- |
| `formats`   | `DrawioFormat[]` | Enabled formats, filtered to the supported set. |
| `scale`     | `number`         | Raster scale factor (default `1`).              |
| `allows(f)` | `boolean`        | Whether `f` is an enabled format.               |

## Package classes

### `DrawioToolPackage`

Groups the `ExportDrawioTool`.

```typescript
import { DrawioToolPackage, DrawioConfiguration } from '@johannes.latzel/llm-chat-drawio';
const pkg = new DrawioToolPackage(workspace, new DrawioConfiguration());
```

- **Tools:** export_drawio (1 tool)
- **Constructor:** `Workspace`, optional `DrawioConfiguration`
- **`dispose()`:** not implemented
