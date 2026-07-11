// localStorage persistence for last-used setup choices (categories, hints
// toggle, timer, target score, team names). No custom categories in this
// version — see spec.md Non-goals.

import { CATEGORIES } from './words.js';

const SETTINGS_KEY = 'wscramble.settings.v1';

export const DEFAULT_SETTINGS = {
  categoryIds: CATEGORIES.map((c) => c.id),
  hintsEnabled: true,
  timerSeconds: 30, // 0/null = no timer
  targetScore: 0, // 0/null = no target — play through the whole deck
  teamNames: { a: 'Team A', b: 'Team B' },
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked — the game still works for this session
  }
}

export function loadSettings() {
  const saved = read(SETTINGS_KEY, null);
  if (!saved) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...saved,
    teamNames: { ...DEFAULT_SETTINGS.teamNames, ...(saved.teamNames || {}) },
  };
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
}
