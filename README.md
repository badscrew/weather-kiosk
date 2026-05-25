# Weather Kiosk

A lightweight HTML/CSS/JS kiosk page for a Raspberry Pi with a 5" 800×480 touchscreen, styled like a Cross Technology / La Crosse weather panel. The 800×480 design canvas now scales to fit any landscape viewport, so the same page also works full-screen on a desktop monitor or a tablet in landscape.

No build step, no backend, no API key. Just static files served by anything (or opened from `file://`).

## Features

- Today panel and three forecast cards (today + 3 next days) with icon, conditions, high/low, precipitation chance
- Today details: feels-like, wind speed + direction, humidity, sunrise, sunset
- 15-minute precipitation-probability strip for the next 4 hours, color-coded white → light blue → blue → dark blue (0 → 50 → 75 → 100%)
- Live clock front-and-center, plus the location's local time appended to the city name when it differs from the device timezone
- Touch-sensitive location header that opens a picker dialog
- Picker dialog: "Use my location" via `navigator.geolocation`, or country + city search powered by Open-Meteo's geocoding API
- Language selector in the dialog: English, Français, Español, Deutsch (UI strings, weather conditions, alert phenomena, country names)
- Météo-France Vigilance alerts for French locations: today (J0) and tomorrow (J+1) chips on the matching cards, colored yellow / orange / red and labeled with the triggering phenomenon (e.g. "Canicule")
- Auto-refresh every 15 minutes (configurable), refetch on tab visibility, persistent location and language via `localStorage`
- Single-layout zoom-to-fit: scales to any landscape viewport, letterboxing if the aspect ratio differs from 5:3

## Data sources

- Weather forecast and minutely-15 precipitation: [Open-Meteo](https://open-meteo.com/) (no key)
- Forward geocoding (country + city search): [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api)
- Reverse geocoding (city/country from coordinates): [BigDataCloud client API](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) (no key)
- French département from coordinates: [geo.api.gouv.fr](https://geo.api.gouv.fr/)
- French weather alerts: Météo-France Vigilance (`webservice.meteofrance.com/v3/warning/full`, with `echeance=J1` for tomorrow). Uses the public mobile-app token; if Météo-France ever rotates it, alerts silently stop appearing while everything else keeps working.

## Configuration

Edit `config.js`:

```js
window.KIOSK_CONFIG = {
  locationName: "",        // "" lets the geocoder fill in the city
  latitude: 47.6062,
  longitude: -122.3321,
  units: "metric",         // "metric" or "imperial"
  clockFormat: "24h",      // "12h" or "24h"
  timezone: "auto",        // IANA tz or "auto"
  refreshMinutes: 15,
};
```

The picker dialog overrides these values at runtime and persists the selection in `localStorage` (`kiosk.location`, `kiosk.lang`). Clear browser storage to reset to the defaults from `config.js`.

## Running locally (any machine)

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

`navigator.geolocation` only works on `https://`, `http://localhost`, or `http://127.0.0.1` — opening the page from a `file://` path will disable the "Use my location" button.

## Running on the Raspberry Pi

### 1. Copy the files
Put the `weather-kiosk/` folder anywhere, for example `/home/pi/weather-kiosk`.

### 2. Install Chromium

```bash
sudo apt update
sudo apt install -y chromium-browser unclutter
```

### 3. Auto-start in kiosk mode

On the X11 LXDE desktop, edit `~/.config/lxsession/LXDE-pi/autostart`:

```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0
@chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito --check-for-update-interval=31536000 file:///home/pi/weather-kiosk/index.html
```

On Wayland (Pi OS Bookworm default), add the same `chromium-browser ...` line to your compositor's autostart (e.g. `~/.config/wayfire.ini` `[autostart]` section).

Reboot and Chromium will launch full-screen on the kiosk page.

### 4. Rotation

The layout is designed in landscape. The simplest setup is to rotate the panel at the framebuffer level (`display_rotate=1` in `/boot/firmware/config.txt` or `/boot/config.txt`); the browser still sees a landscape viewport and the runtime scaler keeps the design intact. Portrait orientation isn't optimized.

## Files

- `index.html` — markup, viewport, dialog
- `style.css` — layout, theme, zoom-to-fit canvas
- `app.js` — data fetch, formatting, render loop, alerts, dialog logic, scale-to-fit
- `i18n.js` — translations (en/fr/es/de) for UI strings, WMO codes, Vigilance phenomena
- `config.js` — user configuration

## Customization tips

- Swap emoji icons for SVG/PNG by replacing the `WMO_ICONS` table in `app.js`. Conditions text comes from `i18n.js`.
- Adjust panel colors and gradients in `style.css` (`#app` background, `.today`, `.fc-card`).
- Change the design canvas size by editing `DESIGN_W` / `DESIGN_H` in `app.js` and the matching `width` / `height` on `#app` in `style.css`. The runtime scaler picks up the new dimensions automatically.
- Add a fifth day by changing the loop bound in `renderForecast` and bumping `forecast_days` in `buildUrl` (the 3-card row would need a CSS tweak to fit a fourth).
- Add a new language: extend `UI`, `WMO_LABELS`, and `ALERT_LABELS` in `i18n.js`, then add the `<option>` to the language select in `index.html`.
