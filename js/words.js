// Built-in word categories for Word Scramble.
// Each category: { id, name, words }
// Each word entry: { word, difficulty: 'easy'|'medium'|'hard' }
// Words are plain A-Z only, single words (no spaces/punctuation) — see
// spec.md Non-goals on multi-word phrases. Scrambling happens at deck-build
// time in js/game.js, not here — this file is content only.

export const CATEGORIES = [
  {
    id: 'animals',
    name: 'Animals',
    words: [
      // easy
      { word: 'LION', difficulty: 'easy' },
      { word: 'TIGER', difficulty: 'easy' },
      { word: 'ZEBRA', difficulty: 'easy' },
      { word: 'SHARK', difficulty: 'easy' },
      { word: 'EAGLE', difficulty: 'easy' },
      { word: 'OTTER', difficulty: 'easy' },
      { word: 'HORSE', difficulty: 'easy' },
      // medium
      { word: 'RABBIT', difficulty: 'medium' },
      { word: 'MONKEY', difficulty: 'medium' },
      { word: 'DOLPHIN', difficulty: 'medium' },
      { word: 'PANTHER', difficulty: 'medium' },
      { word: 'PENGUIN', difficulty: 'medium' },
      { word: 'GIRAFFE', difficulty: 'medium' },
      // hard
      { word: 'ELEPHANT', difficulty: 'hard' },
      { word: 'CROCODILE', difficulty: 'hard' },
      { word: 'KANGAROO', difficulty: 'hard' },
      { word: 'ORANGUTAN', difficulty: 'hard' },
      { word: 'CHIMPANZEE', difficulty: 'hard' },
    ],
  },
  {
    id: 'food-and-drinks',
    name: 'Food & Drinks',
    words: [
      // easy
      { word: 'PIZZA', difficulty: 'easy' },
      { word: 'BREAD', difficulty: 'easy' },
      { word: 'APPLE', difficulty: 'easy' },
      { word: 'GRAPE', difficulty: 'easy' },
      { word: 'HONEY', difficulty: 'easy' },
      { word: 'LEMON', difficulty: 'easy' },
      { word: 'PASTA', difficulty: 'easy' },
      // medium
      { word: 'BURGER', difficulty: 'medium' },
      { word: 'COFFEE', difficulty: 'medium' },
      { word: 'NOODLE', difficulty: 'medium' },
      { word: 'CARROT', difficulty: 'medium' },
      { word: 'BANANA', difficulty: 'medium' },
      { word: 'PANCAKE', difficulty: 'medium' },
      { word: 'AVOCADO', difficulty: 'medium' },
      // hard
      { word: 'SANDWICH', difficulty: 'hard' },
      { word: 'SPAGHETTI', difficulty: 'hard' },
      { word: 'CHOCOLATE', difficulty: 'hard' },
      { word: 'CASSEROLE', difficulty: 'hard' },
      { word: 'BLUEBERRY', difficulty: 'hard' },
    ],
  },
  {
    id: 'movies-and-shows',
    name: 'Movies & Shows',
    words: [
      // easy
      { word: 'SHREK', difficulty: 'easy' },
      { word: 'JOKER', difficulty: 'easy' },
      { word: 'MOANA', difficulty: 'easy' },
      { word: 'ALIEN', difficulty: 'easy' },
      { word: 'JAWS', difficulty: 'easy' },
      { word: 'ROCKY', difficulty: 'easy' },
      { word: 'BAMBI', difficulty: 'easy' },
      // medium
      { word: 'FROZEN', difficulty: 'medium' },
      { word: 'MATRIX', difficulty: 'medium' },
      { word: 'AVATAR', difficulty: 'medium' },
      { word: 'GREASE', difficulty: 'medium' },
      { word: 'TITANIC', difficulty: 'medium' },
      { word: 'JUMANJI', difficulty: 'medium' },
      // hard
      { word: 'ZOOTOPIA', difficulty: 'hard' },
      { word: 'INCEPTION', difficulty: 'hard' },
      { word: 'GLADIATOR', difficulty: 'hard' },
      { word: 'RATATOUILLE', difficulty: 'hard' },
      { word: 'INTERSTELLAR', difficulty: 'hard' },
    ],
  },
  {
    id: 'everyday-objects',
    name: 'Everyday Objects',
    words: [
      // easy
      { word: 'CHAIR', difficulty: 'easy' },
      { word: 'TABLE', difficulty: 'easy' },
      { word: 'PHONE', difficulty: 'easy' },
      { word: 'BRUSH', difficulty: 'easy' },
      { word: 'CLOCK', difficulty: 'easy' },
      { word: 'LAMP', difficulty: 'easy' },
      { word: 'SPOON', difficulty: 'easy' },
      // medium
      { word: 'PENCIL', difficulty: 'medium' },
      { word: 'MIRROR', difficulty: 'medium' },
      { word: 'BLANKET', difficulty: 'medium' },
      { word: 'WALLET', difficulty: 'medium' },
      { word: 'CAMERA', difficulty: 'medium' },
      // hard
      { word: 'BACKPACK', difficulty: 'hard' },
      { word: 'UMBRELLA', difficulty: 'hard' },
      { word: 'KEYBOARD', difficulty: 'hard' },
      { word: 'TOOTHBRUSH', difficulty: 'hard' },
      { word: 'REFRIGERATOR', difficulty: 'hard' },
    ],
  },
];
