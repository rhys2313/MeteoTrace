export const EUMETSAT_WMS = {
  endpoint: "https://view.eumetsat.int/geoserver/wms",
  version: "1.3.0",
  crs: "EPSG:3857",
  format: "image/jpeg",
  officialDocumentation: "https://user.eumetsat.int/resources/user-guides/eumet-view-user-guide",
} as const;

export const RAINVIEWER = {
  metadataEndpoint: "https://api.rainviewer.com/public/weather-maps.json",
  officialDocumentation: "https://www.rainviewer.com/api/weather-maps-api.html",
  attribution: "Weather data by RainViewer",
} as const;

export const COPERNICUS = {
  tokenEndpoint: "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
  catalogueEndpoint: "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
};
