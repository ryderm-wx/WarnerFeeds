import { AppState, UI_THROTTLE_MS, EVENT_FLUSH_MS } from "./state.js";
import {
  getEventName,
  normalizeAlert,
  formatRawTextForBar,
} from "./alert-processing.js";
import { priority, CITY_STATIONS } from "./config.js";
import {
  getCached,
  formatExpirationTime,
  getIconClassForEvent,
  darkenColor,
  getAlertColor,
} from "./utils.js";
import { showNotification } from "./ui.js";

/**
 * HIGH PERFORMANCE EVENT BUFFERING
 * Prevents UI lag by batching incoming SSE messages
 */
export function queueEvent(type, data) {
  AppState.eventBuffer.push({ type, data });
  if (AppState.processingPaused) return;
  if (!AppState.eventFlushTimer) {
    AppState.eventFlushTimer = setTimeout(() => {
      AppState.eventFlushTimer = null;
      flushEventBuffer();
    }, EVENT_FLUSH_MS);
  }
}

function flushEventBuffer() {
  if (AppState.eventBuffer.length === 0) return;
  const batch = AppState.eventBuffer.splice(0);
  setTimeout(() => handleBatch(batch), 0);
}

function handleBatch(batch) {
  const byId = new Map();
  const ordered = [];

  for (const item of batch) {
    const d = item.data || {};
    const id = d.id || null;
    if (id) byId.set(id, item);
    else ordered.push(item);
  }

  ordered.forEach((it) => tacticalMode([it.data], it.type));
  for (const item of byId.values()) {
    tacticalMode([item.data], item.type);
  }

  scheduleUiUpdate();
}

function scheduleUiUpdate() {
  const now = performance.now();
  if (now - AppState.lastUiUpdate < UI_THROTTLE_MS) return;
  AppState.lastUiUpdate = now;
  requestAnimationFrame(() => updateDashboard());
}

/**
 * SSE ALERT STREAM INITIALIZATION
 */
export function initAlertStream() {
  console.log("🔛 Tactical Alert Stream Engaged!");
  const source = new EventSource("/api/xmpp-alerts");

  const handle = (type, event) => {
    try {
      const data = JSON.parse(event.data);
      queueEvent(type, data);
    } catch (e) {
      console.error("Parse Error", e);
    }
  };

  ["NEW", "UPDATE", "INIT", "CONTINUE", "ALERT"].forEach((type) => {
    source.addEventListener(type, (e) => handle(type, e));
  });

  ["CANCEL", "EXPIRE", "ALERT_CANCELED"].forEach((type) => {
    source.addEventListener(type, (e) => {
      const data = JSON.parse(e.data);
      cancelAlert(data.id);
    });
  });
}

/**
 * TACTICAL MODE
 * Filters alerts by state and type, then adds to active list
 */
export function tacticalMode(alerts, type = "NEW") {
  const selectedAlertTypes = Array.from(
    document.querySelectorAll("#checkboxContainer input:checked")
  ).map((cb) => cb.value);

  alerts.forEach((raw) => {
    const alert = normalizeAlert(raw);
    const eventName = getEventName(alert);

    // Filter: Alert Type
    if (
      selectedAlertTypes.length > 0 &&
      !selectedAlertTypes.includes(eventName)
    )
      return;

    // Add/Update in State
    const existingIdx = AppState.activeWarnings.findIndex(
      (w) => w.id === alert.id
    );
    if (existingIdx >= 0) {
      AppState.activeWarnings[existingIdx] = alert;
      if (type !== "INIT") showNotification(alert, "UPDATE");
    } else {
      AppState.activeWarnings.push(alert);
      if (type !== "INIT") showNotification(alert, "NEW");
    }

    AppState.previousWarnings.set(alert.id, alert);
  });
}

/**
 * DASHBOARD ORCHESTRATOR
 */
export function updateDashboard(forceUpdate = false) {
  if (AppState.isCountiesCurrentlyScrolling && !forceUpdate) return;

  const expEl = getCached("#expiration");
  const eventTypeEl = getCached("#eventType");
  const countiesEl = getCached("#counties");
  const alertBar = getCached("#alertBar");

  if (AppState.activeWarnings.length === 0) {
    expEl.textContent = "LOADING...";
    eventTypeEl.textContent = "MICHIGAN STORM CHASERS";
    return;
  }

  // Sort by priority
  const sorted = [...AppState.activeWarnings].sort((a, b) => {
    return (
      (priority[getEventName(a)] || 999) - (priority[getEventName(b)] || 999)
    );
  });

  const warning = sorted[AppState.currentWarningIndex % sorted.length];
  const eventName = getEventName(warning);
  const color = getAlertColor(eventName); // imported via utils/alert-logic elsewhere

  // Update UI Elements
  eventTypeEl.innerHTML = `<i class="${getIconClassForEvent(
    eventName
  )}"></i> ${eventName}`;
  getCached(".event-type-bar").style.backgroundColor = color;
  alertBar.style.backgroundColor = color;
  alertBar.style.setProperty("--glow-color", darkenColor(color, 20));

  const expiresText = formatExpirationTime(
    new Date(warning.properties.expires)
  );
  expEl.textContent = `EXPIRES: ${expiresText}`;

  // Handle Counties Text
  let countiesText = `Counties: ${warning.properties.areaDesc}`;
  if (localStorage.getItem("showRawTextInCounties") === "true") {
    const raw = formatRawTextForBar(warning.rawText);
    if (raw) countiesText += ` | ${raw}`;
  }
  countiesText += ` | Until ${expiresText}`;

  updateCountiesText(countiesText);

  AppState.currentWarningIndex++;
}

/**
 * SCROLLING TEXT LOGIC
 */
export function updateCountiesText(newHTML) {
  const countiesEl = getCached("#counties");
  if (!countiesEl) return;

  countiesEl.classList.add("fade-out");

  setTimeout(() => {
    countiesEl.innerHTML = "";
    const scrollWrapper = document.createElement("span");
    scrollWrapper.innerHTML = newHTML;
    scrollWrapper.style.display = "inline-block";
    scrollWrapper.style.whiteSpace = "nowrap";

    countiesEl.appendChild(scrollWrapper);

    const containerWidth = countiesEl.offsetWidth;
    const textWidth = scrollWrapper.offsetWidth;

    if (textWidth > containerWidth - 100) {
      const scrollDist = textWidth - containerWidth + 200;
      const duration = scrollDist / 50; // 50px per second

      const animName = `scroll-${Date.now()}`;
      const style = document.createElement("style");
      style.textContent = `@keyframes ${animName} { 
                0%, 10% { transform: translateX(0); } 
                90%, 100% { transform: translateX(-${scrollDist}px); } 
            }`;
      document.head.appendChild(style);

      scrollWrapper.style.animation = `${animName} ${
        duration + 4
      }s linear infinite`;
      AppState.isCountiesCurrentlyScrolling = true;
    } else {
      AppState.isCountiesCurrentlyScrolling = false;
    }

    countiesEl.classList.remove("fade-out");
  }, 400);
}

export function cancelAlert(id) {
  AppState.activeWarnings = AppState.activeWarnings.filter((w) => w.id !== id);
  AppState.previousWarnings.delete(id);
  updateDashboard(true);
}
