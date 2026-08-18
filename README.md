# Versa Log Viewer

Local-first VersaTuner / MazdaEdit datalog toolkit for the browser:

1. **Log Viewer** — import VersaTuner or MazdaEdit CSV logs, multi-pane time-series charts, presets, RPM×Load map tables, range export
2. **HPTuners Converter** — VersaTuner or MazdaEdit → HPTuners / VCM Scanner–style CSV (ported from [`tuning-tools` / `versa-tools`](https://github.com/jasonclxr/tuning-tools))
3. **Settings** — preferred display units (pressure, temperature, mixture, speed), stored in localStorage

No backend, accounts, or cloud sync. Files stay in your browser.

## Dev

```bash
npm install
npm run dev
```

## Build / GitHub Pages

```bash
npm run build
npm run preview   # local check of production build
```

For GitHub Pages project site (`https://jasonclxr.github.io/versa-tools/`):

```bash
npm run deploy
```

`deploy` builds with `GITHUB_PAGES=true` (sets Vite `base` to `/versa-tools/`) and publishes `dist/` via `gh-pages`.

Pushing to `main` also runs `.github/workflows/deploy-pages.yml` (enable **Settings → Pages → Source: GitHub Actions** once).

## Sample schema

See [docs/SCHEMA.md](docs/SCHEMA.md) for channel inventory from real VersaTuner exports.

Bundled truncated samples:

- `public/samples/sample-versa-log.csv` (AFR gas)
- `public/samples/sample-versa-log-lambda.csv` (λ)
- `public/samples/sample-mazdaedit-log.csv` (MazdaEdit)

## Keyboard (viewer)

| Key | Action |
|---|---|
| `R` | Reset zoom to full log |
| `S` | Toggle pull-select mode |
| `F` | Fit zoom to selected pull |
| `=` / `-` | Zoom in / out |
| `←` / `→` | Pan |

Mouse: wheel zoom, drag pan (uPlot), box-drag in select mode for analysis range.

## Map table

Use the **Charts / Map table** pages in the log viewer. Pull selection on Charts is shared with Map.

## Stack

Vite + React + TypeScript + [uPlot](https://github.com/leeoniya/uPlot) + Papa Parse
