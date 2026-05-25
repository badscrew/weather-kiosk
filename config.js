// Weather Kiosk configuration
// Edit these values to match your setup. No quotes around numbers.
window.KIOSK_CONFIG = {
  // Display name shown in the header.
  // Set to "" to use the resolved city name from coordinates.
  locationName: "",

  // Coordinates (decimal degrees). Find yours at https://www.latlong.net/
  latitude: 47.6062,
  longitude: -122.3321,

  // "metric" => °C, km/h, mm | "imperial" => °F, mph, inch
  units: "metric",

  // 12-hour or 24-hour clock
  clockFormat: "24h", // "12h" or "24h"

  // IANA timezone, or "auto" to derive from coordinates
  timezone: "auto",

  // Auto-refresh interval (minutes)
  refreshMinutes: 15,
};
