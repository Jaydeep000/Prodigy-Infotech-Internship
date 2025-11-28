// script.js
(() => {
  "use strict";

  /**
   * Local storage keys
   */
  const STORAGE_KEY_STATE = "hpStopwatchState_v1";
  const STORAGE_KEY_SOUND = "hpStopwatchSound_v1";

  /**
   * DOM elements
   */
  const timerDisplay = document.getElementById("timerDisplay");
  const timerStatus = document.getElementById("timerStatus");
  const startStopBtn = document.getElementById("startStopBtn");
  const lapBtn = document.getElementById("lapBtn");
  const resetBtn = document.getElementById("resetBtn");
  const soundToggleBtn = document.getElementById("soundToggleBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const copyTableBtn = document.getElementById("copyTableBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const clearLapsBtn = document.getElementById("clearLapsBtn");
  const lapsBody = document.getElementById("lapsBody");

  if (
    !timerDisplay ||
    !timerStatus ||
    !startStopBtn ||
    !lapBtn ||
    !resetBtn ||
    !soundToggleBtn ||
    !exportCsvBtn ||
    !copyTableBtn ||
    !downloadTxtBtn ||
    !clearLapsBtn ||
    !lapsBody
  ) {
    // If essential elements are missing, avoid errors and abort initialization.
    console.warn("Stopwatch: Required DOM elements not found.");
    return;
  }

  /**
   * Internal state
   */
  let isRunning = false;
  let startTimestamp = 0; // performance.now() when started
  let accumulated = 0; // milliseconds already elapsed before current run
  let animationFrameId = null;
  let laps = []; // array of { id, lapTimeMs, totalTimeMs }
  let soundEnabled = false;

  /**
   * Simple beep using Web Audio API when available
   */
  function playBeep() {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.12
      );

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.13);

      oscillator.onended = () => ctx.close();
    } catch (err) {
      // Fallback silently if audio fails.
      console.error("Stopwatch: Unable to play sound", err);
    }
  }

  /**
   * Formatting helper: ms -> HH:MM:SS.mmm or MM:SS.mmm
   */
  function formatTime(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millis = totalMs % 1000;

    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    const mmm = String(millis).padStart(3, "0");

    if (hours > 0) {
      const hh = String(hours).padStart(2, "0");
      return `${hh}:${mm}:${ss}.${mmm}`;
    }
    return `${mm}:${ss}.${mmm}`;
  }

  /**
   * Compute current elapsed time based on high-resolution clock.
   */
  function getElapsedMs() {
    if (!isRunning) return accumulated;
    return accumulated + (performance.now() - startTimestamp);
  }

  /**
   * UI: update timer display text
   */
  function updateTimerDisplay() {
    const elapsed = getElapsedMs();
    timerDisplay.textContent = formatTime(elapsed);
  }

  /**
   * Animation loop for display refresh, using performance.now(). [web:1][web:2]
   */
  function animationLoop() {
    updateTimerDisplay();
    if (isRunning) {
      animationFrameId = window.requestAnimationFrame(animationLoop);
    }
  }

  /**
   * Persist stopwatch state and laps in localStorage.
   */
  function persistState() {
    try {
      const state = {
        isRunning,
        accumulated,
        lastSaveTimestamp: performance.now(),
        laps,
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    } catch (err) {
      console.warn("Stopwatch: Unable to persist state", err);
    }
  }

  /**
   * Restore state from localStorage, if available.
   */
  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      accumulated = typeof parsed.accumulated === "number" ? parsed.accumulated : 0;
      laps = Array.isArray(parsed.laps) ? parsed.laps : [];

      // If stopwatch was running, resume from last save timestamp.
      if (parsed.isRunning && typeof parsed.lastSaveTimestamp === "number") {
        const now = performance.now();
        const delta = now - parsed.lastSaveTimestamp;
        accumulated += Math.max(0, delta);
        startTimestamp = now;
        isRunning = true;
        startAnimation();
      }

      renderLaps();
      updateTimerDisplay();
      updateControls();
    } catch (err) {
      console.warn("Stopwatch: Unable to restore state", err);
    }
  }

  /**
   * Persist and restore sound preference.
   */
  function loadSoundPreference() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SOUND);
      if (!raw) return;
      const value = raw === "true";
      soundEnabled = value;
    } catch (err) {
      console.warn("Stopwatch: Unable to load sound preference", err);
    }
  }

  function saveSoundPreference() {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, String(soundEnabled));
    } catch (err) {
      console.warn("Stopwatch: Unable to save sound preference", err);
    }
  }

  /**
   * Start animation if not already running.
   */
  function startAnimation() {
    if (animationFrameId != null) return;
    animationFrameId = window.requestAnimationFrame(animationLoop);
  }

  function stopAnimation() {
    if (animationFrameId != null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Start the stopwatch.
   */
  function startStopwatch() {
    if (isRunning) return;
    isRunning = true;
    startTimestamp = performance.now();
    timerStatus.textContent = "Running";
    timerStatus.dataset.state = "running";
    startStopBtn.textContent = "Stop";
    startStopBtn.classList.add("stop-state");
    startStopBtn.setAttribute("aria-pressed", "true");
    startAnimation();
    updateControls();
    persistState();
  }

  /**
   * Stop the stopwatch.
   */
  function stopStopwatch() {
    if (!isRunning) return;
    accumulated = getElapsedMs();
    isRunning = false;
    timerStatus.textContent = "Stopped";
    timerStatus.dataset.state = "stopped";
    startStopBtn.textContent = "Start";
    startStopBtn.classList.remove("stop-state");
    startStopBtn.setAttribute("aria-pressed", "false");
    stopAnimation();
    updateTimerDisplay();
    updateControls();
    persistState();
  }

  /**
   * Toggle start/stop.
   */
  function toggleStartStop() {
    if (isRunning) {
      stopStopwatch();
    } else {
      startStopwatch();
    }
  }

  /**
   * Reset stopwatch and clear time; only when stopped.
   */
  function resetStopwatch() {
    if (isRunning) return;
    accumulated = 0;
    updateTimerDisplay();
    persistState();
  }

  /**
   * Add a lap at current elapsed time.
   */
  function addLap() {
    const total = getElapsedMs();
    if (total <= 0) return;

    const previousTotal =
      laps.length > 0 ? laps[laps.length - 1].totalTimeMs : 0;
    const split = total - previousTotal;

    const lap = {
      id: Date.now() + "_" + Math.random().toString(36).slice(2),
      lapTimeMs: split,
      totalTimeMs: total,
    };
    laps.push(lap);
    renderLaps();
    persistState();
    playBeep();
  }

  /**
   * Delete lap by id.
   */
  function deleteLap(id) {
    const idx = laps.findIndex((lap) => lap.id === id);
    if (idx === -1) return;
    laps.splice(idx, 1);
    renderLaps();
    persistState();
  }

  /**
   * Clear all laps.
   */
  function clearAllLaps() {
    laps = [];
    renderLaps();
    persistState();
  }

  /**
   * Compute fastest and slowest lap indices (based on lapTimeMs).
   * Returns { fastestIndex, slowestIndex } or nulls if unavailable.
   */
  function getFastestSlowestIndices() {
    if (laps.length < 2) {
      return { fastestIndex: null, slowestIndex: null };
    }
    let fastestIndex = 0;
    let slowestIndex = 0;
    let fastest = laps[0].lapTimeMs;
    let slowest = laps[0].lapTimeMs;
    laps.forEach((lap, index) => {
      if (lap.lapTimeMs < fastest) {
        fastest = lap.lapTimeMs;
        fastestIndex = index;
      }
      if (lap.lapTimeMs > slowest) {
        slowest = lap.lapTimeMs;
        slowestIndex = index;
      }
    });
    return { fastestIndex, slowestIndex };
  }

  /**
   * Render laps table body and highlight fastest/slowest laps.
   */
  function renderLaps() {
    lapsBody.innerHTML = "";
    if (laps.length === 0) return;

    const { fastestIndex, slowestIndex } = getFastestSlowestIndices();

    laps.forEach((lap, index) => {
      const tr = document.createElement("tr");

      if (index === fastestIndex) {
        tr.classList.add("lap-fastest");
      } else if (index === slowestIndex) {
        tr.classList.add("lap-slowest");
      }

      const indexTd = document.createElement("td");
      indexTd.className = "lap-index";
      indexTd.textContent = String(index + 1);

      const lapTimeTd = document.createElement("td");
      lapTimeTd.className = "lap-time";
      lapTimeTd.textContent = formatTime(lap.lapTimeMs);

      const splitTd = document.createElement("td");
      splitTd.className = "lap-split";
      const prevTotal =
        index > 0 ? laps[index - 1].totalTimeMs : 0;
      const splitMs = lap.totalTimeMs - prevTotal;
      splitTd.textContent = formatTime(splitMs);

      const actionsTd = document.createElement("td");
      actionsTd.className = "lap-actions";
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-small";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteLap(lap.id));
      actionsTd.appendChild(delBtn);

      tr.appendChild(indexTd);
      tr.appendChild(lapTimeTd);
      tr.appendChild(splitTd);
      tr.appendChild(actionsTd);

      lapsBody.appendChild(tr);
    });
  }

  /**
   * Update controls' disabled state and labels.
   */
  function updateControls() {
    resetBtn.disabled = isRunning || accumulated === 0;
    lapBtn.disabled = !isRunning && accumulated === 0;
    clearLapsBtn.disabled = laps.length === 0;
    exportCsvBtn.disabled = laps.length === 0;
    copyTableBtn.disabled = laps.length === 0;
    downloadTxtBtn.disabled = laps.length === 0;

    soundToggleBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
    soundToggleBtn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
  }

  /**
   * Toggle sound on/off.
   */
  function toggleSound() {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    updateControls();
  }

  /**
   * Export laps to CSV via Blob/download.
   */
  function exportLapsAsCsv() {
    if (!laps.length) return;

    const header = ["Index", "Lap Time", "Total Time"];
    const rows = laps.map((lap, i) => [
      i + 1,
      formatTime(lap.lapTimeMs),
      formatTime(lap.totalTimeMs),
    ]);

    const csvLines = [header, ...rows].map((cols) =>
      cols
        .map((value) => {
          const str = String(value);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    );
    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const date = new Date();
    const timestamp =
      date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.download = `stopwatch-laps-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy lap table to clipboard, falling back if Clipboard API is unavailable. [web:12][web:20]
   */
  function copyLapTableToClipboard() {
    if (!laps.length) return;

    let text = "Index\tLap Time\tTotal Time\n";
    laps.forEach((lap, i) => {
      text +=
        `${i + 1}\t${formatTime(lap.lapTimeMs)}\t${formatTime(
          lap.totalTimeMs
        )}\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // Optional: toast could be added here.
        })
        .catch((err) => {
          console.warn("Stopwatch: Clipboard writeText failed", err);
          legacyCopyFallback(text);
        });
    } else {
      legacyCopyFallback(text);
    }
  }

  /**
   * Fallback copy method using a hidden textarea.
   */
  function legacyCopyFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.warn("Stopwatch: execCommand copy failed", err);
    }
    document.body.removeChild(textarea);
  }

  /**
   * Download laps as plain text.
   */
  function downloadLapsAsText() {
    if (!laps.length) return;

    let lines = [];
    lines.push("Stopwatch Laps");
    lines.push("----------------");
    laps.forEach((lap, i) => {
      const index = i + 1;
      const lapTime = formatTime(lap.lapTimeMs);
      const totalTime = formatTime(lap.totalTimeMs);
      lines.push(`#${index}: Lap ${lapTime} | Total ${totalTime}`);
    });
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const date = new Date();
    const timestamp =
      date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.download = `stopwatch-laps-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Global keyboard shortcuts for core functionality.
   * Space = start/stop, L = lap, R = reset, S = sound, E = export CSV.
   */
  function handleKeydown(e) {
    // Skip if focused element is an input or textarea.
    const target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === " " || key === "spacebar") {
      e.preventDefault();
      toggleStartStop();
    } else if (key === "l") {
      e.preventDefault();
      addLap();
    } else if (key === "r") {
      e.preventDefault();
      resetStopwatch();
    } else if (key === "s") {
      e.preventDefault();
      toggleSound();
    } else if (key === "e") {
      e.preventDefault();
      exportLapsAsCsv();
    }
  }

  /**
   * Wire up event listeners.
   */
  function attachEventListeners() {
    startStopBtn.addEventListener("click", toggleStartStop);
    lapBtn.addEventListener("click", addLap);
    resetBtn.addEventListener("click", resetStopwatch);
    soundToggleBtn.addEventListener("click", toggleSound);
    exportCsvBtn.addEventListener("click", exportLapsAsCsv);
    copyTableBtn.addEventListener("click", copyLapTableToClipboard);
    downloadTxtBtn.addEventListener("click", downloadLapsAsText);
    clearLapsBtn.addEventListener("click", clearAllLaps);

    window.addEventListener("beforeunload", persistState);
    document.addEventListener("keydown", handleKeydown);
  }

  /**
   * Initial bootstrapping.
   */
  function init() {
    loadSoundPreference();
    updateControls();
    restoreState();

    // Make sure status text is consistent after restore.
    if (isRunning) {
      timerStatus.textContent = "Running";
      timerStatus.dataset.state = "running";
      startStopBtn.textContent = "Stop";
      startStopBtn.classList.add("stop-state");
      startStopBtn.setAttribute("aria-pressed", "true");
    } else {
      timerStatus.textContent = "Stopped";
      timerStatus.dataset.state = "stopped";
      startStopBtn.textContent = "Start";
      startStopBtn.classList.remove("stop-state");
      startStopBtn.setAttribute("aria-pressed", "false");
    }

    attachEventListeners();
    updateTimerDisplay();
  }

  // Initialize after DOM is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
