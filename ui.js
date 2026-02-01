import { AppState } from "./state.js";
import {
  getIconClassForEvent,
  darkenColor,
  formatExpirationTime,
} from "./utils.js";
import { getEventName } from "./alert-processing.js";

export function drawPolygon(points) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  const lats = points.map((p) => p[0]),
    lons = points.map((p) => p[1]);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats);
  const minLon = Math.min(...lons),
    maxLon = Math.max(...lons);
  const scale = Math.min(260 / (maxLon - minLon), 260 / (maxLat - minLat));

  function frame() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.beginPath();
    points.forEach(([lat, lon], i) => {
      const x = 20 + (lon - minLon) * scale;
      const y = 280 - (lat - minLat) * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    requestAnimationFrame(frame);
  }
  frame();
  return canvas;
}

export function showNotification(warning, type) {
  if (AppState.notificationsMuted) return;
  const name = getEventName(warning);
  const notif = document.createElement("div");
  notif.className = "notification-popup appear";
  notif.innerHTML = `
    <div class="notification-inner">
      <div class="notification-type-badge">${type}</div>
      <div class="notification-title">${name}</div>
      <div class="notification-message">COUNTIES: ${warning.properties.areaDesc}</div>
    </div>
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.classList.add("disappear");
    setTimeout(() => notif.remove(), 800);
  }, 10000);
}
