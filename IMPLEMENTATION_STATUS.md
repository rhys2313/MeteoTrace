# MeteoTrace — implementation status

Updated: 2026-07-25 — Stage 1.5 analysis tools only

## Delivered

- Stage 1 LIVE core remains limited to the public RainViewer radar and official EUMETView WMS. No FMI, DWD, OPERA, commercial, contract-only, lightning, or other new providers were added.
- RainViewer now uses its public coverage-mask tiles in addition to radar tiles. The interface distinguishes API availability from visual states: `LAYER_LIVE`, `NO_ECHOES`, `NO_COVERAGE`, and `LAYER_ERROR`. The mask is optional on the map and is evaluated for the visible area; it is not a claim of coverage throughout Russia.
- The radar panel states that the composite is a visual reflectivity product, not a point measurement. It shows frame UTC time, tile starts/successes/errors, echo and coverage pixels, visibility, opacity, z-index, and the current non-secret tile template.
- The EUMETView catalog is parsed from live GetCapabilities. The production response contained 96 products across overview, infrared, cloud, precipitation, convection, lightning, and other groups. Recommended groups are presented first; the remaining catalog is in the `All products` disclosure.
- Catalog metadata now preserves title, abstract, ID, CRS, time dimension, coverage, styles, optional official LegendURL, WMS operations, and declared WMS/WCS/WFS/GetFeatureInfo interfaces. WCS and WFS were not connected.
- Official legend URL was visually verified for `msg_fes:cth` (Cloud Top Height — MSG — 0 degree). Products without an official LegendURL explicitly say that numeric ranges are not inferred. Satellite precipitation is labelled as an algorithmic satellite estimate, not radar.
- A point panel always identifies coordinates, source, product, UTC frame, raster type, and coverage context. RainViewer remains visualization-only. For WMS, a bounded, catalog-allowlisted `GetFeatureInfo` query is attempted; its raw source response is shown only when returned, rather than being converted into an invented measurement.
- A/B comparison uses two real source frames with vertical, horizontal, opacity, and blink modes. Pixel difference is deliberately disabled because these WMS/XYZ display rasters are not a compatible numerical field. The former static trace is now a sequence of four real frame images and says the same limitation.
- The existing case area, timeline, A/B selection, and notes make up the scoped “Event study” workflow.
- The main workspace answers what is shown, which UTC frame is selected, how colours should be read, and whether a point number is available. Build and network details live under the diagnostics disclosure.

## Final production verification

Verified in a fresh automated Chromium context at [https://meteotrace.vercel.app](https://meteotrace.vercel.app), 1440 × 1100, after production deployment `meteotrace-pl0wk3l67-cbnus.vercel.app`.

| Check | Factual result |
| --- | --- |
| Deployed revision | `/api/version` returned commit `0b87fc9` and deployment `meteotrace-pl0wk3l67-cbnus.vercel.app`; the same build ID was displayed in the page diagnostics. |
| RainViewer metadata and rendering | `/api/rainviewer` returned `200 application/json`. The selected frame was `2026-07-25T11:10:00.000Z`; 15 XYZ tiles started, 15 loaded, 0 failed. The map was `LAYER_LIVE`, visible, 70% opacity, z-index 10, with 109,463 echo pixels. The radar and coverage tile requests returned `200 image/png`. |
| RainViewer coverage | Coverage tiles such as `/v2/coverage/0/256/5/16/10/0/0_0.png` returned `200 image/png`. The visible area measured 290,958 coverage-mask pixels, and the optional mask checkbox rendered on the real map. |
| EUMETView rendering | `/api/eumetsat/catalog` returned `200 application/json`. Official `msg_fes:ir108` at `2026-07-25T11:00:00.000Z` loaded through `/api/eumetsat?...REQUEST=GetMap...` as `200 image/png`; diagnostics showed 1 start, 1 success, `LAYER_LIVE`, visible, 70% opacity, z-index 10. The cloud image was visible on the map. |
| Official legend | Selecting `msg_fes:cth` displayed its official LegendURL image in the browser. |
| Point interface | A bounded production `GetFeatureInfo` request for `msg_fes:ir108` returned `200 application/json` with a feature collection and RGB-band properties. This is presented as source response, not meteorological point data. |
| Actual analysis frames | Two comparison images and four sequence images loaded from real RainViewer/EUMETView frame URLs. Difference control was disabled with its WMS/XYZ-numerical-raster explanation. |
| Browser errors | No CORS, image-decoding, or OpenLayers errors were observed. The only console error was an unrelated favicon `404`. |

Production screenshots captured during the final verification:

- `C:\Users\v8arm\AppData\Local\Temp\meteotrace-stage15-production-rain.png`
- `C:\Users\v8arm\AppData\Local\Temp\meteotrace-stage15-production-eumet.png`

## Automated checks

- `npm run test` — 7/7 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- Vercel production build — passed.

## Remaining / intentionally not started

- Stages 2–4 remain out of scope: FMI, DWD, OPERA, commercial sources, lightning, font changes, and broad test expansion were not added.
- EUMETView WCS/WFS are metadata-only at this stage; no numerical grid pipeline was claimed.
- RainViewer coverage is a current published mask for the viewed area, not a guarantee of data over any wider region.
- RosHydromet remains `PUBLIC_VIEW_ONLY`: no documented, lawful, ready-to-connect public raster service was confirmed.
