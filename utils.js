export const __nodeCache = new Map();
export function getCached(selector) {
  if (__nodeCache.has(selector)) return __nodeCache.get(selector);
  const el = document.querySelector(selector);
  __nodeCache.set(selector, el);
  return el;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export function getIconClassForEvent(eventName) {
  if (!eventName) return "fa-solid fa-triangle-exclamation";
  const n = eventName.toLowerCase();
  if (n.includes("tornado")) return "fa-solid fa-tornado";
  if (n.includes("severe thunderstorm")) return "fa-solid fa-cloud-bolt";
  if (n.includes("flash flood")) return "fa-solid fa-house-flood-water";
  if (n.includes("flood")) return "fa-solid fa-water";
  if (
    n.includes("blizzard") ||
    n.includes("winter storm") ||
    n.includes("lake effect") ||
    n.includes("snow squall")
  )
    return "fa-solid fa-snowflake";
  if (n.includes("ice storm")) return "fa-solid fa-icicles";
  if (
    n.includes("wind chill") ||
    n.includes("extreme cold") ||
    n.includes("cold weather")
  )
    return "fa-solid fa-temperature-low";
  if (n.includes("high wind") || n.includes("wind advisory"))
    return "fa-solid fa-wind";
  if (n.includes("extreme heat") || n.includes("heat advisory"))
    return "fa-solid fa-temperature-high";
  if (n.includes("freeze") || n.includes("frost"))
    return "fa-solid fa-seedling";
  if (n.includes("dense fog")) return "fa-solid fa-smog";
  if (n.includes("watch")) return "fa-regular fa-eye";
  if (n.includes("special weather")) return "fa-solid fa-circle-exclamation";
  if (n.includes("advisory")) return "fa-solid fa-circle-info";
  return "fa-solid fa-triangle-exclamation";
}

export function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff,
    g = (num >> 8) & 0xff,
    b = num & 0xff;
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

export function formatExpirationTime(expiresDate) {
  if (!expiresDate || !(expiresDate instanceof Date) || isNaN(expiresDate))
    return "UNKNOWN";
  const now = new Date();
  const timeStr = expiresDate
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
  if (expiresDate.toDateString() === now.toDateString()) return timeStr;
  const month = expiresDate
    .toLocaleString("en-US", { month: "long" })
    .toUpperCase();
  return `${month} ${expiresDate.getDate()} AT ${timeStr}`;
}

export function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

export function getCardinalDirection(degrees) {
  if (degrees === "N/A") return "N/A";
  const directions = [
    "North",
    "Northeast",
    "East",
    "Southeast",
    "South",
    "Southwest",
    "West",
    "Northwest",
  ];
  return directions[Math.floor((degrees + 22.5) / 45) % 8];
}

export function getAlertColor(eventName) {
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
    "PDS Tornado Warning": "#FF00FF",
    "Tornado Emergency": "#FF0080",
    "Severe Thunderstorm Warning": "#FF8000",
    "Considerable Severe Thunderstorm Warning": "#FF8000",
    "Destructive Severe Thunderstorm Warning": "#FF8000",
    "Flash Flood Warning": "#228B22",
    "Considerable Flash Flood Warning": "#228B22",
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
