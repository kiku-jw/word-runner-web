import type { Concept, ContentPack, Difficulty, Lesson } from "./types";

interface WordSeed {
  id: string;
  uk: string;
  en: string;
  glyph: string;
}

function defineLesson(
  id: string,
  title: string,
  subtitle: string,
  glyph: string,
  difficulty: Difficulty,
  words: readonly [WordSeed, WordSeed, WordSeed, WordSeed, WordSeed, WordSeed],
): { lesson: Lesson; concepts: Concept[] } {
  const conceptIds: Lesson["conceptIds"] = [
    words[0].id,
    words[1].id,
    words[2].id,
    words[3].id,
    words[4].id,
    words[5].id,
  ];
  return {
    lesson: { id, title, subtitle, glyph, difficulty, conceptIds },
    concepts: words.map((word) => ({
      id: word.id,
      source: { uk: word.uk },
      target: { en: word.en },
      glyph: word.glyph,
      category: id,
      difficulty,
      distractorIds: conceptIds.filter((conceptId) => conceptId !== word.id),
      reviewStatus: "prototype",
    })),
  };
}

const lessonGroups = [
  defineLesson("animals", "Тварини", "Собака, кіт та друзі", "🐾", 1, [
    { id: "dog", uk: "собака", en: "dog", glyph: "🐕" },
    { id: "cat", uk: "кіт", en: "cat", glyph: "🐈" },
    { id: "horse", uk: "кінь", en: "horse", glyph: "🐎" },
    { id: "cow", uk: "корова", en: "cow", glyph: "🐄" },
    { id: "pig", uk: "свиня", en: "pig", glyph: "🐖" },
    { id: "bird", uk: "птах", en: "bird", glyph: "🐦" },
  ]),
  defineLesson("food", "Їжа й напої", "Шість знайомих слів", "🍎", 1, [
    { id: "apple", uk: "яблуко", en: "apple", glyph: "🍎" },
    { id: "bread", uk: "хліб", en: "bread", glyph: "🍞" },
    { id: "milk", uk: "молоко", en: "milk", glyph: "🥛" },
    { id: "cheese", uk: "сир", en: "cheese", glyph: "🧀" },
    { id: "egg", uk: "яйце", en: "egg", glyph: "🥚" },
    { id: "water", uk: "вода", en: "water", glyph: "💧" },
  ]),
  defineLesson("transport", "Транспорт", "Від велосипеда до літака", "🚲", 1, [
    { id: "car", uk: "автомобіль", en: "car", glyph: "🚗" },
    { id: "bus", uk: "автобус", en: "bus", glyph: "🚌" },
    { id: "train", uk: "поїзд", en: "train", glyph: "🚆" },
    { id: "plane", uk: "літак", en: "plane", glyph: "✈️" },
    { id: "boat", uk: "човен", en: "boat", glyph: "⛵" },
    { id: "bicycle", uk: "велосипед", en: "bicycle", glyph: "🚲" },
  ]),
  defineLesson("nature", "Природа", "Сонце, річка та гори", "🌿", 1, [
    { id: "sun", uk: "сонце", en: "sun", glyph: "☀️" },
    { id: "moon", uk: "Місяць", en: "moon", glyph: "🌙" },
    { id: "tree", uk: "дерево", en: "tree", glyph: "🌳" },
    { id: "flower", uk: "квітка", en: "flower", glyph: "🌼" },
    { id: "river", uk: "річка", en: "river", glyph: "🌊" },
    { id: "mountain", uk: "гора", en: "mountain", glyph: "⛰️" },
  ]),
  defineLesson("medium-home", "Дім", "Кімнати й речі навколо", "🏠", 2, [
    { id: "kitchen", uk: "кухня", en: "kitchen", glyph: "🍳" },
    { id: "bedroom", uk: "спальня", en: "bedroom", glyph: "🛏️" },
    { id: "window", uk: "вікно", en: "window", glyph: "🪟" },
    { id: "mirror", uk: "дзеркало", en: "mirror", glyph: "🪞" },
    { id: "carpet", uk: "килим", en: "carpet", glyph: "🧶" },
    { id: "stairs", uk: "сходи", en: "stairs", glyph: "🪜" },
  ]),
  defineLesson("medium-school", "Школа", "Уроки, оцінки та перерви", "🎒", 2, [
    { id: "subject", uk: "предмет", en: "subject", glyph: "📚" },
    { id: "homework", uk: "домашнє завдання", en: "homework", glyph: "📝" },
    { id: "lesson", uk: "урок", en: "lesson", glyph: "👩‍🏫" },
    { id: "break", uk: "перерва", en: "break", glyph: "⏸️" },
    { id: "grade", uk: "оцінка", en: "grade", glyph: "💯" },
    { id: "notebook", uk: "зошит", en: "notebook", glyph: "📓" },
  ]),
  defineLesson("medium-body", "Тіло", "Точніші назви частин тіла", "🧍", 2, [
    { id: "shoulder", uk: "плече", en: "shoulder", glyph: "💪" },
    { id: "stomach", uk: "живіт", en: "stomach", glyph: "🩻" },
    { id: "throat", uk: "горло", en: "throat", glyph: "🗣️" },
    { id: "tooth", uk: "зуб", en: "tooth", glyph: "🦷" },
    { id: "knee", uk: "коліно", en: "knee", glyph: "🦵" },
    { id: "finger", uk: "палець", en: "finger", glyph: "☝️" },
  ]),
  defineLesson("medium-actions", "Дії", "Слова, які рухають речення", "⚙️", 2, [
    { id: "borrow", uk: "позичати", en: "borrow", glyph: "🤝" },
    { id: "choose", uk: "обирати", en: "choose", glyph: "👉" },
    { id: "explain", uk: "пояснювати", en: "explain", glyph: "💬" },
    { id: "remember", uk: "пам’ятати", en: "remember", glyph: "🧠" },
    { id: "arrive", uk: "прибувати", en: "arrive", glyph: "📍" },
    { id: "decide", uk: "вирішувати", en: "decide", glyph: "✅" },
  ]),
  defineLesson("hard-feelings", "Характер", "Почуття й риси людини", "🎭", 3, [
    { id: "curious", uk: "допитливий", en: "curious", glyph: "🔎" },
    { id: "nervous", uk: "нервовий", en: "nervous", glyph: "😬" },
    { id: "proud", uk: "гордий", en: "proud", glyph: "🦚" },
    { id: "jealous", uk: "заздрісний", en: "jealous", glyph: "💚" },
    { id: "patient", uk: "терплячий", en: "patient", glyph: "⏳" },
    { id: "honest", uk: "чесний", en: "honest", glyph: "🤲" },
  ]),
  defineLesson("hard-nature", "Дика природа", "Явища й місця", "🌩️", 3, [
    { id: "thunder", uk: "грім", en: "thunder", glyph: "🌩️" },
    { id: "lightning", uk: "блискавка", en: "lightning", glyph: "⚡" },
    { id: "waterfall", uk: "водоспад", en: "waterfall", glyph: "💦" },
    { id: "valley", uk: "долина", en: "valley", glyph: "🏞️" },
    { id: "island", uk: "острів", en: "island", glyph: "🏝️" },
    { id: "desert", uk: "пустеля", en: "desert", glyph: "🏜️" },
  ]),
  defineLesson("hard-actions", "Сильні дієслова", "Не найочевидніші дії", "🚀", 3, [
    { id: "whisper", uk: "шепотіти", en: "whisper", glyph: "🤫" },
    { id: "notice", uk: "помічати", en: "notice", glyph: "👀" },
    { id: "promise", uk: "обіцяти", en: "promise", glyph: "🤞" },
    { id: "improve", uk: "покращувати", en: "improve", glyph: "📈" },
    { id: "avoid", uk: "уникати", en: "avoid", glyph: "↩️" },
    { id: "deserve", uk: "заслуговувати", en: "deserve", glyph: "🏅" },
  ]),
  defineLesson("hard-tricky", "Слова-пастки", "Схоже написання — різний зміст", "🧩", 3, [
    { id: "quiet", uk: "тихий", en: "quiet", glyph: "🔇" },
    { id: "quite", uk: "доволі", en: "quite", glyph: "📏" },
    { id: "through", uk: "крізь", en: "through", glyph: "🚪" },
    { id: "thought", uk: "думка", en: "thought", glyph: "💭" },
    { id: "though", uk: "хоча", en: "though", glyph: "🔀" },
    { id: "tough", uk: "жорсткий", en: "tough", glyph: "🪨" },
  ]),
];

export const CONTENT_PACK: ContentPack = {
  schemaVersion: 1,
  id: "uk-en-starter",
  title: "Українська → English",
  sourceLocale: "uk",
  targetLocale: "en",
  concepts: lessonGroups.flatMap((group) => group.concepts),
  lessons: lessonGroups.map((group) => group.lesson),
};

export function conceptById(pack: ContentPack, id: string): Concept {
  const concept = pack.concepts.find((candidate) => candidate.id === id);
  if (!concept) {
    throw new Error(`Unknown concept: ${id}`);
  }
  return concept;
}
