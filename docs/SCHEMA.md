# VersaTuner CSV schema notes

Based on real sample exports inspected during v1 setup.

## Format

- Plain CSV, optional UTF-8 BOM
- First row: channel headers with units embedded in parentheses when present
- Subsequent rows: numeric samples (some cells may be empty)
- Time column: `Time (s)` — may start negative (relative session time) or positive

## Sample A — AFR gas log

File: `Data log - 2026-05-05 19.19.56.csv` (~20k rows, ~12 Hz)

| Channel | Notes |
|---|---|
| Time (s) | Shared X axis |
| Absolute load | Fraction (0–1+), not percent |
| Absolute throttle position 1 (%) | TPS |
| Actual equivalence/air to fuel ratio (AFR gas) | AFR, not λ |
| Ambient air temperature (°F) | |
| Engine coolant temperature (°F) | |
| Engine RPM | |
| Ignition timing advance (°) | |
| Intake air temperature (°F) | |
| Intake manifold absolute pressure (kPa) | MAP |
| Knock retard (°) | |
| Long term fuel trim (%) | |
| Manifold air temperature (°F) | |
| Short term fuel trim (primary sensor) (%) | |
| Vehicle speed (mph) | |

## Sample B — Lambda log

File: `BStol SC - DRT v1.94-4.csv` (~1.9k rows, ~9 Hz)

Adds cam angles, MAF, injector PW, catalyst temp, accelerator pedal; uses λ instead of AFR gas; no vehicle speed / ECT / ambient in this export.

## Alias roles used by presets / converter

Logical roles map to the best available header (see `src/lib/channels.ts`):

- `time`, `rpm`, `throttle`, `acceleratorPedal`
- `mapKpa`, `boost` (or derived from MAP − baro)
- `targetBoost`, `wgdc` (optional — absent in current samples)
- `afrGas` / `actualLambda` / `commandedLambda`
- `timingAdvance`, `knockRetard`
- `absoluteLoad`, fuel trims, temps, MAF, vehicle speed, cams, injector PW

## Derived channels (viewer)

When source data allows:

- **Boost (psi)** — from MAP (kPa) − inferred baro, converted to psi
- **Boost error** — Boost − Target Boost (if target present)
- **AFR/λ error** — actual − commanded/desired
- **Knock activity** — abs(knock retard) or knock > 0 flag
