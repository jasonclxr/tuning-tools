# VersaTuner CSV schema notes

Based on real sample exports inspected during v1 setup. MazdaEdit notes added from a SkyActiv / MazdaEdit CSV export.

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
- `mapKpa`, `baro`, `boost` (or derived from MAP − baro)
- `targetBoost`, `wgdc` (optional — absent in current samples)
- `afrGas` / `actualLambda` / `commandedLambda`
- `timingAdvance`, `knockRetard`
- `absoluteLoad`, fuel trims, temps (including oil), MAF, vehicle speed, cams, injector PW
- `fuelPressure`, `oilPressure` (MazdaEdit)

## Derived channels (viewer)

When source data allows:

- **Boost (psi)** — from MAP − baro (native baro when present, otherwise inferred from early MAP), converted to psi
- **Boost error** — Boost − Target Boost (if target present)
- **AFR/λ error** — actual − commanded/desired
- **Knock activity** — abs(knock retard) or knock > 0 flag

## Sample C — MazdaEdit

File: `ECOBOOST-VX-LIGHT-DRIVE.csv` (~3.4k rows, ~3.5 Hz)

MazdaEdit exports the same CSV shape (header row with units in parentheses, numeric samples) with different channel names and units:

| Channel | Notes |
|---|---|
| Time | Milliseconds (converted to seconds on import) |
| Engine speed (RPM) | RPM |
| Calculated Engine Load (OBD) (%) | Percent 0–100, not VersaTuner fraction |
| Manifold absolute pressure (PSI) | Absolute MAP in psi |
| Barometric pressure (PSI) | Native baro — used for derived boost |
| Actual AFR (AFR) | Wideband / actual AFR |
| Vehicle speed (kph) | Converted to preferred speed unit in the viewer |
| Ignition timing (deg) / Knock retard (deg) | Degrees |
| VVT Intake/Exhaust Desired & Actual (deg) | Cam angles |
| Fuel pulse width (ms) | Injector PW |
| Fuel Pressure (mPa) | Rail pressure in MPa (`mPa` in the export) |

