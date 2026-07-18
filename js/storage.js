// localStorage persistence for last-used setup choices (categories, hints
// toggle, timer, target score, team names). No custom categories in this
// version — see spec.md Non-goals.

import { CATEGORIES } from './words.js';

const SETTINGS_KEY = 'wscramble.settings.v1';
const USED_CARDS_KEY = 'wscramble.usedCardKeys.v1';

export const DEFAULT_SETTINGS = {
  categoryIds: CATEGORIES.map((c) => c.id),
  minWordLength: 5,
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
  const merged = {
    ...structuredClone(DEFAULT_SETTINGS),
    ...saved,
    teamNames: { ...DEFAULT_SETTINGS.teamNames, ...(saved.teamNames || {}) },
  };
  merged.minWordLength = Number.isInteger(merged.minWordLength)
    ? Math.max(3, Math.min(12, merged.minWordLength))
    : DEFAULT_SETTINGS.minWordLength;
  return merged;
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
}

export function cardKey(categoryId, entry) {
  return `${categoryId}::${entry.word}`;
}

export function loadUsedCardKeys() {
  const saved = read(USED_CARDS_KEY, []);
  if (!Array.isArray(saved)) return [];
  return saved.filter((key) => typeof key === 'string');
}

export function saveUsedCardKeys(keys) {
  write(USED_CARDS_KEY, [...new Set(keys)]);
}

export function markCardUsed(categoryId, card) {
  if (!categoryId || !card) return;
  const key = cardKey(categoryId, card);
  const used = loadUsedCardKeys();
  if (used.includes(key)) return;
  saveUsedCardKeys([...used, key]);
}

export function resetUsedCardKeys() {
  saveUsedCardKeys([]);
}

export function filterUnusedCategories(categoryPool, categoryIds, usedKeys = loadUsedCardKeys(), minWordLength = 0) {
  const selected = new Set(categoryIds);
  const used = new Set(usedKeys);
  return categoryPool.map((category) => {
    if (!selected.has(category.id)) return category;
    return {
      ...category,
      words: category.words.filter((entry) => entry.word.length >= minWordLength && !used.has(cardKey(category.id, entry))),
    };
  });
}

export function countCards(categoryPool, categoryIds, minWordLength = 0) {
  const selected = new Set(categoryIds);
  return categoryPool
    .filter((category) => selected.has(category.id))
    .reduce((total, category) => total + category.words.filter((entry) => entry.word.length >= minWordLength).length, 0);
}
