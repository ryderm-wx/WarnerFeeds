import { AppState } from "./state.js";
import {
  CITY_STATIONS,
  priority,
  SEMICIRCLE_COUNT_TOGGLE_KEY,
} from "./config.js";
import { syncWithTimeServer, fetchWeatherForCity } from "./services.js";
import { getEventName, formatRawTextForBar } from "./alert-processing.js";
import {
  updateCountiesText,
  updateDashboard,
  initAlertStream,
} from "./logic-controller.js"; // Note: see note below

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Toggles
  const rawToggle = document.getElementById("rawTextToggle");
  if (rawToggle) {
    rawToggle.checked =
      localStorage.getItem("showRawTextInCounties") === "true";
    rawToggle.addEventListener("change", () => {
      localStorage.setItem("showRawTextInCounties", rawToggle.checked);
      updateDashboard(true);
    });
  }

  // 2. Start Services
  syncWithTimeServer();
  initAlertStream();

  // 3. Start Loops
  setInterval(updateClock, 1000);
  startRotatingCities();

  // 4. Register Visibility Events
  document.addEventListener("visibilitychange", () => {
    AppState.processingPaused = document.hidden;
  });
});

function updateClock() {
  const now = new Date(Date.now() + AppState.serverTimeOffset);
  const clock = document.getElementById("clockDisplay");
  if (clock) {
    clock.innerHTML = `<span class="time">${now.toLocaleTimeString()}</span>`;
  }
}

async function startRotatingCities() {
  while (true) {
    if (!AppState.isSpcMode && AppState.activeWarnings.length === 0) {
      AppState.currentCityIndex =
        (AppState.currentCityIndex + 1) % CITY_STATIONS.length;
      const { city, station } = CITY_STATIONS[AppState.currentCityIndex];
      await fetchWeatherForCity(city, station);
      // Update UI
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
}
