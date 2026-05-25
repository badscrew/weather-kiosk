// Weather Kiosk configuration
// Edit these values to match your setup. The picker dialog can override
// any of these at runtime (and persists the choice in localStorage), so
// the values below are just the initial defaults.
window.KIOSK_CONFIG = {
  // Display name shown in the header.
  // Set to "" to use the resolved city name from coordinates.
  locationName: "",

  // Coordinates (decimal degrees). Defaults to the Royal Observatory,
  // Greenwich. Use the picker dialog or edit these values to your city.
  latitude: 51.4779,
  longitude: 0.0015,

  // "metric" => °C, km/h, mm | "imperial" => °F, mph, inch
  units: "metric",

  // 12-hour or 24-hour clock
  clockFormat: "24h", // "12h" or "24h"

  // IANA timezone, or "auto" to derive from coordinates
  timezone: "auto",

  // Auto-refresh interval (minutes)
  refreshMinutes: 15,
};
