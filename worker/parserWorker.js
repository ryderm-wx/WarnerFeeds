// Parser worker: parse incoming raw event.data strings off the main thread
self.onmessage = function (e) {
  const msg = e.data || {};
  const type = msg.type || "message";
  const raw = msg.raw || msg.data || null;

  try {
    if (raw === null || raw === undefined) {
      // nothing to do
      return;
    }

    // If already an object, forward it
    if (typeof raw === "object") {
      self.postMessage({ type, payload: raw });
      return;
    }

    // Attempt to parse JSON; if it's very large this runs off the main thread
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // Fallback: try to patch common non-JSON wrappers
      try {
        const cleaned = raw.replace(/^[\uFEFF\u0000-\u001F]+/, "");
        parsed = JSON.parse(cleaned);
      } catch (err2) {
        // Cannot parse; forward raw string
        self.postMessage({ type, payload: raw });
        return;
      }
    }

    self.postMessage({ type, payload: parsed });
  } catch (err) {
    // Ensure worker doesn't die silently
    self.postMessage({ type, payload: raw });
  }
};
