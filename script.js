const eventTypes = {
  "Tornado Warning": "tornado-warning",
  "Radar Confirmed Tornado Warning": "radar-confirmed-tornado",
  "Spotter Confirmed Tornado Warning": "spotter-confirmed-tornado",
  "Observed Tornado Warning": "observed-tornado-warning",
  "PDS Tornado Warning": "pds-tornado-warning",
  "Tornado Emergency": "tornado-emergency",
  "Severe Thunderstorm Warning": "severe-thunderstorm-warning",
  "Considerable Severe Thunderstorm Warning":
    "severe-thunderstorm-considerable",
  "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning",
  "Flash Flood Warning": "flash-flood-warning",
  "Flash Flood Emergency": "flash-flood-emergency",
  "Tornado Watch": "tornado-watch",
  "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
  "Winter Weather Advisory": "winter-weather-advisory",
  "Winter Storm Watch": "winter-storm-watch",
  "Winter Storm Warning": "winter-storm-warning",
  "Special Weather Statement": "special-weather-statement",
  "Ice Storm Warning": "ice-storm-warning",
  "Blizzard Warning": "blizzard-warning",
  "High Wind Warning": "high-wind-warning",
  "High Wind Watch": "high-wind-watcv=h",
  "Wind Advisory": "wind-advisory",
  "Dense Fog Advisory": "dense-fog-advisory",
  "Snow Squall Warning": "snow-squall-warning",
};

const priority = {
  "Tornado Emergency": 1,
  "PDS Tornado Warning": 2,
  "Observed Tornado Warning": 3,
  "Spotter Confirmed Tornado Warning": 4,
  "Law Enforcement Confirmed Tornado Warning": 5,
  "Public Confirmed Tornado Warning": 6, // added here
  "Radar Confirmed Tornado Warning": 7,
  "Tornado Warning": 8,
  "Destructive Severe Thunderstorm Warning": 9,
  "Considerable Severe Thunderstorm Warning": 10,
  "Severe Thunderstorm Warning": 11,
  "Special Weather Statement": 12,
  "Tornado Watch": 13,
  "Severe Thunderstorm Watch": 14,
  "Flash Flood Emergency": 15,
  "Flash Flood Warning": 16,
  "Snow Squall Warning": 17,
  "Blizzard Warning": 18,
  "Ice Storm Warning": 19,
  "Winter Storm Warning": 20,
  "Winter Storm Watch": 21,
  "Winter Weather Advisory": 22,
  "High Wind Warning": 23,
  "High Wind Watch": 24,
  "Wind Advisory": 25,
  "Dense Fog Advisory": 26,
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

  source.addEventListener("open", () => {
    console.log("✅ SSE Connected at /api/xmpp-alerts");

    // Start the heartbeat interval check
    heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastMessageTime;
      // If no message for 30 seconds, consider the connection dead
      if (timeSinceLastMessage > 300000) {
        console.warn(
          "⚠️ No messages received for 300+ seconds, reconnecting..."
        );
        clearInterval(heartbeatInterval);
        source.close();

        setTimeout(() => {
          console.log("🔄 Attempting to reconnect SSE due to inactivity...");
          initAlertStream();
        }, 2000);
      }
    }, 10000); // Check every 10 seconds
  });

  source.addEventListener("error", (err) => {
    console.error("❌ SSE Error:", err);
    clearInterval(heartbeatInterval);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log("🔄 Attempting to reconnect SSE after error...");
      initAlertStream();
    }, 5000); // 5 second delay before reconnect
  });

  // Listen for ping events to update the lastMessageTime
  source.addEventListener("ping", () => {
    lastMessageTime = Date.now();
    console.debug("💓 Heartbeat received");
  });

  // Update lastMessageTime on any event
  const updateLastMessageTime = () => {
    lastMessageTime = Date.now();
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
    source.addEventListener(type, (event) => {
      updateLastMessageTime();
      try {
        const data = JSON.parse(event.data);
        console.log(`📩 Received ${type}`, data);
        HandleAlertPayload(data, type);
      } catch (error) {
        console.error(`Error processing ${type} event:`, error);
      }
    })
  );

  // Cancel events
  cancelTypes.forEach((type) =>
    source.addEventListener(type, (event) => {
      updateLastMessageTime();
      try {
        const data = JSON.parse(event.data);
        console.log(`🚨 Received ${type} for ${data.id || "unknown ID"}`);

        // Force push the cancel payload into the regular handler
        HandleAlertPayload(data, type); // <-- key line

        // Also cancel the ID to clean up UI
        cancelAlert(data.id);
      } catch (error) {
        console.error(`Error processing ${type} event:`, error);
      }
    })
  );
}

// Add this function to your script.js file
function createCheckboxes() {
  const alertTypes = [
    { value: "Tornado Warning", category: "tornado" },
    { value: "Radar Confirmed Tornado Warning", category: "tornado" },
    { value: "Spotter Confirmed Tornado Warning", category: "tornado" },
    { value: "Public Confirmed Tornado Warning", category: "tornado" }, // Law Enforcement
    { value: "Law Enforcement Confirmed Tornado Warning", category: "tornado" }, // Law Enforcement
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
    { value: "High Wind Warning", category: "wind" },
    { value: "High Wind Watch", category: "wind" },
    { value: "Wind Advisory", category: "wind" },
    { value: "Dense Fog Advisory", category: "other" },
  ];

  const container = document.getElementById("checkboxContainer");
  container.className = "checkbox-container";
  container.innerHTML = "";

  alertTypes.forEach((alert) => {
    const label = document.createElement("label");
    label.className = `custom-checkbox checkbox-${alert.category}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = alert.value;
    input.checked = true; // Default to checked

    const span = document.createElement("span");
    span.className = "checkmark";

    const textSpan = document.createElement("span");
    textSpan.className = "checkbox-label";
    textSpan.textContent = alert.value;

    label.appendChild(input);
    label.appendChild(span);
    label.appendChild(textSpan);
    container.appendChild(label);
  });

  // Set up the selected alerts based on checked boxes
  updateSelectedAlerts();

  // Add event listener to update selected alerts when checkboxes change
  container.addEventListener("change", updateSelectedAlerts);
}

function updateSelectedAlerts() {
  const checkedBoxes = document.querySelectorAll(
    "#checkboxContainer input:checked"
  );
  selectedAlerts = new Set(Array.from(checkedBoxes).map((cb) => cb.value));
  console.log("Selected alerts updated:", Array.from(selectedAlerts));
}

// Call this function when the page loads

/**
 * Extract the core identifier from a VTEC string or alert object
 * @param {string|object} input - VTEC string or alert object with VTEC
 * @returns {string|null} - Core identifier or null if not found
 */
function parseVtecCore(input) {
  if (!input) return null;

  // Handle objects with vtec property or properties.vtec
  if (typeof input === "object") {
    const vtec =
      input.vtec ||
      (input.properties && input.properties.vtec) ||
      (input.properties &&
        input.properties.parameters &&
        input.properties.parameters.VTEC);

    if (Array.isArray(vtec) && vtec.length > 0) {
      return parseVtecCore(vtec[0]);
    } else if (typeof vtec === "string") {
      return parseVtecCore(vtec);
    }
    return null;
  }

  // Handle VTEC string directly
  if (typeof input === "string") {
    const parsed = parseVTEC(input);
    return parsed.core || null;
  }

  return null;
}

function isWarningExpired(warning) {
  if (!warning || !warning.properties || !warning.properties.expires) {
    return false; // Can't determine expiration, assume not expired
  }

  const expiresDate = new Date(warning.properties.expires);
  return expiresDate < new Date();
}

function isAlertTypeSelected(alert) {
  // If selectedAlerts is not defined or not a Set, consider all alerts as selected
  if (!selectedAlerts || !(selectedAlerts instanceof Set)) {
    console.warn(
      "⚠️ selectedAlerts is not defined or not a Set - defaulting to true"
    );
    return true;
  }

  // Handle both string event names and alert objects
  const eventName = typeof alert === "string" ? alert : getEventName(alert);

  // Check if the event name is in the selectedAlerts Set
  return selectedAlerts.has(eventName);
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
  var slider = document.getElementById("sliderContainer");
  var body = document.body;

  if (slider.style.transform === "translateY(0%)") {
    slider.style.transform = "translateY(-100%)";
    body.classList.remove("overlay");
  } else {
    slider.style.transform = "translateY(0%)";
    body.classList.add("overlay");
  }
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

function testNotification(eventName) {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 30);

  // Get random counties
  const allCounties = [
    "Washtenaw, MI",
    "Lenawee, MI",
    "Monroe, MI",
    "Wayne, MI",
    "Oakland, MI",
    "Macomb, MI",
    "Livingston, MI",
    "Genesee, MI",
    "Ingham, MI",
    "Jackson, MI",
    "Hillsdale, MI",
    "Calhoun, MI",
    "Eaton, MI",
    "Shiawassee, MI",
    "Clinton, MI",
    "Lapeer, MI",
    "St. Clair, MI",
    "Barry, MI",
    "Kent, MI",
    "Ottawa, MI",
    "Muskegon, MI",
    "Saginaw, MI",
    "Bay, MI",
    "Midland, MI",
    "Isabella, MI",
    "Gratiot, MI",
    "Ionia, MI",
    "Montcalm, MI",
    "Mecosta, MI",
    "Newaygo, MI",
  ];

  const countyCount = Math.floor(Math.random() * 20) + 1;
  const shuffledCounties = [...allCounties].sort(() => 0.5 - Math.random());
  const selectedCounties = shuffledCounties.slice(0, countyCount);
  const areaDesc = "TEST - " + selectedCounties.join("; ");

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
  }

  // Generate a description string that includes the SOURCE and HAZARD
  let description = "";
  if (parameters.source) {
    description += `SOURCE... ${parameters.source[0]}\n`;
  }

  // Add hazard information based on event type
  if (eventName === "Tornado Warning") {
    const hazardText =
      eventName === "Tornado Emergency"
        ? "DEADLY TORNADO."
        : eventName === "PDS Tornado Warning"
        ? "DAMAGING TORNADO."
        : "TORNADO.";
    description += `HAZARD... ${hazardText}\n`;
  } else if (eventName === "Severe Thunderstorm Warning") {
    const hazardText =
      parameters.threats.thunderstormDamageThreat === "DESTRUCTIVE"
        ? "DESTRUCTIVE THUNDERSTORM WINDS AND LARGE HAIL."
        : "DAMAGING WINDS AND LARGE HAIL.";
    description += `HAZARD... ${hazardText}\n`;
  } else if (eventName === "Flash Flood Warning") {
    description += `HAZARD... FLASH FLOODING\n`;
  }

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
  updateDashboard(warning);
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

function updateWarningCounters(warning) {
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
}

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

function addAlert(feature) {
  allAlerts.push(feature);
  if (allAlerts.length > MAX_ALERTS) allAlerts.shift();
}

function testMostRecentAlert() {
  if (activeWarnings.length > 0) {
    const mostRecentWarning = activeWarnings[0];
    showNotification(mostRecentWarning);
  } else {
    alert("No active warnings to test.");
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

function getEventName(alert) {
  if (!alert) return "Unknown Event";

  const props =
    alert.properties || alert.feature?.properties || alert.feature || alert;
  const threats = alert.threats || props.threats || {}; // ✅ THIS LINE FIXES IT

  const event = props.eventName || props.event || "Unknown Event";
  const description = props.description || props.rawText || alert.rawText || "";

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
    if (tornadoDetection === "OBSERVED") return "Observed Tornado Warning";
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
    if (flashFloodDamageThreat === "CATASTROPHIC")
      return "Flash Flood Emergency";
    return "Flash Flood Warning";
  }

  return event;
}

let currentCountyIndex = 0;

let isNotificationQueueEnabled = false;
let notificationQueue = [];
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

function checkIfRecentAlert(warning) {
  // Get the alert's issuance time, defaulting to properties.sent or properties.effective
  const alertTime = new Date(
    warning.properties.sent ||
      warning.properties.effective ||
      warning.properties.onset ||
      Date.now()
  );

  // Consider alerts within the last 15 minutes as "recent" and worth notifying about
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return alertTime > fifteenMinutesAgo;
}

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

  // 1. INIT alerts are special: always store, never notify explicitly
  if (sseEventType.toUpperCase() === "INIT") {
    previousWarnings.set(warningId, warning);
    // Also track in notifiedWarnings so that future non-INIT messages are seen as "tracked"
    // even if INIT itself didn't trigger a visual notification.
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
            notificationType = "ALERT UPGRADED";
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
  const soundId = getSoundForEvent(eventName, notificationType);
  console.log(`🔊 Playing sound ID: ${soundId}`);
  playSoundById(soundId);

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
  if (notificationType === "ALERT UPGRADED") {
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
    if (eventName.includes("Considerable")) return "SVRCNEWSound";
    if (eventName.includes("Severe Thunderstorm Warning")) return "SVRCSound";
    if (eventName.includes("Tornado Watch")) return "TOAWatch";
    if (eventName.includes("Severe Thunderstorm Watch")) return "SVAWatch";
    // Default sound if no specific match for new alerts
    return "SVRCSound";
  }
}

function displayNotification(warning, notificationType, emergencyText) {
  if (notificationsMuted) return; // no logging, keep it chill

  const eventName = getEventName(warning);
  const description = warning.rawText || warning.properties?.rawText || "";
  const rawAreaDesc = Array.isArray(warning.counties)
    ? warning.counties.join("; ")
    : warning.properties?.areaDesc || "";
  const cleanAreaDesc = rawAreaDesc.replace(/^TEST\s*-\s*/i, "").trim();

  // Build container
  const notification = document.createElement("div");
  notification.className = "notification-popup";

  // Determine if it's a special weather statement early
  const isSpecialWeatherStatement =
    eventName.toLowerCase() === "special weather statement";

  // If eventName is 'special weather statement', set the primary text color to black for general inheritance
  if (isSpecialWeatherStatement) {
    notification.style.color = "black";
  }

  const counties = cleanAreaDesc
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  notification.style.bottom = "70px";

  // Type label
  const typeLabel = document.createElement("div");
  typeLabel.className = "notification-type-label";
  typeLabel.textContent = notificationType;
  if (isSpecialWeatherStatement) {
    typeLabel.style.color = "black"; // Explicitly set color for type label
  }
  notification.appendChild(typeLabel);

  // Title
  const title = document.createElement("div");
  title.className = "notification-title";
  title.textContent = eventName;
  if (isSpecialWeatherStatement) {
    title.style.color = "black"; // Explicitly set color for title
  }
  notification.appendChild(title);

  // Area/counties
  const countyDiv = document.createElement("div");
  countyDiv.className = "notification-message";
  countyDiv.textContent = `COUNTIES: ${cleanAreaDesc}`;
  if (isSpecialWeatherStatement) {
    countyDiv.style.color = "black"; // Explicitly set color for county div
  }
  notification.appendChild(countyDiv);

  // Scroll logic based on comma/semicolon count:
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

      const extraPadding = 10;
      const scrollDistance =
        scrollWrapper.scrollWidth - countyDiv.offsetWidth + extraPadding;

      const mask =
        "linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)";
      countyDiv.style.webkitMaskImage = mask;
      countyDiv.style.maskImage = mask;

      const totalDuration =
        eventName.toLowerCase().includes("tornado") || eventName.includes("PDS")
          ? 10
          : 7;

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

  // Expiration
  const expirationEl = document.createElement("div");
  expirationEl.className = "notification-expiration";
  const expires = new Date(
    warning.expires || warning.properties?.expires || Date.now()
  );
  expirationEl.textContent = `EXPIRES ${expires.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
  if (isSpecialWeatherStatement) {
    expirationEl.style.color = "black"; // Explicitly set color for expiration text
  }
  notification.appendChild(expirationEl);

  // Emergency block (if any)
  if (emergencyText) {
    const emergencyWrapper = document.createElement("div");
    emergencyWrapper.className = "emergency-alert";
    emergencyWrapper.style.display = "flex";
    emergencyWrapper.style.alignItems = "center";
    emergencyWrapper.style.justifyContent = "flex-end";
    emergencyWrapper.style.gap = "10px";
    emergencyWrapper.style.fontSize = "36px";
    emergencyWrapper.style.color = "#FFFFFF";
    emergencyWrapper.style.right = "35px";
    if (isSpecialWeatherStatement) {
      emergencyWrapper.style.color = "black";
    }

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

    notification.appendChild(emergencyWrapper);
  }

  // Tornado hazard/source info
  const nameLC = eventName.toLowerCase().trim();

  const allowedTornadoAlerts = [
    "tornado warning",
    "radar confirmed tornado warning",
    "spotter confirmed tornado warning",
    "public confirmed tornado warning",
    "law enforcement confirmed tornado warning",
    "observed tornado warning",
    "pds tornado warning",
    "tornado emergency",
  ];

  if (allowedTornadoAlerts.includes(nameLC)) {
    const haz = (
      description.match(/HAZARD\.{3}\s*([^\n\r]*)/i)?.[1] ||
      warning.tornadoDamageThreat ||
      "N/A"
    ).trim();
    const src = (
      description.match(/SOURCE\.{3}\s*([^\n\r]*)/i)?.[1] || "N/A"
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
    if (isSpecialWeatherStatement) {
      hs.style.color = "black";
    }
    hs.innerHTML = `
      <div><strong>HAZARD:</strong> ${getHazardEmoji(
        haz
      )}${haz}${getHazardEmoji(haz)}</div>
      <div><strong>SOURCE:</strong> ${getSourceEmoji(
        src
      )}${src}${getSourceEmoji(src)}</div>
    `;
    notification.appendChild(hs);
  }

  // Severe thunderstorm wind/hail info
  if (eventName.toLowerCase().includes("severe thunderstorm warning")) {
    const haz = (
      description.match(/HAZARD\.{3}\s*([^\n\r]*)/i)?.[1] || "N/A"
    ).trim();
    const src = (
      description.match(/SOURCE\.{3}\s*([^\n\r]*)/i)?.[1] || "N/A"
    ).trim();
    const tornadoDetection = warning.threats?.tornadoDetection || "N/A";

    const wh = document.createElement("div");
    wh.className = "wind-hail-info";
    wh.style.lineHeight = "1.2";
    if (isSpecialWeatherStatement) {
      wh.style.color = "black";
    }
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
    notification.appendChild(wh);
  }

  // Pulse logo animation
  const logo = document.getElementById("pulseLogo");
  if (logo) {
    logo.classList.remove("notification-pulse");
    void logo.offsetWidth; // trigger reflow for restart animation
    logo.classList.add("notification-pulse");
    setTimeout(() => logo.classList.remove("notification-pulse"), 2000);
  }

  // Append & animate popup
  document.body.appendChild(notification);
  notification.style.transform = "translateY(100%)";
  notification.style.backgroundColor = getAlertColor(eventName);
  notification.style.opacity = 1;
  notification.style.transition = "transform 0.85s cubic-bezier(0.4,0,0.2,1)";

  setTimeout(() => (notification.style.transform = "translateY(50%)"), 50);

  const duration =
    eventName.toLowerCase().includes("tornado") || eventName.includes("PDS")
      ? 10000
      : 7000;
  setTimeout(() => {
    notification.style.transform = "translateY(100%)";
    setTimeout(() => notification.remove(), 500);
  }, duration);

  updateWarningList(activeWarnings);
}

function processNotificationQueue() {
  if (isShowingNotification || notificationQueue.length === 0) {
    return;
  }

  isShowingNotification = true;
  const { warning, notificationType } = notificationQueue.shift();
  displayNotification(warning, notificationType);

  setTimeout(() => {
    isShowingNotification = false;
    processNotificationQueue();
  }, 5000);
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

// Sync with a solid time API
let serverTimeOffset = 0; // global offset in ms
const currentTimeZone = "ET"; // or "CT" if you need

async function syncWithTimeServer() {
  console.log("⏰ Syncing time with fallback servers...");

  const urls = [
    "https://worldtimeapi.org/api/timezone/America/New_York",

    // add more if you want
  ];

  let data = null;
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        data = await response.json();
        console.log(`✅ Got time data from: ${url}`);
        break;
      } else {
        console.warn(`⚠️ HTTP ${response.status}: ${url}`);
      }
    } catch (err) {
      console.warn(`💥 Error fetching from: ${url}`, err);
      lastError = err;
    }
  }

  if (!data) {
    console.error("❌ All time servers failed 😭");
    throw lastError || new Error("All time servers failed");
  }

  // 🧠 Build server time from 'datetime' field (ISO string)
  let serverTime;
  if (data.datetime) {
    serverTime = new Date(data.datetime);
  } else {
    throw new Error("🤷‍♂️ Unknown time API format, missing 'datetime'");
  }

  const localTime = new Date();
  serverTimeOffset = serverTime.getTime() - localTime.getTime();

  console.log(`🧊 Synced. Offset: ${serverTimeOffset} ms`);
}

// Always get time adjusted by offset
function getCurrentTime() {
  return new Date(Date.now() + serverTimeOffset);
}

function updateClock() {
  const now = getCurrentTime();

  // ET is the server timezone; CT = ET -1h
  const tzOffsetMs = currentTimeZone === "CT" ? -1 * 60 * 60 * 1000 : 0;
  const displayTime = new Date(now.getTime() + tzOffsetMs);

  const hours = displayTime.getHours() % 12 || 12;
  const minutes = displayTime.getMinutes().toString().padStart(2, "0");
  const seconds = displayTime.getSeconds().toString().padStart(2, "0");
  const ampm = displayTime.getHours() >= 12 ? "PM" : "AM";

  document.getElementById("clockDisplay").innerHTML =
    `<span class="time">${hours}:${minutes}:${seconds} ${ampm} ${currentTimeZone}</span>` +
    `<span class="date">${(displayTime.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/` +
    `${displayTime.getDate().toString().padStart(2, "0")}/` +
    `${(displayTime.getFullYear() % 100).toString().padStart(2, "0")}</span>`;
}

function toggleTimeZone() {
  currentTimeZone = currentTimeZone === "ET" ? "CT" : "ET";
  document.getElementById("toggleTimeZone").textContent =
    currentTimeZone === "ET"
      ? "Switch to Central Time"
      : "Switch to Eastern Time";
  updateClock();
}

// Hard fail init: don't start clock if sync fails
async function initClock() {
  try {
    await syncWithTimeServer();

    updateClock();
    setInterval(updateClock, 1000); // update every second
    setInterval(syncWithTimeServer, 3600000); // re-sync hourly
  } catch (err) {
    console.error(
      "💥 Failed to sync time from server. Clock will not start.",
      err
    );
    document.getElementById("clockDisplay").textContent =
      "⚠️ Failed to sync time from server";
  }
}

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

  if (highestAlert.alert === "N/A" && activeWarnings.length === 0) {
    alertText.textContent = "MICHIGAN STORM CHASERS";
    alertText.style.color = ""; // Reset to default color
    alertBar.style.backgroundColor = "#1F2593";
    activeAlertsBox.style.display = "none";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
  } else if (highestAlert.alert) {
    alertText.textContent = currentText;
    // Set text color to black if it's a Special Weather Statement
    alertText.style.color =
      currentText === "Special Weather Statement" ? "black" : "";
    alertBar.style.backgroundColor = highestAlert.color;

    // Darken glow by 20%
    const darkerGlow = darkenColor(highestAlert.color, 20);
    alertBar.style.setProperty("--glow-color", darkerGlow);

    activeAlertsBox.textContent = "HIGHEST ACTIVE ALERT";
    activeAlertsBox.style.display = "block";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
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
  const eventName = warning.eventName || getEventName(warning);
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
    "Flash Flood Emergency": "🚨🌊",
    "Flood Warning": "💧",
    "Flood Advisory": "💦",
    "Winter Storm Warning": "❄️",
    "Winter Weather Advisory": "🌨️",
    "Ice Storm Warning": "🧊",
    "Blizzard Warning": "☃️❄️",
    "Special Weather Statement": "ℹ️",
    "Tornado Watch": "👀🌪️",
    "Severe Thunderstorm Watch": "👀⛈️",
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
  };

  return colorMap[eventClass] || "rgba(255, 255, 255, 0.3)";
}

setInterval(updateAlertBar, 10);

function getAlertColor(eventName) {
  switch (eventName) {
    case "Tornado Warning":
      return "#FF0000";
    case "Observed Tornado Warning":
      return "#FF00FF";
    case "Radar Confirmed Tornado Warning":
      return "#FF00FF";
    case "Spotter Confirmed Tornado Warning":
      return "#FF00FF";
    case "Law Enforcement Confirmed Tornado Warning":
      return "#FF00FF";
    case "Public Confirmed Tornado Warning":
      return "#FF00FF";
    case "PDS Tornado Warning":
      return "#FF00FF";
    case "Tornado Emergency":
      return "#FF0080";
    case "Severe Thunderstorm Warning":
    case "Considerable Severe Thunderstorm Warning":
    case "Destructive Severe Thunderstorm Warning":
      return "#FF8000";
    case "Flash Flood Warning":
      return "#228B22";
    case "Flash Flood Emergency":
      return "#8B0000";
    case "Tornado Watch":
      return "#8B0000";
    case "Severe Thunderstorm Watch":
      return "#DB7093";
    case "Winter Weather Advisory":
      return "#7B68EE";
    case "Winter Storm Warning":
      return "#FF69B4";
    case "Winter Storm Watch":
      return "#6699CC";
    case "Ice Storm Warning":
      return "#8B008B";
    case "Blizzard Warning":
      return "#FF4500";
    case "Special Weather Statement":
      return "#FFE4B5";
    case "High Wind Warning":
      return "#DAA520";
    case "High Wind Watch":
      return "#B8860B";
    case "Wind Advisory":
      return "#D2B48C";
    case "Snow Squall Warning":
      return "#64B5F6";
    case "Freezing Fog Advisory":
      return "#008080";
    case "Dense Fog Advisory":
      return "#708090";
    case "Dust Advisory":
      return "#BDB76B";
    default:
      return "rgba(255, 255, 255, 0.9)";
  }
}

const audioElements = {
  TorIssSound: new Audio(
    "https://audio.jukehost.co.uk/ClbCqxfWssr6dlRXqx3lXVqKQPPVeRgQ"
  ),
  TorPDSSound: new Audio(
    "https://audio.jukehost.co.uk/MePPuUhuqZzUMt6vBRqvBYDydDVxNhBi"
  ),
  PDSSVRSound: new Audio(
    "https://audio.jukehost.co.uk/xjwbmhiA8SZPbtkRvIV15dryKrUWDnXP"
  ),
  SVRCSound: new Audio(
    "https://audio.jukehost.co.uk/Xkv300KaF6MJghFS9oQ5BMTWfSDle4IW"
  ),
  SVRCNEWSound: new Audio(
    "https://audio.jukehost.co.uk/cAZ0FjIgLrbX8kxErMb6DAKTq0BwKdlz"
  ),
  TORUPG: new Audio(
    "https://audio.jukehost.co.uk/X242ZLUEUAOXvdr05shOqjt5YBpWLIdg"
  ),
  TOREISS: new Audio(
    "https://audio.jukehost.co.uk/DELgBfmWgrg8lakettLP9mD9nomZaVA3"
  ),
  TOAWatch: new Audio(
    "https://audio.jukehost.co.uk/MZxVbo8EmFP4XP6vTKaGPtUfGIU6IFdK"
  ),
  SVAWatch: new Audio(
    "https://audio.jukehost.co.uk/vOROpwVlXRik9TS2wXvJvtYInR8o2qMQ"
  ),
  TorUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/jeoBTHhj1MqYOke3BPe2rsdShWcAKe5K"
  ),
  TorPDSUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/iUTfKHPTtMU1d8foLsxL4bwoJDM7UnZ1"
  ),
  TorEmergencyUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/pMOZALOjzSE6DmppsYP3DV4enDLVg0I2"
  ),
  TorUpgradeSound: new Audio(
    "https://audio.jukehost.co.uk/X242ZLUEUAOXvdr05shOqjt5YBpWLIdg"
  ),
  SvrUpgradeSound: new Audio(
    "https://audio.jukehost.co.uk/2pBX1txWPzqySYtAlzveXcwRHb1jybGW"
  ),
};

audioElements.TorPDSSound.volume = 0.4;
audioElements.TOREISS.volume = 0.4;
audioElements.TorPDSUpdateSound.volume = 0.4;
audioElements.TorEmergencyUpdateSound.volume = 0.4;
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

function getWindEmoji(windSpeed) {
  const speed = parseInt(windSpeed, 10);
  if (isNaN(speed)) return "<span class='emoji-animated tight-kerning'></span>";

  if (speed >= 90) {
    return "<span class='emoji-animated tight-kerning'></span>";
  }
  if (speed >= 80) {
    return "<span class='emoji-animated tight-kerning'></span>";
  }
  if (speed >= 70) {
    return "<span class='emoji-animated tight-kerning'></span>";
  }
  if (speed >= 60) {
    return "<span class='emoji-animated tight-kerning'></span>";
  }
  return "<span class='emoji-animated'></span>";
}

function getHailEmoji(hailSize) {
  const size = parseFloat(hailSize);
  if (isNaN(size)) return "<span class='emoji-animated'></span>";

  if (size >= 5.0) {
    // Softball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 4.0) {
    // Softball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 3.0) {
    // Softball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 2.75) {
    // Baseball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 2.5) {
    // Tennis ball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 2.0) {
    // Hen egg
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 1.75) {
    // Golf ball
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 1.5) {
    // Walnut/large grape
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 1.25) {
    // Half-dollar
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 1.0) {
    // Quarter (NWS severe hail)
    return "<span class='emoji-animated'></span>";
  }
  if (size >= 0.75) {
    // Penny
    return "<span class='emoji-animated'></span>";
  }
  // Smaller than pea-sized
  return "<span class='emoji-animated'></span>";
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

function isWarningActive(warning) {
  const expirationDate = new Date(warning.properties.expires);
  return expirationDate > new Date();
}

function getEventNameFromText(warningText) {
  if (warningText.includes("Tornado Warning")) {
    if (
      warningText.includes(
        "This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!"
      )
    ) {
      return "PDS Tornado Warning";
    } else if (warningText.includes("TORNADO EMERGENCY")) {
      return "Tornado Emergency";
    } else {
      return "Observed Tornado Warning";
    }
  } else if (warningText.includes("Severe Thunderstorm Warning")) {
    if (warningText.includes("THUNDERSTORM DAMAGE THREAT...CONSIDERABLE")) {
      return "Considerable Severe Thunderstorm Warning";
    } else if (
      warningText.includes("THUNDERSTORM DAMAGE THREAT...DESTRUCTIVE")
    ) {
      return "Destructive Severe Thunderstorm Warning";
    } else {
      return "Severe Thunderstorm Warning";
    }
  } else if (warningText.includes("Flash Flood Warning")) {
    return "Flash Flood Warning";
  } else {
    return "Unknown Event";
  }
}

function extractCounties(warningText) {
  const countyRegex =
    /(?:\* Locations impacted include\.\.\.\s*)([\s\S]*?)(?=\n\n)/;
  const match = warningText.match(countyRegex);
  return match ? match[1].trim() : "N/A";
}

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

function updateWarningList(warnings) {
  const warningList = document.getElementById("warningList");
  if (!warningList) return;

  warningList.innerHTML = "";

  const listHeader = document.createElement("div");
  listHeader.className = "warning-list-header";
  listHeader.innerHTML = `
    <h2>Active Warnings <span class="warning-count-badge">${warnings.length}</span></h2>
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
    "Flash Flood Emergency",
    "Snow Squall Warning",
    "Tornado Watch",
    "Severe Thunderstorm Watch",
    "Winter Storm Warning",
    "Ice Storm Warning",
    "Blizzard Warning",
    "Winter Storm Watch",
    "Winter Weather Advisory",
    "High Wind Warning",
    "Wind Advisory",
    "Dense Fog Advisory",
    "Special Weather Statement",
  ];

  const warningGroupsContainer = document.createElement("div");
  warningGroupsContainer.className = "warning-groups-container";
  warningList.appendChild(warningGroupsContainer);

  severityOrder.forEach((eventType) => {
    if (!warningGroups[eventType] || warningGroups[eventType].length === 0)
      return;

    const warnings = warningGroups[eventType];

    const groupContainer = document.createElement("div");
    groupContainer.className = "warning-group";

    const groupHeader = document.createElement("div");
    groupHeader.className = `warning-group-header ${getWarningClass(
      eventType
    )}`;
    groupHeader.innerHTML = `
  <div class="group-icon">${getWarningEmoji(eventType)}</div>
  <h3>${eventType} <span class="group-count">${warnings.length}</span></h3>
  <div class="group-toggle"><i class="fa fa-chevron-down"></i></div>
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
  const eventName = warning.eventName || props.event || "Unknown Event";

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
          <div class="instruction-toggle">Safety Instructions <i class="fa fa-chevron-down"></i></div>
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
        icon.classList.toggle("fa-chevron-up");
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

function getCallToAction(eventName) {
  switch (eventName) {
    case "Tornado Warning":
    case "Observed Tornado Warning":
      return "Seek shelter now!";
    case "PDS Tornado Warning":
    case "Tornado Emergency":
      return "Seek shelter now! You are in a life-threatening situation!";
    case "Severe Thunderstorm Warning":
    case "Considerable Severe Thunderstorm Warning":
    case "Destructive Severe Thunderstorm Warning":
      return "Seek shelter indoors away from windows!";
    case "Flash Flood Warning":
      return "Seek higher ground now!";
    case "Tornado Watch":
    case "Severe Thunderstorm Watch":
    case "Winter Weather Advisory":
    case "Winter Storm Watch":
    case "Blizzard Warning":
    case "Winter Storm Warning":
    case "Ice Storm Warning":
      return "Stay tuned for further info!";
    default:
      return "Take Appropriate Action!";
  }
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
  return { action, wfo, phenSig, etn, core: `${wfo}_${etn}` };
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
    updateDashboard(warning);
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
    updateDashboard();
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

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.floor((degrees + 22.5) / 45) % 8;
  return directions[index];
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
  activeWarnings.length = 0;
  updateWarningList(activeWarnings);
  updateHighestAlert();
  updateAlertBar();
});
async function rotateCity() {
  const isSpcModeEnabled = document.getElementById("spcModeToggle").checked;

  // If SPC mode is enabled, do not update current conditions
  if (isSpcModeEnabled) {
    console.log("SPC mode is enabled. Skipping current conditions update.");
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
        `Wind: ${arrowSvg} ${updatedWeatherData.cardinalDirection} @ ${updatedWeatherData.windSpeed} mph`
      );
    }

    if (updatedWeatherData.humidity !== "N/A") {
      parts.push(`Humidity: ${updatedWeatherData.humidity}`);
    }
    if (updatedWeatherData.heatIndexF !== "N/A") {
      parts.push(`Heat Index: ${updatedWeatherData.heatIndexF}°F`);
    }
    if (updatedWeatherData.windChillF !== "N/A") {
      parts.push(`Wind Chill: ${updatedWeatherData.windChillF}°F`);
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
  eventTypeBar.style.backgroundColor = "#1F2593";

  // Explicitly reset the text color to white
  const eventTypeElement = document.querySelector("#eventType");
  if (eventTypeElement) {
    eventTypeElement.style.color = "white"; // or "" to use default color
  }
  document.querySelector(".event-type-bar").style.backgroundColor = "#1F2593";
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
// Global: keep track of last scrolled text
let lastScrollingHTML = "";
function updateCountiesText(newHTML, warning) {
  const countiesEl = document.querySelector("#counties");
  if (!countiesEl) {
    console.warn("[updateCountiesText] Missing #counties, aborting.");
    return;
  }

  const eventTypeBar = document.querySelector(".event-type-bar");
  const leftGap = 40; // Base padding from left/event bar
  const additionalSafetyMargin = 20; // Extra margin so no touching right edge
  const safeMargin = 50; // Right side safe margin

  // Clear any existing observer so we don't stack multiple
  if (countiesEl._resizeObserver) {
    countiesEl._resizeObserver.disconnect();
    countiesEl._resizeObserver = null;
  }

  countiesEl.classList.add("fade-out");

  setTimeout(() => {
    countiesEl.innerHTML = "";
    const scrollWrapper = document.createElement("span");
    scrollWrapper.innerHTML = newHTML;
    scrollWrapper.style.display = "inline-block";
    scrollWrapper.style.paddingRight = "5em"; // default right padding

    function updatePadding() {
      if (!eventTypeBar) {
        scrollWrapper.style.paddingLeft = `${leftGap}px`;
        return;
      }

      const barRect = eventTypeBar.getBoundingClientRect();
      const containerRect = countiesEl.getBoundingClientRect();
      const neededPadding = Math.max(
        leftGap,
        barRect.right - containerRect.left + leftGap + additionalSafetyMargin
      );
      scrollWrapper.style.paddingLeft = `${neededPadding}px`;

      // Right side checks for scrolling / padding
      const contentW = scrollWrapper.offsetWidth;
      const containerW = countiesEl.offsetWidth;

      const shouldScroll = contentW > containerW;
      const isTooClose =
        contentW > containerW - safeMargin && contentW <= containerW;

      scrollWrapper.style.animation = "none";

      if (shouldScroll) {
        const mask =
          "linear-gradient(to right, transparent 300px, black 320px, black calc(100% - 20px), transparent 100%)";
        countiesEl.style.webkitMaskImage = mask;
        countiesEl.style.maskImage = mask;

        scrollWrapper.style.paddingLeft = "300px";
        const scrollDistance = contentW + 50 - containerW;
        const animName = `scrollLeftPause${Date.now()}`;
        const totalDuration = 10;

        const oldStyle = document.getElementById("scrolling-animation-style");
        if (oldStyle) oldStyle.remove();

        const style = document.createElement("style");
        style.id = "scrolling-animation-style";
        style.textContent = `
          @keyframes ${animName} {
            0%   { transform: translateX(0); }
            10%  { transform: translateX(0); }
            80%  { transform: translateX(-${scrollDistance}px); }
            100% { transform: translateX(-${scrollDistance}px); }
          }
        `;
        document.head.appendChild(style);
        scrollWrapper.style.animation = `${animName} ${totalDuration}s linear infinite`;
      } else if (isTooClose) {
        scrollWrapper.style.paddingRight = `${safeMargin + leftGap}px`;
        countiesEl.style.webkitMaskImage = "";
        countiesEl.style.maskImage = "";
      } else {
        countiesEl.style.webkitMaskImage = "";
        countiesEl.style.maskImage = "";
        scrollWrapper.style.paddingRight = "5em";
      }
    }

    countiesEl.appendChild(scrollWrapper);
    countiesEl.style.overflow = "hidden";
    countiesEl.style.whiteSpace = "nowrap";

    requestAnimationFrame(() => {
      setTimeout(() => {
        updatePadding();

        // Observe resizing of counties element and event type bar for dynamic padding updates
        countiesEl._resizeObserver = new ResizeObserver(() => {
          updatePadding();
        });

        countiesEl._resizeObserver.observe(countiesEl);
        if (eventTypeBar) countiesEl._resizeObserver.observe(eventTypeBar);

        countiesEl.classList.remove("fade-out");
      }, 50);
    });
  }, 400);
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
      ? "ACTIVE ALERTS"
      : "CURRENT CONDITIONS";
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

function updateDashboard() {
  const expirationElement = document.querySelector("#expiration");
  const eventTypeElement = document.querySelector("#eventType");
  const countiesElement = document.querySelector("#counties");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const activeAlertText = document.getElementById("ActiveAlertText");
  const spcToggle = document.getElementById("spcModeToggle");

  if (!Array.isArray(activeWarnings) || activeWarnings.length === 0) {
    expirationElement.textContent = "LOADING...";
    eventTypeElement.textContent = "LOADING...";
    countiesElement.textContent = "LOADING...";
    document.querySelector(".event-type-bar").style.backgroundColor = "#333";
    updateActiveAlertText();
    showNoWarningDashboard();
    return;
  }

  if (
    typeof currentWarningIndex !== "number" ||
    currentWarningIndex >= activeWarnings.length
  ) {
    currentWarningIndex = 0;
  }

  let warning = activeWarnings[currentWarningIndex];

  if (!warning || !warning.properties) {
    console.warn("⚠️ Skipping invalid warning entry:", warning);

    let validFound = false;
    let attempts = 0;
    while (attempts < activeWarnings.length) {
      currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
      const nextWarning = activeWarnings[currentWarningIndex];
      if (nextWarning && nextWarning.properties) {
        warning = nextWarning;
        validFound = true;
        break;
      }
      attempts++;
    }

    if (!validFound) {
      console.warn(
        "⚠️ No valid warnings found. Falling back to current conditions."
      );
      activeWarnings = [];
      showNoWarningDashboard();
      return;
    }
  }

  const { event, areaDesc, expires } = warning.properties;
  const eventName = getEventName(warning);
  const alertColor = getAlertColor(eventName);

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

  const formattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    timeOptions
  );
  const fullFormattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    fullOptions
  );

  expirationElement.textContent = `Expires: ${fullFormattedExpirationTime}`;

  const counties = formatCountiesTopBar(areaDesc);
  updateCountiesText(
    `Counties: ${counties} | Until ${formattedExpirationTime}`,
    warning
  );

  eventTypeElement.textContent = eventName;
  activeAlertsBox.style.display = "block";
  activeAlertText.textContent = "ACTIVE ALERTS";

  showWarningDashboard();

  // ✅ always rotate index
  currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
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
    await rotateCity();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    if (rotateActive) rotateCityWithDelay();
  }
}

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
    fetchConditionsActive = !fetchConditionsActive;
    const buttonText = fetchConditionsActive
      ? "STOP FETCHING"
      : "FETCH CURRENT CONDITIONS";
    document.getElementById("animatedToggleButton").textContent = buttonText;

    document
      .getElementById("animatedToggleButton")
      .classList.toggle("active", fetchConditionsActive);

    if (fetchConditionsActive) {
      fetchInterval = setInterval(fetchAllWeatherData, 30 * 60 * 1000);
      startRotatingCities();
      fetchAllWeatherData();
      updateDashboard();
    } else {
      clearInterval(fetchInterval);
      updateDashboard();
      stopRotatingCities();
    }
  });
