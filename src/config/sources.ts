export const EUMETSAT_WMS = {
  endpoint: "https://view.eumetsat.int/geoserver/wms",
  version: "1.3.0",
  crs: "EPSG:3857",
  format: "image/jpeg",
  configuredLayer: "msg_fes:rgb_natural",
  status: "LIVE" as const,
  note: "Official EUMETView WMS. Availability is checked at request time; unavailable imagery is never replaced with simulated observations.",
};

export const EUMETSAT_LAYERS = ["msg_fes:rgb_natural", "msg_fes:rgb_airmass", "msg_fes:ir108"] as const;

export const COPERNICUS = {
  tokenEndpoint: "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
  catalogueEndpoint: "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
};
