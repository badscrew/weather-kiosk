/* Weather Kiosk - internationalization
 * Supported languages: en, fr, es, de
 *
 * The active language is stored under window.KIOSK_LANG and persisted in
 * localStorage under "kiosk.lang". App code reads strings via t(key) and
 * weather/alert labels via tWmo(code) / tAlert(id).
 */

window.I18N = (function () {
  "use strict";

  const SUPPORTED = ["en", "fr", "es", "de"];
  const STORE_KEY = "kiosk.lang";
  const DEFAULT = "en";

  // ---- UI strings -----------------------------------------------------
  const UI = {
    en: {
      appTitle: "Weather Kiosk",
      loading: "Loading…",
      offline: "Offline",
      ok: "OK",
      updating: "Updating…",
      updatedAt: "Updated",
      hiAbbr: "H",
      loAbbr: "L",
      feels: "Feels",
      wind: "Wind",
      humidity: "Humidity",
      rain: "Rain",
      sunrise: "Sunrise",
      sunset: "Sunset",
      precipTitle: "Precipitation probability · next 4 h",
      precipAria: "Precipitation probability for the next 4 hours",
      today: "Today",
      tomorrow: "Tomorrow",
      localTime: "local time",
      // Dialog
      dialogTitle: "Choose location",
      closeAria: "Close",
      useMyLocation: "Use my location",
      orPickCity: "or pick a city",
      language: "Language",
      country: "Country",
      city: "City",
      anyCountry: "— Any country —",
      cityPlaceholder: "Type at least 2 letters…",
      hintPick: "Pick a country, then search for a city.",
      hintTypeMore: "Type at least 2 letters to search.",
      hintSearching: "Searching…",
      hintNoMatch: "No matches. Try a different spelling.",
      hintResults: (n) => `${n} result${n === 1 ? "" : "s"}. Tap one to use it.`,
      hintSearchFailed: (msg) => `Search failed: ${msg}`,
      hintLocating: "Locating you…",
      hintNoGeolocation: "Geolocation is not available in this browser.",
      hintInsecureContext: "Geolocation needs HTTPS or localhost. Try http://127.0.0.1:8000.",
      hintGeoDenied: "Permission denied. Allow location access in your browser settings.",
      hintGeoUnavailable: "Position unavailable. Try again or pick a city manually.",
      hintGeoTimeout: "Locating timed out. Try again.",
      hintGeoFailed: "Could not get your location.",
      hintConfigure: "Set latitude/longitude in config.js",
      // Alert chip labels
      alertYellow: "yellow",
      alertOrange: "orange",
      alertRed: "red",
    },
    fr: {
      appTitle: "Kiosque Météo",
      loading: "Chargement…",
      offline: "Hors ligne",
      ok: "OK",
      updating: "Mise à jour…",
      updatedAt: "Mis à jour",
      hiAbbr: "H",
      loAbbr: "B",
      feels: "Ressenti",
      wind: "Vent",
      humidity: "Humidité",
      rain: "Pluie",
      sunrise: "Lever",
      sunset: "Coucher",
      precipTitle: "Probabilité de précipitations · 4 prochaines h",
      precipAria: "Probabilité de précipitations pour les 4 prochaines heures",
      today: "Aujourd’hui",
      tomorrow: "Demain",
      localTime: "heure locale",
      dialogTitle: "Choisir un lieu",
      closeAria: "Fermer",
      useMyLocation: "Utiliser ma position",
      orPickCity: "ou choisir une ville",
      language: "Langue",
      country: "Pays",
      city: "Ville",
      anyCountry: "— Tous les pays —",
      cityPlaceholder: "Saisir au moins 2 lettres…",
      hintPick: "Choisissez un pays, puis cherchez une ville.",
      hintTypeMore: "Saisissez au moins 2 lettres pour rechercher.",
      hintSearching: "Recherche…",
      hintNoMatch: "Aucun résultat. Essayez une autre orthographe.",
      hintResults: (n) => `${n} résultat${n === 1 ? "" : "s"}. Touchez-en un pour l’utiliser.`,
      hintSearchFailed: (msg) => `Échec de la recherche : ${msg}`,
      hintLocating: "Localisation en cours…",
      hintNoGeolocation: "La géolocalisation n’est pas disponible dans ce navigateur.",
      hintInsecureContext: "La géolocalisation requiert HTTPS ou localhost. Essayez http://127.0.0.1:8000.",
      hintGeoDenied: "Autorisation refusée. Activez l’accès à la position dans les paramètres du navigateur.",
      hintGeoUnavailable: "Position indisponible. Réessayez ou choisissez une ville.",
      hintGeoTimeout: "Délai de localisation dépassé. Réessayez.",
      hintGeoFailed: "Impossible d’obtenir votre position.",
      hintConfigure: "Définissez latitude/longitude dans config.js",
      alertYellow: "jaune",
      alertOrange: "orange",
      alertRed: "rouge",
    },
    es: {
      appTitle: "Quiosco del Tiempo",
      loading: "Cargando…",
      offline: "Sin conexión",
      ok: "OK",
      updating: "Actualizando…",
      updatedAt: "Actualizado",
      hiAbbr: "M",
      loAbbr: "m",
      feels: "Sensación",
      wind: "Viento",
      humidity: "Humedad",
      rain: "Lluvia",
      sunrise: "Salida",
      sunset: "Puesta",
      precipTitle: "Probabilidad de precipitación · próximas 4 h",
      precipAria: "Probabilidad de precipitación para las próximas 4 horas",
      today: "Hoy",
      tomorrow: "Mañana",
      localTime: "hora local",
      dialogTitle: "Elegir ubicación",
      closeAria: "Cerrar",
      useMyLocation: "Usar mi ubicación",
      orPickCity: "o elegir una ciudad",
      language: "Idioma",
      country: "País",
      city: "Ciudad",
      anyCountry: "— Cualquier país —",
      cityPlaceholder: "Escribe al menos 2 letras…",
      hintPick: "Elige un país y luego busca una ciudad.",
      hintTypeMore: "Escribe al menos 2 letras para buscar.",
      hintSearching: "Buscando…",
      hintNoMatch: "Sin resultados. Prueba otra ortografía.",
      hintResults: (n) => `${n} resultado${n === 1 ? "" : "s"}. Toca uno para usarlo.`,
      hintSearchFailed: (msg) => `Error de búsqueda: ${msg}`,
      hintLocating: "Localizando…",
      hintNoGeolocation: "La geolocalización no está disponible en este navegador.",
      hintInsecureContext: "La geolocalización requiere HTTPS o localhost. Prueba http://127.0.0.1:8000.",
      hintGeoDenied: "Permiso denegado. Permite el acceso a la ubicación en el navegador.",
      hintGeoUnavailable: "Posición no disponible. Vuelve a intentarlo o elige una ciudad.",
      hintGeoTimeout: "Tiempo de localización agotado. Inténtalo de nuevo.",
      hintGeoFailed: "No se pudo obtener tu ubicación.",
      hintConfigure: "Configura latitude/longitude en config.js",
      alertYellow: "amarilla",
      alertOrange: "naranja",
      alertRed: "roja",
    },
    de: {
      appTitle: "Wetter-Kiosk",
      loading: "Lade…",
      offline: "Offline",
      ok: "OK",
      updating: "Aktualisiere…",
      updatedAt: "Aktualisiert",
      hiAbbr: "H",
      loAbbr: "T",
      feels: "Gefühlt",
      wind: "Wind",
      humidity: "Luftfeuchte",
      rain: "Regen",
      sunrise: "Sonnenaufgang",
      sunset: "Sonnenuntergang",
      precipTitle: "Niederschlagswahrscheinlichkeit · nächste 4 Std.",
      precipAria: "Niederschlagswahrscheinlichkeit für die nächsten 4 Stunden",
      today: "Heute",
      tomorrow: "Morgen",
      localTime: "Ortszeit",
      dialogTitle: "Ort wählen",
      closeAria: "Schließen",
      useMyLocation: "Meinen Standort verwenden",
      orPickCity: "oder Stadt auswählen",
      language: "Sprache",
      country: "Land",
      city: "Stadt",
      anyCountry: "— Beliebiges Land —",
      cityPlaceholder: "Mindestens 2 Buchstaben eingeben…",
      hintPick: "Land wählen und dann nach einer Stadt suchen.",
      hintTypeMore: "Mindestens 2 Buchstaben eingeben.",
      hintSearching: "Suche…",
      hintNoMatch: "Keine Treffer. Andere Schreibweise versuchen.",
      hintResults: (n) => `${n} Treffer. Tippen zum Auswählen.`,
      hintSearchFailed: (msg) => `Suche fehlgeschlagen: ${msg}`,
      hintLocating: "Standort wird ermittelt…",
      hintNoGeolocation: "Geolocation ist in diesem Browser nicht verfügbar.",
      hintInsecureContext: "Geolocation benötigt HTTPS oder localhost. Versuche http://127.0.0.1:8000.",
      hintGeoDenied: "Berechtigung verweigert. Standortzugriff in den Browser-Einstellungen erlauben.",
      hintGeoUnavailable: "Standort nicht verfügbar. Erneut versuchen oder Stadt manuell wählen.",
      hintGeoTimeout: "Zeitüberschreitung bei der Standortermittlung. Erneut versuchen.",
      hintGeoFailed: "Standort konnte nicht ermittelt werden.",
      hintConfigure: "Latitude/Longitude in config.js setzen",
      alertYellow: "gelb",
      alertOrange: "orange",
      alertRed: "rot",
    },
  };

  // ---- WMO weather code labels ---------------------------------------
  // Codes per https://open-meteo.com/en/docs (WMO)
  const WMO_LABELS = {
    en: {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Rime fog",
      51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
      56: "Freezing drizzle", 57: "Freezing drizzle",
      61: "Light rain", 63: "Rain", 65: "Heavy rain",
      66: "Freezing rain", 67: "Freezing rain",
      71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers",
      85: "Snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Thunderstorm + hail",
    },
    fr: {
      0: "Ciel clair", 1: "Plutôt clair", 2: "Partiellement nuageux", 3: "Couvert",
      45: "Brouillard", 48: "Brouillard givrant",
      51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
      56: "Bruine verglaçante", 57: "Bruine verglaçante",
      61: "Pluie faible", 63: "Pluie", 65: "Pluie forte",
      66: "Pluie verglaçante", 67: "Pluie verglaçante",
      71: "Neige faible", 73: "Neige", 75: "Neige forte", 77: "Grésil",
      80: "Averses", 81: "Averses", 82: "Averses violentes",
      85: "Averses de neige", 86: "Averses de neige fortes",
      95: "Orage", 96: "Orage + grêle", 99: "Orage + grêle",
    },
    es: {
      0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Cubierto",
      45: "Niebla", 48: "Niebla helada",
      51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna fuerte",
      56: "Llovizna helada", 57: "Llovizna helada",
      61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia fuerte",
      66: "Lluvia helada", 67: "Lluvia helada",
      71: "Nieve ligera", 73: "Nieve", 75: "Nieve fuerte", 77: "Granos de nieve",
      80: "Chubascos", 81: "Chubascos", 82: "Chubascos fuertes",
      85: "Chubascos de nieve", 86: "Chubascos de nieve fuertes",
      95: "Tormenta", 96: "Tormenta con granizo", 99: "Tormenta con granizo",
    },
    de: {
      0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bedeckt",
      45: "Nebel", 48: "Reifnebel",
      51: "Leichter Nieselregen", 53: "Nieselregen", 55: "Starker Nieselregen",
      56: "Gefrierender Nieselregen", 57: "Gefrierender Nieselregen",
      61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
      66: "Gefrierender Regen", 67: "Gefrierender Regen",
      71: "Leichter Schneefall", 73: "Schneefall", 75: "Starker Schneefall", 77: "Schneegriesel",
      80: "Regenschauer", 81: "Regenschauer", 82: "Starke Regenschauer",
      85: "Schneeschauer", 86: "Starke Schneeschauer",
      95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel",
    },
  };

  // ---- Météo-France phenomenon labels --------------------------------
  const ALERT_LABELS = {
    en: {
      "1": "High winds", "2": "Rain & flood", "3": "Thunderstorms", "4": "Flood",
      "5": "Snow & ice", "6": "Heatwave", "7": "Extreme cold",
      "8": "Avalanches", "9": "Coastal flooding",
    },
    fr: {
      "1": "Vent violent", "2": "Pluie-inondation", "3": "Orages", "4": "Inondation",
      "5": "Neige-verglas", "6": "Canicule", "7": "Grand-froid",
      "8": "Avalanches", "9": "Vagues-submersion",
    },
    es: {
      "1": "Viento fuerte", "2": "Lluvia e inundación", "3": "Tormentas", "4": "Inundación",
      "5": "Nieve y hielo", "6": "Ola de calor", "7": "Frío extremo",
      "8": "Avalanchas", "9": "Marejada costera",
    },
    de: {
      "1": "Sturm", "2": "Regen & Überschwemmung", "3": "Gewitter", "4": "Überschwemmung",
      "5": "Schnee & Eis", "6": "Hitzewelle", "7": "Extreme Kälte",
      "8": "Lawinen", "9": "Sturmflut",
    },
  };

  // ---- Internal state -------------------------------------------------
  let current = DEFAULT;
  const listeners = new Set();

  function detectInitial() {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (_) {}
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : DEFAULT;
  }

  function getLang() { return current; }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    current = lang;
    try { localStorage.setItem(STORE_KEY, lang); } catch (_) {}
    document.documentElement.lang = lang;
    applyToDOM();
    listeners.forEach((fn) => { try { fn(lang); } catch (_) {} });
  }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function t(key) {
    const dict = UI[current] || UI[DEFAULT];
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    return UI[DEFAULT][key] || key;
  }

  function tWmo(code) {
    const dict = WMO_LABELS[current] || WMO_LABELS[DEFAULT];
    if (code in dict) return dict[code];
    if (code in WMO_LABELS[DEFAULT]) return WMO_LABELS[DEFAULT][code];
    return "";
  }

  function tAlert(id) {
    const dict = ALERT_LABELS[current] || ALERT_LABELS[DEFAULT];
    return dict[String(id)] || ALERT_LABELS[DEFAULT][String(id)] || "";
  }

  // Walk the DOM and apply translations to elements with data-i18n[*] attrs.
  function applyToDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const v = t(key);
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const attr = el.getAttribute("data-i18n-attr");
      const key = el.getAttribute("data-i18n-attr-key");
      const v = t(key);
      if (typeof v === "string") el.setAttribute(attr, v);
    });
  }

  // Public init: sets language but does NOT yet apply to DOM (caller may
  // want to wait until DOMContentLoaded).
  function init() {
    current = detectInitial();
    document.documentElement.lang = current;
  }

  init();

  return {
    SUPPORTED,
    getLang,
    setLang,
    onChange,
    t,
    tWmo,
    tAlert,
    applyToDOM,
  };
})();
