import { priority } from "./config.js";

export function getEventName(alert) {
  if (!alert) return "Unknown Event";
  const props =
    alert.properties || alert.feature?.properties || alert.feature || alert;
  const threats = alert.threats || props.threats || props.parameters || {};

  const event = props.eventName || props.event || "Unknown Event";
  const description = props.description || props.rawText || alert.rawText || "";

  // Tornado Detection Logic
  const tDmg = (
    threats.tornadoDamageThreat?.[0] ||
    threats.tornadoDamageThreat ||
    ""
  ).toUpperCase();
  const tDet = (
    threats.tornadoDetection?.[0] ||
    threats.tornadoDetection ||
    ""
  ).toUpperCase();
  const sDmg = (
    threats.thunderstormDamageThreat?.[0] ||
    threats.thunderstormDamageThreat ||
    ""
  ).toUpperCase();
  const fDmg = (
    threats.flashFloodDamageThreat?.[0] ||
    threats.flashFloodDamageThreat ||
    ""
  ).toUpperCase();

  if (event.includes("Tornado Warning")) {
    if (tDmg === "CATASTROPHIC") return "Tornado Emergency";
    if (tDmg === "CONSIDERABLE") return "PDS Tornado Warning";
    if (tDet === "OBSERVED") return "Observed Tornado Warning";
    return "Tornado Warning";
  }

  if (event.includes("Severe Thunderstorm Warning")) {
    if (sDmg === "DESTRUCTIVE")
      return "Destructive Severe Thunderstorm Warning";
    if (sDmg === "CONSIDERABLE")
      return "Considerable Severe Thunderstorm Warning";
    return "Severe Thunderstorm Warning";
  }

  if (event.includes("Flash Flood Warning")) {
    if (fDmg === "CATASTROPHIC") return "Flash Flood Emergency";
    if (fDmg === "CONSIDERABLE") return "Considerable Flash Flood Warning";
    return "Flash Flood Warning";
  }

  return event;
}

export function parseVTEC(vtec) {
  const parts = vtec.replace(/^\//, "").replace(/\/$/, "").split(".");
  if (parts.length < 6) return {};
  return {
    action: parts[1],
    wfo: parts[2],
    phenSig: parts[3] + "." + parts[4],
    etn: parts[5],
    core: `${parts[2]}_${parts[5]}`,
  };
}

export function formatRawTextForBar(rawText) {
  if (!rawText) return "";
  let txt = rawText
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\r\n?|\n/g, "\n");
  const wanted = new Set(["WHAT", "WHERE", "WHEN", "IMPACTS"]);
  const sections = { WHAT: "", WHERE: "", WHEN: "", IMPACTS: "" };
  let current = null;
  const lines = txt.split("\n");
  for (let line of lines) {
    const m = line.match(
      /^\s*(?:\*\s*)?([A-Za-z][A-Za-z /-]{1,40})\.\.\.\s*(.*)$/i
    );
    if (m) {
      const h = m[1].toUpperCase();
      if (wanted.has(h)) {
        current = h;
        sections[current] = m[2].trim();
      } else current = null;
    } else if (current) sections[current] += " " + line.trim();
  }
  return Object.entries(sections)
    .filter(([k, v]) => v)
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join(" | ");
}

// Normalize various incoming alert shapes into a consistent alert object
export function normalizeAlert(raw) {
  if (!raw) return null;

  // If it's already a GeoJSON Feature
  if (raw.type === "Feature" && raw.properties) {
    const props = raw.properties;
    const id =
      raw.id ||
      props.id ||
      props.eventId ||
      props._id ||
      props.VTEC ||
      props.vtec ||
      null;
    const normalized = {
      id: id || String(props.id || props.eventId || props._id || Date.now()),
      properties: props,
      geometry: raw.geometry || null,
      rawText: props.rawText || props.description || props.detail || "",
    };
    if (props.vtec) normalized.vtec = parseVTEC(props.vtec);
    return normalized;
  }

  // If it's already in 'properties' shape
  if (raw.properties) {
    const props = raw.properties;
    const id =
      raw.id ||
      props.id ||
      props.eventId ||
      props._id ||
      props.VTEC ||
      props.vtec ||
      null;
    const normalized = {
      id: id || String(props.id || props.eventId || props._id || Date.now()),
      properties: props,
      geometry: raw.geometry || props.geometry || null,
      rawText: props.rawText || props.description || props.detail || "",
    };
    if (props.vtec) normalized.vtec = parseVTEC(props.vtec);
    return normalized;
  }

  // Fallback: raw is likely already a flat alert object
  const props = raw;
  const id = raw.id || raw.eventId || raw._id || raw.VTEC || raw.vtec || null;
  const normalized = {
    id: id || String(raw.id || raw.eventId || raw._id || Date.now()),
    properties: props,
    geometry: raw.geometry || null,
    rawText: props.rawText || props.description || props.detail || "",
  };
  if (props.vtec) normalized.vtec = parseVTEC(props.vtec);
  return normalized;
}
