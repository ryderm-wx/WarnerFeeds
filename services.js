import { AppState } from "./state.js";
import { CITY_STATIONS, riskLevels } from "./config.js";
import { getCardinalDirection } from "./utils.js";

export async function syncWithTimeServer() {
  const urls = [
    "https://worldtimeapi.org/api/timezone/America/New_York",
    "https://timeapi.io/api/Time/current/zone?timeZone=America/New_York",
  ];
  for (const url of urls) {
    try {
      const t0 = Date.now();
      const resp = await fetch(url);
      const data = await resp.json();
      // Handle both datetime formats: worldtimeapi uses 'datetime', timeapi.io uses 'dateTime'
      const timeStr = data.datetime || data.dateTime;
      if (!timeStr) {
        console.warn(`⚠️ Missing datetime field in response from ${url}`);
        continue;
      }
      const serverTime = new Date(timeStr).getTime();
      AppState.serverTimeOffset =
        serverTime + (Date.now() - t0) / 2 - Date.now();
      console.log("✅ Time synced with server");
      return;
    } catch (e) {
      console.warn(`⚠️ Failed to sync with ${url}:`, e);
    }
  }
  // Fallback to system clock if all time servers fail
  console.warn("⚠️ All time servers failed. Using system clock.");
  AppState.serverTimeOffset = 0;
}

export async function fetchWeatherForCity(city, station) {
  try {
    const resp = await fetch(
      `https://api.weather.gov/stations/${station}/observations/latest`,
    );
    const json = await resp.json();
    const obs = json.properties;
    const tempF = obs.temperature?.value
      ? ((obs.temperature.value * 9) / 5 + 32).toFixed(1)
      : "N/A";
    AppState.lastFetchedData.set(city, {
      tempF,
      text: obs.textDescription || "unknown",
      windSpeed: obs.windSpeed?.value
        ? (obs.windSpeed.value * 0.621371).toFixed(0)
        : "N/A",
      cardinalDirection: getCardinalDirection(
        obs.windDirection?.value ?? "N/A",
      ),
      humidity: obs.relativeHumidity?.value
        ? `${Math.round(obs.relativeHumidity.value)}%`
        : "N/A",
      pressureInHg: obs.barometricPressure?.value
        ? (obs.barometricPressure.value / 3386.39).toFixed(2)
        : "N/A",
    });
  } catch (err) {
    console.error("Weather fetch error", err);
  }
}

export async function fetchSpcTable() {
  const url = "https://www.spc.noaa.gov/products/outlook/ac1_0600_SItable.html"; // Simplified logic
  const resp = await fetch(url);
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table table tr")].slice(1);
  return rows.map((tr) => {
    const tds = tr.querySelectorAll("td");
    return {
      name: tds[0].innerText.trim().toUpperCase(),
      pop: tds[2].innerText.replace(/[^\d]/g, ""),
      cities: tds[3].innerText.trim().replace(/\.\.\./g, ", "),
    };
  });
}
