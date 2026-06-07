# Weather Kiosk

A lightweight HTML/CSS/JS kiosk page for a Tablet or a Raspberry Pi with a 5" 800×480 or more touchscreen, styled like a hardware weather panel device. The 800×480 design canvas now scales to fit any landscape viewport, so the same page also works full-screen on a desktop monitor or a tablet in landscape.

No build step, no backend, no API key. Just static files served by anything (or opened from `file://`).

**Live demo:** [badscrew.github.io/weather-kiosk](https://badscrew.github.io/weather-kiosk/)

## Features

- Today panel and three forecast cards (today + 3 next days) with icon, conditions, high/low, precipitation chance
- Tap the forecast row to switch between the 3-day view and a 7-day week view; the choice is remembered across reloads
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
- `icons/` — self-hosted SVG weather icons

## Hosting on GitHub Pages

Because everything is static, GitHub Pages serves the project as-is.

1. In the repo, go to **Settings → Pages**.
2. Set **Source** to "Deploy from a branch".
3. Pick **Branch** = `main`, **Folder** = `/ (root)`. Save.

Every push to `main` republishes the site within a minute or two. The URL is `https://<user>.github.io/<repo>/`. Geolocation works because Pages serves over HTTPS.

`config.js` ships with neutral defaults (Royal Observatory, Greenwich); the picker dialog overrides them at runtime and persists the choice in `localStorage`, so each visitor's selection is independent.

## Acknowledgements

- [Open-Meteo](https://open-meteo.com/) — free weather forecast API used for the current conditions, daily forecast, and 15-minute precipitation strip
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) — country/city search powering the picker dialog
- [BigDataCloud](https://www.bigdatacloud.com/) — keyless reverse-geocoding client API used to resolve coordinates to a city name
- [geo.api.gouv.fr](https://geo.api.gouv.fr/) — French government geocoding API used to map coordinates to a département for the Vigilance lookup
- [Météo-France Vigilance](https://vigilance.meteofrance.fr/) — official French weather alerts, used for J0 and J+1 chips

Weather icons in the `icons/` folder are hand-drawn SVGs released under the same license as the rest of this repo. Emoji are intentionally avoided so the kiosk renders identically across operating systems.

## Customization tips

- Swap emoji icons for SVG/PNG by replacing the `WMO_ICONS` table in `app.js`. Conditions text comes from `i18n.js`.
- Adjust panel colors and gradients in `style.css` (`#app` background, `.today`, `.fc-card`).
- Change the design canvas size by editing `DESIGN_W` / `DESIGN_H` in `app.js` and the matching `width` / `height` on `#app` in `style.css`. The runtime scaler picks up the new dimensions automatically.
- Add a fifth day by changing the loop bound in `renderForecast` and bumping `forecast_days` in `buildUrl` (the 3-card row would need a CSS tweak to fit a fourth).
- Add a new language: extend `UI`, `WMO_LABELS`, and `ALERT_LABELS` in `i18n.js`, then add the `<option>` to the language select in `index.html`.

## License

Copyright (C) 2026 badscrew

Weather Kiosk is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. See the [`LICENSE`](LICENSE) file or
<https://www.gnu.org/licenses/>.

The hand-drawn SVG icons in `icons/` are released under the same GPL-3.0 license
as the rest of this repository.
