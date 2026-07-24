# MeteoTrace — implementation status

Updated: 2026-07-25 (Stage 1 only)

## Implemented in this correction

- RainViewer metadata and EUMETView catalog are fetched independently. A slow or failed EUMETView catalog no longer delays a usable RainViewer layer.
- Provider API state is distinct from browser rendering state: `API_LOADING`, `API_LIVE`, `API_ERROR` are shown separately from `LAYER_LOADING`, `LAYER_LIVE`, `NO_ECHOES`, `NO_COVERAGE`, and `LAYER_ERROR`.
- The OpenLayers weather layer is stable across ordinary React state updates. It is recreated only when source/frame/product changes; opacity changes update the existing layer.
- RainViewer diagnostics expose selected UTC timestamp, starts/successes/errors, detected echo pixels, visible flag, opacity, z-index, and the non-secret XYZ URL.
- Weather raster colors are no longer suppressed by the map-wide grayscale/brightness CSS filter. Weather layers are created with `visible=true`, `zIndex=10`; the marker is at z-index 20.
- EUMETView GetMap recognizes both `request` and OpenLayers’ `REQUEST`, validates against all layer IDs present in the live GetCapabilities response, and retains strict upstream, timeout, image-content-type, and parameter controls.
- `/api/version` adds the short Vercel/Git commit identifier to the UI diagnostics.

## Local factual checks

| Item | Result |
| --- | --- |
| RainViewer metadata | `/api/rainviewer` returned `200 application/json`. |
| RainViewer raster | Browser loaded 15 real RainViewer XYZ PNG tiles: 15 successful, 0 errors, `visible=true`, opacity `70%`, z-index `10`; raster inspection found 97,659 colored echo pixels. |
| Example tile form | `https://tilecache.rainviewer.com/v2/radar/<current-frame>/256/5/17/10/2/1_1.png` returned `200 image/png`; this confirms normal EPSG:3857 XYZ `z/x/y` addressing. |
| EUMETView locally | The local network closed TLS while requesting the official WMS GetCapabilities endpoint, so the local route correctly returned `503` and did not claim a visible satellite layer. |

## Validation completed before production verification

- `npm run test` — 6/6 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.

## Production verification

Verified in a fresh browser context on `https://meteotrace.vercel.app` after deployment `https://meteotrace-rmz1xmn75-cbnus.vercel.app`.

| Check | Factual production result |
| --- | --- |
| Deployed revision | `/api/version` returned commit `5c8dad5` and deployment `meteotrace-rmz1xmn75-cbnus.vercel.app`; the diagnostic panel displayed the same build value. |
| RainViewer API and raster | `/api/rainviewer` returned `200 application/json`. Current XYZ requests such as `/v2/radar/cf29fca60cd0/256/5/17/10/2/1_1.png` returned `200 image/png`. Browser diagnostics: 15 starts, 15 successes, 0 errors, 96,467 echo pixels, `visible=true`, opacity 70%, z-index 10. Visible echoes were present over Europe (including the British Isles and the western Mediterranean in the captured frame). |
| Frame/time change | Changing one time step changed the frame timestamp from `2026-07-24T22:00:00.000Z` to `2026-07-24T21:50:00.000Z`, changed the opaque RainViewer frame path, and loaded real tiles for the new frame. |
| Map/state changes | Searching `55, 20` moved the map to the supplied European coordinates. Reducing opacity changed the diagnostic value from 70% to 68% without rebuilding the source. Reloading in a fresh context again reached `LAYER_LIVE` with 15/15 successful tiles. |
| EUMETView API and raster | `/api/eumetsat/catalog` returned `200 application/json`. The selected official IR product `msg_fes:ir108`, time `2026-07-24T21:30:00.000Z`, produced `/api/eumetsat?...REQUEST=GetMap...` with `200 image/png`; diagnostics recorded one image start, one success, `visible=true`, opacity 70%, z-index 10, and `LAYER_LIVE`. The browser screenshot visibly shows the cloud field over Europe. |
| Browser console | No CORS, image decode, or OpenLayers layer error occurred. The only console error was an unrelated missing favicon (`404`). |

Production screenshots captured during this verification:

- `C:\Users\v8arm\AppData\Local\Temp\meteotrace-production-rain.png`
- `C:\Users\v8arm\AppData\Local\Temp\meteotrace-production-eumet.png`

## Not started by design

Stages 2–4 remain out of scope: FMI, DWD, OPERA, lightning, commercial sources, font work, and broad test suites were not added. RosHydromet remains `PUBLIC_VIEW_ONLY` because no documented legal public raster service was confirmed.
