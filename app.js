/* Weather Kiosk - main script
 * Data source: Open-Meteo (https://open-meteo.com/) - free, no API key.
 * Renders today's weather + the next 3 days' forecast.
 */

(function () {
  "use strict";

  const CFG = window.KIOSK_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  // Storage key for user-selected location overrides.
  const LOC_KEY = "kiosk.location";

  // Forecast view: 3-day (default) or 7-day week. Toggled by tapping the
  // forecast area; the choice is persisted across reloads.
  const FC_VIEW_KEY = "kiosk.fcview";
  const FC_VIEWS = { THREE: "3day", WEEK: "week" };
  let forecastView = FC_VIEWS.THREE;
  try {
    const v = localStorage.getItem(FC_VIEW_KEY);
    if (v === FC_VIEWS.WEEK || v === FC_VIEWS.THREE) forecastView = v;
  } catch (_) { /* ignore */ }

  // Apply any saved location override on top of CFG before anything reads it.
  function loadSavedLocation() {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.latitude === "number" && typeof saved.longitude === "number") {
        CFG.latitude = saved.latitude;
        CFG.longitude = saved.longitude;
        CFG.locationName = saved.name || CFG.locationName || "";
        CFG.countryCode = saved.countryCode || CFG.countryCode || "";
        CFG.locationTz = saved.timezone || CFG.locationTz || "";
      }
    } catch (_) { /* ignore */ }
  }
  loadSavedLocation();

  // ---- WMO weather code mapping ---------------------------------------
  // Labels come from i18n.js (tWmo). The icon table maps WMO codes to
  // self-hosted SVG files in ./icons/, so the visual is identical on every
  // device and doesn't depend on the OS emoji font.
  const ICON = (name) => `icons/${name}.svg`;
  const WMO_ICONS = {
    0:  { day: ICON("sun"),               night: ICON("moon") },
    1:  { day: ICON("partly-cloudy-day"), night: ICON("moon") },
    2:  { day: ICON("partly-cloudy-day"), night: ICON("partly-cloudy-night") },
    3:  { day: ICON("cloudy"),            night: ICON("cloudy") },
    45: { day: ICON("fog"),               night: ICON("fog") },
    48: { day: ICON("fog"),               night: ICON("fog") },
    51: { day: ICON("drizzle"),           night: ICON("drizzle") },
    53: { day: ICON("drizzle"),           night: ICON("drizzle") },
    55: { day: ICON("rain-light"),        night: ICON("rain-light") },
    56: { day: ICON("freezing-rain"),     night: ICON("freezing-rain") },
    57: { day: ICON("freezing-rain"),     night: ICON("freezing-rain") },
    61: { day: ICON("rain-light"),        night: ICON("rain-light") },
    63: { day: ICON("rain"),              night: ICON("rain") },
    65: { day: ICON("rain-heavy"),        night: ICON("rain-heavy") },
    66: { day: ICON("freezing-rain"),     night: ICON("freezing-rain") },
    67: { day: ICON("freezing-rain"),     night: ICON("freezing-rain") },
    71: { day: ICON("snow-light"),        night: ICON("snow-light") },
    73: { day: ICON("snow"),              night: ICON("snow") },
    75: { day: ICON("snow-heavy"),        night: ICON("snow-heavy") },
    77: { day: ICON("snow-light"),        night: ICON("snow-light") },
    80: { day: ICON("rain-light"),        night: ICON("rain-light") },
    81: { day: ICON("rain"),              night: ICON("rain") },
    82: { day: ICON("rain-heavy"),        night: ICON("rain-heavy") },
    85: { day: ICON("snow-light"),        night: ICON("snow-light") },
    86: { day: ICON("snow-heavy"),        night: ICON("snow-heavy") },
    95: { day: ICON("thunderstorm"),      night: ICON("thunderstorm") },
    96: { day: ICON("thunderstorm-hail"), night: ICON("thunderstorm-hail") },
    99: { day: ICON("thunderstorm-hail"), night: ICON("thunderstorm-hail") },
  };
  const FALLBACK_ICON = ICON("unknown");

  function describe(code, isDay) {
    const ico = WMO_ICONS[code];
    const src = ico ? (isDay ? ico.day : ico.night) : FALLBACK_ICON;
    return {
      label: window.I18N ? window.I18N.tWmo(code) : "",
      icon: src,
    };
  }

  // Build an <img> element pointing at one of our SVG icons. The label is
  // used as alt text so screen readers can still announce the condition.
  function iconImg(src, label) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = label || "";
    img.draggable = false;
    return img;
  }

  // ---- Units helpers ---------------------------------------------------
  const isImperial = (CFG.units || "metric").toLowerCase() === "imperial";
  const tempUnit = isImperial ? "fahrenheit" : "celsius";
  const windUnit = isImperial ? "mph" : "kmh";
  const precipUnit = isImperial ? "inch" : "mm";
  const windLabel = isImperial ? "mph" : "km/h";

  // ---- API URL builder -------------------------------------------------
  function buildUrl() {
    const params = new URLSearchParams({
      latitude: String(CFG.latitude),
      longitude: String(CFG.longitude),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "is_day",
      ].join(","),
      minutely_15: "precipitation_probability",
      hourly: "weather_code",
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "precipitation_sum",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: CFG.timezone || "auto",
      temperature_unit: tempUnit,
      wind_speed_unit: windUnit,
      precipitation_unit: precipUnit,
      forecast_days: "7",
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  // ---- Predominant daytime weather code --------------------------------
  // Instead of using the daily weather_code (which picks the "worst"
  // condition from any hour), we derive the most frequent code during
  // daytime hours (7:00–21:00) from hourly data. This better matches what
  // forecasters show on weather sites.
  // WMO severity order: higher = more significant. When two codes tie in
  // frequency, the more significant one wins.
  const WMO_SEVERITY = {
    0:0, 1:1, 2:2, 3:3, 45:4, 48:5,
    51:6, 53:7, 55:8, 56:9, 57:10,
    61:11, 63:12, 65:13, 66:14, 67:15,
    71:16, 73:17, 75:18, 77:19,
    80:20, 81:21, 82:22, 85:23, 86:24,
    95:25, 96:26, 99:27,
  };

  function predominantDaytimeCode(data, dayIndex) {
    const h = data.hourly;
    if (!h || !h.time || !h.weather_code) return null;
    const daily = data.daily;
    if (!daily || !daily.time || !daily.time[dayIndex]) return null;

    const dayDate = daily.time[dayIndex]; // "YYYY-MM-DD"
    // Collect hourly codes for this day between 7:00 and 20:59 (local)
    const codes = [];
    for (let i = 0; i < h.time.length; i++) {
      const t = h.time[i]; // "YYYY-MM-DDTHH:MM"
      if (!t.startsWith(dayDate)) continue;
      const hour = parseInt(t.substring(11, 13), 10);
      if (hour >= 7 && hour <= 20 && h.weather_code[i] != null) {
        codes.push(h.weather_code[i]);
      }
    }
    if (codes.length === 0) return null;

    // Count frequency of each code
    const freq = {};
    for (const c of codes) freq[c] = (freq[c] || 0) + 1;

    // Pick the code with highest frequency; break ties by severity
    let best = null;
    let bestCount = 0;
    for (const [code, count] of Object.entries(freq)) {
      const c = Number(code);
      if (count > bestCount || (count === bestCount && (WMO_SEVERITY[c] || 0) > (WMO_SEVERITY[best] || 0))) {
        best = c;
        bestCount = count;
      }
    }
    return best;
  }

  // ---- Formatters ------------------------------------------------------
  const fmtInt = (n) => (n == null || isNaN(n) ? "--" : Math.round(n).toString());

  function fmtClock(date) {
    const opts = CFG.clockFormat === "12h"
      ? { hour: "numeric", minute: "2-digit", hour12: true }
      : { hour: "2-digit", minute: "2-digit", hour12: false };
    return date.toLocaleTimeString(getLocale(), opts);
  }

  function fmtDate(date) {
    return date.toLocaleDateString(getLocale(), {
      weekday: "long", month: "short", day: "numeric",
    });
  }

  function getLocale() {
    return (window.I18N && window.I18N.getLang()) || "en";
  }

  function dayName(isoDate, idx) {
    if (idx === 0) return window.I18N ? window.I18N.t("today") : "Today";
    if (idx === 1) return window.I18N ? window.I18N.t("tomorrow") : "Tomorrow";
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString(getLocale(), { weekday: "short" });
  }

  function compass(deg) {
    if (deg == null || isNaN(deg)) return "";
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  function timeFromIso(iso) {
    if (!iso) return "--:--";
    // Open-Meteo daily sunrise/sunset format: "2024-01-01T07:42"
    const d = new Date(iso);
    return fmtClock(d);
  }

  // ---- Render ----------------------------------------------------------
  function renderClock() {
    const now = new Date();
    $("time").textContent = fmtClock(now);
    $("date").textContent = fmtDate(now);
  }

  // Local time at the displayed location, derived from its IANA timezone.
  // Shown after the city name as e.g. "Paris (local time 14:24)".
  // Hidden if the location's timezone matches the device timezone.
  function renderLocalTime() {
    const el = $("location-local");
    if (!el) return;
    const tz = CFG.locationTz;
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === deviceTz) { el.textContent = ""; el.hidden = true; return; }
    const opts = CFG.clockFormat === "12h"
      ? { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }
      : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz };
    try {
      const t = new Date().toLocaleTimeString(getLocale(), opts);
      const label = window.I18N ? window.I18N.t("localTime") : "local time";
      el.textContent = ` (${label} ${t})`;
      el.hidden = false;
    } catch (_) {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function renderToday(data) {
    const c = data.current || {};
    const daily = data.daily || {};
    const isDay = c.is_day === 1;
    const w = describe(c.weather_code, isDay);

    $("today-icon").replaceChildren(iconImg(w.icon, w.label));
    $("today-temp").textContent = fmtInt(c.temperature_2m);
    $("today-cond").textContent = w.label;
    $("today-feels").textContent = fmtInt(c.apparent_temperature) + "°";
    $("today-wind").textContent =
      fmtInt(c.wind_speed_10m) + " " + windLabel +
      (c.wind_direction_10m != null ? " " + compass(c.wind_direction_10m) : "");
    $("today-humidity").textContent = fmtInt(c.relative_humidity_2m) + "%";

    if (daily.temperature_2m_max && daily.temperature_2m_min) {
      $("today-high").textContent = fmtInt(daily.temperature_2m_max[0]);
      $("today-low").textContent = fmtInt(daily.temperature_2m_min[0]);
    }
    if (daily.precipitation_probability_max) {
      $("today-precip").textContent = fmtInt(daily.precipitation_probability_max[0]) + "%";
    }
    if (daily.sunrise && daily.sunset) {
      $("today-sunrise").textContent = timeFromIso(daily.sunrise[0]);
      $("today-sunset").textContent = timeFromIso(daily.sunset[0]);
    }

    // Headline label: prefer an explicitly chosen/configured name, otherwise
    // leave it for resolveLocationName() to fill in with the geocoded city.
    if (CFG.locationName) {
      $("location").textContent = CFG.locationName;
    }
  }

  function renderForecast(data) {
    const d = data.daily || {};
    const root = $("forecast");
    root.innerHTML = "";

    // 3-day view shows the next 3 days; week view shows the next 6
    // arranged as two rows of three.
    const isWeek = forecastView === FC_VIEWS.WEEK;
    root.classList.toggle("week", isWeek);
    const count = isWeek ? 6 : 3;

    // Show next N days (skip today, index 0)
    for (let i = 1; i <= count; i++) {
      if (!d.time || d.time[i] == null) continue;
      // Use predominant daytime condition instead of the daily "worst" code.
      const code = predominantDaytimeCode(data, i) ?? d.weather_code[i];
      const w = describe(code, true);
      const card = document.createElement("div");
      card.className = "fc-card fade-in";
      card.dataset.date = d.time[i];
      card.innerHTML = `
        <div class="fc-day">${dayName(d.time[i], i)}</div>
        <div class="fc-icon"></div>
        <div class="fc-cond">${w.label}</div>
        <div class="fc-temps">
          <span class="fc-high">${fmtInt(d.temperature_2m_max[i])}°</span>
          <span class="fc-low">${fmtInt(d.temperature_2m_min[i])}°</span>
        </div>
        <div class="fc-precip"><img class="fc-precip-icon" src="icons/umbrella.svg" alt=""/>${fmtInt(d.precipitation_probability_max[i])}%</div>
      `;
      card.querySelector(".fc-icon").appendChild(iconImg(w.icon, w.label));
      root.appendChild(card);
    }
    // Alerts may already be loaded; reapply chips to the freshly built cards.
    renderAlertChips();
  }

  // Toggle between the 3-day and 7-day forecast views and persist the
  // choice. Re-renders from the cached payload, so no refetch is needed.
  function setForecastView(view) {
    forecastView = view === FC_VIEWS.WEEK ? FC_VIEWS.WEEK : FC_VIEWS.THREE;
    try { localStorage.setItem(FC_VIEW_KEY, forecastView); } catch (_) {}
    if (lastWeatherData) renderForecast(lastWeatherData);
  }

  function toggleForecastView() {
    setForecastView(forecastView === FC_VIEWS.WEEK ? FC_VIEWS.THREE : FC_VIEWS.WEEK);
  }

  // Tapping/clicking anywhere in the forecast strip switches the view.
  // Keyboard users can do the same via Enter/Space.
  function wireForecastToggle() {
    const root = $("forecast");
    if (!root) return;
    root.addEventListener("click", toggleForecastView);
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleForecastView(); }
    });
  }

  // ---- Precipitation strip --------------------------------------------
  // Color anchors: 0% white, 50% light blue, 75% blue, 100% dark blue.
  // Values in between are linearly interpolated between the surrounding anchors.
  const PRECIP_ANCHORS = [
    { p: 0,   rgb: [255, 255, 255] }, // white
    { p: 50,  rgb: [135, 206, 250] }, // light blue (LightSkyBlue)
    { p: 75,  rgb: [ 30, 144, 255] }, // blue (DodgerBlue)
    { p: 100, rgb: [ 10,  35, 110] }, // dark blue (deep navy)
  ];

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

  function precipColor(pct) {
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    for (let i = 1; i < PRECIP_ANCHORS.length; i++) {
      const lo = PRECIP_ANCHORS[i - 1];
      const hi = PRECIP_ANCHORS[i];
      if (p <= hi.p) {
        const t = (p - lo.p) / (hi.p - lo.p);
        const r = lerp(lo.rgb[0], hi.rgb[0], t);
        const g = lerp(lo.rgb[1], hi.rgb[1], t);
        const b = lerp(lo.rgb[2], hi.rgb[2], t);
        return { fill: `rgb(${r}, ${g}, ${b})`, lum: (0.299*r + 0.587*g + 0.114*b) };
      }
    }
    const last = PRECIP_ANCHORS[PRECIP_ANCHORS.length - 1].rgb;
    return { fill: `rgb(${last[0]}, ${last[1]}, ${last[2]})`, lum: 30 };
  }

  // Find the index of the first 15-min slot at or after `now`.
  function firstUpcomingIndex(times, now) {
    for (let i = 0; i < times.length; i++) {
      // Open-Meteo returns local times as ISO without zone; treating them as
      // local matches the timezone=auto we requested.
      const t = new Date(times[i]).getTime();
      if (!isFinite(t)) continue;
      // Use the slot whose start is within the previous 15 min (so the
      // currently in-progress block is shown first).
      if (t + 15 * 60 * 1000 > now) return i;
    }
    return -1;
  }

  // ---- Native 15-min coverage detection -------------------------------
  // Open-Meteo serves minutely_15 globally, but only North America (HRRR)
  // and parts of Western/Central Europe (AROME, ICON-D2) have native 15-min
  // models. Elsewhere the data is interpolated from hourly, which is
  // misleading on the precip strip. We probe each native model with a tiny
  // request and only show the strip when at least one returns data.
  const NATIVE_15M_MODELS = ["gfs_hrrr", "meteofrance_arome_france", "icon_d2"];

  // Cache the result per ~5km grid cell to avoid re-probing on every fetch.
  const minute15CoverageCache = new Map();

  function coverageKey() {
    const lat = Number(CFG.latitude).toFixed(2);
    const lon = Number(CFG.longitude).toFixed(2);
    return `${lat},${lon}`;
  }

  async function detectMinutely15Coverage() {
    const key = coverageKey();
    if (minute15CoverageCache.has(key)) return minute15CoverageCache.get(key);

    const probes = NATIVE_15M_MODELS.map(async (model) => {
      const params = new URLSearchParams({
        latitude: String(CFG.latitude),
        longitude: String(CFG.longitude),
        minutely_15: "precipitation_probability",
        forecast_days: "1",
        models: model,
      });
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) return false;
        const data = await res.json();
        return !data.error && Array.isArray(data?.minutely_15?.time);
      } catch (_) { return false; }
    });

    const results = await Promise.all(probes);
    const covered = results.some(Boolean);
    minute15CoverageCache.set(key, covered);
    return covered;
  }

  // Render (or hide) the 15-minute precipitation strip. It's only useful
  // when Open-Meteo can serve native 15-min data here, otherwise the
  // values are linearly interpolated from hourly and the bar pattern is
  // misleading. We probe the candidate native models once per location.
  async function renderPrecipStrip(data) {
    const app = document.getElementById("app");
    const track = $("precip-track");
    const axis = $("precip-axis");
    if (!track || !axis) return;
    track.innerHTML = "";
    axis.innerHTML = "";

    const m = data.minutely_15;
    const haveData = m && Array.isArray(m.time) && Array.isArray(m.precipitation_probability);
    const covered = haveData && await detectMinutely15Coverage();

    // Hide the whole strip when data isn't natively 15-minutely; the
    // main content area reclaims its vertical space.
    if (app) app.classList.toggle("no-precip", !covered);
    if (!covered) return;

    const start = firstUpcomingIndex(m.time, Date.now());
    if (start < 0) return;

    for (let i = 0; i < 16; i++) {
      const idx = start + i;
      const t = m.time[idx];
      const pct = m.precipitation_probability[idx];
      const block = document.createElement("div");
      block.className = "precip-block";

      if (t != null && pct != null) {
        const c = precipColor(pct);
        block.style.backgroundColor = c.fill;
        // Pick black or white text for legibility against the fill color.
        const labelColor = c.lum > 160 ? "#0b1220" : "#ffffff";
        block.style.setProperty("--label", labelColor);

        const dt = new Date(t);
        const isHourStart = dt.getMinutes() === 0;
        if (isHourStart) block.classList.add("hour-start");
        block.title = `${fmtClock(dt)} - ${Math.round(pct)}%`;

        // Show the % only on hour boundaries to keep the strip readable.
        if (isHourStart) {
          const lab = document.createElement("span");
          lab.className = "pct";
          lab.textContent = Math.round(pct) + "%";
          block.appendChild(lab);
        }
      }
      track.appendChild(block);

      // Axis: hour label under each hour-start block, blank otherwise.
      const lbl = document.createElement("span");
      if (t != null && new Date(t).getMinutes() === 0) {
        lbl.textContent = fmtClock(new Date(t));
      } else {
        lbl.className = "empty";
      }
      axis.appendChild(lbl);
    }
  }

  function setStatus(msg, isError) {
    const el = $("status");
    el.textContent = msg;
    el.classList.toggle("error", !!isError);

    // The status bar is hidden by default to save vertical space. We only
    // surface it as a small floating banner when there's a real error to
    // show. "OK" / "Updating…" never become visible.
    const bar = el.parentElement;
    if (bar) bar.classList.toggle("error-visible", !!isError);
  }

  function setUpdated() {
    const label = window.I18N ? window.I18N.t("updatedAt") : "Updated";
    $("updated").textContent = `${label} ${fmtClock(new Date())}`;
  }

  // ---- Reverse geocoding ----------------------------------------------
  // Resolves the configured coordinates to a human-readable place name.
  // Uses BigDataCloud's keyless client endpoint. Cached in localStorage so
  // we only hit the network once per location.
  async function resolveLocationName() {
    const sub = $("location-sub");
    const lat = Number(CFG.latitude);
    const lon = Number(CFG.longitude);
    const cacheKey = `kiosk.geo.${lat.toFixed(3)},${lon.toFixed(3)}`;

    // Always show the coordinates as an immediate fallback.
    const coordText = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    sub.textContent = coordText;

    let cached = null;
    try { cached = localStorage.getItem(cacheKey); } catch (_) {}
    if (cached) {
      sub.textContent = cached;
      if (!CFG.locationName) $("location").textContent = cached.split(",")[0];
      return;
    }

    try {
      const lang = getLocale();
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(lang)}`;
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return;
      const g = await res.json();
      const city = g.city || g.locality || g.localityInfo?.administrative?.[3]?.name;
      const region = g.principalSubdivision || g.countrySubdivision;
      const country = g.countryCode || g.countryName;
      const parts = [city, region, country].filter(Boolean);
      if (parts.length) {
        const text = parts.join(", ");
        sub.textContent = text;
        if (!CFG.locationName && city) $("location").textContent = city;
        try { localStorage.setItem(cacheKey, text); } catch (_) {}
      }
      // Capture the country code for downstream features (e.g. FR alerts).
      if (g.countryCode && !CFG.countryCode) {
        CFG.countryCode = g.countryCode;
        fetchAlerts();
      }
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
      // Leave the coordinate fallback in place.
    }
  }

  // ---- Location picker dialog -----------------------------------------
  // Country list: ISO 3166-1 alpha-2 codes only. Display names are
  // generated via Intl.DisplayNames in the active language.
  const COUNTRY_CODES = [
    "AR","AU","AT","BE","BR","CA","CL","CN","CO","CZ","DK","EG","FI","FR","DE",
    "GR","HK","HU","IS","IN","ID","IE","IL","IT","JP","KE","MY","MX","MA","NL",
    "NZ","NO","PE","PH","PL","PT","RO","RU","SA","SG","SK","SI","ZA","KR","ES",
    "SE","CH","TW","TH","TR","UA","AE","GB","US","VN",
  ];

  const dialogState = { searchAbort: null, searchTimer: 0 };

  function openLocationDialog() {
    const dlg = $("loc-dialog");
    dlg.hidden = false;
    populateCountrySelect();
    syncLanguageSelect();
    syncCountrySelect();
    $("loc-city").value = "";
    $("loc-results").innerHTML = "";
    setHint(window.I18N ? window.I18N.t("hintPick") : "Pick a country, then search for a city.", false);
    setTimeout(() => $("loc-city").focus(), 50);
  }

  function closeLocationDialog() {
    $("loc-dialog").hidden = true;
  }

  function setHint(msg, isError) {
    const el = $("loc-hint");
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
  }

  function populateCountrySelect() {
    const sel = $("loc-country");
    sel.innerHTML = "";
    const lang = getLocale();
    let displayNames = null;
    try { displayNames = new Intl.DisplayNames([lang], { type: "region" }); } catch (_) {}

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = window.I18N ? window.I18N.t("anyCountry") : "— Any country —";
    sel.appendChild(blank);

    const items = COUNTRY_CODES.map((code) => ({
      code,
      name: (displayNames && displayNames.of(code)) || code,
    }));
    items.sort((a, b) => a.name.localeCompare(b.name, lang));

    for (const { code, name } of items) {
      const opt = document.createElement("option");
      opt.value = code; opt.textContent = name;
      sel.appendChild(opt);
    }
  }

  function syncLanguageSelect() {
    const sel = $("loc-language");
    if (!sel || !window.I18N) return;
    sel.value = window.I18N.getLang();
  }

  // Preselect the country dropdown to match the currently active location.
  // Falls back to the empty "Any country" option if the country isn't in
  // our visible list.
  function syncCountrySelect() {
    const sel = $("loc-country");
    if (!sel) return;
    const target = (CFG.countryCode || "").toUpperCase();
    if (!target) { sel.value = ""; return; }
    const has = Array.from(sel.options).some((o) => o.value === target);
    sel.value = has ? target : "";
  }

  async function searchCities() {
    const q = $("loc-city").value.trim();
    const country = $("loc-country").value;
    const list = $("loc-results");

    if (q.length < 2) {
      list.innerHTML = "";
      setHint(window.I18N ? window.I18N.t("hintTypeMore") : "Type at least 2 letters to search.", false);
      return;
    }

    if (dialogState.searchAbort) dialogState.searchAbort.abort();
    const ctrl = new AbortController();
    dialogState.searchAbort = ctrl;

    const params = new URLSearchParams({
      name: q, count: "10", language: getLocale(), format: "json",
    });
    if (country) params.set("countryCode", country);
    const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;

    setHint(window.I18N ? window.I18N.t("hintSearching") : "Searching…", false);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      renderCityResults(data.results || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      const msg = window.I18N ? window.I18N.t("hintSearchFailed")(err.message) : `Search failed: ${err.message}`;
      setHint(msg, true);
      list.innerHTML = "";
    }
  }

  function renderCityResults(results) {
    const list = $("loc-results");
    list.innerHTML = "";
    if (!results.length) {
      setHint(window.I18N ? window.I18N.t("hintNoMatch") : "No matches. Try a different spelling.", false);
      return;
    }
    const msg = window.I18N ? window.I18N.t("hintResults")(results.length) : `${results.length} results`;
    setHint(msg, false);
    for (const r of results) {
      const li = document.createElement("li");
      li.tabIndex = 0;
      const sub = [r.admin1, r.country].filter(Boolean).join(", ");
      li.innerHTML = `<strong>${escapeHtml(r.name)}</strong>${sub ? `<small>${escapeHtml(sub)}</small>` : ""}`;
      const pick = () => applyChosenLocation(r);
      li.addEventListener("click", pick);
      li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      list.appendChild(li);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function applyChosenLocation(r) {
    CFG.latitude = r.latitude;
    CFG.longitude = r.longitude;
    CFG.locationName = r.name;
    CFG.countryCode = r.country_code || "";
    CFG.locationTz = r.timezone || "";
    // The 15-min coverage decision depends on coordinates; let the next
    // fetch redo the probe.
    minute15CoverageCache.clear();
    try {
      localStorage.setItem(LOC_KEY, JSON.stringify({
        latitude: r.latitude,
        longitude: r.longitude,
        name: r.name,
        countryCode: r.country_code || "",
        timezone: r.timezone || "",
      }));
    } catch (_) {}

    // Update the headline immediately and refresh data.
    $("location").textContent = r.name;
    $("location-sub").textContent = [r.admin1, r.country].filter(Boolean).join(", ")
      || `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}`;
    closeLocationDialog();
    fetchWeather();
    fetchAlerts();
    renderLocalTime();
    // Also refresh the reverse-geocoded subline (it caches per coords).
    resolveLocationName();
  }

  function wireLocationDialog() {
    $("location-btn").addEventListener("click", openLocationDialog);
    $("loc-close").addEventListener("click", closeLocationDialog);
    $("loc-dialog").addEventListener("click", (e) => {
      if (e.target.id === "loc-dialog") closeLocationDialog();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("loc-dialog").hidden) closeLocationDialog();
    });

    const cityInput = $("loc-city");
    const countrySel = $("loc-country");
    const langSel = $("loc-language");
    const debounced = () => {
      clearTimeout(dialogState.searchTimer);
      dialogState.searchTimer = setTimeout(searchCities, 250);
    };
    cityInput.addEventListener("input", debounced);
    countrySel.addEventListener("change", () => {
      if (cityInput.value.trim().length >= 2) searchCities();
    });
    if (langSel) {
      langSel.addEventListener("change", () => {
        if (window.I18N) window.I18N.setLang(langSel.value);
      });
    }

    const gpsBtn = $("loc-gps");
    if (gpsBtn) gpsBtn.addEventListener("click", useMyLocation);
  }

  // Resolve the device's GPS coordinates and apply them as the active
  // location. Reverse-geocodes via BigDataCloud to get a proper city name
  // and country code. Timezone is filled in by the next weather fetch.
  async function useMyLocation() {
    const btn = $("loc-gps");
    if (!("geolocation" in navigator)) {
      setHint(window.I18N ? window.I18N.t("hintNoGeolocation") : "Geolocation is not available in this browser.", true);
      return;
    }
    if (!window.isSecureContext) {
      setHint(window.I18N ? window.I18N.t("hintInsecureContext") : "Geolocation needs HTTPS or localhost.", true);
      return;
    }

    btn.disabled = true;
    btn.classList.add("locating");
    setHint(window.I18N ? window.I18N.t("hintLocating") : "Locating you…", false);

    let pos;
    try {
      pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 5 * 60 * 1000,
        });
      });
    } catch (err) {
      const keys = { 1: "hintGeoDenied", 2: "hintGeoUnavailable", 3: "hintGeoTimeout" };
      const fallback = "Could not get your location.";
      const key = err && keys[err.code];
      const msg = key && window.I18N ? window.I18N.t(key) : (window.I18N ? window.I18N.t("hintGeoFailed") : fallback);
      setHint(msg, true);
      btn.disabled = false;
      btn.classList.remove("locating");
      return;
    }

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Reverse-geocode to get a city name + country code.
    let chosen = {
      name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      latitude: lat,
      longitude: lon,
      admin1: "",
      country: "",
      country_code: "",
      timezone: "",
    };
    try {
      const lang = getLocale();
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(lang)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const g = await res.json();
        const city = g.city || g.locality || g.localityInfo?.administrative?.[3]?.name;
        if (city) chosen.name = city;
        chosen.admin1 = g.principalSubdivision || "";
        chosen.country = g.countryName || "";
        chosen.country_code = g.countryCode || "";
      }
    } catch (_) { /* keep coordinate fallback */ }

    btn.disabled = false;
    btn.classList.remove("locating");

    // Reuse the standard apply path so weather, alerts, local time and the
    // headline all stay in sync.
    applyChosenLocation(chosen);
  }

  // ---- Météo-France Vigilance alerts (France only) --------------------
  // Vigilance color levels: 1=green, 2=yellow, 3=orange, 4=red.
  const ALERT_LEVELS = { 2: "yellow", 3: "orange", 4: "red" };
  const MF_TOKEN = "__Wj7dVSTjV9YGu1guveLyDq0g7S7TfTjaHBTPTpO0kj8__";

  // In-memory cache: { "YYYY-MM-DD": { color, reasonIds: [string, …] } }
  // Reason IDs are kept untranslated so we can re-render in any language.
  let alertsByDay = {};

  function dayKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function clearAlertChips() {
    alertsByDay = {};
    const t = $("today-alert");
    if (t) { t.hidden = true; t.className = "alert-chip"; t.textContent = ""; }
    const todayCard = $("today");
    if (todayCard) todayCard.classList.remove("vigilance-yellow", "vigilance-orange", "vigilance-red");
    document.querySelectorAll("#forecast .alert-chip").forEach((el) => el.remove());
  }

  async function resolveDepartmentCode() {
    const lat = Number(CFG.latitude);
    const lon = Number(CFG.longitude);
    const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=codeDepartement,departement&format=json&geometry=centre`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("geo.api.gouv.fr HTTP " + res.status);
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) return null;
    const c = arr[0];
    const code = c.codeDepartement || null;
    if (!code) return null;
    const name = (c.departement && c.departement.nom) || "";
    deptSlug = slugifyDept(name);
    return code;
  }

  // Slugify a French department name into the form used by
  // vigilance.meteofrance.fr URLs (e.g. "Loire-Atlantique" -> "loire-atlantique").
  function slugifyDept(s) {
    if (!s) return "";
    return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  let deptSlug = "";

  async function fetchAlerts() {
    if ((CFG.countryCode || "").toUpperCase() !== "FR") {
      clearAlertChips();
      return;
    }
    try {
      const dept = await resolveDepartmentCode();
      if (!dept) { clearAlertChips(); return; }
      // Fetch today (J0) and tomorrow (J+1) vigilance bulletins.
      const [j0, j1] = await Promise.all([
        fetchVigilance(dept, null),
        fetchVigilance(dept, "J1"),
      ]);
      const byDay = {};
      mergeVigilanceInto(byDay, j0);
      mergeVigilanceInto(byDay, j1);

      // Convert reason sets to arrays for easier rendering.
      alertsByDay = {};
      for (const [k, v] of Object.entries(byDay)) {
        alertsByDay[k] = {
          color: v.color,
          topReasonIds: Array.from(v.topReasons),
          allReasonIds: Array.from(v.allReasons),
          dept,
        };
      }
      renderAlertChips();
    } catch (err) {
      console.warn("Alerts fetch failed:", err);
      clearAlertChips();
    }
  }

  // One Vigilance request. `echeance` is null for today (J0), "J1" for
  // tomorrow. Returns the parsed JSON or null on failure.
  async function fetchVigilance(dept, echeance) {
    const params = new URLSearchParams({ domain: dept, token: MF_TOKEN });
    if (echeance) params.set("echeance", echeance);
    const url = `https://webservice.meteofrance.com/v3/warning/full?${params.toString()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  // Aggregate Vigilance timelaps_items into per-day buckets in `byDay`.
  // Tracks the highest color level and which phenomena reach that level
  // (for the chip text) plus all phenomena that triggered any alert (for
  // the tooltip).
  function mergeVigilanceInto(byDay, data) {
    if (!data || !Array.isArray(data.timelaps)) return;
    const oneDay = 24 * 60 * 60 * 1000;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 4 * oneDay); // today + 3 days

    for (const ph of data.timelaps) {
      const phId = String(ph.phenomenon_id);
      for (const item of ph.timelaps_items || []) {
        if (!item.color_id || item.color_id < 2) continue; // only yellow+
        let cur = new Date(item.begin_time * 1000); cur.setHours(0, 0, 0, 0);
        const end = new Date(item.end_time * 1000);
        while (cur < end && cur < horizon) {
          if (cur >= today) {
            const key = dayKey(cur);
            const slot = byDay[key] || (byDay[key] = {
              color: 0,
              allReasons: new Set(),
              topReasons: new Set(),
            });
            slot.allReasons.add(phId);
            if (item.color_id > slot.color) {
              slot.color = item.color_id;
              slot.topReasons = new Set([phId]);
            } else if (item.color_id === slot.color) {
              slot.topReasons.add(phId);
            }
          }
          cur = new Date(cur.getTime() + oneDay);
        }
      }
    }
  }

  function chipFor(level, label) {
    const cls = ALERT_LEVELS[level];
    if (!cls) return null;
    const el = document.createElement("div");
    el.className = `alert-chip alert-${cls}`;
    el.textContent = label || (window.I18N ? window.I18N.t("alert" + cls.charAt(0).toUpperCase() + cls.slice(1)) : cls);
    return el;
  }

  function reasonText(reasonIds) {
    if (!Array.isArray(reasonIds) || !reasonIds.length) return "";
    return reasonIds
      .map((id) => (window.I18N ? window.I18N.tAlert(id) : id))
      .filter(Boolean)
      .join(", ");
  }

  function chipLabel(reasonIds, fallbackLevelKey) {
    const text = reasonText(reasonIds);
    if (text) return text;
    return window.I18N ? window.I18N.t(fallbackLevelKey) : fallbackLevelKey;
  }

  function renderAlertChips() {
    // Today's chip
    const todayKey = dayKey(new Date());
    const todayChip = $("today-alert");
    const todayCard = $("today");
    // Remove any previous vigilance border
    if (todayCard) todayCard.classList.remove("vigilance-yellow", "vigilance-orange", "vigilance-red");

    if (todayChip) {
      const a = alertsByDay[todayKey];
      if (a && a.color >= 2) {
        const cls = ALERT_LEVELS[a.color];
        const fallbackKey = "alert" + cls.charAt(0).toUpperCase() + cls.slice(1);
        todayChip.className = `alert-chip alert-${cls} alert-link`;
        todayChip.textContent = chipLabel(a.topReasonIds, fallbackKey);
        todayChip.title = reasonText(a.allReasonIds);
        // Show as a link to the official Vigilance page for this dept.
        const slug = deptSlug || "";
        const href = slug
          ? `https://vigilance.meteofrance.fr/fr/${slug}`
          : "https://vigilance.meteofrance.fr/";
        todayChip.setAttribute("href", href);
        todayChip.setAttribute("target", "_blank");
        todayChip.setAttribute("rel", "noopener");
        todayChip.hidden = false;
        // Apply vigilance border to the today card (yellow, orange, red only)
        if (todayCard && cls) todayCard.classList.add(`vigilance-${cls}`);
      } else {
        todayChip.hidden = true;
        todayChip.className = "alert-chip";
        todayChip.textContent = "";
        todayChip.title = "";
        todayChip.removeAttribute("href");
      }
    }

    // Tomorrow's forecast card: apply vigilance border (orange/red only)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dayKey(tomorrow);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    // Find the forecast card for tomorrow by its data-date attribute
    const tomorrowCard = document.querySelector(`#forecast .fc-card[data-date="${tomorrowIso}"]`);
    if (tomorrowCard) {
      tomorrowCard.classList.remove("vigilance-yellow", "vigilance-orange", "vigilance-red");
      const a = alertsByDay[tomorrowKey];
      if (a && a.color >= 2) { // yellow (2), orange (3), or red (4)
        const cls = ALERT_LEVELS[a.color];
        if (cls) tomorrowCard.classList.add(`vigilance-${cls}`);
      }
    }

    // Remove any leftover alert chips on forecast cards.
    document.querySelectorAll("#forecast .alert-chip").forEach((el) => el.remove());
  }

  // ---- Fetch loop ------------------------------------------------------
  async function fetchWeather() {
    setStatus(window.I18N ? window.I18N.t("updating") : "Updating…", false);
    try {
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      // Open-Meteo echoes the resolved IANA timezone when timezone=auto.
      if (data && data.timezone && data.timezone !== "auto") {
        CFG.locationTz = data.timezone;
      }
      lastWeatherData = data;
      renderToday(data);
      renderForecast(data);
      renderPrecipStrip(data);
      setStatus(window.I18N ? window.I18N.t("ok") : "OK", false);
      setUpdated();
    } catch (err) {
      console.error(err);
      const prefix = window.I18N ? window.I18N.t("offline") : "Offline";
      setStatus(`${prefix}: ${err.message}`, true);
    }
  }

  // ---- Init ------------------------------------------------------------
  // Latest weather payload kept around so a language change can re-render
  // localized labels (day names, condition text) without refetching.
  let lastWeatherData = null;

  // ---- Zoom-to-fit -----------------------------------------------------
  // The UI is designed at 800x480. To support arbitrary landscape screens
  // we scale the whole #app via a CSS transform. We pick the largest scale
  // that keeps both axes inside the viewport (letterboxing if aspect ratios
  // differ). Portrait orientation is intentionally not optimized.
  const DESIGN_W = 800;
  const DESIGN_H = 480;

  function setupScale() {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const apply = () => {
      // Use the stage's content box rather than window.innerWidth so the
      // safe-area padding (iPhone notch, Android gesture bar) is honored
      // when running as an installed PWA in standalone mode.
      const w = stage.clientWidth || window.innerWidth || document.documentElement.clientWidth;
      const h = stage.clientHeight || window.innerHeight || document.documentElement.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / DESIGN_W, h / DESIGN_H);
      stage.style.setProperty("--stage-scale", String(s));
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
  }

  // ---- Fullscreen toggle ----------------------------------------------
  // The standard Fullscreen API works on desktop (Chrome, Firefox, Edge,
  // Safari) and Android browsers. iPhone Safari does not implement it,
  // so we feature-detect and only show the toggle button where it
  // actually works. iPhone users get the same chrome-free experience by
  // installing the PWA (Add to Home Screen), which honors
  // `display: fullscreen` from the manifest.
  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function fullscreenSupported() {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  async function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (_) { /* user gesture missing or denied */ }
  }

  async function exitFullscreen() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
  }

  function setupFullscreen() {
    const btn = document.getElementById("fullscreen-btn");
    if (!btn) return;

    // No point showing the button when the API isn't available at all
    // (iPhone Safari). Browser-managed fullscreen still works inside an
    // installed PWA window on desktop, so we don't hide the button there.
    if (!fullscreenSupported()) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;

    const sync = () => btn.classList.toggle("is-fullscreen", !!fullscreenElement());
    sync();

    btn.addEventListener("click", () => {
      if (fullscreenElement()) exitFullscreen();
      else enterFullscreen();
    });

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);

    // Keyboard shortcut: F toggles, Esc is handled natively by the browser.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "f" && e.key !== "F") return;
      // Don't hijack typing in the location dialog inputs.
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (fullscreenElement()) exitFullscreen();
      else enterFullscreen();
    });
  }

  function init() {
    // Wire up the fullscreen toggle first so it works even before a
    // location is configured (the button has nothing to do with config).
    setupFullscreen();

    if (CFG.latitude == null || CFG.longitude == null) {
      setStatus(window.I18N ? window.I18N.t("hintConfigure") : "Set latitude/longitude in config.js", true);
      return;
    }

    setupScale();
    // Apply translations to all elements with data-i18n attributes.
    if (window.I18N) {
      window.I18N.applyToDOM();
      window.I18N.onChange(() => {
        window.I18N.applyToDOM();
        // Rebuild widgets that contain localized values.
        populateCountrySelect();
        if (lastWeatherData) {
          renderToday(lastWeatherData);
          renderForecast(lastWeatherData);
          renderPrecipStrip(lastWeatherData);
        }
        renderAlertChips();
        renderClock();
        renderLocalTime();
        setUpdated();
      });
    }

    renderClock();
    setInterval(renderClock, 1000);
    renderLocalTime();
    setInterval(renderLocalTime, 1000);

    // Show configured label immediately if any; resolve the real city name async.
    if (CFG.locationName) $("location").textContent = CFG.locationName;
    resolveLocationName();
    wireLocationDialog();
    wireForecastToggle();

    fetchWeather();
    fetchAlerts();
    const refreshMs = Math.max(1, Number(CFG.refreshMinutes) || 15) * 60 * 1000;
    setInterval(fetchWeather, refreshMs);
    setInterval(fetchAlerts, refreshMs);

    // Refetch when the tab becomes visible again (e.g. wake from screensaver)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { fetchWeather(); fetchAlerts(); }
    });

    // Full page reload once a day (between 03:00 and 04:00 local time) so
    // the browser picks up any new version of the static assets without
    // manual refresh. A random offset spreads traffic across the hour.
    function scheduleDailyReload() {
      const now = new Date();
      const next = new Date(now);
      next.setHours(3, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      // Add a random jitter of 0–59 minutes to avoid thundering herd
      const jitterMs = Math.floor(Math.random() * 60 * 60 * 1000);
      const ms = (next - now) + jitterMs;
      setTimeout(() => location.reload(), ms);
    }
    scheduleDailyReload();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
