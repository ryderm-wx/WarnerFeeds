export const EVENT_FLUSH_MS = 150;
export const UI_THROTTLE_MS = 100;

export const AppState = {
  activeWarnings: [],
  previousWarnings: new Map(),
  notifiedWarnings: new Map(),
  selectedAlerts: new Set(),
  selectedStates: ["MI"],
  notificationsMuted: false,
  serverTimeOffset: 0,
  currentTimeZone: "ET",
  isSpcMode: false,
  currentWarningIndex: 0,
  currentCityIndex: 0,
  isCountiesCurrentlyScrolling: false,
  countiesScrollEndTime: 0,
  semicircleFollowEventType: true,
  semicircleCountCycleInterval: null,
  semicircleCountCycleMessages: [],
  semicircleCountCycleIndex: 0,
  lastFetchedData: new Map(),
  parserWorker: null,
  eventBuffer: [],
  eventFlushTimer: null,
  processingPaused: false,
  lastUiUpdate: 0,
};
