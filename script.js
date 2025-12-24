// Initialize the Raw Text toggle (persisted in localStorage)
const SEMICIRCLE_COUNT_TOGGLE_KEY = "semicircleCountCyclerEnabled";
let semicircleCountCycleInterval = null;
let semicircleCountCycleMessages = [];
let semicircleCountCycleIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  const rawToggle = document.getElementById("rawTextToggle");
  if (rawToggle) {
    try {
      rawToggle.checked = isRawTextInBarEnabled();
    } catch (_) {}
    rawToggle.addEventListener("change", () => {
      setRawTextInBarEnabled(rawToggle.checked);
      // Immediately refresh the dashboard when toggled
      try {
        console.log("rawTextToggle changed:", rawToggle.checked);
        // Bypass scrolling guard: force immediate dashboard refresh
        updateDashboard(true);
      } catch (e) {
        console.warn("updateDashboard not available yet:", e);
      }
    });
  }

  const semicircleToggle = document.getElementById("semicircleCountToggle");
  if (semicircleToggle) {
    try {
      semicircleToggle.checked = isSemicircleCountCyclerEnabled();
    } catch (_) {}

    semicircleToggle.addEventListener("change", () => {
      setSemicircleCountCyclerEnabled(semicircleToggle.checked);
      updateSemicircleCountCycler(true);
    });
  }
});
const eventTypes = {
  "Tornado Warning": "tornado-warning",
  "Radar Confirmed Tornado Warning": "observed-tornado-warning",
  "Spotter Confirmed Tornado Warning": "observed-tornado-warning",
  "Emergency Mgmt Confirmed Tornado Warning": "observed-tornado-warning",
  "Law Enforcement Confirmed Tornado Warning": "observed-tornado-warning",
  "Public Confirmed Tornado Warning": "observed-tornado-warning",
  "Observed Tornado Warning": "observed-tornado-warning",
  "PDS Tornado Warning": "pds-tornado-warning",
  "Tornado Emergency": "tornado-emergency",
  "Severe Thunderstorm Warning": "severe-thunderstorm-warning",
  "Considerable Severe Thunderstorm Warning":
    "severe-thunderstorm-considerable",
  "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning",
  "Flash Flood Warning": "flash-flood-warning",
  "Considerable Flash Flood Warning": "considerable-flash-flood-warning",
  "Flash Flood Emergency": "flash-flood-emergency",
  "Flood Warning": "flood-warning",
  "Flood Advisory": "flood-advisory",
  "Flood Watch": "flood-watch",
  "Tornado Watch": "tornado-watch",
  "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
  "Winter Weather Advisory": "winter-weather-advisory",
  "Winter Storm Watch": "winter-storm-watch",
  "Winter Storm Warning": "winter-storm-warning",
  "Special Weather Statement": "special-weather-statement",
  "Ice Storm Warning": "ice-storm-warning",
  "Blizzard Warning": "blizzard-warning",
  "High Wind Warning": "high-wind-warning",
  "High Wind Watch": "high-wind-watch",
  "Wind Advisory": "wind-advisory",
  "Dense Fog Advisory": "dense-fog-advisory",
  "Snow Squall Warning": "snow-squall-warning",
  "Extreme Heat Warning": "extreme-heat-warning",
  "Extreme Heat Watch": "extreme-heat-watch",
  "Heat Advisory": "heat-advisory",
  "Frost Advisory": "frost-advisory",
  "Freeze Watch": "freeze-watch",
  "Freeze Warning": "freeze-warning",
  "Cold Weather Advisory": "cold-weather-advisory",
  "Wind Chill Warning": "wind-chill-warning",
  "Extreme Cold Warning": "extreme-cold-warning",
  "Extreme Cold Watch": "extreme-cold-watch",
  "Lake Effect Snow Warning": "lake-effect-snow-warning",
};

const priority = {
  // 🔴 Tornado tier
  "Tornado Emergency": 1,
  "PDS Tornado Warning": 2,
  "Observed Tornado Warning": 3,
  "Emergency Mgmt Confirmed Tornado Warning": 4,
  "Spotter Confirmed Tornado Warning": 5,
  "Law Enforcement Confirmed Tornado Warning": 6,
  "Public Confirmed Tornado Warning": 7,
  "Radar Confirmed Tornado Warning": 8,
  "Tornado Warning": 9,

  // ⚡ Severe thunderstorm
  "Destructive Severe Thunderstorm Warning": 10,
  "Considerable Severe Thunderstorm Warning": 11,
  "Severe Thunderstorm Warning": 12,

  // 🌊 Flooding
  "Flash Flood Emergency": 13,
  "Considerable Flash Flood Warning": 14,
  "Flash Flood Warning": 15,
  "Flood Warning": 16,
  "Flood Advisory": 17,

  // 🟡 Watches (convective)
  "Tornado Watch": 18,
  "Severe Thunderstorm Watch": 19,
  "Flood Watch": 20,

  // ❄️ Winter weather
  "Blizzard Warning": 21,
  "Ice Storm Warning": 22,
  "Snow Squall Warning": 23,
  "Winter Storm Warning": 24,
  "Winter Weather Advisory": 25,
  "Winter Storm Watch": 26,

  // ❗ Special statements
  "Special Weather Statement": 27,

  // Cold weather related
  "Cold Weather Advisory": 28,
  "Wind Chill Warning": 29,
  "Extreme Cold Warning": 30,
  "Extreme Cold Watch": 31,
  "Lake Effect Snow Warning": 32,

  // 🌬️ Wind
  "High Wind Warning": 33,
  "High Wind Watch": 34,
  "Wind Advisory": 35,

  // 🌡️ Heat
  "Extreme Heat Warning": 36,
  "Extreme Heat Watch": 37,
  "Heat Advisory": 38,

  // ❄️ Frost/Freeze
  "Frost Advisory": 39,
  "Freeze Watch": 40,
  "Freeze Warning": 41,

  // 🌫️ Other
  "Dense Fog Advisory": 42,
};

const STATE_FIPS_TO_ABBR = {
  Any: "US",
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
};

let notificationsMuted = false;

const warningListElement = document.getElementById("warningList");
const expirationElement = document.getElementById("expiration");
const eventTypeElement = document.getElementById("eventType");
const countiesElement = document.getElementById("counties");

const tornadoCountElement = document.getElementById("tornadoCount");
const thunderstormCountElement = document.getElementById("thunderstormCount");
const floodCountElement = document.getElementById("floodCount");
const winterWeatherCountElement = document.getElementById("winterWeatherCount");
const socket = new WebSocket("");
let isSpcMode = false;

const alertEventTypes = [
  "INIT",
  "ALERT",
  "UPDATE",
  "CANCEL",
  "OTHER",
  "ALERT_CANCELED",
  "EXPIRE_ALERT",
  "CONTINUE",
  "NEW",
  "EXPIRE",
  "SPECIAL_WEATHER_STATEMENT",
  "EXPIRE_BEFORE_OPEN",
  "message",
];

const cancelTypes = [
  "CANCEL",
  "ALERT_CANCELED",
  "EXPIRE",
  "EXPIRE_ALERT",
  "EXPIRE_BEFORE_OPEN",
];

function initAlertStream() {
  console.log("🔛 Tactical Alert Stream Engaged!");

  // Close existing connection if there is one
  if (window.eventSource) {
    window.eventSource.close();
    console.log("🔌 Closed existing SSE connection");
  }

  const source = new EventSource("/api/xmpp-alerts");
  window.eventSource = source; // Store reference globally

  // Setup heartbeat checker
  let lastMessageTime = Date.now();
  let heartbeatInterval;

  source.onopen = () => {
    console.log("✅ SSE Connected at /api/xmpp-alerts");

    // Start the heartbeat interval check
    heartbeatInterval = setInterval(() => {
      if (Date.now() - lastMessageTime > 300000) {
        // 5 minutes
        console.warn("⚠️ No messages received, reconnecting...");
        clearInterval(heartbeatInterval);
        source.close();

        setTimeout(() => {
          console.log("🔄 Attempting to reconnect SSE due to inactivity...");
          initAlertStream();
        }, 2000);
      }
    }, 10000); // Check every 10 seconds
  };

  source.onerror = (err) => {
    console.error("❌ SSE Error:", err);
    clearInterval(heartbeatInterval);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log("🔄 Attempting to reconnect SSE after error...");
      initAlertStream();
    }, 5000); // 5 second delay before reconnect
  };

  // Update lastMessageTime on any event
  const updateLastMessageTime = () => (lastMessageTime = Date.now());

  // Listen for ping events to update the lastMessageTime
  source.addEventListener("ping", updateLastMessageTime);

  const handleEvent = (type, event) => {
    updateLastMessageTime();
    try {
      const data = JSON.parse(event.data);
      console.log(`📩 Received ${type}`, data);
      HandleAlertPayload(data, type);
    } catch (error) {
      console.error(`Error processing ${type} event:`, error);
    }
  };

  const handleCancelEvent = (type, event) => {
    updateLastMessageTime();
    try {
      const data = JSON.parse(event.data);
      console.log(`🚨 Received ${type} for ${data.id || "unknown ID"}`);
      HandleAlertPayload(data, type);
      cancelAlert(data.id);
    } catch (error) {
      console.error(`Error processing ${type} event:`, error);
    }
  };

  // Handle Special Weather Statements separately to ensure they always work
  // Wire up all other normal alert events
  const normalTypes = [
    "NEW",
    "UPDATE",
    "INIT",
    "CONTINUE",
    "OTHER",
    "ALERT",
    "SPECIAL_WEATHER_STATEMENT",
  ];
  normalTypes.forEach((type) =>
    source.addEventListener(type, (event) => handleEvent(type, event))
  );

  // Cancel events
  cancelTypes.forEach((type) =>
    source.addEventListener(type, (event) => handleCancelEvent(type, event))
  );
}

// Add this function to your script.js file
function createCheckboxes() {
  const alertTypes = [
    { value: "Tornado Warning", category: "tornado" },
    { value: "Radar Confirmed Tornado Warning", category: "tornado" },
    { value: "Spotter Confirmed Tornado Warning", category: "tornado" },
    {
      value: "Emergency Mgmt Confirmed Tornado Warning",
      category: "tornado",
    },
    { value: "Public Confirmed Tornado Warning", category: "tornado" },
    { value: "Law Enforcement Confirmed Tornado Warning", category: "tornado" },
    { value: "Observed Tornado Warning", category: "tornado" },
    { value: "PDS Tornado Warning", category: "tornado" },
    { value: "Tornado Emergency", category: "tornado" },
    { value: "Severe Thunderstorm Warning", category: "thunderstorm" },
    {
      value: "Considerable Severe Thunderstorm Warning",
      category: "thunderstorm",
    },
    {
      value: "Destructive Severe Thunderstorm Warning",
      category: "thunderstorm",
    },
    { value: "Flash Flood Warning", category: "flood" },
    { value: "Flood Warning", category: "flood" },
    { value: "Flood Advisory", category: "flood" },
    { value: "Flood Watch", category: "flood" },
    { value: "Tornado Watch", category: "tornado" },
    { value: "Severe Thunderstorm Watch", category: "thunderstorm" },
    { value: "Winter Weather Advisory", category: "winter" },
    { value: "Winter Storm Warning", category: "winter" },
    { value: "Snow Squall Warning", category: "winter" },
    { value: "Winter Storm Watch", category: "winter" },
    { value: "Special Weather Statement", category: "other" },
    { value: "Ice Storm Warning", category: "winter" },
    { value: "Blizzard Warning", category: "winter" },
    { value: "Flash Flood Emergency", category: "flood" },
    { value: "Considerable Flash Flood Warning", category: "flood" },
    { value: "High Wind Warning", category: "wind" },
    { value: "High Wind Watch", category: "wind" },
    { value: "Wind Advisory", category: "wind" },
    { value: "Dense Fog Advisory", category: "other" },
    { value: "Extreme Heat Warning", category: "other" },
    { value: "Extreme Heat Watch", category: "other" },
    { value: "Heat Advisory", category: "other" },
    { value: "Frost Advisory", category: "winter" },
    { value: "Freeze Watch", category: "winter" },
    { value: "Freeze Warning", category: "winter" },
    { value: "Cold Weather Advisory", category: "winter" },
    { value: "Wind Chill Warning", category: "winter" },
    { value: "Extreme Cold Warning", category: "winter" },
  ];

  // Load saved alerts from localStorage
  let savedAlerts = [];
  try {
    const savedData = localStorage.getItem("selectedAlerts");
    if (savedData) {
      savedAlerts = JSON.parse(savedData);
      console.log("Loaded saved alerts from localStorage:", savedAlerts);
    }
  } catch (error) {
    console.error("Error loading alerts from localStorage:", error);
  }

  const container = document.getElementById("checkboxContainer");
  if (!container) {
    console.error("Checkbox container not found!");
    return;
  }

  container.className = "checkbox-container";
  container.innerHTML = "";

  // Create category headers for better organization
  const categories = {};
  alertTypes.forEach((alert) => {
    if (!categories[alert.category]) {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = `alert-category ${alert.category}-category`;

      const heading = document.createElement("h3");
      heading.textContent =
        alert.category.charAt(0).toUpperCase() + alert.category.slice(1);
      categoryDiv.appendChild(heading);

      container.appendChild(categoryDiv);
      categories[alert.category] = categoryDiv;
    }
  });

  alertTypes.forEach((alert) => {
    const label = document.createElement("label");
    label.className = `custom-checkbox checkbox-${alert.category}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = alert.value;

    // Use saved settings if available, otherwise default to checked
    if (savedAlerts.length > 0) {
      input.checked = savedAlerts.includes(alert.value);
    } else {
      input.checked = alert.checked === undefined ? true : alert.checked;
    }

    const span = document.createElement("span");
    span.className = "checkmark";

    const textSpan = document.createElement("span");
    textSpan.className = "checkbox-label";
    textSpan.textContent = alert.value;

    label.appendChild(input);
    label.appendChild(span);
    label.appendChild(textSpan);

    // Add to appropriate category div
    categories[alert.category].appendChild(label);
  });

  // Add control buttons at the top
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "controls";

  const selectAllBtn = document.createElement("button");
  selectAllBtn.textContent = "Select All";
  selectAllBtn.className = "control-btn";
  selectAllBtn.addEventListener("click", () => {
    document
      .querySelectorAll("#checkboxContainer input[type=checkbox]")
      .forEach((cb) => {
        cb.checked = true;
      });
    updateSelectedAlerts();
  });

  const clearAllBtn = document.createElement("button");
  clearAllBtn.textContent = "Clear All";
  clearAllBtn.className = "control-btn";
  clearAllBtn.addEventListener("click", () => {
    document
      .querySelectorAll("#checkboxContainer input[type=checkbox]")
      .forEach((cb) => {
        cb.checked = false;
      });
    updateSelectedAlerts();
  });

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset to Default";
  resetBtn.className = "control-btn";
  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("selectedAlerts");
    createCheckboxes(); // Recreate checkboxes with defaults
  });

  controlsDiv.appendChild(selectAllBtn);
  controlsDiv.appendChild(clearAllBtn);
  controlsDiv.appendChild(resetBtn);
  container.insertBefore(controlsDiv, container.firstChild);

  // Set up the selected alerts based on checked boxes
  updateSelectedAlerts();

  // Add event listener to update selected alerts when checkboxes change
  container.addEventListener("change", updateSelectedAlerts);
  console.log(
    "Checkboxes created with",
    savedAlerts.length > 0 ? "saved configuration" : "default settings"
  );
}

function updateSelectedAlerts() {
  const checkedBoxes = document.querySelectorAll(
    "#checkboxContainer input:checked"
  );

  if (!checkedBoxes) {
    console.error("No checkboxes found!");
    return;
  }

  // Store new selection without immediately applying it
  const newSelectedAlerts = new Set(
    Array.from(checkedBoxes).map((cb) => cb.value)
  );

  // Check if selections have changed
  let currentSelectionArray = [];
  try {
    currentSelectionArray = Array.from(selectedAlerts || []).sort();
  } catch (e) {
    console.warn("Error getting current selections, may be first run:", e);
  }

  const newSelectionArray = Array.from(newSelectedAlerts).sort();

  const currentSelectionString = JSON.stringify(currentSelectionArray);
  const newSelectionString = JSON.stringify(newSelectionArray);

  if (currentSelectionString !== newSelectionString) {
    // Show apply button only when there are actual changes
    showApplyButton(newSelectedAlerts);
  }

  console.log("Selected alerts ready to apply:", Array.from(newSelectedAlerts));
}

function showApplyButton(newAlerts) {
  // Remove existing button if present
  const existingButton = document.getElementById("applyChangesButton");
  if (existingButton) {
    existingButton.remove();
  }

  // Create the apply button
  const applyButton = document.createElement("button");
  applyButton.id = "applyChangesButton";
  applyButton.className = "apply-changes-button";
  applyButton.textContent = "Apply Alert Changes";

  // Add pulsing animation class
  applyButton.classList.add("pulse-animation");

  // Add click handler
  applyButton.addEventListener("click", () => {
    try {
      // Update the actual selectedAlerts with the new selection
      selectedAlerts = newAlerts;

      // Save to localStorage
      localStorage.setItem(
        "selectedAlerts",
        JSON.stringify(Array.from(newAlerts))
      );
      console.log(
        "Saved alert settings to localStorage:",
        Array.from(newAlerts)
      );

      // Clear activeWarnings and previousWarnings
      if (Array.isArray(activeWarnings)) {
        activeWarnings.length = 0;
      } else {
        console.warn("activeWarnings is not an array");
        window.activeWarnings = [];
      }

      if (previousWarnings && typeof previousWarnings.clear === "function") {
        previousWarnings.clear();
      } else {
        console.warn("previousWarnings is not a Map or Set");
        window.previousWarnings = new Map();
      }

      // Get the alert bar element
      const alertBar = document.querySelector(".alert-bar");
      if (alertBar) {
        alertBar.style.setProperty("--glow-color", "rgba(255, 255, 255, 0.6)");
        alertBar.classList.add("thinbg-glow");
      }

      // Show success message
      const successMsg = document.createElement("div");
      successMsg.className = "success-message";
      successMsg.textContent = "Alert settings saved!";
      document.body.appendChild(successMsg);

      setTimeout(() => {
        successMsg.classList.add("show");
        setTimeout(() => {
          successMsg.classList.remove("show");
          setTimeout(() => {
            successMsg.remove();
          }, 300);
        }, 2000);
      }, 10);

      // Call initAlertStream to apply changes
      if (typeof initAlertStream === "function") {
        initAlertStream();
      } else {
        console.error("initAlertStream function not found");
      }

      // Remove the button after applying
      applyButton.remove();
      console.log("Changes applied! Alert stream reinitialized.");
    } catch (error) {
      console.error("Error applying changes:", error);
    }
  });

  // Add button to the page (after checkbox container)
  const container = document.getElementById("checkboxContainer");
  if (container && container.parentNode) {
    container.parentNode.insertBefore(applyButton, container.nextSibling);
  } else {
    console.error("Could not find appropriate place to add apply button");
  }
}

// Load saved alerts when the page loads
document.addEventListener("DOMContentLoaded", function () {
  // Initialize selectedAlerts if not already defined
  if (typeof selectedAlerts === "undefined") {
    try {
      const savedData = localStorage.getItem("selectedAlerts");
      if (savedData) {
        window.selectedAlerts = new Set(JSON.parse(savedData));
      } else {
        window.selectedAlerts = new Set();
      }
    } catch (error) {
      console.error("Error initializing selectedAlerts:", error);
      window.selectedAlerts = new Set();
    }
  }

  // Create checkboxes if the container exists
  if (document.getElementById("checkboxContainer")) {
    createCheckboxes();
  }
});

// Add some CSS for the new elements
const styleElement = document.createElement("style");
styleElement.textContent = `
  .alert-category {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.2);
  }
  
  .alert-category h3 {
    margin-top: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 5px;
    margin-bottom: 10px;
  }
  
  .tornado-category h3 { color: #ff6666; }
  .thunderstorm-category h3 { color: #ffaa00; }
  .flood-category h3 { color: #66cc66; }
  .winter-category h3 { color: #aaaaff; }
  .wind-category h3 { color: #66ccff; }
  .other-category h3 { color: #cccccc; }
  
  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    justify-content: center;
  }
  
  .control-btn {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background-color: #444;
    color: white;
    transition: all 0.3s;
  }
  
  .control-btn:hover {
    background-color: #666;
    transform: translateY(-2px);
  }
  
  .apply-changes-button {
    display: block;
    margin: 15px auto;
    padding: 10px 20px;
    background: linear-gradient(to right, #4CAF50, #2E7D32);
    color: white;
    border: none;
    border-radius: 30px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s;
  }
  
  .apply-changes-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }
  
  .pulse-animation {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transform: translateX(200%);
    transition: transform 0.3s ease;
    z-index: 1000;
  }
  
  .success-message.show {
    transform: translateX(0);
  }
`;
document.head.appendChild(styleElement);
/**
 * Extract the core identifier from a VTEC string or alert object
 * @param {string|object} input - VTEC string or alert object with VTEC
 * @returns {string|null} - Core identifier or null if not found
 */
function parseVtecCore(input) {
  if (!input) {
    console.log("parseVtecCore: No input");
    return null;
  }

  // Handle objects with vtec property or properties.vtec
  if (typeof input === "object") {
    const vtec =
      input.vtec ||
      (input.properties && input.properties.vtec) ||
      (input.properties &&
        input.properties.parameters &&
        input.properties.parameters.VTEC);

    console.log(
      "parseVtecCore: Object input detected, extracting VTEC",
      input,
      vtec
    );

    if (Array.isArray(vtec) && vtec.length > 0) {
      console.log("parseVtecCore: VTEC is an array, using the first element");
      return parseVtecCore(vtec[0]);
    } else if (typeof vtec === "string") {
      console.log("parseVtecCore: VTEC is a string, parsing directly");
      return parseVtecCore(vtec);
    }
    console.log("parseVtecCore: No VTEC found in object");
    return null;
  }

  // Handle VTEC string directly
  if (typeof input === "string") {
    console.log("parseVtecCore: String input detected, parsing directly");
    const parsed = parseVTEC(input);
    return parsed.core || null;
  }

  console.log("parseVtecCore: Unknown input type");
  return null;
}

function isWarningExpired(warning) {
  if (!warning || !warning.properties || !warning.properties.expires) {
    return false; // Can't determine expiration, assume not expired
  }

  const expiresDate = new Date(warning.properties.expires);
  return expiresDate < new Date();
}

function HandleAlertPayload(payload, eventType) {
  console.log("HandleAlertPayload function called.");

  // 1) Unwrap and normalize
  let alerts, type;

  if (Array.isArray(payload)) {
    alerts = payload;
    type = eventType || "NEW";
  } else if (payload.alerts) {
    alerts = payload.alerts;
    type = payload.type || eventType || "NEW";
  } else {
    alerts = [payload];
    type = eventType || "NEW";
  }

  // 2) sanity check
  if (!Array.isArray(alerts) || !type) {
    console.warn("⚠️ Invalid alerts/type after unwrap:", { alerts, type });
    return;
  }
  alerts = alerts.filter((a) => a && typeof a === "object");

  // 3) hand off to TacticalMode
  TacticalMode(alerts, type);
}

function normalizeAlertsFromEvent(event) {
  if (!event?.data) return [];

  try {
    const data = JSON.parse(event.data.trim());
    const rawAlerts = data?.features || [data?.feature] || data || [];

    return rawAlerts
      .filter((a) => a && typeof a === "object")
      .map(
        ({
          id,
          eventName = "Unknown Event",
          counties = [],
          office = "",
          action = "",
          vtec = "",
          effective = "",
          expires = "",
          rawText = "",
          geocode = {},
          threats = {},
          source = "",
          polygon = null,
          geometry = null,
        }) => ({
          id,
          normalizedId: id,
          properties: {
            event: eventName,
            areaDesc: counties.join("; "),
            expires,
            office,
            action,
            vtec,
            effective,
            rawText,
            geocode,
            parameters: {
              ...Object.fromEntries(
                Object.entries(threats).map(([key, val]) => [
                  key,
                  Array.isArray(val) ? val : [val],
                ])
              ),
              source: [source],
            },
          },
          geometry: polygon?.type
            ? {
                type: polygon.type,
                coordinates: polygon.coordinates,
              }
            : geometry || null,
        })
      );
  } catch (err) {
    console.error(`❌ normalizeAlertsFromEvent() failed:`, err);
    console.error("Raw event data:", event?.data);
    return [];
  }
}

let previousWarningIds = new Set();

const labels = {
  tornado: "🌪️TORNADO WARNINGS",
  thunderstorm: "⛈️SEVERE THUNDERSTORM WARNINGS",
  flood: "💦FLASH FLOOD WARNINGS",
  winter: "❄️WINTER WEATHER WARNINGS",
};

let currentWarningIndex = 0;
let activeWarnings = [];
let previousWarningVersions = new Map();
const previousWarnings = new Map();

document.body.addEventListener("click", enableSound);

function enableSound() {
  document.body.removeEventListener("click", enableSound);
}

const headerElement = document.createElement("div");
headerElement.textContent = "Latest Alerts:";
headerElement.className = "warning-list-header";

warningListElement.prepend(headerElement);

const checkboxContainer = document.querySelector(".checkbox-container");

selectedAlerts = new Set([
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
  "Flood Warning",
  "Flood Advisory",
  "Special Weather Statement",
]);

function toggleslider() {
  const slider = document.getElementById("sliderContainer");
  const body = document.body;
  const isOpen = slider.classList.toggle("open");

  body.classList.toggle("overlay", isOpen);
}

function adjustMessageFontSize(messageElement) {
  const originalFontSize = 36;
  let currentFontSize = originalFontSize;

  messageElement.style.fontSize = `${currentFontSize}px`;

  while (
    messageElement.scrollHeight > messageElement.clientHeight &&
    currentFontSize > 20
  ) {
    currentFontSize -= 1;
    messageElement.style.fontSize = `${currentFontSize}px`;
  }

  if (messageElement.scrollHeight > messageElement.clientHeight) {
    const originalText = messageElement.textContent;
    let textLength = originalText.length;

    while (
      messageElement.scrollHeight > messageElement.clientHeight &&
      textLength > 0
    ) {
      textLength -= 5;
      messageElement.textContent =
        originalText.substring(0, textLength) + "...";
    }
  }
}

const countiesInput = document.getElementById("countiesInput");

document
  .getElementById("generateAlertButton")
  .addEventListener("click", function () {
    const eventType = document.getElementById("alertType").value;
    const damageThreat = document.getElementById("damageThreat").value;
    const detection = document.getElementById("detection").value;
    const counties = countiesInput.value
      .split(",")
      .map((county) => county.trim());
    const expirationTime = parseInt(
      document.getElementById("expiration").value,
      10
    );

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + expirationTime);

    const areaDesc = counties.map((county) => county.trim()).join("; ");
    countiesElement.textContent = `Counties: ${counties.join(", ")}`;

    const parameters = {
      thunderstormDamageThreat: ["NONE"],
      tornadoDamageThreat: ["NONE"],
      tornadoDetection: detection,
    };

    if (eventType.includes("Tornado Warning")) {
      if (eventType.includes("PDS Tornado Warning")) {
        parameters.tornadoDamageThreat = ["CONSIDERABLE"];
      } else if (eventType.includes("Tornado Emergency")) {
        parameters.tornadoDamageThreat = ["CATASTROPHIC"];
      } else if (eventType.includes("Observed Tornado Warning")) {
        parameters.tornadoDetection = ["OBSERVED"];
      }
    } else if (eventType.includes("Severe Thunderstorm Warning")) {
      if (eventType.includes("Considerable Severe Thunderstorm Warning")) {
        parameters.thunderstormDamageThreat = ["CONSIDERABLE"];
      } else if (
        eventType.includes("Destructive Severe Thunderstorm Warning")
      ) {
        parameters.thunderstormDamageThreat = ["DESTRUCTIVE"];
      }
    }

    const randomVTEC =
      generateRandomString(4) +
      "." +
      generateRandomString(4) +
      "." +
      generateRandomString(4) +
      "." +
      generateRandomString(4);
    const randomID = `urn:oid:urn:oid:2.49.0.1.840.0.${generateRandomString(
      32
    )}.001.1`;

    const warning = {
      id: randomID,
      properties: {
        event: eventType,
        areaDesc: areaDesc,
        expires: expirationDate.toISOString(),
        VTEC: randomVTEC,
        parameters: parameters,
      },
    };

    showNotification(warning);
  });

function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

function notifyWarningExpired(eventName, warningId, areaDesc = "N/A") {
  const expiredWarning = {
    properties: {
      event: `A weather alert expired - This was a ${eventName} near ${areaDesc}`,
      id: warningId,
      areaDesc: `This was a ${eventName} near ${areaDesc}`,
      alertColor: "#FFE4C4",
    },
  };
}

/**
 * Test a warning upgrade scenario by creating an initial warning and then upgrading it
 * @param {string} initialType - The initial warning type
 * @param {string} upgradedType - The upgraded warning type
 */
function testUpgradeNotification(type) {
  const testId = `TEST-${Date.now()}`;
  const typeUpper = type.toUpperCase();

  const warning = createTestWarning(type, testId);
  warning.properties.action = "UPDATE";
  warning.forceUpgrade = true;

  // Damage threats
  if (typeUpper.includes("TORNADO WARNING")) {
    if (typeUpper.includes("PDS")) {
      warning.properties.parameters.tornadoDamageThreat = ["CONSIDERABLE"];
    } else if (typeUpper.includes("EMERGENCY")) {
      warning.properties.parameters.tornadoDamageThreat = ["CATASTROPHIC"];
    }
  } else if (typeUpper.includes("SEVERE THUNDERSTORM WARNING")) {
    if (typeUpper.includes("CONSIDERABLE")) {
      warning.properties.parameters.thunderstormDamageThreat = ["CONSIDERABLE"];
    } else if (typeUpper.includes("DESTRUCTIVE")) {
      warning.properties.parameters.thunderstormDamageThreat = ["DESTRUCTIVE"];
    }
  }

  console.log(`🚀 Sending single forced upgrade: ${type} with ID ${testId}`);

  showNotification(warning, "UPDATE", Date.now().toString());
}

function createTestWarning(eventType, id = null) {
  const eventTypeUpper = eventType.toUpperCase();

  const warning = {
    id: id || `TEST-${Date.now()}`,
    type: "Feature",
    properties: {
      event: eventType,
      headline: `Test ${eventType}`,
      description: `This is a test ${eventType.toLowerCase()} for demonstration purposes.`,
      severity: "Severe",
      certainty: "Observed",
      urgency: "Immediate",
      effective: new Date().toISOString(),
      onset: new Date().toISOString(),
      expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: "Actual",
      messageType: "Alert",
      category: "Met",
      response: "Shelter",
      parameters: {
        VTEC: ["/O.NEW.KXXX.TO.W.0123.230815T1800Z-230815T1845Z/"],
        EAS_ORG: ["WXR"],
        SAME: [""],
        SenderName: ["NATIONAL WEATHER SERVICE"],
        NWSheadline: [`TEST ${eventType.toUpperCase()}`],
      },
      areaDesc: "Test County",
      geocode: {
        SAME: ["012345"],
        UGC: ["MIZ000"],
      },
      affectedZones: ["MIZ000"],
      action: "NEW",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-85, 43],
          [-84, 43],
          [-84, 44],
          [-85, 44],
          [-85, 43],
        ],
      ],
    },
  };

  // Add proper threat tags
  if (eventTypeUpper.includes("TORNADO WARNING")) {
    if (eventTypeUpper.includes("PDS")) {
      warning.properties.parameters.tornadoDamageThreat = ["CONSIDERABLE"];
    } else if (eventTypeUpper.includes("EMERGENCY")) {
      warning.properties.parameters.tornadoDamageThreat = ["CATASTROPHIC"];
    }
  } else if (eventTypeUpper.includes("SEVERE THUNDERSTORM WARNING")) {
    if (eventTypeUpper.includes("CONSIDERABLE")) {
      warning.properties.parameters.thunderstormDamageThreat = ["CONSIDERABLE"];
    } else if (eventTypeUpper.includes("DESTRUCTIVE")) {
      warning.properties.parameters.thunderstormDamageThreat = ["DESTRUCTIVE"];
    }
  }

  return warning;
}

function testNotification(eventName) {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 30);

  // Get random counties
  const allCounties = [
    "Alcona, MI",
    "Alger, MI",
    "Allegan, MI",
    "Alpena, MI",
    "Antrim, MI",
    "Arenac, MI",
    "Baraga, MI",
    "Barry, MI",
    "Bay, MI",
    "Benzie, MI",
    "Berrien, MI",
    "Branch, MI",
    "Calhoun, MI",
    "Cass, MI",
    "Charlevoix, MI",
    "Cheboygan, MI",
    "Chippewa, MI",
    "Clare, MI",
    "Clinton, MI",
    "Crawford, MI",
    "Delta, MI",
    "Dickinson, MI",
    "Eaton, MI",
    "Emmet, MI",
    "Genesee, MI",
    "Gladwin, MI",
    "Gogebic, MI",
    "Grand Traverse, MI",
    "Gratiot, MI",
    "Hillsdale, MI",
    "Houghton, MI",
    "Huron, MI",
    "Ingham, MI",
    "Ionia, MI",
    "Iosco, MI",
    "Iron, MI",
    "Isabella, MI",
    "Jackson, MI",
    "Kalamazoo, MI",
    "Kalkaska, MI",
    "Kent, MI",
    "Keweenaw, MI",
    "Lake, MI",
    "Lapeer, MI",
    "Leelanau, MI",
    "Lenawee, MI",
    "Livingston, MI",
    "Luce, MI",
    "Mackinac, MI",
    "Macomb, MI",
    "Manistee, MI",
    "Marquette, MI",
    "Mason, MI",
    "Mecosta, MI",
    "Menominee, MI",
    "Midland, MI",
    "Missaukee, MI",
    "Monroe, MI",
    "Montcalm, MI",
    "Montmorency, MI",
    "Muskegon, MI",
    "Newaygo, MI",
    "Oakland, MI",
    "Oceana, MI",
    "Ogemaw, MI",
    "Ontonagon, MI",
    "Osceola, MI",
    "Oscoda, MI",
    "Otsego, MI",
    "Ottawa, MI",
    "Presque Isle, MI",
    "Roscommon, MI",
    "Saginaw, MI",
    "St. Clair, MI",
    "St. Joseph, MI",
    "Sanilac, MI",
    "Schoolcraft, MI",
    "Shiawassee, MI",
    "Tuscola, MI",
    "Van Buren, MI",
    "Washtenaw, MI",
    "Wayne, MI",
    "Wexford, MI",
  ];

  // Determine max counties based on alert type
  let maxCounties = 20; // Default for other alert types
  const alertTypeLower = eventName.toLowerCase();

  if (
    alertTypeLower.includes("tornado warning") ||
    alertTypeLower.includes("severe thunderstorm warning") ||
    alertTypeLower.includes("flash flood warning")
  ) {
    maxCounties = 4;
  }

  const countyCount = Math.floor(Math.random() * maxCounties) + 1;
  const shuffledCounties = [...allCounties].sort(() => 0.5 - Math.random());
  const selectedCounties = shuffledCounties.slice(0, countyCount);
  // Ensure counties are separated with " • "
  const areaDesc = "TEST - " + selectedCounties.join(" • ");

  function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  }

  const randomVTEC = `${generateRandomString(4)}.${generateRandomString(
    4
  )}.${generateRandomString(4)}.${generateRandomString(4)}`;
  const randomID = `urn:oid:2.49.0.1.840.0.${generateRandomString(32)}.001.1`;
  const messageType = Math.random() < 0.5 ? "Alert" : "Update";
  const currentVersion = `v${Math.floor(Math.random() * 1000)}`;

  // Create parameters object with threats
  const parameters = {
    threats: {},
  };

  // Handle special tornado warning types
  if (eventName.includes("Tornado Warning")) {
    if (eventName === "Radar Confirmed Tornado Warning") {
      parameters.source = ["RADAR CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "Spotter Confirmed Tornado Warning") {
      parameters.threats.tornadoDetection = ["OBSERVED"];
      parameters.source = ["WEATHER SPOTTERS CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "Emergency Mgmt Confirmed Tornado Warning") {
      parameters.threats.tornadoDetection = ["OBSERVED"];
      parameters.source = ["EMERGENCY MANAGEMENT CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "Law Enforcement Confirmed Tornado Warning") {
      parameters.threats.tornadoDetection = ["OBSERVED"];
      parameters.source = ["LAW ENFORCEMENT CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "Public Confirmed Tornado Warning") {
      parameters.threats.tornadoDetection = ["OBSERVED"];
      parameters.source = ["PUBLIC CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "Observed Tornado Warning") {
      parameters.threats.tornadoDetection = ["OBSERVED"];
      parameters.source = ["CONFIRMED TORNADO"];
      eventName = "Tornado Warning";
    } else if (eventName === "PDS Tornado Warning") {
      parameters.threats.tornadoDamageThreat = ["CONSIDERABLE"];
      parameters.source = ["RADAR INDICATED ROTATION"];
      eventName = "Tornado Warning";
    } else if (eventName === "Tornado Emergency") {
      parameters.threats.tornadoDamageThreat = ["CATASTROPHIC"];
      parameters.source = ["RADAR INDICATED ROTATION"];
      eventName = "Tornado Warning";
    } else if (eventName === "Tornado Warning") {
      parameters.source = ["RADAR INDICATED ROTATION"];
    }
  } else if (eventName.includes("Severe Thunderstorm Warning")) {
    if (eventName === "Destructive Severe Thunderstorm Warning") {
      parameters.threats.thunderstormDamageThreat = ["DESTRUCTIVE"];
      eventName = "Severe Thunderstorm Warning";
    } else if (eventName === "Considerable Severe Thunderstorm Warning") {
      parameters.threats.thunderstormDamageThreat = ["CONSIDERABLE"];
      eventName = "Severe Thunderstorm Warning";
    }
  } else if (eventName === "Flash Flood Emergency") {
    parameters.threats.flashFloodDamageThreat = ["CATASTROPHIC"];
    eventName = "Flash Flood Warning";
  } else if (eventName === "Considerable Flash Flood Warning") {
    parameters.threats.flashFloodDamageThreat = ["CONSIDERABLE"];
    eventName = "Flash Flood Warning";
  }

  let description = "";
  if (parameters.source) {
    description += `SOURCE... ${parameters.source[0]}\n`;
  }

  // Add hazard information based on event type
  if (eventName === "Tornado Warning") {
    // Only add hazard if not already included in the source or description
    // If the source or description already contains "TORNADO", don't add another hazard line
    const sourceText = parameters.source
      ? parameters.source[0].toUpperCase()
      : "";
    if (
      !description.toUpperCase().includes("HAZARD...") &&
      !description.toUpperCase().includes("TORNADO") &&
      !sourceText.includes("TORNADO")
    ) {
      const hazardText =
        parameters.threats?.tornadoDamageThreat === "CATASTROPHIC"
          ? "DEADLY TORNADO."
          : parameters.threats?.tornadoDamageThreat === "CONSIDERABLE"
          ? "DAMAGING TORNADO."
          : "TORNADO.";
    }
  } else if (eventName === "Severe Thunderstorm Warning") {
    const hazardText =
      parameters.threats?.thunderstormDamageThreat === "DESTRUCTIVE"
        ? "DESTRUCTIVE THUNDERSTORM WINDS AND LARGE HAIL."
        : "DAMAGING WINDS AND LARGE HAIL.";
  }
  // ...existing code...
  // Create the warning object using the normalizeAlert format
  const warning = {
    id: randomID,
    geometry: null, // Assuming no geometry for test notifications
    rawText: description,
    vtec: randomVTEC,
    properties: {
      event: eventName,
      expires: expirationDate.toISOString(),
      areaDesc: areaDesc,
      parameters: parameters,
      actionSection:
        "THIS IS A TEST MESSAGE. DO NOT TAKE ACTION ON THIS MESSAGE.",
      messageType: messageType,
      currentVersion: currentVersion,
    },
  };

  if (!window.activeWarningsSet) {
    window.activeWarningsSet = new Set();
  }
  window.activeWarningsSet.add(randomID);

  if (!previousWarnings) {
    previousWarnings = new Map();
  }
  previousWarnings.set(randomID, warning);

  if (!activeWarnings) {
    activeWarnings = [];
  }
  activeWarnings.push(warning);

  updateWarningCounters(warning);
  updateWarningList(activeWarnings);
  updateHighestAlert();
  showNotification(warning);
}

function normalizeAlert(alert) {
  if (!alert || typeof alert !== "object") return null;

  const props = alert.properties || {};
  const fallbackEvent = alert.eventName || props.event || "Unknown Event";
  const fallbackArea = Array.isArray(alert.counties)
    ? alert.counties.join("; ")
    : props.areaDesc || "Unknown Area";

  return {
    id: alert.id || props.id || `unknown-${Date.now()}`,
    geometry: alert.geometry || null,
    rawText: alert.rawText || props.rawText || "",
    vtec: alert.vtec || props.vtec || "",
    properties: {
      action: alert.action || null, // Added this line
      event: fallbackEvent,
      expires: props.expires || alert.expires || "",
      areaDesc: fallbackArea,
      parameters: props.parameters || alert.threats || {},
      ...props, // keep original props if they exist
    },
  };
}

function updateWarningCounters(activeWarnings) {
  if (!activeWarnings || !Array.isArray(activeWarnings)) {
    console.warn(
      "⚠️ updateWarningCounters skipped invalid activeWarnings:",
      activeWarnings
    );
    return;
  }

  activeWarnings.forEach((warning) => {
    try {
      if (typeof warning === "string") {
        warning = JSON.parse(warning);
      }

      if (!warning || !warning.properties || !warning.properties.event) {
        console.warn(
          "⚠️ updateWarningCounters skipped malformed warning:",
          warning
        );
        return;
      }

      const eventType = warning.properties.event;

      let tornadoCount = parseInt(
        tornadoCountElement.textContent.split(":")[1]?.trim() || 0
      );
      let thunderstormCount = parseInt(
        thunderstormCountElement.textContent.split(":")[1]?.trim() || 0
      );
      let floodCount = parseInt(
        floodCountElement.textContent.split(":")[1]?.trim() || 0
      );
      let winterWeatherCount = parseInt(
        winterWeatherCountElement.textContent.split(":")[1]?.trim() || 0
      );

      if (eventType.includes("Tornado Warning")) {
        tornadoCount++;
        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
      } else if (eventType.includes("Severe Thunderstorm Warning")) {
        thunderstormCount++;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
      } else if (eventType.includes("Flash Flood Warning")) {
        floodCount++;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
      } else if (
        eventType.includes("Winter") ||
        eventType.includes("Ice") ||
        eventType.includes("Blizzard")
      ) {
        winterWeatherCount++;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`;
      }
    } catch (e) {
      console.warn(
        "⚠️ updateWarningCounters failed to update warning counters:",
        e
      );
    }
  });
}

// Or if you're directly processing the data property from your example:
// updateWarningCounters(eventData.data);
function updateHighestAlert() {
  const sortedWarnings = [...activeWarnings].sort((a, b) => {
    const priorityA = priority[getEventName(a)] || 999;
    const priorityB = priority[getEventName(b)] || 999;
    return priorityA - priorityB;
  });

  if (sortedWarnings.length > 0) {
    const highestAlert = sortedWarnings[0];
    const eventName = getEventName(highestAlert);
  }
}

const riskLevels = [
  { name: "HIGH", class: "risk-HIGH", color: "#F918FF" },
  { name: "MODERATE", class: "risk-MOD", color: "#AD0200" },
  { name: "ENHANCED", class: "risk-ENH", color: "#ff9900" },
  { name: "SLIGHT", class: "risk-SLIGHT", color: "#ffff00" },
  { name: "MARGINAL", class: "risk-MARGINAL", color: "#00c000" },
  { name: "TSTM", class: "risk-TSTM", color: "#0085ff" },
];

let currentRiskIndex = 0;
let riskCycleInterval;
let activeRisks = [];

(() => {
  const toggle = document.getElementById("spcModeToggle");
  const eventType = document.getElementById("eventType");
  const counties = document.getElementById("counties");
  const expiration = document.getElementById("expiration");
  const eventTypeBar = document.querySelector(".event-type-bar");

  let cachedState = {};

  toggle.addEventListener("change", () => {
    toggle.checked ? enterSpcMode() : exitSpcMode();
  });

  function enterSpcMode() {
    cachedState = {
      eventText: eventType.textContent,
      eventCls: eventType.className,
      counties: counties.textContent,
      countiesVis: counties.style.visibility,
      expirationVis: expiration.style.visibility,
    };

    currentRiskIndex = 0;
    clearInterval(riskCycleInterval);
    fetchSpcTable()
      .then(updateUiWithSpc)
      .catch((err) => {
        console.error("SPC table error:", err);
        exitSpcMode();
      });
  }

  function exitSpcMode() {
    clearInterval(riskCycleInterval);
    eventType.textContent = cachedState.eventText;
    eventType.className = cachedState.eventCls;
    eventType.style.backgroundColor = "#1F2593";
    counties.textContent = cachedState.counties;
    counties.style.visibility = cachedState.countiesVis || "visible";
    expiration.style.visibility = cachedState.expirationVis || "visible";
  }

  function startRiskCycle() {
    if (!eventTypeBar || activeRisks.length === 0) return;

    riskCycleInterval = setInterval(() => {
      if (!toggle.checked) {
        clearInterval(riskCycleInterval);
        return;
      }
      if (activeWarnings.length > 0) {
        console.log("Active warnings present. Updating warning dashboard.");
        updateDashboard();
        return;
      }

      const current = activeRisks[currentRiskIndex];

      eventTypeBar.textContent = `${current.name} RISK`;
      eventTypeBar.className = `event-type-bar ${current.class}`;
      eventTypeBar.style.backgroundColor = current.color;

      counties.textContent = `Cities: ${current.cities} (Pop. ${Number(
        current.pop
      ).toLocaleString()})`;
      counties.style.visibility = "visible";

      currentRiskIndex = (currentRiskIndex + 1) % activeRisks.length;
    }, 5000);
  }

  function fetchSpcTable() {
    const spcUpdates = [
      [1, 0, "https://www.spc.noaa.gov/products/outlook/ac1_0600_SItable.html"],
      [8, 0, "https://www.spc.noaa.gov/products/outlook/ac1_1300_SItable.html"],
      [
        12,
        35,
        "https://www.spc.noaa.gov/products/outlook/ac1_1630_SItable.html",
      ],
      [
        16,
        5,
        "https://www.spc.noaa.gov/products/outlook/ac1_2000_SItable.html",
      ],
      [
        21,
        0,
        "https://www.spc.noaa.gov/products/outlook/ac1_0100_SItable.html",
      ],
    ];

    const nowET = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
    const now = new Date(nowET);
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

    let url = spcUpdates[0][2];
    for (const [h, m, link] of spcUpdates) {
      if (minutesSinceMidnight >= h * 60 + m) url = link;
    }

    return fetch(url).then((r) => r.text());
  }

  function updateUiWithSpc(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nestedTable = doc.querySelector("table table");
    if (!nestedTable) {
      console.warn("SPC nested table not found");
      return exitSpcMode();
    }

    const rows = [...nestedTable.querySelectorAll("tr")].slice(1); // skip header
    const risksMap = {};

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 4) return;

      const risk = tds[0].innerText.trim().toUpperCase();
      const area = tds[1].innerText.trim();
      const popRaw = tds[2].innerText
        .trim()
        .replace(/,/g, "")
        .replace(/[^\d]/g, "");
      const pop = parseInt(popRaw, 10);
      const cities = tds[3].innerText
        .trim()
        .replace(/\.\.\./g, ", ")
        .replace(/,\s*$/, "");

      if (!isNaN(pop)) {
        risksMap[risk] = { area, pop, cities };
      }
    });

    activeRisks = riskLevels
      .filter((r) => risksMap[r.name])
      .map((r) => ({
        ...r,
        ...risksMap[r.name],
      }));

    if (activeRisks.length === 0) {
      console.warn("No valid risks found in SPC table.");
      return exitSpcMode();
    }

    const top = activeRisks[0];
    eventType.textContent = `${top.name} RISK`;
    eventType.className = `event-type-bar ${top.class}`;
    eventType.style.backgroundColor = top.color;
    counties.textContent = `Cities: ${top.cities} (Pop. ${Number(
      top.pop
    ).toLocaleString()})`;
    counties.style.visibility = "visible";
    expiration.style.visibility = "hidden";

    startRiskCycle();
  }
})();

function firstNonEmptyString(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim();
      }
    }
  }
  return "";
}

function extractSourceFromDescription(description = "") {
  if (!description) return "";
  const match = description.match(/SOURCE\.{3}\s*(.*?)(?=IMPACT\.{3}|$)/is);
  return match ? match[1].trim() : "";
}

const tornadoSourceMappings = [
  {
    name: "Emergency Mgmt Confirmed Tornado Warning",
    tests: [/emergency\s*management/, /\bema\b/, /emergency\s*mgr/],
  },
  {
    name: "Law Enforcement Confirmed Tornado Warning",
    tests: [
      /law\s*enforcement/,
      /\bpolice\b/,
      /\bsheriff\b/,
      /state\s*(trooper|police)/,
      /highway\s*patrol/,
    ],
  },
  {
    name: "Spotter Confirmed Tornado Warning",
    tests: [
      /spotter/,
      /storm\s*chaser/,
      /weather\s*spotter/,
      /trained\s*spotter/,
    ],
  },
  {
    name: "Public Confirmed Tornado Warning",
    tests: [
      /\bpublic\b/,
      /general\s*public/,
      /citizen/,
      /911/,
      /social\s*media/,
      /photo/,
      /video/,
    ],
  },
  {
    name: "Radar Confirmed Tornado Warning",
    tests: [
      /radar\s*confirmed/,
      /radar\s*indicated/,
      /tornado\s*debris\s*signature/,
      /\btds\b/,
      /dual-?pol/,
      /correlation\s*coefficient/,
      /cc\s*drop/,
    ],
  },
];

function detectConfirmedTornadoSource(sourceText) {
  if (!sourceText) return null;
  const normalized = sourceText.toLowerCase();
  for (const mapping of tornadoSourceMappings) {
    if (mapping.tests.some((regex) => regex.test(normalized))) {
      return mapping.name;
    }
  }
  return null;
}

function resolveTornadoSourceText(props, description) {
  const candidates = [
    firstNonEmptyString(props.source),
    firstNonEmptyString(props.parameters?.source),
    firstNonEmptyString(props.parameters?.Source),
    firstNonEmptyString(props.parameters?.SOURCE),
    firstNonEmptyString(props.threats?.source),
    firstNonEmptyString(props.parameters?.threats?.source),
  ];

  const descriptionSource = extractSourceFromDescription(description);
  if (descriptionSource) {
    candidates.push(descriptionSource);
  }

  return candidates.find((text) => text && text.length > 2) || "";
}

function getEventName(alert) {
  if (!alert) return "Unknown Event";

  const props =
    alert.properties || alert.feature?.properties || alert.feature || alert;
  const threats = alert.threats || props.threats || {}; // ✅ THIS LINE FIXES IT

  const event = props.eventName || props.event || "Unknown Event";
  const description = props.description || props.rawText || alert.rawText || "";
  const normalizedSourceText = resolveTornadoSourceText(props, description);

  // 💥 Threat levels
  const tornadoDamageThreat = (
    props.tornadoDamageThreat ||
    threats.tornadoDamageThreat ||
    props.parameters?.threats?.tornadoDamageThreat?.[0] ||
    ""
  ).toUpperCase();

  const thunderstormDamageThreat = (
    props.thunderstormDamageThreat ||
    threats.thunderstormDamageThreat ||
    props.parameters?.threats?.thunderstormDamageThreat?.[0] ||
    ""
  ).toUpperCase();

  const flashFloodDamageThreat = (
    props.flashFloodDamageThreat ||
    threats.flashFloodDamageThreat ||
    props.parameters?.threats?.flashFloodDamageThreat?.[0] ||
    ""
  ).toUpperCase();

  const tornadoDetection = (
    props.tornadoDetection ||
    threats.tornadoDetection ||
    props.parameters?.threats?.tornadoDetection?.[0] ||
    ""
  ).toUpperCase();

  // 🌪 Tornado logic
  if (event.includes("Tornado Warning")) {
    if (tornadoDamageThreat === "CATASTROPHIC") return "Tornado Emergency";
    if (tornadoDamageThreat === "CONSIDERABLE") return "PDS Tornado Warning";
    if (tornadoDetection === "OBSERVED") {
      const sourceBasedName =
        detectConfirmedTornadoSource(normalizedSourceText);
      return sourceBasedName || "Observed Tornado Warning";
    }
    return "Tornado Warning";
  }

  // ⚡ Thunderstorm logic
  if (event.includes("Severe Thunderstorm Warning")) {
    if (thunderstormDamageThreat === "DESTRUCTIVE")
      return "Destructive Severe Thunderstorm Warning";
    if (thunderstormDamageThreat === "CONSIDERABLE")
      return "Considerable Severe Thunderstorm Warning";
    return "Severe Thunderstorm Warning";
  }

  // 🌊 Flash Flood logic
  if (event.includes("Flash Flood Warning")) {
    const floodthreat = (flashFloodDamageThreat || "").toUpperCase();
    if (floodthreat === "CATASTROPHIC") return "Flash Flood Emergency";
    if (floodthreat === "CONSIDERABLE")
      return "Considerable Flash Flood Warning";
    return "Flash Flood Warning";
  }

  return event;
}

let currentCountyIndex = 0;

let isNotificationQueueEnabled = false;
let isShowingNotification = false;

document
  .getElementById("singleNotificationToggleButton")
  .addEventListener("click", () => {
    isNotificationQueueEnabled = !isNotificationQueueEnabled;
    const buttonText = isNotificationQueueEnabled
      ? "Disable Single Notification Queue"
      : "Enable Single Notification Queue";
    document.getElementById("singleNotificationToggleButton").textContent =
      buttonText;
  });

// globals—ensure these live outside any function

const notifiedWarnings = new Map();
let emergencyText = "";

function showNotification(
  warning,
  sseEventType = "NEW", // The type from the SSE stream (e.g., INIT, NEW, UPDATE, CANCEL)
  currentVersion // Passed as an argument, usually from NWSheadline or properties.sent
) {
  const eventName = getEventName(warning);
  const warningId = warning.id.trim().toUpperCase();

  // Determine the CAP-style action, falling back to SSE event type if none.
  // This `alertAction` is primarily for logging and understanding the message intent.
  const alertAction =
    (warning.properties.action || warning.action)?.toUpperCase() ||
    sseEventType.toUpperCase();

  // Check if we've processed this alert ID before (even if not visually notified)
  const hasBeenInternallyTracked = previousWarnings.has(warningId);
  const previousWarningObject = previousWarnings.get(warningId); // Will be undefined if not tracked

  // --- Determine notification type (NEW vs UPDATED vs IGNORED) ---
  let isNew = false;
  let isUpdated = false;
  let notificationType = "NEW WEATHER ALERT"; // Default for alerts that will be shown
  if (warning.forceUpgrade === true) {
    console.log(`⚡ Brute-forcing WEATHER ALERT UPGRADE for ID ${warningId}`);
    isUpdated = true;
    notificationType = "WEATHER ALERT UPGRADE";

    // 🛑 short-circuit to skip the rest
    previousWarnings.set(warningId, warning);
    notifiedWarnings.set(warningId, currentVersion);
    displayNotification(warning, notificationType, emergencyText);
    return;
  }

  // 1. INIT alerts are special: always store, never notify explicitly
  if (sseEventType.toUpperCase() === "INIT") {
    previousWarnings.set(warningId, warning);
    notifiedWarnings.set(warningId, currentVersion);
    console.log(`🧠 State updated for ${warningId} (INIT, no notification)`);
    return; // Exit, no visual notification
  }

  // 2. Special handling for Special Weather Statements (SWS)
  // SWS will NEVER be "UPDATED" based on action field. They are either NEW (first time seeing, or content changed)
  // or ignored (content unchanged). This logic takes precedence for SWS.
  if (eventName === "Special Weather Statement") {
    if (hasBeenInternallyTracked) {
      // If we've seen this SWS ID before
      const previousSWS = previousWarningObject; // Use previousWarningObject directly
      const prevRawText =
        previousSWS?.rawText || previousSWS?.properties?.rawText || "";
      const currentRawText =
        warning.rawText || warning.properties?.rawText || "";
      const prevAreaDesc = previousSWS?.properties?.areaDesc || "";
      const currentAreaDesc = warning.properties?.areaDesc || "";

      // If content is identical, do not re-notify.
      if (prevRawText === currentRawText && prevAreaDesc === currentAreaDesc) {
        console.log(
          `⚠️ SWS [${warningId}] received again with identical content. Ignoring to prevent duplicate notifications.`
        );
        // Update version/object even if identical content, for robust tracking.
        if (notifiedWarnings.get(warningId) !== currentVersion) {
          notifiedWarnings.set(warningId, currentVersion);
        }
        previousWarnings.set(warningId, warning);
        return; // Ignore this alert for visual notification purposes.
      } else {
        // Content has changed for an existing SWS ID. Treat this as a NEW alert (from notification perspective).
        isNew = true;
        notificationType = "NEW WEATHER ALERT";
        console.log(
          `🔄 SWS [${warningId}] content changed. Marking as NEW weather alert.`
        );
      }
    } else {
      // First time seeing this SWS ID.
      isNew = true;
      notificationType = "NEW WEATHER ALERT";
      console.log(
        `🆕 SWS [${warningId}] ID not previously tracked. Marking as NEW weather alert.`
      );
    }
  }
  // 3. Main logic driven by `alertAction` for non-SWS alerts
  else {
    switch (alertAction) {
      case "NEW":
        isNew = true;
        notificationType = "NEW WEATHER ALERT";
        console.log(`🆕 Action is NEW. Marking as NEW.`);
        break;

      case "UPDATE":
      case "CON": // Group UPDATE and CON as they share upgrade logic.
        // Per your request, if an alert's action is UPDATE or CON,
        // it should ONLY trigger a notification if it's an UPGRADE.
        // Otherwise, it's considered stale and will not be displayed.
        if (previousWarningObject) {
          const previousEventName = getEventName(previousWarningObject);
          const currentPriority = priority[eventName];
          const prevPriority = priority[previousEventName];

          // Check if this is a severity upgrade (lower priority number means higher priority alert)
          if (
            currentPriority !== undefined &&
            prevPriority !== undefined &&
            currentPriority < prevPriority
          ) {
            isUpdated = true;
            notificationType = "WEATHER ALERT UPGRADE";
            console.log(
              `⬆️ Action is ${alertAction}, severity UPGRADED from ${previousEventName} to ${eventName}.`
            );
          } else {
            // Not an upgrade, just a regular update / continuance - treat as stale.
            console.log(
              `⚠️ Action is ${alertAction}, but not a severity upgrade. Ignoring notification as stale.`
            );
            previousWarnings.set(warningId, warning); // Still update internal state
            notifiedWarnings.set(warningId, currentVersion);
            return; // DO NOT notify
          }
        } else {
          // Alert is UPDATE/CON, but we haven't tracked it before.
          // As per "no more useless tracking" for non-upgrades,
          // if we receive an UPDATE/CON for a new ID, we silently track it.
          // It's not an "upgrade" we can confirm, so it's not notified.
          console.log(
            `⚠️ Action is ${alertAction}, but alert ID not previously tracked. Tracking silently as potentially stale.`
          );
          previousWarnings.set(warningId, warning);
          notifiedWarnings.set(warningId, currentVersion);
          return; // DO NOT notify
        }
        break;

      default:
        // This default case handles alerts where the 'action' field is missing or unknown.
        // It falls back to content comparison to decide if it's a visual update.
        if (!hasBeenInternallyTracked) {
          isNew = true;
          notificationType = "NEW WEATHER ALERT";
          console.log(
            `🆕 Default action, not internally tracked. Marking as NEW.`
          );
        }
        // If already tracked, determine if it's a visual update or a silent update.
        else if (previousWarningObject) {
          const prevRawText =
            previousWarningObject?.rawText ||
            previousWarningObject?.properties?.rawText ||
            "";
          const currentRawText =
            warning.rawText || warning.properties?.rawText || "";
          const prevAreaDesc =
            previousWarningObject?.properties?.areaDesc || "";
          const currentAreaDesc = warning.properties?.areaDesc || "";

          // If any meaningful content changed or event name changed, consider it an implicit update.
          if (
            prevRawText !== currentRawText ||
            prevAreaDesc !== currentAreaDesc ||
            getEventName(previousWarningObject) !== eventName
          ) {
            isUpdated = true;
            notificationType = "ALERT UPDATED";
            console.log(
              `🔃 Default action, but content/name changed. Marking as UPDATED.`
            );
          } else {
            // No change, ignore.
            console.log(`⚠️ Default action, no significant change. Ignoring.`);
            return;
          }
        } else {
          // Fallback if not tracked and no specific action, treat as new.
          isNew = true;
          notificationType = "NEW WEATHER ALERT";
          console.log(
            `🆕 Default action, not internally tracked. Marking as NEW.`
          );
        }
        break;
    }
  }

  // Final validation: Ensure either isNew or isUpdated is true. If not, it means an edge case was missed, so ignore.
  if (!isNew && !isUpdated) {
    console.log(
      `⛔ Final determination: No change for ${warningId}. Ignoring.`
    );
    return;
  }

  console.log(
    `✅ Determined notification status — New: ${isNew}, Updated: ${isUpdated}, Type: ${notificationType}`
  );

  // 🔊 Pick your fighter

  // 🧠 Track state - consistently store the full warning object for future comparisons
  previousWarnings.set(warningId, warning); // Store the current warning object for next comparison
  notifiedWarnings.set(warningId, currentVersion); // Store the version for future version comparisons
  console.log(`🧠 State updated for ${warningId}`);
  switch (eventName) {
    case "Destructive Severe Thunderstorm Warning":
      emergencyText = "THIS IS A DANGEROUS SITUATION";
      break;
    case "Flash Flood Emergency":
      emergencyText = "SEEK HIGHER GROUND IMMEDIATELY";
      break;
    case "Observed Tornado Warning":
      emergencyText = "A TORNADO IS ON THE GROUND";
      break;
    case "Radar Confirmed Tornado Warning":
      emergencyText = "RADAR HAS CONFIRMED A TORNADO";
      break;
    case "Spotter Confirmed Tornado Warning":
      emergencyText = "A SPOTTER HAS CONFIRMED A TORNADO";
      break;
    case "Emergency Mgmt Confirmed Tornado Warning":
      emergencyText = "EMERGENCY MANAGEMENT CONFIRMED A TORNADO";
      break;
    case "Law Enforcement Confirmed Tornado Warning":
      emergencyText = "LAW ENFORCEMENT CONFIRMED A TORNADO";
      break;
    case "Public Confirmed Tornado Warning":
      emergencyText = "THE PUBLIC HAS CONFIRMED A TORNADO";
      break;
    case "PDS Tornado Warning":
      emergencyText =
        "A LARGE AND EXTREMELY DANGEROUS TORNADO IS ON THE GROUND";
      break;
    case "Tornado Emergency":
      emergencyText = "A VIOLENT AND PERHAPS DEADLY TORNADO IS ON THE GROUND";
      break;
    default:
      emergencyText = "";
  }

  // Display the notification
  displayNotification(warning, notificationType, emergencyText);
}

function getSoundForEvent(eventName, notificationType) {
  if (notificationType === "WEATHER ALERT UPGRADE") {
    if (eventName.includes("Tornado Emergency")) return "TorUpgradeSound"; // Re-using update sound for upgrade to Tornado Warning
    if (eventName.includes("Tornado Warning")) return "TorUpgradeSound"; // Re-using update sound for upgrade to Tornado Warning
    if (eventName.includes("Severe Thunderstorm Warning"))
      return "SvrUpgradeSound"; // Re-using update sound for upgrade to Tornado Warning
  } else {
    // notificationType === "NEW WEATHER ALERT"
    // Sounds for initial issuance of an alert
    if (eventName.includes("Tornado Emergency")) return "TOREISS";
    if (eventName.includes("PDS Tornado Warning")) return "TorPDSSound";
    if (eventName.includes("Tornado Warning")) return "TorIssSound";
    if (eventName.includes("Destructive")) return "PDSSVRSound";
    if (eventName.includes("Considerable Severe Thunderstorm Warning"))
      return "SVRCNEWSound";
    if (eventName === "Severe Thunderstorm Warning") return "Bloop";
    if (eventName.includes("Tornado Watch")) return "TOAWatch";
    if (eventName.includes("Severe Thunderstorm Watch")) return "SVAWatch";
    if (eventName.includes("Flash Flood Emergency")) return "FFENewIss";
    if (eventName.includes("Considerable Flash Flood Warning"))
      return "FFWCNewIss";
    // Default sound if no specific match for new alerts
    return "SVRCSound";
  }
}

// Queue to store pending notifications
const notificationQueue = [];
let isNotificationDisplaying = false;

/**
 * Displays a notification and processes the queue
 * @param {Object} warning - The warning object
 * @param {string} notificationType - Type of notification
 * @param {string|null} emergencyText - Emergency text if applicable
 */
function displayNotification(warning, notificationType, emergencyText) {
  if (notificationsMuted) return; // no logging, keep it chill

  // Add the notification to the queue
  notificationQueue.push({
    warning,
    notificationType,
    emergencyText,
  });

  // Process the queue if no notification is currently displaying
  if (!isNotificationDisplaying) {
    processNotificationQueue();
  }
}

/**
 * Process notifications in the queue one by one
 */
function processNotificationQueue() {
  if (notificationQueue.length === 0) {
    isNotificationDisplaying = false;
    return;
  }

  isNotificationDisplaying = true;
  const { warning, notificationType, emergencyText } =
    notificationQueue.shift();

  // Create and display the notification
  showNotificationElement(warning, notificationType, emergencyText);
}

/**
 * Shows the actual notification element
 * @param {Object} warning - The warning object
 * @param {string} notificationType - Type of notification
 * @param {string|null} emergencyText - Emergency text if applicable
 */
function showNotificationElement(warning, notificationType, emergencyText) {
  const eventName = getEventName(warning);
  const description = warning.rawText || warning.properties?.rawText || "";
  const rawAreaDesc = Array.isArray(warning.counties)
    ? warning.counties.join(" • ")
    : warning.properties?.areaDesc || "";
  const cleanAreaDesc = rawAreaDesc.replace(/^TEST\s*-\s*/i, "").trim();

  // Build container
  const notification = document.createElement("div");
  notification.className = "notification-popup";

  // Create inner container for gradient background
  const innerContainer = document.createElement("div");
  innerContainer.className = "notification-inner";
  notification.appendChild(innerContainer);

  // Determine if it's a special weather statement early
  const isSpecialWeatherStatement =
    eventName.toLowerCase() === "special weather statement";
  if (isSpecialWeatherStatement) {
    notification.classList.add("special-weather-statement");
  }

  // Type badge (protruding element)
  const typeBadge = document.createElement("div");
  typeBadge.className = "notification-type-badge";
  typeBadge.textContent = notificationType;
  typeBadge.style.backgroundColor = getAlertColor(eventName);
  notification.appendChild(typeBadge);

  // Title
  const title = document.createElement("div");
  title.className = "notification-title";
  title.textContent = eventName;
  innerContainer.appendChild(title);

  // Area/counties + expiration
  const expires = new Date(
    warning.expires || warning.properties?.expires || Date.now()
  );
  const expiresText = formatExpirationTime(expires);
  const countyDiv = document.createElement("div");
  countyDiv.className = "notification-message";
  countyDiv.textContent = `COUNTIES: ${cleanAreaDesc} | EFFECTIVE UNTIL ${expiresText}`;
  innerContainer.appendChild(countyDiv);

  // Play appropriate sound
  const soundId = getSoundForEvent(eventName, notificationType);
  console.log(`🔊 Playing sound ID: ${soundId}`);
  playSoundById(soundId);

  // Scroll logic for long county lists
  // Scroll logic for long county lists
  requestAnimationFrame(() => {
    const commaCount = (countyDiv.textContent.match(/,/g) || []).length;
    const semiCount = (countyDiv.textContent.match(/;/g) || []).length;
    const shouldScroll = commaCount > 9 || semiCount > 9;

    if (shouldScroll) {
      countyDiv.style.paddingLeft = "0px";
      countyDiv.style.paddingRight = "5em";
      countyDiv.style.whiteSpace = "nowrap";
      countyDiv.style.overflow = "hidden";

      // Wrap the text before measuring
      const scrollWrapper = document.createElement("span");
      scrollWrapper.style.display = "inline-block";
      scrollWrapper.innerHTML = countyDiv.innerHTML;
      countyDiv.innerHTML = "";
      countyDiv.appendChild(scrollWrapper);

      // Check if hazard/source info exists to adjust mask position
      const hasHazardInfo =
        allowedTornadoAlerts.includes(nameLC) ||
        eventName.toLowerCase().includes("severe thunderstorm warning");

      // Adjust mask based on presence of hazard/source info
      let maskGradient;
      if (hasHazardInfo) {
        // Position mask to end 30px left of hazard box (which is at right: 10px)
        // Hazard box width is approximately 250px (from CSS min-width), so we need to account for:
        // 10px (right position) + 250px (box width) + 30px (buffer) = 290px from right edge
        maskGradient =
          "linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 290px), transparent calc(100% - 270px))";
      } else {
        // Original mask for notifications without hazard info
        maskGradient =
          "linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)";
      }

      countyDiv.style.webkitMaskImage = maskGradient;
      countyDiv.style.maskImage = maskGradient;

      const extraPadding = 10;
      // Adjust scroll distance calculation for hazard info presence
      const rightBuffer = hasHazardInfo ? 290 : 20; // Account for hazard box space
      const scrollDistance =
        scrollWrapper.scrollWidth -
        (countyDiv.offsetWidth - rightBuffer) +
        extraPadding;

      // Determine scroll duration based on warning type
      const isCritical =
        getEventName(warning).toLowerCase().includes("considerable") ||
        getEventName(warning).toLowerCase().includes("destructive") ||
        getEventName(warning).toLowerCase().includes("observed tornado") ||
        getEventName(warning).includes("PDS") ||
        getEventName(warning).toLowerCase().includes("emergency");

      const totalDuration = isCritical ? 20 : 10;

      const animName = `scrollNotif${Date.now()}`;
      const oldStyle = document.getElementById("notif-scroll-style");
      if (oldStyle) oldStyle.remove();

      const style = document.createElement("style");
      style.id = "notif-scroll-style";
      style.textContent = `
      @keyframes ${animName} {
        0%   { transform: translateX(0); }
        20%  { transform: translateX(0); }
        80%  { transform: translateX(-${scrollDistance}px); }
        100% { transform: translateX(-${scrollDistance}px); }
      }
    `;
      document.head.appendChild(style);

      scrollWrapper.style.animation = `${animName} ${totalDuration}s linear forwards`;
    }
  });

  // Emergency block (if any)
  if (emergencyText) {
    const emergencyWrapper = document.createElement("div");
    emergencyWrapper.className = "emergency-alert";

    const iconDiv = document.createElement("div");
    iconDiv.className = "emergency-icon";

    // Add keyframes animation inline
    const styleSheet = document.createElement("style");
    const animationName = `fade${Date.now()}`; // Create unique animation name
    styleSheet.textContent = `
      @keyframes ${animationName} {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `;
    document.head.appendChild(styleSheet);

    // Apply animation to iconDiv
    iconDiv.style.animation = `${animationName} 2s ease-in-out infinite`;

    const iconImg = document.createElement("img");
    iconImg.src = "https://i.postimg.cc/DwFyZb3k/Exclamation.png";
    iconImg.alt = "Emergency Icon";
    iconImg.className = "logo";
    iconImg.id = "pulseLogo";

    iconDiv.appendChild(iconImg);

    const emergencyTextElement = document.createElement("div");
    emergencyTextElement.textContent = emergencyText;

    emergencyWrapper.appendChild(iconDiv);
    emergencyWrapper.appendChild(emergencyTextElement);

    innerContainer.appendChild(emergencyWrapper);
  }

  // Tornado hazard/source info
  const nameLC = eventName.toLowerCase().trim();
  const allowedTornadoAlerts = [
    "tornado warning",
    "radar confirmed tornado warning",
    "spotter confirmed tornado warning",
    "emergency mgmt confirmed tornado warning",
    "public confirmed tornado warning",
    "law enforcement confirmed tornado warning",
    "observed tornado warning",
    "pds tornado warning",
    "tornado emergency",
  ];

  if (allowedTornadoAlerts.includes(nameLC)) {
    const haz = (
      description.match(/HAZARD\.{3}\s*(.*?)(?=SOURCE\.{3}|$)/is)?.[1] ||
      warning.tornadoDamageThreat ||
      "N/A"
    ).trim();
    const src = (
      description.match(/SOURCE\.{3}\s*(.*?)(?=IMPACT\.{3}|$)/is)?.[1] || "N/A"
    ).trim();

    const getHazardEmoji = (hazard) => {
      const h = hazard.toLowerCase();
      if (h.includes("deadly tornado")) return "";
      if (h.includes("damaging tornado")) return "";
      if (h.includes("tornado")) return "";
      return "⚠️";
    };

    const getSourceEmoji = (source) => {
      const s = source.toLowerCase();
      if (s.includes("weather spotter")) return "";
      if (s.includes("radar indicated")) return "";
      if (s.includes("radar confirmed")) return "";
      if (s.includes("public")) return "";
      return "";
    };

    const hs = document.createElement("div");
    hs.className = "hazard-source-info";
    hs.innerHTML = `
      <div><strong>HAZARD:</strong> ${getHazardEmoji(
        haz
      )}${haz}${getHazardEmoji(haz)}</div>
      <div><strong>SOURCE:</strong> ${getSourceEmoji(
        src
      )}${src}${getSourceEmoji(src)}</div>
    `;
    innerContainer.appendChild(hs);
  }

  // Severe thunderstorm wind/hail info
  if (eventName.toLowerCase().includes("severe thunderstorm warning")) {
    const haz = (
      description.match(/HAZARD\.{3}\s*(.*?)(?=SOURCE\.{3}|$)/is)?.[1] || "N/A"
    ).trim();
    const src = (
      description.match(/SOURCE\.{3}\s*(.*?)(?=IMPACT\.{3}|$)/is)?.[1] || "N/A"
    ).trim();
    const tornadoDetection = warning.threats?.tornadoDetection || "N/A";

    const wh = document.createElement("div");
    wh.className = "wind-hail-info";

    if (tornadoDetection.toUpperCase() === "POSSIBLE") {
      wh.innerHTML = `
        <div><strong>HAZARD:</strong> ${haz}</div>
        <div><strong>SOURCE:</strong> ${src}</div>
        <div style="font-weight: bold;">**A TORNADO IS ALSO POSSIBLE**</div>
      `;
    } else {
      wh.innerHTML = `
        <div><strong>HAZARD:</strong> ${haz}</div>
        <div><strong>SOURCE:</strong> ${src}</div>
      `;
    }
    innerContainer.appendChild(wh);
  }

  // Append notification to document body
  document.body.appendChild(notification);

  // Apply background color to notification

  // Set timeout for disappearing
  const duration =
    eventName.toLowerCase().includes("tornado") || eventName.includes("PDS")
      ? 10_000
      : 10_000;

  setTimeout(() => {
    // Remove appear class to prevent conflicts with disappear animation
    notification.classList.remove("appear");
    // Apply exit animation
    notification.classList.add("disappear");

    // Remove after animation completes
    setTimeout(() => {
      notification.remove();
      processNotificationQueue();
    }, 800); // Match this to the disappear animation duration (0.7s parent + 0.2s max child delay + 0.3s child animation = ~1s, using 800ms for safety)
  }, duration);

  // Update warning list if needed
  if (
    typeof updateWarningList === "function" &&
    typeof activeWarnings !== "undefined"
  ) {
    updateWarningList(activeWarnings);
  }

  const alertColor = getAlertColor(eventName);
  notification.style.setProperty("--alert-color", alertColor);

  // Trigger entrance animation
  setTimeout(() => {
    notification.classList.add("appear");
  }, 10);
}
/**
 * Clear all pending notifications
 */
function clearNotificationQueue() {
  notificationQueue.length = 0;
}

function typeEffect(element, text, delay = 25, startDelay = 150) {
  element.textContent = "";
  let index = 0;

  setTimeout(() => {
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, delay);
  }, startDelay);
}
function getHighestActiveAlert() {
  if (!activeWarnings || activeWarnings.length === 0) {
    return { alert: "N/A", color: "#1F2593" };
  }

  const sortedWarnings = [...activeWarnings].sort((a, b) => {
    const eventNameA = getEventName(a);
    const eventNameB = getEventName(b);

    return priority[eventNameA] - priority[eventNameB];
  });

  const highestAlert = sortedWarnings[0];
  const eventName = getEventName(highestAlert);

  return {
    alert: eventName,
    color: getAlertColor(eventName),
    originalAlert: highestAlert,
  };
}

let serverTimeOffset = 0; // ms
let currentTimeZone = "ET"; // or "CT"

let isFirstSync = true; // track if it’s first sync or not

async function syncWithTimeServer() {
  const clock = document.getElementById("clockDisplay");

  if (isFirstSync) {
    clock.textContent = "Syncronizing Time..."; // placeholder only on first try
  }

  console.log("⏰ Starting time sync…");
  const urls = [
    "https://worldtimeapi.org/api/timezone/America/New_York",
    "https://timeapi.io/api/Time/current/zone?timeZone=America/New_York",
  ];
  const maxRetries = 10;
  const retryDelay = 500; // ms

  let lastError = null;

  for (const url of urls) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔁 Fetching ${url} (try ${attempt}/${maxRetries})`);
      try {
        const t0 = Date.now();
        const resp = await fetch(url, { cache: "no-store" });
        const t1 = Date.now();

        if (!resp.ok) {
          console.warn(`⚠️ HTTP ${resp.status} from ${url}`);
        } else {
          const data = await resp.json();
          if (data && data.datetime) {
            const serverTime = new Date(data.datetime).getTime();
            const rtt = t1 - t0;
            serverTimeOffset = serverTime + rtt / 2 - t1;
            console.log(
              `✅ Synced. RTT: ${rtt} ms, offset: ${serverTimeOffset} ms`
            );
            if (isFirstSync) clock.textContent = ""; // clear placeholder only first time
            isFirstSync = false; // mark that first sync done
            return;
          } else {
            console.warn(`⚠️ Missing datetime in response from ${url}`);
          }
        }
      } catch (err) {
        console.warn(`💥 Fetch error from ${url}`, err);
        lastError = err;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
    console.warn(`😤 All retries failed for ${url}, moving on...`);
  }
  throw lastError || new Error("❌ Couldn’t fetch valid time 😭");
}

function getCurrentTime() {
  return new Date(Date.now() + serverTimeOffset);
}

function updateClock() {
  const now = getCurrentTime();
  const tzOffsetMs = currentTimeZone === "CT" ? -3600000 : 0;
  const displayTime = new Date(now.getTime() + tzOffsetMs);
  const h = displayTime.getHours() % 12 || 12;
  const m = displayTime.getMinutes().toString().padStart(2, "0");
  const s = displayTime.getSeconds().toString().padStart(2, "0");
  const a = displayTime.getHours() >= 12 ? "PM" : "AM";
  const d = displayTime.getDate().toString().padStart(2, "0");
  const M = (displayTime.getMonth() + 1).toString().padStart(2, "0");
  const y = (displayTime.getFullYear() % 100).toString().padStart(2, "0");

  document.getElementById(
    "clockDisplay"
  ).innerHTML = `<span class="time">${h}:${m}:${s} ${a} ${currentTimeZone}</span><span class="date">${M}/${d}/${y}</span>`;
}

function toggleTimeZone() {
  currentTimeZone = currentTimeZone === "ET" ? "CT" : "ET";
  document.getElementById("toggleTimeZone").textContent =
    currentTimeZone === "ET"
      ? "Switch to Central Time"
      : "Switch to Eastern Time";
  updateClock();
}

async function initClock() {
  try {
    await syncWithTimeServer();
    updateClock();

    // Align next tick to the next full second
    const now = getCurrentTime();
    const delay = 1000 - now.getMilliseconds();
    setTimeout(() => {
      updateClock();
      setInterval(updateClock, 1000);
    }, delay);

    // Re-sync every hour to stay precise
  } catch (err) {
    console.error(
      "💥 Failed to sync time from server. Clock will not start.",
      err
    );
    document.getElementById("clockDisplay").textContent =
      "⚠️ Failed to sync time from server";
  }
}

// Go!
initClock();

document.addEventListener("DOMContentLoaded", initClock);
setInterval(() => {
  updateWarningList(activeWarnings);
}, 30000);

let lastAlertText = "";
let lastAlertColor = "";
let lastWarningsCount = 0;

function updateAlertBar() {
  function darkenColor(color, percent = 20) {
    let r, g, b;

    if (color.startsWith("#")) {
      if (color.length === 7) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      } else if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else {
        return color;
      }

      const factor = (100 - percent) / 100;

      r = Math.floor(r * factor);
      g = Math.floor(g * factor);
      b = Math.floor(b * factor);

      const toHex = (n) => n.toString(16).padStart(2, "0");

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return color;
  }

  const highestAlert = getHighestActiveAlert();
  const alertBar = document.getElementById("alertBar");
  const alertText = document.getElementById("highestAlertText");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const semicircle = document.querySelector(".semicircle");

  const currentText =
    highestAlert.alert === "N/A"
      ? "MICHIGAN STORM CHASERS"
      : highestAlert.originalAlert
      ? getEventName(highestAlert.originalAlert)
      : highestAlert.alert;
  const currentColor = highestAlert.color || "#1F2593";
  const currentCount = activeWarnings.length;

  if (
    currentText === lastAlertText &&
    currentColor === lastAlertColor &&
    currentCount === lastWarningsCount
  )
    return;

  lastAlertText = currentText;
  lastAlertColor = currentColor;
  lastWarningsCount = currentCount;

  // Check for custom settings
  const savedAlertText = localStorage.getItem("customAlertText");
  const savedAlertBarColor = localStorage.getItem("alertBarColor");
  const savedEventTypeBarColor = localStorage.getItem("eventTypeBarColor");

  if (highestAlert.alert === "N/A" && activeWarnings.length === 0) {
    alertText.textContent = savedAlertText || "MICHIGAN STORM CHASERS";
    alertText.style.color = ""; // Reset to default color
    alertBar.style.backgroundColor = savedAlertBarColor || "#1F2593";
    activeAlertsBox.style.display = "none";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
    updateDashboard();
  } else if (highestAlert.alert) {
    alertText.textContent = currentText;
    alertText.style.color =
      currentText === "Special Weather Statement" ? "black" : "";
    alertBar.style.backgroundColor = highestAlert.color;

    // Darken glow by 20%
    const darkerGlow = darkenColor(highestAlert.color, 20);
    alertBar.style.setProperty("--glow-color", darkerGlow);

    activeAlertsBox.textContent = "HIGHEST ACTIVE ALERT";
    activeAlertsBox.style.display = "block";
    // Set text color to black if it's a Special Weather Statement
    activeAlertsBox.style.color =
      currentText === "Special Weather Statement" ? "black" : "";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";

    updateDashboard();
  } else {
    alertText.textContent = "No valid alert found.";
    alertText.style.color = ""; // Reset to default color
    alertBar.style.backgroundColor = "#606060";
    activeAlertsBox.style.display = "none";
    semicircle.style.background =
      "linear-gradient(to right, rgba(100, 100, 100, 0.7) 0%, rgba(50, 50, 50, 0) 100%)";
  }
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));

  return `rgb(${r}, ${g}, ${b})`;
}

function createWarningDetailModal() {
  if (!document.getElementById("warning-detail-modal")) {
    const modalContainer = document.createElement("div");
    modalContainer.id = "warning-detail-modal";
    modalContainer.className = "warning-detail-modal";
    modalContainer.style.display = "none";

    const modalContent = document.createElement("div");
    modalContent.className = "warning-detail-content";

    const closeButton = document.createElement("span");
    closeButton.className = "close-modal";
    closeButton.innerHTML = "&times;";
    closeButton.onclick = function () {
      document.getElementById("warning-detail-modal").style.display = "none";
    };

    modalContent.appendChild(closeButton);
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    window.addEventListener("click", function (event) {
      if (event.target === modalContainer) {
        modalContainer.style.display = "none";
      }
    });
  }
}

function showAlertDetails(warning) {
  document.getElementById("alertTitle").textContent = getEventName(warning);
  document.getElementById("alertDescription").textContent =
    warning.properties.areaDesc;

  const parameters = warning.properties.parameters || {};

  document.getElementById("maxWindGust").textContent =
    parameters.maxWindGust || "Not specified";
  document.getElementById("maxHailSize").textContent =
    parameters.maxHailSize || "Not specified";
  document.getElementById("tornadoDetection").textContent =
    parameters.tornadoDetection || "Not specified";
  document.getElementById("tornadoDamageThreat").textContent =
    parameters.tornadoDamageThreat || "None";

  const expiresDate = new Date(warning.properties.expires);
  document.getElementById("expires").textContent = formatDate(expiresDate);

  document.getElementById("alertDetailModal").classList.remove("hidden");
}

function setupFlashingEffect(content) {
  content.classList.add("flashing");

  const indicatorContainer = document.createElement("div");
  indicatorContainer.className = "emergency-indicator";
  content.prepend(indicatorContainer);

  const canvas = document.createElement("canvas");
  canvas.width = 30;
  canvas.height = 30;
  indicatorContainer.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let isWhite = true;
  const flashInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(15, 15, 10, 0, 2 * Math.PI);
    ctx.fillStyle = isWhite ? "white" : "red";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();

    isWhite = !isWhite;
  }, 1000);

  const modal = document.getElementById("warning-detail-modal");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === "style" &&
        modal.style.display === "none"
      ) {
        clearInterval(flashInterval);
        observer.disconnect();
      }
    });
  });

  observer.observe(modal, { attributes: true });
}

function displayWarningDetails(warning) {
  createWarningDetailModal();

  const modal = document.getElementById("warning-detail-modal");
  const content = modal.querySelector(".warning-detail-content");
  content.innerHTML = "";

  // Close button
  const closeButton = document.createElement("span");
  closeButton.className = "close-modal";
  closeButton.innerHTML = "&times;";
  closeButton.onclick = () => (modal.style.display = "none");
  content.appendChild(closeButton);

  // Header & title
  const eventName = getEventName(warning);
  const eventClass = eventTypes[eventName] || "unknown-event";
  content.className = `warning-detail-content ${eventClass}`;

  const header = document.createElement("div");
  header.className = "detail-section detail-header";

  const emoji = getWarningEmoji(eventName);
  const title = document.createElement("h2");
  title.innerHTML = `${emoji} <span class="event-emoji"></span>${eventName}`;
  header.appendChild(title);

  // Area description (counties or fallback)
  const areaDescText = Array.isArray(warning.counties)
    ? warning.counties.join(", ")
    : warning.areaDesc || "Area information unavailable";
  const areaDesc = document.createElement("h3");
  areaDesc.textContent = areaDescText;
  header.appendChild(areaDesc);

  content.appendChild(header);

  // 🕒 Timing & Details
  const infoSection = document.createElement("div");
  infoSection.className = "detail-section";

  const infoTitle = document.createElement("h4");
  infoTitle.textContent = "⏱️ Timing & Details";
  infoSection.appendChild(infoTitle);

  const infoContainer = document.createElement("div");
  infoContainer.className = "detail-info";

  // date detection: look for .effective, .sent, fallback to rawText parse?
  const issuedRaw = warning.effective || warning.sent;
  const expiresRaw = warning.expires;
  const issuedDate = issuedRaw ? new Date(issuedRaw) : null;
  const expiresDate = expiresRaw ? new Date(expiresRaw) : null;

  const details = [
    {
      label: "Issued",
      value: issuedDate ? issuedDate.toLocaleString() : "Unknown",
    },
    {
      label: "Expires",
      value: expiresDate ? expiresDate.toLocaleString() : "Unknown",
    },
  ];

  // unified threats object
  const t = warning.threats || {};

  // pull every possible threat field, normalize missing to "Unknown"
  const fieldDefs = [
    {
      key: "windThreat",
      label: "Wind Threat",
      critical: (v) => v.toLowerCase().includes("observed"),
    },
    {
      key: "hailThreat",
      label: "Hail Threat",
      critical: () => false,
    },
    {
      key: "maxWindGust",
      label: "Maximum Wind Gust",
      critical: (v) => parseInt(v) >= 70,
    },
    {
      key: "maxHailSize",
      label: "Maximum Hail Size",
      critical: (v) => parseFloat(v) >= 1.5,
    },
    {
      key: "tornadoDetection",
      label: "Tornado Detection",
      critical: (v) => v.toLowerCase().includes("observed"),
    },
    {
      key: "tornadoDamageThreat",
      label: "Tornado Damage Threat",
      critical: (v) => v.toLowerCase() !== "possible",
    },
    {
      key: "thunderstormDamageThreat",
      label: "Thunderstorm Damage Threat",
      critical: (v) =>
        ["CONSIDERABLE", "DESTRUCTIVE", "CATASTROPHIC"].includes(
          v.toUpperCase()
        ),
    },
  ];

  fieldDefs.forEach(({ key, label, critical }) => {
    // fetch from top-level first, then from t object
    const raw = warning[key] ?? t[key];
    if (raw != null) {
      const val = String(raw);
      details.push({
        label,
        value: val,
        critical: critical(val),
      });
    }
  });

  // render all detail rows
  details.forEach((d) => {
    const row = document.createElement("div");
    row.className = "detail-row";

    const lbl = document.createElement("span");
    lbl.className = "detail-label";
    lbl.textContent = d.label + ": ";

    const valSpan = document.createElement("span");
    valSpan.className = d.critical ? "detail-value critical" : "detail-value";
    valSpan.textContent = d.value;

    row.appendChild(lbl);
    row.appendChild(valSpan);
    infoContainer.appendChild(row);
  });

  infoSection.appendChild(infoContainer);
  content.appendChild(infoSection);

  // 📝 Description block
  if (warning.rawText) {
    const descSection = document.createElement("div");
    descSection.className = "detail-section";

    const descTitle = document.createElement("h4");
    descTitle.textContent = "📝 Description";

    const descText = document.createElement("div");
    descText.className = "description-text";
    descText.style.whiteSpace = "pre-wrap";
    descText.style.maxHeight = "150px"; // initial height
    descText.style.overflow = "hidden";
    descText.style.transition = "max-height 0.3s ease";
    descText.textContent = warning.rawText;

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-description";
    toggleBtn.textContent = "Show More";
    toggleBtn.style.marginTop = "0.5em";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.onclick = () => {
      const expanded = descText.classList.toggle("expanded");
      descText.style.maxHeight = expanded ? "none" : "150px";
      toggleBtn.textContent = expanded ? "Show Less" : "Show More";
    };

    descSection.append(descTitle, descText, toggleBtn);
    content.appendChild(descSection);
  }

  // ⚠️ Instructions block
  if (warning.instruction) {
    const instrSection = document.createElement("div");
    instrSection.className = "detail-section instructions";
    const instrTitle = document.createElement("h4");
    instrTitle.textContent = "⚠️ Instructions";
    const instrText = document.createElement("div");
    instrText.className = "instruction-text";
    instrText.textContent = warning.instruction;
    instrSection.append(instrTitle, instrText);
    content.appendChild(instrSection);
  }

  // 🗺️ Polygon overlay (white on transparent)
  if (
    warning.polygon &&
    warning.polygon.type === "Polygon" &&
    Array.isArray(warning.polygon.coordinates)
  ) {
    const outer = warning.polygon.coordinates[0];
    if (
      Array.isArray(outer) &&
      outer.every((p) => Array.isArray(p) && p.length === 2)
    ) {
      // NEW: no flip, treat as [lat, lon]
      const latlon = outer.map(([lat, lon]) => [lat, lon]);
      const areaSection = document.createElement("div");
      areaSection.className = "detail-section areas";
      const polyTitle = document.createElement("h4");
      polyTitle.textContent = "🗺️ Warning Area";
      const polyCanvas = drawPolygon(latlon);
      if (polyCanvas) {
        areaSection.append(polyTitle, polyCanvas);
        content.appendChild(areaSection);
      }
    } else {
      console.warn("Malformed polygon coords:", warning.polygon);
    }
  }

  // show modal & add animations
  modal.style.display = "block";
  content.style.animation = "fadeIn 0.3s ease-in-out";

  // flash special emergencies
  if (["Tornado Emergency", "PDS Tornado Warning"].includes(eventName)) {
    setupFlashingEffect(content);
  } else {
    content.classList.remove("flashing");
  }

  makeElementDraggable(content);
}

function makeElementDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  const header = element.querySelector(".detail-header") || element;

  if (header) {
    header.style.cursor = "move";
    header.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function getWarningEmoji(eventName) {
  const emojiMap = {
    "Tornado Warning": "🌪️",
    "Observed Tornado Warning": "🌪️",
    "PDS Tornado Warning": "⚠️🌪️",
    "Tornado Emergency": "🚨🌪️",
    "Severe Thunderstorm Warning": "⛈️",
    "Considerable Severe Thunderstorm Warning": "⚡⛈️",
    "Destructive Severe Thunderstorm Warning": "💥⛈️",
    "Flash Flood Warning": "🌊",
    "Considerable Flash Flood Warning": "🌊⚠️",
    "Flash Flood Emergency": "🚨🌊",
    "Flood Warning": "💧",
    "Flood Advisory": "💦",
    "Flood Watch": "👀💦",
    "Winter Storm Warning": "❄️",
    "Winter Weather Advisory": "🌨️",
    "Ice Storm Warning": "🧊",
    "Blizzard Warning": "☃️❄️",
    "Special Weather Statement": "ℹ️",
    "Tornado Watch": "👀🌪️",
    "Severe Thunderstorm Watch": "👀⛈️",
    "Extreme Heat Warning": "🌡️",
    "Extreme Heat Watch": "🫠",
    "Heat Advisory": "🔥",
    "Frost Advisory": "❄️",
    "Freeze Watch": "❄️",
    "Freeze Warning": "❄️",
    "Wind Chill Warning": "🥶",
    "Cold Weather Advisory": "🧥",
    "Extreme Cold Warning": "❄️🥶",
  };

  return emojiMap[eventName] || "⚠️";
}

function drawPolygon(rawPoints, parentElement, eventClass = "") {
  if (
    !Array.isArray(rawPoints) ||
    rawPoints.length === 0 ||
    !Array.isArray(rawPoints[0])
  ) {
    console.warn("Invalid polygon points:", rawPoints);
    return null;
  }

  const points = rawPoints
    .filter((pt) => Array.isArray(pt) && pt.length === 2)
    .map(([lat, lon]) => [lat, lon]);

  const canvas = document.createElement("canvas");
  canvas.className = `polygon-preview ${eventClass}`;
  canvas.width = 300;
  canvas.height = 300;

  const ctx = canvas.getContext("2d");

  const latValues = points.map((p) => p[0]);
  const lonValues = points.map((p) => p[1]);

  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const minLon = Math.min(...lonValues);
  const maxLon = Math.max(...lonValues);

  const padding = 20;

  const dataWidth = maxLon - minLon;
  const dataHeight = maxLat - minLat;

  const scaleX = (canvas.width - 2 * padding) / dataWidth;
  const scaleY = (canvas.height - 2 * padding) / dataHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = dataWidth * scale;
  const scaledHeight = dataHeight * scale;

  const offsetX = (canvas.width - scaledWidth) / 2;
  const offsetY = (canvas.height - scaledHeight) / 2;

  let alpha = 0.15; // starting opacity
  let alphaDirection = 1; // 1 for fade in, -1 for fade out
  const alphaMin = 0.05;
  const alphaMax = 0.4;
  const alphaStep = 0.01;

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    points.forEach(([lat, lon], i) => {
      const x = offsetX + (lon - minLon) * scale;
      const y = offsetY + scaledHeight - (lat - minLat) * scale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();

    // flashing fill with dynamic alpha
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // update alpha for flashing effect
    alpha += alphaDirection * alphaStep;
    if (alpha >= alphaMax || alpha <= alphaMin) alphaDirection *= -1;

    requestAnimationFrame(drawFrame);
  }

  // kick off the animation loop
  drawFrame();

  return canvas;
}

function getPolygonColor(eventClass) {
  const colorMap = {
    "tornado-warning": "rgba(255, 0, 0, 0.6)",
    "observed-tornado-warning": "rgba(139, 0, 0, 0.6)",
    "pds-tornado-warning": "rgba(128, 0, 128, 0.6)",
    "tornado-emergency": "rgba(255, 192, 203, 0.6)",
    "severe-thunderstorm-warning": "rgba(255, 165, 0, 0.6)",
    "flash-flood-warning": "rgba(0, 100, 0, 0.6)",
    "ice-storm-warning": "rgba(160, 28, 127, 0.6)",
    "cold-weather-advisory": "rgba(139, 188, 188, 0.6)",
    "wind-chill-warning": "rgba(0, 168, 168, 0.6)",
    "extreme-cold-warning": "rgba(0, 0, 255, 0.6)",
    "extreme-cold-watch": "rgba(95, 158, 160, 0.6)",
    "lake-effect-snow-warning": "rgba(0, 139, 139, 0.6)",
  };

  return colorMap[eventClass] || "rgba(255, 255, 255, 0.3)";
}

setInterval(updateAlertBar, 10);

function getAlertColor(eventName) {
  const colorMap = {
    "Tornado Warning": "#FF0000",
    "Observed Tornado Warning": "#FF00FF",
    "Emergency Mgmt Confirmed Tornado Warning": "#FF2F4A",
    "Law Enforcement Confirmed Tornado Warning": "#FF2F4A",
    "Spotter Confirmed Tornado Warning": "#FF2F4A",
    "Public Confirmed Tornado Warning": "#FF2F4A",
    "Radar Confirmed Tornado Warning": "#FF2F4A",
    "Cold Weather Advisory": "#8BBCBC",
    "Wind Chill Warning": "#00A8A8",
    "Extreme Cold Warning": "#0000FF",
    "Extreme Cold Watch": "#5F9EA0",
    "Lake Effect Snow Warning": "#008B8B",
    "Radar Confirmed Tornado Warning": "#FF00FF",
    "Spotter Confirmed Tornado Warning": "#FF00FF",
    "Emergency Mgmt Confirmed Tornado Warning": "#FF00FF",
    "Law Enforcement Confirmed Tornado Warning": "#FF00FF",
    "Public Confirmed Tornado Warning": "#FF00FF",
    "PDS Tornado Warning": "#FF00FF",
    "Tornado Emergency": "#FF0080",
    "Severe Thunderstorm Warning": "#FF8000",
    "Considerable Severe Thunderstorm Warning": "#FF8000",
    "Destructive Severe Thunderstorm Warning": "#FF8000",
    "Flash Flood Warning": "#228B22",
    "Considerable Flash Flood Warning": "#228B22", // Same color as flash flood warning
    "Flood Warning": "#00c900ff",
    "Flood Advisory": "#66ca66ff",
    "Flood Watch": "#1d5736ff",
    "Flash Flood Emergency": "#8B0000",
    "Tornado Watch": "#8B0000",
    "Severe Thunderstorm Watch": "#DB7093",
    "Winter Weather Advisory": "#7B68EE",
    "Winter Storm Warning": "#FF69B4",
    "Winter Storm Watch": "#6699CC",
    "Ice Storm Warning": "#8B008B",
    "Frost Advisory": "#6495ED",
    "Freeze Watch": "#00d4d4ff",
    "Freeze Warning": "#483D8B",
    "Cold Weather Advisory": "#8BBCBC",
    "Wind Chill Warning": "#00A8A8",
    "Extreme Cold Warning": "#0000FF",
    "Blizzard Warning": "#FF4500",
    "Special Weather Statement": "#FFE4B5",
    "High Wind Warning": "#DAA520",
    "High Wind Watch": "#B8860B",
    "Wind Advisory": "#D2B48C",
    "Snow Squall Warning": "#C71585",
    "Freezing Fog Advisory": "#008080",
    "Dense Fog Advisory": "#708090",
    "Dust Advisory": "#BDB76B",
    "Extreme Heat Warning": "#C71585",
    "Extreme Heat Watch": "#800000",
    "Heat Advisory": "#FF4500",
  };

  return colorMap[eventName] || "rgba(85, 84, 165, 0.9)";
}

const audioElements = {
  TorIssSound: new Audio("Sounds/TorIssSound.mp3"),
  TorPDSSound: new Audio("Sounds/PDSTorIss.mp3"),
  PDSSVRSound: new Audio("Sounds/SvrDNew.mp3"),
  SVRCSound: new Audio("Sounds/Chime.wav"),
  SVRCNEWSound: new Audio("Sounds/SvrCIss.mp3"),
  TORUPG: new Audio("Sounds/TorUpg.mp3"),
  TOREISS: new Audio("Sounds/TorEIss.mp3"),
  TOAWatch: new Audio("Sounds/TOAWatch.mp3"),
  SVAWatch: new Audio("Sounds/SVAWatch.mp3"),
  TorUpdateSound: new Audio("Sounds/TorUpg.mp3"),
  TorPDSUpdateSound: new Audio("Sounds/PDSTorIss.mp3"),
  TorEmergencyUpdateSound: new Audio("Sounds/TorElss.mp3"),
  TorUpgradeSound: new Audio("Sounds/TorUpg.mp3"),
  SvrUpgradeSound: new Audio("Sounds/SvrUpgrade.mp3"),
  FFWCNewIss: new Audio("Sounds/FFWCIss.mp3"),
  FFENewIss: new Audio("Sounds/FFWEIss.mp3"),
  Bloop: new Audio("Sounds/Bloop.mp3"),
};

function playSoundById(soundId) {
  const sound = audioElements[soundId];
  if (!sound) {
    // fallback
    const fallback = audioElements.SVRCSound;
    fallback.currentTime = 0;
    fallback.play().catch((error) => {
      console.error("Error playing fallback sound:", error);
    });
    return;
  }

  // Try to resume audio context if suspended (for browsers like Chrome)
  if (typeof window.AudioContext !== "undefined") {
    try {
      const ctx = window.audioCtx || new window.AudioContext();
      window.audioCtx = ctx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    } catch (e) {
      // Ignore if not supported
    }
  }

  sound.currentTime = 0;
  sound.play().catch((error) => {
    console.error("Error playing sound:", error);
    // Try to re-create the audio element if it failed
    if (audioElements[soundId].src) {
      audioElements[soundId] = new Audio(audioElements[soundId].src);
      audioElements[soundId].currentTime = 0;
      audioElements[soundId].play().catch((err) => {
        console.error("Error playing recreated sound:", err);
      });
    }
  });
}

document
  .getElementById("testCustomWarningButton")
  .addEventListener("click", () => {
    const customWarningText =
      document.getElementById("customWarningInput").value;
    if (customWarningText) {
      testNotification(customWarningText);
    } else {
      alert("Please enter a warning to test.");
    }
  });

function formatCountiesTopBar(areaDesc) {
  if (!areaDesc) return "Unknown Area";

  const parts = areaDesc.split(";").map((part) => part.trim());

  return parts.join("; ");
}

function formatCountiesNotification(areaDesc) {
  if (!areaDesc) return "Unknown Area";

  const parts = areaDesc.split(";").map((part) => part.trim());

  return parts.join(", ");
}

/**
 * Formats expiration time, including date if not today
 * @param {Date} expiresDate - The expiration date
 * @returns {string} Formatted expiration text (e.g., "11:00 PM" or "NOVEMBER 4 AT 11:00 PM")
 */
function formatExpirationTime(expiresDate) {
  if (!expiresDate || !(expiresDate instanceof Date) || isNaN(expiresDate)) {
    return "UNKNOWN";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiresDay = new Date(
    expiresDate.getFullYear(),
    expiresDate.getMonth(),
    expiresDate.getDate()
  );

  const timeStr = expiresDate
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();

  // If expires today, just show time
  if (expiresDay.getTime() === today.getTime()) {
    return timeStr;
  }

  // If expires on a different day, show "MONTH DAY AT TIME"
  const month = expiresDate
    .toLocaleString("en-US", { month: "long" })
    .toUpperCase();
  const day = expiresDate.getDate();

  return `${month} ${day} AT ${timeStr}`;
}

function updateWarningList(warnings = null) {
  // Allow callers to omit the warnings array; default to global activeWarnings
  if (!Array.isArray(warnings))
    warnings = Array.isArray(activeWarnings) ? activeWarnings : [];
  const warningList = document.getElementById("warningList");
  if (!warningList) return;

  warningList.innerHTML = "";

  const listHeader = document.createElement("div");
  listHeader.className = "warning-list-header";
  listHeader.innerHTML = `
    <h2>Active Warnings (Click to expand/collapse)<span class="warning-count-badge">${warnings.length}</span></h2>
    <div class="warning-list-controls">
      <button class="list-control-btn sort-btn" title="Sort warnings by time">
        <i class="fa fa-clock"></i> Sort by Time
      </button>
      <button class="list-control-btn filter-btn" title="Filter warnings">
        <i class="fa fa-filter"></i> Filter
      </button>
    </div>
  `;
  warningList.appendChild(listHeader);

  const warningGroups = {};
  warnings
    .filter((w) => w && w.properties && w.properties.event)
    .forEach((warning) => {
      const eventName = getEventName(warning) || "Unknown Event";
      if (!warningGroups[eventName]) {
        warningGroups[eventName] = [];
      }
      warningGroups[eventName].push(warning);
    });

  const severityOrder = [
    "Tornado Emergency",
    "PDS Tornado Warning",
    "Observed Tornado Warning",
    "Spotter Confirmed Tornado Warning",
    "Radar Confirmed Tornado Warning",
    "Tornado Warning",
    "Destructive Severe Thunderstorm Warning",
    "Considerable Severe Thunderstorm Warning",
    "Severe Thunderstorm Warning",
    "Flash Flood Warning",
    "Considerable Flash Flood Warning",
    "Flash Flood Emergency",
    "Flood Warning",
    "Snow Squall Warning",
    "Tornado Watch",
    "Severe Thunderstorm Watch",
    "Flood Watch",
    "Winter Storm Warning",
    "Ice Storm Warning",
    "Blizzard Warning",
    "Winter Storm Watch",
    "Winter Weather Advisory",
    "High Wind Warning",
    "Wind Advisory",
    "Flood Advisory",
    "Dense Fog Advisory",
    "Special Weather Statement",
    "Frost Advisory",
    "Freeze Watch",
    "Freeze Warning",
    "Extreme Heat Warning",
    "Extreme Heat Watch",
    "Heat Advisory",
  ];

  const warningGroupsContainer = document.createElement("div");
  warningGroupsContainer.className = "warning-groups-container";
  warningList.appendChild(warningGroupsContainer);

  severityOrder.forEach((eventType) => {
    if (!warningGroups[eventType] || warningGroups[eventType].length === 0)
      return;

    const warnings = warningGroups[eventType];

    const groupContainer = document.createElement("div");
    groupContainer.className = "warning-group collapsed"; // Start collapsed

    const groupHeader = document.createElement("div");
    groupHeader.className = `warning-group-header ${getWarningClass(
      eventType
    )}`;
    groupHeader.innerHTML = `
      <div class="group-icon">${getWarningEmoji(eventType)}</div>
      <h3>${eventType} <span class="group-count">${warnings.length}</span></h3>
      <div class="group-toggle"><i class="fa fa-chevron-right"></i></div>
    `;

    groupContainer.appendChild(groupHeader);

    const warningsContainer = document.createElement("div");
    warningsContainer.className = "warnings-container";

    warnings.sort((a, b) => {
      const aExpires = new Date(a.properties.expires);
      const bExpires = new Date(b.properties.expires);
      return aExpires - bExpires;
    });

    warnings.forEach((warning, index) => {
      const warningCard = createWarningCard(warning, index);
      warningsContainer.appendChild(warningCard);
    });

    groupContainer.appendChild(warningsContainer);
    warningGroupsContainer.appendChild(groupContainer);

    groupHeader.addEventListener("click", () => {
      groupContainer.classList.toggle("collapsed");
      const icon = groupHeader.querySelector(".group-toggle i");
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-right");
    });
  });

  const sortBtn = warningList.querySelector(".sort-btn");
  if (sortBtn) {
    sortBtn.addEventListener("click", () => {
      console.log("Sort button clicked");
    });
  }

  if (warnings.length === 0) {
    const noWarnings = document.createElement("div");
    noWarnings.className = "no-warnings-message";
    noWarnings.innerHTML = `
      <div class="no-warnings-icon">🔍</div>
      <h3>No Active Warnings</h3>
      <p>The monitored area is currently clear of weather warnings.</p>
    `;
    warningList.appendChild(noWarnings);
  }
}

function createWarningCard(warning, index) {
  // pull properties from either root or nested 'properties' obj
  const props = warning.properties || warning;

  // eventName may exist at root or inside properties
  const eventName = getEventName(warning) || props.eventName || "Unknown Event";

  // counties can be array at root or string in properties.areaDesc
  const counties = Array.isArray(warning.counties)
    ? warning.counties.join(", ")
    : props.areaDesc || "Unknown Area";

  // expiration date either root or properties
  const expiresStr = warning.expires || props.expires;
  const expires = new Date(expiresStr);

  const now = new Date();
  const timeRemaining = expires - now;
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));

  let urgencyClass = "";
  if (minutesRemaining < 15) {
    urgencyClass = "urgent";
  } else if (minutesRemaining < 30) {
    urgencyClass = "warning";
  }

  const card = document.createElement("div");
  card.className = `warning-card ${getWarningClass(eventName)} ${urgencyClass}`;
  card.setAttribute("data-warning-index", index);

  const progressPercentage = Math.min(
    100,
    Math.max(0, (minutesRemaining / 60) * 100)
  );

  card.innerHTML = `
    <div class="card-header">
      <div class="card-emoji">⚠️</div>
      <div class="card-title">${eventName}</div>
      <div class="card-urgency-indicator"></div>
    </div>
    <div class="card-body">
      <div class="card-location">
        <i class="fa fa-map-marker-alt"></i> ${counties}
      </div>
      <div class="card-time-remaining">
        <div class="time-bar-container">
          <div class="time-bar" style="width: ${progressPercentage}%"></div>
        </div>
        <div class="time-text">
          <i class="fa fa-clock"></i> 
          <span>${
            minutesRemaining > 0
              ? `${minutesRemaining} min remaining`
              : "Expiring soon"
          }</span>
        </div>
      </div>
      ${
        props.instruction
          ? `
        <div class="card-instruction">
          <div class="instruction-toggle">Safety Instructions <i class="fa fa-chevron-right"></i></div>
          <div class="instruction-content hidden">${props.instruction}</div>
        </div>
      `
          : ""
      }
    </div>
    <div class="card-actions">
      <button class="card-btn details-btn" title="View Details">
        <i class="fa fa-info-circle"></i> Details
      </button>
      <button class="card-btn share-btn" title="Share Warning">
        <i class="fa fa-share-alt"></i> Share
      </button>
    </div>
  `;

  setTimeout(() => {
    const detailsBtn = card.querySelector(".details-btn");
    if (detailsBtn) {
      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        displayWarningDetails(warning);
      });
    }

    const instructionToggle = card.querySelector(".instruction-toggle");
    if (instructionToggle) {
      instructionToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const content = card.querySelector(".instruction-content");
        content.classList.toggle("hidden");
        const icon = instructionToggle.querySelector("i");
        icon.classList.toggle("fa-chevron-down");
        icon.classList.toggle("fa-chevron-right");
      });
    }

    card.addEventListener("click", () => {
      showNotification(warning);
    });
  }, 10);

  return card;
}
function getWarningClass(eventName) {
  const eventNameLower = eventName.toLowerCase();

  if (eventNameLower.includes("tornado emergency")) return "tornado-emergency";
  if (eventNameLower.includes("pds tornado")) return "pds-tornado-warning";
  if (eventNameLower.includes("observed tornado"))
    return "observed-tornado-warning";
  if (eventNameLower.includes("tornado warning")) return "tornado-warning";
  if (eventNameLower.includes("destructive"))
    return "severe-thunderstorm-destructive";
  if (eventNameLower.includes("considerable"))
    return "severe-thunderstorm-considerable";
  if (eventNameLower.includes("severe thunderstorm"))
    return "severe-thunderstorm-warning";
  if (eventNameLower.includes("flash flood")) return "flash-flood-warning";
  if (eventNameLower.includes("tornado watch")) return "tornado-watch";
  if (eventNameLower.includes("thunderstorm watch"))
    return "severe-thunderstorm-watch";
  if (eventNameLower.includes("winter storm warning"))
    return "winter-storm-warning";
  if (eventNameLower.includes("winter weather"))
    return "winter-weather-advisory";
  if (eventNameLower.includes("blizzard")) return "blizzard-warning";
  if (eventNameLower.includes("ice storm")) return "ice-storm-warning";

  return "unknown-event";
}

function playSound(soundFile) {
  const audio = new Audio(`Sounds/${soundFile}`);
  audio.play().catch((error) => console.error("Error playing sound:", error));
}

document.getElementById("saveStateButton").addEventListener("click", () => {
  const rawInput = document.getElementById("stateInput").value.toUpperCase();
  window.selectedStates = rawInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const stateFipsCodes = window.selectedStates.map((state) => {
    const fipsCode = Object.keys(STATE_FIPS_TO_ABBR).find(
      (key) => STATE_FIPS_TO_ABBR[key] === state
    );
    return fipsCode || "Unknown";
  });

  console.log(`State filter set to: ${window.selectedStates.join(", ")}`);
  console.log(`State FIPS codes set to: ${stateFipsCodes.join(", ")}`);

  updateDashboard();

  if (window.tacticalModeAbort) {
    window.tacticalModeAbort();
  }
  let abort = false;
  window.tacticalModeAbort = () => {
    abort = true;
  };

  (async function tacticalModeLoop() {
    const interval = none;
    while (!abort) {
      const start = Date.now();

      await tacticalMode();

      const elapsed = Date.now() - start;
      const remainingTime = Math.max(0, interval - elapsed);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  })();
});

document.getElementById("tacticalModeButton").addEventListener("click", () => {
  initAlertStream();
  console.log("Save button clicked. Starting to listen for alerts...");
});

// Event listener for saveStateButton
document.getElementById("saveStateButton").addEventListener("click", () => {
  initAlertStream();
  console.log("Save state button clicked. Starting to listen for alerts...");
});

let dashboardUpdatePending = false;

if (window.tacticalModeAbort) {
  window.tacticalModeAbort();
}

let abort = false;

window.tacticalModeAbort = () => {
  abort = true;
};

(async function tacticalModeLoop() {
  const interval = none;
  while (!abort) {
    const start = Date.now();

    await tacticalMode(true);
    updateWarningList(activeWarnings);

    const elapsed = Date.now() - start;
    const remainingTime = Math.max(0, interval - elapsed);

    await new Promise((resolve) => setTimeout(resolve, remainingTime));
  }
})();

function parseRawAlert(raw) {
  let jsonStr =
    typeof raw === "string" ? raw.replace(/^data:\s*/, "").trim() : null;
  if (!jsonStr) return null;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("💥 JSON parse fail:", e, jsonStr);
    return null;
  }
}

function getVTECCore(vtecStr) {
  if (!vtecStr) return null;

  const vtecs = vtecStr
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (vtecs.length === 0) return null;

  for (const v of vtecs) {
    const parts = v.split(".");
    if (parts.length >= 5) {
      return parts.slice(2, 6).join(".");
    }
  }

  return vtecs[0];
}

let alertIndex = 0; // To keep track of the current alert index
let alertCycleInterval; // To hold the interval ID

let alertListeningActive = false; // Flag to track if alert listening is active

// VTEC Action Codes - Maps action codes to their types and descriptions
const VTEC_ACTION_CODES = {
  NEW: {
    type: "NEW",
    description: "New event issued",
  },
  CON: {
    type: "UPDATE",
    description: "Event continued",
  },
  EXT: {
    type: "UPDATE",
    description: "Event extended (time)",
  },
  EXA: {
    type: "UPDATE",
    description: "Event extended (area)",
  },
  EXB: {
    type: "UPDATE",
    description: "Event extended (both time and area)",
  },
  UPG: {
    type: "UPGRADE",
    description: "Event upgraded",
  },
  CAN: {
    type: "CANCEL",
    description: "Event cancelled",
  },
  EXP: {
    type: "EXPIRE",
    description: "Event expired",
  },
  ROU: {
    type: "UPDATE",
    description: "Routine update",
  },
  COR: {
    type: "UPDATE",
    description: "Correction to event",
  },
};

// Helper: parse VTEC into key components
function parseVTEC(vtec) {
  // format: /O.ACTION.WFO.PHEN.SIG.ETN.YYYYMMDDThhmmZ-.../
  const parts = vtec.replace(/^\//, "").replace(/\/$/, "").split(".");
  if (parts.length < 6) return {};
  const [preamble, action, wfo, phenSig, etn] = [
    parts[0],
    parts[1],
    parts[2],
    parts[3] + "." + parts[4],
    parts[5],
  ];

  // Get action code details
  const actionInfo = VTEC_ACTION_CODES[action] || {
    type: "UNKNOWN",
    description: "Unknown action code",
  };

  return {
    action,
    actionType: actionInfo.type,
    actionDescription: actionInfo.description,
    wfo,
    phenSig,
    etn,
    core: `${wfo}_${etn}`,
  };
}

function normalizeAlert(alert) {
  if (!alert.properties) {
    alert.properties = {
      event: alert.eventName || alert.eventCode || "Unknown Event",
      areaDesc: alert.counties?.join(", ") || "Unknown Area",
      expires:
        alert.expires ||
        alert.expiration ||
        new Date(Date.now() + 3600000).toISOString(), // fallback 1 hour from now
    };
  }
  return alert;
}

function TacticalMode(alerts, type = "NEW") {
  console.log("🔄 [Start] Processing tactical mode alerts...");

  activeWarnings = Array.isArray(activeWarnings) ? activeWarnings : [];

  if (!window.previousWarnings) {
    window.previousWarnings = new Map();
  }

  // Get selected alert types from checkboxes
  const selectedAlertTypes = Array.from(
    document.querySelectorAll(
      '#checkboxContainer input[type="checkbox"]:checked'
    )
  ).map((cb) => cb.value);

  // Get selected states (if any); if none, disable state filtering
  const selectedStates =
    window.selectedStates && window.selectedStates.length > 0
      ? window.selectedStates.map((s) => s.toUpperCase())
      : null;

  alerts.forEach((raw) => {
    const alert = raw?.feature || raw;

    if (!alert || typeof alert !== "object") {
      console.warn("⚠️ Skipping non-object alert:", alert);
      return;
    }

    const id = alert.id || alert.properties?.id || alert.eventCode || null;
    const eventName = getEventName(alert);

    if (!id) {
      console.warn(`⚠️ Skipping alert — missing ID entirely`);
      return;
    }

    if (!eventName) {
      console.warn(`⚠️ Skipping alert [${id}] — missing event name`);
      return;
    }

    // --- SAME code logic START ---
    let sameCodes = [];
    if (alert.geocode?.SAME) {
      sameCodes = Array.isArray(alert.geocode.SAME)
        ? alert.geocode.SAME
        : [alert.geocode.SAME];
    } else if (alert.properties?.parameters?.SAME) {
      sameCodes = Array.isArray(alert.properties.parameters.SAME)
        ? alert.properties.parameters.SAME
        : [alert.properties.parameters.SAME];
    }

    let passesSameFilter = true;
    if (selectedStates) {
      passesSameFilter = sameCodes.some((code) => {
        const stateAbbr = getStateFromSAME(code);
        return selectedStates.includes(stateAbbr);
      });

      if (!passesSameFilter) {
        console.log(
          `⛔ Alert [${eventName}] (${id}) filtered out by SAME/state selection`
        );
        return;
      }
    }
    // --- SAME code logic END ---

    const hasPolygon = !!(
      alert.polygon?.type === "Polygon" &&
      Array.isArray(alert.polygon.coordinates)
    );

    if (!selectedAlertTypes.includes(eventName)) {
      console.log(`⛔ Alert type '${eventName}' not selected`);
      return;
    }

    const normalized = normalizeAlert(alert);

    if (!window.previousWarnings.has(id)) {
      console.log(`📝 Adding to previousWarnings: ${eventName} (${id})`);
      window.previousWarnings.set(id, normalized);
    }

    const existingIndex = activeWarnings.findIndex((w) => w.id === id);
    if (existingIndex >= 0) {
      activeWarnings[existingIndex] = normalized;

      // Skip notifications for "INIT" alerts
      if (type !== "INIT") {
        showNotification(normalized, "UPDATE");
      }
    } else {
      activeWarnings.push(normalized);

      // Skip notifications for "INIT" alerts
      if (type !== "INIT") {
        showNotification(normalized, "NEW");
      }

      // 🎯 🆕 NEW: Draw polygon if available
      if (hasPolygon) {
        const polygonElem = drawPolygon(
          alert.polygon.coordinates,
          document.body
        );
        if (polygonElem) {
          document.body.appendChild(polygonElem);
        }
      }
    }
  });

  console.log("📦 Active Warnings Summary:");
  console.table(
    activeWarnings.map((w) => ({
      ID: w.id,
      Event: getEventName(w),
      Polygon: !!(
        w.polygon?.type === "Polygon" && Array.isArray(w.polygon.coordinates)
      ),
    }))
  );
  updateWarningList(activeWarnings);
  updateWarningCounters(activeWarnings);
  console.log(`✅ [Done] ${activeWarnings.length} active warnings in memory`);
}

function isWarningExpired(warning) {
  if (!warning || !warning.properties || !warning.properties.expires) {
    return false;
  }

  const expiresDate = new Date(warning.properties.expires);
  return expiresDate < new Date();
}

function updateActiveWarningsList() {
  // Clear the current active warnings
  activeWarnings = [];

  // Add all non-expired warnings from previousWarnings to activeWarnings
  if (window.previousWarnings) {
    window.previousWarnings.forEach((warning, id) => {
      if (!isWarningExpired(warning)) {
        activeWarnings.push(warning);
      } else {
        console.log(
          `🕒 Warning ${id} has expired and won't be added to active list`
        );
        // Clean up expired warnings
        window.previousWarnings.delete(id);
      }
    });
  }

  // Update the UI with the current warnings
  updateWarningList(activeWarnings);
  updateHighestAlert();
}

function processNewWarning(warning, action, isUpdate, currentVersion) {
  // Set default action if not provided
  const actionType = action ? action.toUpperCase() : "NEW";

  // For INIT alerts, add them to activeWarnings but don't show notifications
  if (actionType === "INIT") {
    console.log(`🏁 Adding INIT warning to active list: ${warning.id}`);

    // Make sure activeWarnings exists
    if (!Array.isArray(activeWarnings)) {
      activeWarnings = [];
    }

    // Add to active warnings if not already there
    if (!activeWarnings.some((w) => w.id === warning.id)) {
      activeWarnings.push(warning);
    }

    // Update UI without notifications
    updateWarningCounters(warning);
    updateWarningList(activeWarnings);
    updateHighestAlert();
    return;
  }

  // For other types, process normally with notifications
  if (!activeWarnings) {
    activeWarnings = [];
  }

  // Check if warning already exists in activeWarnings
  const existingIndex = activeWarnings.findIndex((w) => w.id === warning.id);
  if (existingIndex >= 0) {
    // Update existing warning
    activeWarnings[existingIndex] = warning;
  } else {
    // Add new warning
    activeWarnings.push(warning);
  }

  updateWarningCounters(warning);
  updateWarningList(activeWarnings);
  updateHighestAlert();
  showNotification(warning, actionType, isUpdate, currentVersion);
  updateDashboard(warning);
}

function getStateFromSAME(sameCode) {
  if (!sameCode) {
    console.warn("⚠️ Missing SAME code:", sameCode);
    return "Unknown";
  }
  if (typeof sameCode !== "string") {
    console.warn("⚠️ Unexpected SAME code type:", sameCode);
    sameCode = String(sameCode);
  }
  if (sameCode.length < 3) {
    console.warn("⚠️ SAME code too short:", sameCode);
    return "Unknown";
  }
  const fips = sameCode.slice(0, 2); // fix here
  return STATE_FIPS_TO_ABBR[fips] || "Unknown";
}

function cancelAlert(id) {
  if (!id) {
    console.warn("⚠️ Attempted to cancel alert with no ID");
    return;
  }

  console.log(`🗑️ Removing warning: ${id}`);

  // Remove from activeWarnings array
  activeWarnings = activeWarnings.filter((warning) => warning.id !== id);

  // Clean up from tracking maps
  if (window.previousWarnings) {
    window.previousWarnings.delete(id);
  }
  if (notifiedWarnings) {
    notifiedWarnings.delete(id);
  }
  if (previousWarningVersions) {
    previousWarningVersions.delete(id);
  }

  // Update UI
  updateWarningList(activeWarnings);
  updateHighestAlert();
  updateAlertBar();

  // Get the alert bar element
  const alertBar = document.querySelector(".alert-bar");

  if (activeWarnings.length === 0) {
    showNoWarningDashboard();
    updateActiveAlertText();
    updateHighestAlert();
    updateAlertBar();
    // Set the thinbg glow style when no warnings active
    if (alertBar) {
      alertBar.style.setProperty("--glow-color", "rgba(255, 255, 255, 0.6)");
      alertBar.classList.add("thinbg-glow"); // Optional if you have a CSS class for the glow
    }
  } else {
    return;
  }

  console.log(`🧹 Alert ${id} canceled and cleaned up.`);
}

let currentCityIndex = 0;

const CITY_STATIONS = [
  { city: "Detroit", station: "KDTW" },
  { city: "Lansing", station: "KLAN" },
  { city: "Grand Rapids", station: "KGRR" },
  { city: "Kalamazoo", station: "KAZO" },
  { city: "Hillsdale", station: "KJYM" },
  { city: "Flint", station: "KFNT" },
  { city: "Bad Axe", station: "KBAX" },
  { city: "Mount Pleasant", station: "KMOP" },
  { city: "Ludington", station: "KLDM" },
  { city: "Cadillac", station: "KCAD" },
  { city: "Gaylord", station: "KGLR" },
  { city: "Houghton", station: "KCMX" },
  { city: "Marquette", station: "KSAW" },
  { city: "Sault Ste. Marie", station: "KANJ" },
];

const EXTRA_CITIES = [
  { city: "Alpena", station: "KAPN" },
  { city: "Escanaba", station: "KESC" },
  { city: "Ironwood", station: "KIWD" },
  { city: "Traverse City", station: "KTVC" },
  { city: "Saginaw", station: "KHYX" },
];

const WEATHER_ICONS = {
  clear: "https://i.imgur.com/jKEHIsy.png",
  cloudy: "https://i.imgur.com/AcihKAW.png",
  "partly-cloudy": "https://i.imgur.com/37bCqbo.png",
  rain: "https://i.imgur.com/yS8RtPE.png",
  snow: "https://i.imgur.com/yEu5fVZ.png",
  thunderstorm: "https://i.imgur.com/DG1Wz63.png",
  fog: "https://i.imgur.com/uwHDNIA.png",
};

let weatherIndex = 0;
const weatherCities = CITY_STATIONS.concat(EXTRA_CITIES);

function getCardinalDirection(degrees) {
  if (degrees === "N/A") return "N/A";

  const directionsFull = [
    "North",
    "Northeast",
    "East",
    "Southeast",
    "South",
    "Southwest",
    "West",
    "Northwest",
  ];
  const index = Math.floor((degrees + 22.5) / 45) % 8;
  return directionsFull[index];
}

const weatherConditionsMap = new Map();

const lastFetchedData = new Map();

async function fetchWeatherForCity(city, station, targetMap = lastFetchedData) {
  try {
    const resp = await fetch(
      `https://api.weather.gov/stations/${station}/observations/latest`
    );
    if (!resp.ok) {
      if (resp.status === 404) {
        console.error(
          `Weather data not found for ${city} (${station}). Skipping...`
        );
      } else {
        throw new Error(`Network error ${resp.status}`);
      }
      return;
    }

    const json = await resp.json();
    const obs = json.properties;

    // Temp (°C → °F)
    const tempC = obs.temperature?.value;
    const tempF = tempC != null ? ((tempC * 9) / 5 + 32).toFixed(1) : "N/A";

    // Description
    const text = obs.textDescription?.toLowerCase() || "unknown";

    // Wind speed & dir
    let windSpeed = "N/A";
    if (obs.windSpeed?.value != null) {
      windSpeed = (obs.windSpeed.value * 0.621371).toFixed(0);
    }
    const windDirection = obs.windDirection?.value ?? "N/A";
    const cardinalDirection = getCardinalDirection(windDirection);

    // Store raw wind direction degrees for arrow rotation
    const windDirectionValue = windDirection !== "N/A" ? windDirection : null;

    // Humidity
    const humidity =
      obs.relativeHumidity?.value != null
        ? `${Math.round(obs.relativeHumidity.value)}%`
        : "N/A";

    // Heat Index (°C → °F)
    const heatIndexC = obs.heatIndex?.value;
    const heatIndexF =
      heatIndexC != null ? ((heatIndexC * 9) / 5 + 32).toFixed(1) : "N/A";

    // Wind Chill (°C → °F)
    const windChillC = obs.windChill?.value;
    const windChillF =
      windChillC != null ? ((windChillC * 9) / 5 + 32).toFixed(1) : "N/A";

    // Pressure (Pa → inHg)
    const pressurePa = obs.barometricPressure?.value;
    const pressureInHg =
      pressurePa != null ? (pressurePa / 3386.39).toFixed(2) : "N/A";

    // Clouds summary
    let clouds = "N/A";
    if (obs.cloudLayers?.length > 0) {
      clouds = obs.cloudLayers
        .map((layer) => `${layer.amount} @ ${layer.base?.value} m`)
        .join(", ");
    }

    // Icon logic
    let iconUrl = WEATHER_ICONS.clear;
    if (text.includes("thunder")) iconUrl = WEATHER_ICONS.thunderstorm;
    else if (text.includes("rain")) iconUrl = WEATHER_ICONS.rain;
    else if (text.includes("snow")) iconUrl = WEATHER_ICONS.snow;
    else if (text.includes("fog") || text.includes("mist"))
      iconUrl = WEATHER_ICONS.fog;
    else if (text.includes("cloud")) iconUrl = WEATHER_ICONS.cloudy;

    // Store all fields in map
    targetMap.set(city, {
      tempF,
      text,
      iconUrl,
      windSpeed,
      cardinalDirection,
      windDirectionValue, // raw degrees for arrow rotation
      humidity,
      heatIndexF,
      windChillF,
      pressureInHg,
      clouds,
    });

    console.log(`✅ Weather data fetched for ${city}:`, new Date());
  } catch (err) {
    console.error("❌ Weather fetch error:", err);
  }
}

async function fetchAllWeatherData() {
  for (const { city, station } of CITY_STATIONS) {
    try {
      await fetchWeatherForCity(city, station);
    } catch (err) {
      console.error("Weather fetch error for", city, err);
    }
  }

  console.log("Weather data fetched for all cities.");
}

const clearWarningsButton = document.getElementById("clearWarningsButton");

// Add the click handler
clearWarningsButton.addEventListener("click", () => {
  try {
    if (!Array.isArray(activeWarnings)) {
      console.error("activeWarnings is not an array:", activeWarnings);
      return;
    }

    activeWarnings.length = 0;
    previousWarnings.length = 0;
    if (!previousWarnings || !previousWarnings.clear) {
      console.error("previousWarnings is not a Map:", previousWarnings);
      return;
    }

    previousWarnings.clear();
    if (alertBar) {
      alertBar.style.setProperty("--glow-color", "rgba(255, 255, 255, 0.6)");
      alertBar.classList.add("thinbg-glow"); // Optional if you have a CSS class for the glow
    }
    let highestAlertText = "N/A";
    updateWarningList(activeWarnings);
    updateHighestAlert();
    updateAlertBar();
    updateCurrentConditions();
    updateWarningCounters();

    console.log("All warnings cleared.");
  } catch (err) {
    console.error("Error clearing warnings:", err);
  }
});

async function rotateCity() {
  const isSpcModeEnabled = document.getElementById("spcModeToggle").checked;

  // If SPC mode is enabled, do not update current conditions
  if (isSpcModeEnabled) {
    console.log("SPC mode is enabled. Skipping current conditions update.");
    return;
  }

  // Prevent rotation while scrolling is in progress
  if (isCountiesCurrentlyScrolling) {
    console.log(
      "Counties currently scrolling. Skipping rotation to avoid interruption."
    );
    return;
  }

  const eventTypeBar = document.querySelector(".event-type-bar");
  const countiesElement = document.querySelector("#counties");

  if (!eventTypeBar || !countiesElement) {
    console.error(
      "Required elements (event-type-bar or counties) not found. Cannot perform city rotation."
    );
    return;
  }

  currentCityIndex = (currentCityIndex + 1) % CITY_STATIONS.length;
  const city = CITY_STATIONS[currentCityIndex].city;
  const station = CITY_STATIONS[currentCityIndex].station;

  eventTypeBar.textContent = city;
  eventTypeBar.style.display = "block";

  const weatherData = lastFetchedData.get(city);

  if (!weatherData) {
    await fetchWeatherForCity(city, station);
  }
  if (activeWarnings.length > 0) {
    console.log("Active warnings present. Updating warning dashboard.");
    updateDashboard();
    return;
  }

  const updatedWeatherData = lastFetchedData.get(city);
  if (updatedWeatherData) {
    // First part: icon + condition + temp (NO trailing |)
    const firstPart = `
      <img src="${updatedWeatherData.iconUrl}" alt="${
      updatedWeatherData.text
    }" style="width:24px;height:24px;vertical-align:middle;">
      ${
        updatedWeatherData.text.charAt(0).toUpperCase() +
        updatedWeatherData.text.slice(1)
      }, ${updatedWeatherData.tempF}°F
    `;

    const parts = [];

    // Wind arrow SVG + rotation calc
    if (
      updatedWeatherData.windSpeed !== "N/A" &&
      updatedWeatherData.cardinalDirection !== "N/A"
    ) {
      const windDirFrom = updatedWeatherData.windDirectionValue ?? null;
      const windDirTo = windDirFrom !== null ? (windDirFrom + 180) % 360 : null;

      const arrowSvg =
        windDirTo !== null
          ? `
    <svg 
      style="vertical-align:middle; width:24px; height:24px; transform: rotate(${windDirTo}deg);" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"/>
        <polyline points="5 12 12 5 19 12"/>
    </svg>`
          : "";

      parts.push(
        `Wind from the ${updatedWeatherData.cardinalDirection} at ${updatedWeatherData.windSpeed} mph ${arrowSvg}`
      );
    }

    if (updatedWeatherData.humidity !== "N/A") {
      parts.push(`Humidity: ${updatedWeatherData.humidity}`);
    }

    // Only display Feels Like if it's at least 5 degrees different from actual temp
    const tempF = parseFloat(updatedWeatherData.tempF);

    // Heat index check - only show if 5+ degrees above actual temp
    if (updatedWeatherData.heatIndexF !== "N/A") {
      const heatIndex = parseFloat(updatedWeatherData.heatIndexF);
      if (!isNaN(heatIndex) && !isNaN(tempF) && heatIndex - tempF >= 5) {
        parts.push(`Feels Like: ${updatedWeatherData.heatIndexF}°F`);
      }
    }

    // Wind chill check - only show if 5+ degrees below actual temp
    if (updatedWeatherData.windChillF !== "N/A") {
      const windChill = parseFloat(updatedWeatherData.windChillF);
      if (!isNaN(windChill) && !isNaN(tempF) && tempF - windChill >= 5) {
        parts.push(`Feels Like: ${updatedWeatherData.windChillF}°F`);
      }
    }

    const fullText =
      parts.length > 0 ? `${firstPart} | ${parts.join(" | ")}` : firstPart;

    updateCountiesText(fullText);
  } else {
    console.log("Weather data still not available for city:", city);
  }
}

function showNoWarningDashboard() {
  const warningBar = document.querySelector(".warning-counts");
  if (warningBar) {
    warningBar.classList.remove("show");
    warningBar.classList.add("fade-out");
  }

  const noWarningsBar = document.querySelector(".no-warning-bar");
  if (noWarningsBar) {
    noWarningsBar.classList.remove("fade-out");
    noWarningsBar.classList.add("fade-in");
    noWarningsBar.classList.add("show");
  }

  const eventTypeBar = document.querySelector(".event-type-bar");
  const savedEventTypeBarColor = localStorage.getItem("eventTypeBarColor");
  eventTypeBar.style.backgroundColor = savedEventTypeBarColor || "#1F2593";

  // Explicitly reset the text color to white or use custom settings if available
  const eventTypeElement = document.querySelector("#eventType");
  if (eventTypeElement) {
    eventTypeElement.style.color = "white"; // or "" to use default color
  }
}

function showWarningDashboard() {
  const noWarningsBar = document.querySelector(".no-warning-bar");
  if (noWarningsBar) {
    noWarningsBar.classList.remove("show");
    noWarningsBar.classList.add("fade-out");
  }

  const warningBar = document.querySelector(".warning-counts");
  if (warningBar) {
    warningBar.classList.remove("fade-out");
    warningBar.classList.add("fade-in");
    warningBar.classList.add("show");
  }
}

function extractTornadoEmergencyLocation(rawText) {
  if (!rawText) return null;

  // Look for the tornado emergency line with regex
  const emergencyMatch =
    rawText.match(/\.\.\.TORNADO EMERGENCY FOR ([^\.]+)\.\.\./) ||
    rawText.match(/TORNADO EMERGENCY for ([^\.]+)/i);

  if (emergencyMatch && emergencyMatch[1]) {
    return emergencyMatch[1].trim();
  }

  return null;
}

/**
 * Updates the counties text with a fade transition and adds a conditional
 * scrolling animation for long lists.
 * @param {string} newHTML The new HTML content for the counties bar.
 * @param {object} [warning] Optional warning object for special formatting.
 */
// Global: keep track of last scrolled text and animation state
let lastScrollingHTML = "";
let countiesScrollEndTime = 0; // Timestamp when scroll animation will end
let isCountiesCurrentlyScrolling = false; // Flag to prevent updates while scrolling
const SCROLL_SPEED_PX_PER_SEC = 150; // Fixed scroll speed in pixels per second

// in script.js

// Setting toggle: whether to append formatted rawText into the counties bar
function isRawTextInBarEnabled() {
  try {
    return localStorage.getItem("showRawTextInCounties") === "true";
  } catch (_) {
    return false;
  }
}

function setRawTextInBarEnabled(val) {
  try {
    localStorage.setItem("showRawTextInCounties", val ? "true" : "false");
  } catch (_) {}
}

// Escape HTML to ensure raw text is safe for insertion into innerHTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Format rawText for inline display within the single-line counties bar
// - Replace section headers like "WHAT..." -> "WHAT:"
// - Remove leading list bullets "* "
// - Normalize whitespace and newlines to single separators
// - Strip non-printable characters
function formatRawTextForBar(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  // Replace non-printable/unicode oddities with spaces
  let txt = rawText.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");

  // Normalize Windows/Mac line endings
  txt = txt.replace(/\r\n?|\n/g, "\n");

  // Remove leading bullets like "* " at start of lines
  txt = txt.replace(/^\s*\*\s+/gm, "");

  // Parse only WHAT, WHERE, WHEN, IMPACTS sections
  const wanted = new Set(["WHAT", "WHERE", "WHEN", "IMPACTS"]);
  const sections = { WHAT: "", WHERE: "", WHEN: "", IMPACTS: "" };
  let current = null;

  const headerRe = /^\s*(?:\*\s*)?([A-Za-z][A-Za-z /-]{1,40})\.\.\.\s*(.*)$/i;

  const lines = txt.split("\n");
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) {
      // blank line ends current section accumulation
      current = null;
      continue;
    }

    const m = line.match(headerRe);
    if (m) {
      const header = m[1].toUpperCase();
      const rest = m[2] ? m[2].trim() : "";
      if (wanted.has(header)) {
        current = header;
        sections[current] = rest; // start with the content on the same line
      } else {
        current = null; // unknown header; ignore following lines until next header
      }
      continue;
    }

    if (current && wanted.has(current)) {
      // append continuation lines to current section
      sections[current] += (sections[current] ? " " : "") + line;
    }
  }

  // Build output in the specified order, only including present sections
  const parts = [];
  ["WHAT", "WHERE", "WHEN", "IMPACTS"].forEach((key) => {
    const val = sections[key].replace(/\s{2,}/g, " ").trim();
    if (val) parts.push(`${key}: ${escapeHtml(val)}`);
  });

  return parts.join(" | ");
}

function updateCountiesText(newHTML, warning) {
  const countiesEl = document.querySelector("#counties");
  if (!countiesEl)
    return console.warn("[updateCountiesText] Missing #counties");

  const eventTypeBar = document.querySelector(".event-type-bar");
  const leftGap = 40;
  const additionalSafetyMargin = 20; // 20px to the right of event-type bar
  const rightEdgeOffset = 720; // distance from right edge of screen where fade/scroll stops

  console.log("[updateCountiesText] Starting update with new HTML:", newHTML);

  // Reset scroll state immediately - will be updated if scrolling is needed
  countiesScrollEndTime = -1;
  isCountiesCurrentlyScrolling = false;

  // Disconnect old observer
  if (countiesEl._resizeObserver) {
    countiesEl._resizeObserver.disconnect();
    countiesEl._resizeObserver = null;
    console.log("[updateCountiesText] Disconnected old resize observer");
  }

  // Fade out old text
  countiesEl.classList.add("fade-out");

  setTimeout(() => {
    countiesEl.innerHTML = "";

    // Optionally augment with formatted rawText when enabled and a warning object is provided
    let contentHTML = newHTML;
    try {
      if (warning && warning.rawText && isRawTextInBarEnabled()) {
        const formatted = formatRawTextForBar(warning.rawText);
        if (formatted) {
          contentHTML = `${newHTML} | ${formatted}`;
        }
      }
    } catch (e) {
      console.warn("[updateCountiesText] Failed to format rawText:", e);
    }

    const scrollWrapper = document.createElement("span");
    scrollWrapper.innerHTML = contentHTML;
    scrollWrapper.style.display = "inline-block";
    scrollWrapper.style.whiteSpace = "nowrap";
    scrollWrapper.style.opacity = "0"; // Start invisible

    function setupPositioningAndScroll() {
      console.log(
        "[setupPositioningAndScroll] Starting positioning calculation"
      );

      const containerRect = countiesEl.getBoundingClientRect();
      let startX = leftGap;

      if (eventTypeBar) {
        const barRect = eventTypeBar.getBoundingClientRect();
        const eventBarRightEdge = barRect.right - containerRect.left;
        startX = eventBarRightEdge + additionalSafetyMargin;
        console.log(
          "[setupPositioningAndScroll] Event bar right edge relative to container:",
          eventBarRightEdge
        );
        console.log("[setupPositioningAndScroll] Final startX:", startX);
      }

      const contentWidth = scrollWrapper.offsetWidth;
      const containerLeft = containerRect.left;

      // 🧠 Define the 720px-from-right-edge boundary
      const screenRightLimit = window.innerWidth - rightEdgeOffset;
      const availableWidth = screenRightLimit - (containerLeft + startX);
      const overflowAmount = contentWidth - availableWidth;

      console.log("[setupPositioningAndScroll] Content width:", contentWidth);
      console.log(
        "[setupPositioningAndScroll] Available width (up to 720px from screen edge):",
        availableWidth
      );
      console.log(
        "[setupPositioningAndScroll] Overflow amount:",
        overflowAmount
      );

      // Fade position relative to container
      const fadePosition = screenRightLimit - containerLeft;
      console.log("[setupPositioningAndScroll] Fade position:", fadePosition);

      // Reset styles before recalculating
      scrollWrapper.style.animation = "none";
      countiesEl.style.webkitMaskImage = "";
      countiesEl.style.maskImage = "";

      if (overflowAmount > 10) {
        console.log(
          "[setupPositioningAndScroll] Content overflows - setting up scrolling"
        );

        const safeMargin = 50;
        const endX =
          screenRightLimit - containerLeft - contentWidth - safeMargin;

        // Calculate total scroll distance
        const scrollDistance = Math.abs(endX - startX);

        // Calculate duration based on fixed speed (150px/sec)
        const scrollDuration = scrollDistance / SCROLL_SPEED_PX_PER_SEC;

        // Add 1 second pause at start and 1 second pause at end
        const pauseAtStart = 1; // 1 second
        const pauseAtEnd = 0; // 1 second
        const totalDuration = pauseAtStart + scrollDuration + pauseAtEnd;

        // Calculate keyframe percentages
        const startPausePercent = (pauseAtStart / totalDuration) * 100;
        const scrollEndPercent =
          ((pauseAtStart + scrollDuration) / totalDuration) * 100;

        // Store when the scroll will end (for rotateCity timing)
        countiesScrollEndTime = Date.now() + totalDuration * 1000;

        // Set flag to indicate scrolling is in progress
        isCountiesCurrentlyScrolling = true;

        // Clear the flag when animation completes
        setTimeout(() => {
          isCountiesCurrentlyScrolling = false;
          console.log(
            "[setupPositioningAndScroll] Scrolling complete, updates now allowed"
          );
        }, totalDuration * 1000);

        console.log(
          `[setupPositioningAndScroll] Scroll distance: ${scrollDistance}px`
        );
        console.log(
          `[setupPositioningAndScroll] Scroll duration: ${scrollDuration.toFixed(
            2
          )}s`
        );
        console.log(
          `[setupPositioningAndScroll] Total duration (with pauses): ${totalDuration.toFixed(
            2
          )}s`
        );

        const animName = `scroll-${Date.now()}`;
        const animationStyle = document.createElement("style");
        animationStyle.textContent = `
          @keyframes ${animName} {
            0%   { transform: translateX(${startX}px); }
            ${startPausePercent.toFixed(
              2
            )}%  { transform: translateX(${startX}px); }      /* Pause 1s at start */
            ${scrollEndPercent.toFixed(
              2
            )}%  { transform: translateX(${endX}px); }        /* Scroll */
            100% { transform: translateX(${endX}px); }        /* Pause 1s at end */
          }
        `;
        document.head.appendChild(animationStyle);

        // Use 'forwards' to keep the end state, and don't loop
        scrollWrapper.style.animation = `${animName} ${totalDuration}s linear forwards`;

        // --- MASK ADJUSTMENT FOR SCROLLING TEXT ---
        const maskGap = 10;
        const maskFadeWidth = 20;
        const maskFadeStart = startX - maskFadeWidth + maskGap;
        const maskFadeEnd = startX + maskGap;

        const mask = `linear-gradient(to right, 
          transparent ${maskFadeStart}px, 
          black ${maskFadeEnd}px, 
          black ${fadePosition}px, 
          transparent ${fadePosition + 60}px)`;

        countiesEl.style.webkitMaskImage = mask;
        countiesEl.style.maskImage = mask;

        console.log(
          "[setupPositioningAndScroll] Applied scrolling mask:",
          mask
        );
      } else {
        console.log(
          "[setupPositioningAndScroll] Content fits - positioning statically"
        );
        scrollWrapper.style.transform = `translateX(${startX}px)`;

        // Static content - flags already set to default at start of updateCountiesText
        // countiesScrollEndTime remains -1
        // isCountiesCurrentlyScrolling remains false

        // --- STATIC MASK ---
        const maskGap = 10;
        const maskFadeWidth = 20;
        const maskFadeStart = startX - maskFadeWidth + maskGap;
        const maskFadeEnd = startX + maskGap;
        const mask = `linear-gradient(to right, 
          transparent ${maskFadeStart}px, 
          black ${maskFadeEnd}px, 
          black ${fadePosition}px, 
          transparent ${fadePosition + 60}px)`;

        countiesEl.style.webkitMaskImage = mask;
        countiesEl.style.maskImage = mask;

        console.log("[setupPositioningAndScroll] Applied static mask:", mask);
      }

      console.log("[setupPositioningAndScroll] Positioning setup complete");
    }

    countiesEl.appendChild(scrollWrapper);
    countiesEl.style.overflow = "hidden";

    requestAnimationFrame(() => {
      setTimeout(() => {
        setupPositioningAndScroll();
        scrollWrapper.style.transition = "opacity 0.4s ease-in-out";
        scrollWrapper.style.opacity = "1";

        countiesEl._resizeObserver = new ResizeObserver(() => {
          console.log(
            "[ResizeObserver] Detected resize/change, recalculating position"
          );
          setupPositioningAndScroll();
        });

        countiesEl._resizeObserver.observe(countiesEl);
        if (eventTypeBar) countiesEl._resizeObserver.observe(eventTypeBar);

        countiesEl.classList.remove("fade-out");
        console.log("[updateCountiesText] Fade in complete, observers set up");
      }, 50);
    });
  }, 400);
}

// Helper you already have
function isCountiesScrolling() {
  const wrapper = document.querySelector("#counties span");
  return Boolean(
    wrapper &&
      wrapper.style.animationName &&
      wrapper.style.animationName !== "none"
  );
}

function stopScrolling(countiesElement) {
  isScrolling = false;
  countiesElement.classList.remove("scrolling");

  // Remove mask elements
  const leftMask = document.getElementById("counties-left-mask");
  if (leftMask) leftMask.remove();
}

function crossfadeEventTypeBar(newHTML, newBackgroundColor) {
  const eventTypeBar = document.querySelector(".event-type-bar");

  // Create a temporary overlay element with the same dimensions and position
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor =
    newBackgroundColor || eventTypeBar.style.backgroundColor;
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.innerHTML = newHTML;
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.4s ease-in-out";
  overlay.style.zIndex = "1";

  // Make the event type bar a relative container if it's not already
  if (getComputedStyle(eventTypeBar).position !== "relative") {
    eventTypeBar.style.position = "relative";
  }

  // Add the overlay to the event type bar
  eventTypeBar.appendChild(overlay);

  // Start crossfade
  setTimeout(() => {
    overlay.style.opacity = "1";

    // After the crossfade completes, replace the content and remove the overlay
    setTimeout(() => {
      eventTypeBar.innerHTML = newHTML;
      eventTypeBar.style.backgroundColor =
        newBackgroundColor || eventTypeBar.style.backgroundColor;
    }, 400);
  }, 10); // Small delay to ensure the initial opacity is applied
}

document.getElementById("spcModeToggle").addEventListener("change", () => {
  updateActiveAlertText();
});

function updateActiveAlertText() {
  const activeAlertText = document.getElementById("ActiveAlertText");
  const spcToggle = document.getElementById("spcModeToggle");

  if (spcToggle.checked) {
    activeAlertText.textContent = "SPC OUTLOOK";
  } else {
    activeAlertText.textContent = activeWarnings.length
      ? "ALL ACTIVE ALERTS"
      : "CURRENT CONDITIONS";
  }
}

function isSemicircleCountCyclerEnabled() {
  try {
    return localStorage.getItem(SEMICIRCLE_COUNT_TOGGLE_KEY) === "true";
  } catch (err) {
    console.warn("Could not read semicircle count toggle state", err);
    return false;
  }
}

function setSemicircleCountCyclerEnabled(enabled) {
  try {
    localStorage.setItem(
      SEMICIRCLE_COUNT_TOGGLE_KEY,
      enabled ? "true" : "false"
    );
  } catch (err) {
    console.warn("Could not persist semicircle count toggle state", err);
  }
}

function buildSemicircleCountMessages() {
  if (!Array.isArray(activeWarnings) || activeWarnings.length === 0) {
    return [];
  }

  const counts = {};
  for (const warning of activeWarnings) {
    const eventName = getEventName(warning);
    if (!eventName) continue;
    counts[eventName] = (counts[eventName] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(
      ([eventA], [eventB]) =>
        (priority[eventA] || 9999) - (priority[eventB] || 9999) ||
        eventA.localeCompare(eventB)
    )
    .map(([eventName, count]) => `${eventName}: ${count}`);
}

function stopSemicircleCountCycle() {
  if (semicircleCountCycleInterval) {
    clearInterval(semicircleCountCycleInterval);
    semicircleCountCycleInterval = null;
  }
}

function updateSemicircleCountCycler(forceRestart = false) {
  const labelEl = document.querySelector(".semicircle-label");
  const toggleEl = document.getElementById("semicircleCountToggle");

  if (!labelEl) {
    return;
  }

  const enabled = isSemicircleCountCyclerEnabled();
  if (toggleEl) {
    toggleEl.checked = enabled;
  }

  if (!enabled) {
    stopSemicircleCountCycle();
    labelEl.textContent = "ACTIVE ALERT COUNT";
    labelEl.classList.add("semicircle-disabled");
    return;
  }

  labelEl.classList.remove("semicircle-disabled");

  semicircleCountCycleMessages = buildSemicircleCountMessages();
  if (semicircleCountCycleMessages.length === 0) {
    semicircleCountCycleMessages = ["No Active Alerts"];
  }

  if (
    forceRestart ||
    semicircleCountCycleIndex >= semicircleCountCycleMessages.length
  ) {
    semicircleCountCycleIndex = 0;
  }

  labelEl.textContent = semicircleCountCycleMessages[semicircleCountCycleIndex];

  stopSemicircleCountCycle();
  if (semicircleCountCycleMessages.length > 0) {
    semicircleCountCycleInterval = setInterval(() => {
      semicircleCountCycleIndex =
        (semicircleCountCycleIndex + 1) % semicircleCountCycleMessages.length;
      labelEl.textContent =
        semicircleCountCycleMessages[semicircleCountCycleIndex];
    }, 10000);
  }
}

// Helper you already have
function isCountiesScrolling() {
  const wrapper = document.querySelector("#counties span");
  return Boolean(
    wrapper &&
      wrapper.style.animationName &&
      wrapper.style.animationName !== "none"
  );
}

let sortedWarnings = [];
let lastActiveIds = [];

// Keep this map outside the function to track previous alert states
const lastAlertsMap = new Map();

function updateDashboard(forceUpdate = false) {
  console.log("Starting updateDashboard function");

  // Prevent updates while scrolling is in progress
  if (isCountiesCurrentlyScrolling && !forceUpdate) {
    console.log("Counties currently scrolling. Deferring dashboard update.");
    return;
  }

  const expirationElement = document.querySelector("#expiration");
  const eventTypeElement = document.querySelector("#eventType");
  const countiesElement = document.querySelector("#counties");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const activeAlertText = document.getElementById("ActiveAlertText");
  const spcToggle = document.getElementById("spcModeToggle");

  console.log("Checking activeWarnings array:", activeWarnings);

  if (!Array.isArray(activeWarnings) || activeWarnings.length === 0) {
    console.log("No active warnings or invalid activeWarnings array");
    expirationElement.textContent = "LOADING...";
    eventTypeElement.textContent = "LOADING...";
    countiesElement.textContent = "LOADING...";
    document.querySelector(".event-type-bar").style.backgroundColor = "#333";
    updateActiveAlertText();
    updateSemicircleCountCycler(true);
    showNoWarningDashboard();
    return;
  }

  // Check for new or updated alerts by comparing serialized JSON for each alert ID
  let hasChanges = false;

  // Build set of current alert IDs to clean up old ones later
  const currentIds = new Set();
  console.log("Building current IDs set");

  for (const alert of activeWarnings) {
    const id = alert.id;
    console.log("Processing alert ID:", id);
    currentIds.add(id);
    const alertStr = JSON.stringify(alert);

    if (!lastAlertsMap.has(id) || lastAlertsMap.get(id) !== alertStr) {
      // New alert or updated alert found!
      console.log("New or updated alert found with ID:", id);
      hasChanges = true;
      lastAlertsMap.set(id, alertStr);
    }
  }

  // Clean up any old alerts that disappeared
  console.log("Checking for removed alerts");
  for (const oldId of lastAlertsMap.keys()) {
    if (!currentIds.has(oldId)) {
      console.log("Alert removed:", oldId);
      hasChanges = true;
      lastAlertsMap.delete(oldId);
    }
  }

  if (hasChanges) {
    console.log("Changes detected, sorting warnings");
    // Sort by priority & expiration (your original logic)
    sortedWarnings = activeWarnings
      .slice()
      .sort(
        (a, b) =>
          (priority[getEventName(a)] || 9999) -
          (priority[getEventName(b)] || 9999)
      );

    currentWarningIndex = 0; // Reset index when alerts update
    console.log("Sorted warnings:", sortedWarnings);
  }

  if (!sortedWarnings || sortedWarnings.length === 0) {
    console.log("No sorted warnings available");
    expirationElement.textContent = "LOADING...";
    eventTypeElement.textContent = "LOADING...";
    countiesElement.textContent = "LOADING...";
    document.querySelector(".event-type-bar").style.backgroundColor = "#333";
    updateActiveAlertText();
    showNoWarningDashboard();
    return;
  }

  // Wrap current index if out of bounds
  currentWarningIndex = currentWarningIndex % sortedWarnings.length;
  console.log("Current warning index:", currentWarningIndex);

  const warning = sortedWarnings[currentWarningIndex];
  console.log("Current warning object:", warning);

  const { event, areaDesc, expires, rawText } = warning.properties || warning;
  console.log("Warning properties extracted:", { event, expires });
  console.log("Area description:", areaDesc);

  // Log the complete counties data
  console.log("Counties data from warning:", warning.counties);

  const eventName = getEventName(warning);
  console.log("Event name:", eventName);

  const alertColor = getAlertColor(eventName);
  console.log("Alert color:", alertColor);

  const eventTypeBar = document.querySelector(".event-type-bar");
  if (eventTypeBar) {
    eventTypeBar.style.backgroundColor = alertColor;
    eventTypeElement.style.color =
      eventName === "Special Weather Statement" ? "black" : "";
  }

  const expirationDate = new Date(expires);
  const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  const fullOptions = {
    timeZoneName: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  // Use our helper function to format expiration with date if not today
  const formattedExpirationTime = formatExpirationTime(expirationDate);
  const fullFormattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    fullOptions
  );

  // Use our helper function to format expiration with date if not today
  const expiresText = formatExpirationTime(expirationDate);

  console.log("Formatted expiration times:", {
    formattedExpirationTime,
    fullFormattedExpirationTime,
    expiresText,
  });

  expirationElement.textContent = `EXPIRES: ${expiresText}`;

  try {
    console.log("Extracting tornado emergency location (if any)");
    // Extract tornado emergency location, if any
    const tornadoEmergencyLocation = extractTornadoEmergencyLocation(rawText);
    if (tornadoEmergencyLocation) {
      console.log(
        "Tornado emergency location found:",
        tornadoEmergencyLocation
      );
    }

    // Log raw areaDesc before formatting
    console.log("Raw areaDesc before formatting:", areaDesc);

    // Check if we're dealing with a special counties format from the examples
    if (Array.isArray(warning.counties)) {
      console.log("Found counties array in warning:", warning.counties);
    }

    let rawCounties;
    // Handle the different formats for counties data
    if (Array.isArray(warning.counties) && warning.counties.length > 0) {
      console.log("Using counties array from warning");

      // Filter out empty strings and values like "and" or "."
      const filteredCounties = warning.counties.filter(
        (county) =>
          county && county.trim() && !["and", "."].includes(county.trim())
      );

      console.log("Filtered counties array:", filteredCounties);

      // Check if counties have state info
      const hasStateInfo = filteredCounties.some((county) =>
        county.includes(",")
      );
      console.log("Counties contain state information:", hasStateInfo);

      if (hasStateInfo) {
        // Already in County, ST format
        rawCounties = filteredCounties.join(" • ");
      } else {
        // Format like those in the example (city names, etc.)
        // Remove any trailing periods or "and" prefixes
        rawCounties = filteredCounties
          .map((county) =>
            county.replace(/\.$/, "").replace(/^and /, "").trim()
          )
          .join(" • ");
      }
    } else if (areaDesc) {
      console.log("Using areaDesc to format counties");
      rawCounties = formatCountiesTopBar(areaDesc);
    } else {
      console.log("No valid counties data found, using empty string");
      rawCounties = "";
    }

    console.log("Raw counties after initial formatting:", rawCounties);

    // If we have city names like in the example, we'll just use them directly
    let counties;
    if (
      Array.isArray(warning.counties) &&
      warning.counties.length > 0 &&
      !warning.counties[0].includes(",")
    ) {
      console.log("Using city/location names directly");
      counties = rawCounties;
    } else {
      // Try to extract county pattern
      const countyPattern = /([^,]+, [A-Z]{2})/g; // Match "County, ST"
      const matchedCounties = rawCounties.match(countyPattern) || [];
      console.log("Matched counties using pattern:", matchedCounties);

      if (matchedCounties.length > 0) {
        // Fix the double bullet issue by joining with a single bullet
        counties = matchedCounties.join(" • ");
      } else {
        counties = rawCounties;
      }
    }

    // Fix any instances of double bullets that might still exist
    counties = counties.replace(/\s*•\s*•\s*/g, " • ");

    console.log("Final formatted counties:", counties);

    // Extract hazard information
    const threats = warning.threats || warning.properties?.threats || {};
    console.log("Threats data:", threats);

    const maxWindGust = threats.maxWindGust || "N/A";
    const maxHailSize = threats.maxHailSize || "N/A";
    const tornadoDetection = threats.tornadoDetection || "N/A";
    const tornadoDamageThreat = threats.tornadoDamageThreat || "N/A";

    console.log("Extracted threat details:", {
      maxWindGust,
      maxHailSize,
      tornadoDetection,
      tornadoDamageThreat,
    });

    // Create enhanced counties text with hazard information
    let countiesText = counties
      ? `Counties: ${counties}`
      : "Counties: Not specified";
    console.log("Initial counties text:", countiesText);

    // Add hazard information if available
    if (
      maxWindGust !== "N/A" ||
      maxHailSize !== "N/A" ||
      tornadoDetection !== "N/A"
    ) {
      countiesText += " |";
      console.log("Adding hazard information to counties text");

      if (maxWindGust !== "N/A") {
        countiesText += ` Wind: ${maxWindGust}`;
      }

      if (maxHailSize !== "N/A") {
        if (maxWindGust !== "N/A") {
          countiesText += ",";
        }
        countiesText += ` Hail: ${maxHailSize}`;
      }

      if (tornadoDetection !== "N/A") {
        if (maxWindGust !== "N/A" || maxHailSize !== "N/A") {
          countiesText += ",";
        }

        // Only add tornadoDamageThreat if it's not null or N/A
        if (tornadoDamageThreat && tornadoDamageThreat !== "N/A") {
          countiesText += ` Tornado: ${tornadoDetection}, ${tornadoDamageThreat}`;
        } else {
          countiesText += ` Tornado: ${tornadoDetection}`;
        }
      }
    }

    countiesText += ` | Until ${formattedExpirationTime}`;
    console.log("Final counties text with hazards:", countiesText);

    updateCountiesText(countiesText, warning);

    eventTypeElement.textContent = eventName;
    activeAlertsBox.style.display = "block";
    activeAlertText.textContent = "ALL ACTIVE ALERTS";

    showWarningDashboard();
  } catch (err) {
    console.error("Error updating dashboard:", err);
    console.log("Error details:", err.message);
    console.log("Error stack:", err.stack);
  }

  // Rotate index for next call
  currentWarningIndex = (currentWarningIndex + 1) % sortedWarnings.length;
  console.log("Next warning index set to:", currentWarningIndex);
  console.log("updateDashboard function completed");

  updateSemicircleCountCycler(hasChanges || forceUpdate);
}

let rotateActive = false;

async function startRotatingCities() {
  rotateActive = true;
  await rotateCityWithDelay();
}

function stopRotatingCities() {
  rotateActive = false;
}

async function rotateCityWithDelay() {
  if (rotateActive) {
    let totalDelay;

    // Check if content is scrolling or static
    if (countiesScrollEndTime === -1) {
      // Static content (no scrolling) - use base 10 second delay
      totalDelay = 10000;
      console.log(
        `[rotateCityWithDelay] Static content - using base 10s delay`
      );
    } else {
      // Scrolling content - wait for scroll to end + 1 second
      const now = Date.now();
      const timeUntilScrollEnd = Math.max(0, countiesScrollEndTime - now);
      const additionalDelay = 1000; // 1 second after scroll ends
      totalDelay = timeUntilScrollEnd + additionalDelay;

      console.log(
        `[rotateCityWithDelay] Scrolling content - waiting ${(
          totalDelay / 1000
        ).toFixed(2)}s before next rotation`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, totalDelay));

    if (rotateActive) {
      await rotateCity();
      rotateCityWithDelay(); // Continue rotation
    }
  }
}

document.getElementById("customizeButton").addEventListener("click", () => {
  const panel = document.getElementById("customizationPanel");
  panel.classList.toggle("hidden");
});

document.getElementById("saveSettingsButton").addEventListener("click", () => {
  const logoInput = document.getElementById("logoInput").files[0];
  const alertText = document.getElementById("alertTextInput").value;
  const alertBarColor = document.getElementById("alertBarColor").value;
  const eventTypeBarColor = document.getElementById("eventTypeBarColor").value;
  const fontInput = null;
  const timeoutDuration = document.getElementById("timeoutSlider").value;

  if (logoInput) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("pulseLogo").src = e.target.result;
      localStorage.setItem("customLogo", e.target.result);
    };
    reader.readAsDataURL(logoInput);
  }

  if (fontInput) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const fontFace = new FontFace("CustomFont", e.target.result);
      fontFace.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        document.body.style.fontFamily = "CustomFont, sans-serif";
        localStorage.setItem("customFont", e.target.result);
      });
    };
    reader.readAsArrayBuffer(fontInput);
  }

  document.getElementById("highestAlertText").textContent = alertText;
  document.querySelector(".alert-bar").style.backgroundColor = alertBarColor;
  document.querySelector(".event-type-bar").style.backgroundColor =
    eventTypeBarColor;

  localStorage.setItem("customAlertText", alertText);
  localStorage.setItem("alertBarColor", alertBarColor);
  localStorage.setItem("eventTypeBarColor", eventTypeBarColor);
  localStorage.setItem("timeoutDuration", timeoutDuration);

  alert("Settings saved!");
});

// Apply saved settings on load
window.addEventListener("load", () => {
  const savedLogo = localStorage.getItem("customLogo");
  const savedFont = localStorage.getItem("customFont");
  const savedAlertText = localStorage.getItem("customAlertText");
  const savedAlertBarColor = localStorage.getItem("alertBarColor");
  const savedEventTypeBarColor = localStorage.getItem("eventTypeBarColor");
  const savedTimeoutDuration = localStorage.getItem("timeoutDuration");

  if (savedLogo) {
    document.getElementById("pulseLogo").src = savedLogo;
  }

  if (savedFont) {
    const fontFace = new FontFace("CustomFont", savedFont);
    fontFace.load().then((loadedFont) => {
      document.fonts.add(loadedFont);
      document.body.style.fontFamily = "CustomFont, sans-serif";
    });
  }

  if (savedAlertText) {
    if (highestAlert.alert === "N/A" && activeWarnings.length === 0) {
      document.getElementById("highestAlertText").textContent = savedAlertText;

      alertText.style.color = ""; // Reset to default color
      activeAlertsBox.style.display = "none";
      semicircle.style.background =
        "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
      updateDashboard();
    }
  }

  if (savedAlertBarColor) {
    document.querySelector(".alert-bar").style.backgroundColor =
      savedAlertBarColor;
  }

  if (savedEventTypeBarColor) {
    document.querySelector(".event-type-bar").style.backgroundColor =
      savedEventTypeBarColor;
  }

  if (savedTimeoutDuration) {
    document.getElementById("timeoutSlider").value = savedTimeoutDuration;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  createCheckboxes();
  updateDashboard();
  fetchAllWeatherData();
  startRotatingCities();

  // Hardcode TX as the selected state
  window.selectedStates = ["MI"];

  // Map TX to FIPS codes for logging
  const stateFipsCodes = window.selectedStates.map((state) => {
    const fipsCode = Object.keys(STATE_FIPS_TO_ABBR).find(
      (key) => STATE_FIPS_TO_ABBR[key] === state
    );
    return fipsCode || "Unknown";
  });

  console.log(`State filter set to: ${window.selectedStates.join(", ")}`);
  console.log(`State FIPS codes set to: ${stateFipsCodes.join(", ")}`);

  // Initial dashboard update again if needed
  updateDashboard();

  // Cancel previous tacticalMode loops if any
  if (window.tacticalModeAbort) {
    window.tacticalModeAbort();
  }
  let abort = false;
  window.tacticalModeAbort = () => {
    abort = true;
  };

  (async function tacticalModeLoop() {
    const interval = null; // or number for repeating delay

    while (!abort) {
      const start = Date.now();

      await tacticalMode();

      const elapsed = Date.now() - start;
      const remainingTime = Math.max(0, (interval || 0) - elapsed);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  })();
  initAlertStream();
  updateWarningList();
});

let fetchConditionsActive = false;
let fetchInterval, rotateInterval;
document
  .getElementById("animatedToggleButton")
  .addEventListener("click", () => {
    fetchConditionsActive = true;

    document.getElementById("animatedToggleButton").classList.add("active");

    fetchInterval = setInterval(fetchAllWeatherData, 30 * 60 * 1000);
    startRotatingCities();
    fetchAllWeatherData();
    updateDashboard();
  });
