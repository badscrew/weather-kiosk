"""Fetch weather data from Open-Meteo for Andrésy, France and print it."""

import urllib.request
import urllib.parse
import json
from datetime import datetime

LATITUDE = 48.979
LONGITUDE = 2.051

params = urllib.parse.urlencode({
    "latitude": LATITUDE,
    "longitude": LONGITUDE,
    "current": ",".join([
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "is_day",
    ]),
    "hourly": ",".join([
        "weather_code",
        "temperature_2m",
        "precipitation_probability",
    ]),
    "minutely_15": "precipitation_probability",
    "daily": ",".join([
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "precipitation_sum",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "sunrise",
        "sunset",
    ]),
    "timezone": "Europe/Paris",
    "temperature_unit": "celsius",
    "wind_speed_unit": "kmh",
    "precipitation_unit": "mm",
    "forecast_days": 7,
})

# WMO weather code descriptions
WMO_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def wmo_description(code):
    return WMO_DESCRIPTIONS.get(code, f"Unknown ({code})")


url = f"https://api.open-meteo.com/v1/forecast?{params}"

with urllib.request.urlopen(url) as response:
    data = json.loads(response.read().decode())

# --- Current conditions ---
current = data["current"]
print("=" * 60)
print(f"  Weather for Andrésy ({LATITUDE}°N, {LONGITUDE}°E)")
print(f"  Fetched at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

print("\n--- Current Conditions ---")
print(f"  Temperature:        {current['temperature_2m']} °C")
print(f"  Feels like:         {current['apparent_temperature']} °C")
print(f"  Humidity:           {current['relative_humidity_2m']} %")
print(f"  Precipitation:      {current['precipitation']} mm")
print(f"  Condition:          {wmo_description(current['weather_code'])}")
print(f"  Wind speed:         {current['wind_speed_10m']} km/h")
print(f"  Wind direction:     {current['wind_direction_10m']}°")
print(f"  Is daytime:         {'Yes' if current['is_day'] else 'No'}")

# --- 15-minute precipitation probability ---
minutely = data.get("minutely_15", {})
times_15 = minutely.get("time", [])
precip_prob = minutely.get("precipitation_probability", [])

print("\n--- 15-Minute Precipitation Probability (next 4 hours) ---")
now = datetime.now()
shown = 0
for t, p in zip(times_15, precip_prob):
    slot_time = datetime.fromisoformat(t)
    if slot_time >= now and shown < 16:
        print(f"  {slot_time.strftime('%H:%M')}  {p if p is not None else 'N/A'}%")
        shown += 1
if shown == 0 or all(p is None for p in precip_prob):
    print("  (Not available for this model)")


# --- Daily forecast ---
daily = data["daily"]
print("\n--- 7-Day Forecast ---")
print(f"  {'Date':<12} {'Condition':<26} {'High':<6} {'Low':<6} {'Precip%':<8} {'Rain mm':<8} {'Wind':<7} {'Gusts':<7} {'Sunrise':<6} {'Sunset'}")
print(f"  {'-'*12} {'-'*26} {'-'*6} {'-'*6} {'-'*8} {'-'*8} {'-'*7} {'-'*7} {'-'*6} {'-'*6}")

def fmt_val(val, fmt=".1f", suffix=""):
    """Format a value, returning 'N/A' if None."""
    if val is None:
        return "N/A"
    return f"{val:{fmt}}{suffix}"


for i in range(len(daily["time"])):
    sunrise = daily["sunrise"][i].split("T")[1] if "T" in daily["sunrise"][i] else daily["sunrise"][i]
    sunset = daily["sunset"][i].split("T")[1] if "T" in daily["sunset"][i] else daily["sunset"][i]
    precip_pct = daily['precipitation_probability_max'][i]
    print(
        f"  {daily['time'][i]:<12} "
        f"{wmo_description(daily['weather_code'][i]):<26} "
        f"{fmt_val(daily['temperature_2m_max'][i]):<6} "
        f"{fmt_val(daily['temperature_2m_min'][i]):<6} "
        f"{str(precip_pct if precip_pct is not None else 'N/A'):<8} "
        f"{fmt_val(daily['precipitation_sum'][i]):<8} "
        f"{fmt_val(daily['wind_speed_10m_max'][i]):<7} "
        f"{fmt_val(daily['wind_gusts_10m_max'][i]):<7} "
        f"{sunrise:<6} "
        f"{sunset}"
    )

print()

# --- Hourly weather code breakdown ---
hourly = data.get("hourly", {})
hourly_times = hourly.get("time", [])
hourly_codes = hourly.get("weather_code", [])

if hourly_times and hourly_codes:
    print("--- Hourly Weather Code (by day) ---")
    current_date = None
    for t, code in zip(hourly_times, hourly_codes):
        dt = datetime.fromisoformat(t)
        day = dt.strftime("%Y-%m-%d")
        if day != current_date:
            current_date = day
            weekday = dt.strftime("%A")
            print(f"\n  {day} ({weekday}):")
            print(f"    {'Hour':<6} {'Code':<4} {'Condition'}")
            print(f"    {'-'*5}  {'-'*4} {'-'*24}")
        desc = wmo_description(code) if code is not None else "N/A"
        print(f"    {dt.strftime('%H:%M'):<6} {str(code) if code is not None else 'N/A':<4} {desc}")

print()
