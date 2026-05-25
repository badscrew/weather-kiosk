# Weather Kiosk

A lightweight HTML/CSS/JS kiosk page for a Raspberry Pi with a 5" 800×480 touchscreen. Shows the current weather plus a 3-day forecast, styled like a Cross Technology / La Crosse weather panel.

Data comes from [Open-Meteo](https://open-meteo.com/) (free, no API key, no signup).

## Features

- Today's weather: icon, temperature, conditions, high/low, feels-like, wind, humidity, rain chance, sunrise, sunset
- 3-day forecast cards (icon, conditions, hi/lo, precipitation chance)
- 15-minute precipitation-probability strip for the next 4 hours, color-coded white → light blue → blue → dark blue (0 → 50 → 75 → 100%)
- Live clock + date in the header
- Auto-refresh every 15 minutes (configurable)
- Metric or imperial units
- 12h / 24h clock
- Sized exactly for an 800×480 display

## Configuration

Edit `config.js`:

```js
window.KIOSK_CONFIG = {
  locationName: "Home",
  latitude: 47.6062,
  longitude: -122.3321,
  units: "metric",      // "metric" or "imperial"
  clockFormat: "24h",   // "12h" or "24h"
  timezone: "auto",     // IANA tz or "auto"
  refreshMinutes: 15,
};
```

## Running locally (any machine)

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Running on the Raspberry Pi

### 1. Copy the files
Put the `weather-kiosk/` folder anywhere, for example `/home/pi/weather-kiosk`.

### 2. Install Chromium (already on most Pi OS images)

```bash
sudo apt update
sudo apt install -y chromium-browser unclutter
```

### 3. Auto-start in kiosk mode

For Wayland (Pi OS Bookworm default), create `~/.config/wayfire.ini` autostart entry, or for the X11 LXDE desktop edit `~/.config/lxsession/LXDE-pi/autostart`:

```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0
@chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito --check-for-update-interval=31536000 file:///home/pi/weather-kiosk/index.html
```

Replace the path if you stored the folder elsewhere. Reboot and Chromium will launch full-screen on the kiosk page.

### 4. Rotate the display (if needed)

For a 5" HDMI touchscreen mounted in portrait, edit `/boot/firmware/config.txt` (or `/boot/config.txt` on older OSes) and set, for example:

```
display_rotate=1
```

The CSS targets a landscape 800×480 layout. If you rotate, the dimensions in `style.css` and the meta viewport in `index.html` will need to swap.

## Customization tips

- Swap emoji icons for SVG/PNG by replacing the `WMO` table values in `app.js`.
- Adjust panel colors and gradients in `style.css` (`#app` background, `.today`, `.fc-card`).
- Add a fifth day by changing the loop bound in `renderForecast` and bumping `forecast_days` in `buildUrl` (note: the layout is tuned for 3 cards).

## Files

- `index.html` - markup
- `style.css` - layout & theme (fixed at 800×480)
- `app.js` - data fetch, formatting, render loop
- `config.js` - user configuration
