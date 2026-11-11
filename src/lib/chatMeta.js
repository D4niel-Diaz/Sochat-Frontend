import { DEFAULT_MATCH_PREFERENCES } from "../api/services/presenceService";

/**
 * UI-only chat metadata: topics, stranger nicknames and per-chat details that
 * the server doesn't send back (kept in sessionStorage so a reload keeps them).
 */

// `subject` is what the matcher compares; "General" matches every topic.
export const TOPICS = [
  { label: "Anything", subject: "General" },
  { label: "Exams & schoolwork", subject: "Exams & schoolwork" },
  { label: "Org life", subject: "Org life" },
  { label: "Feelings", subject: "Feelings" },
  { label: "Music", subject: "Music" },
  { label: "Games", subject: "Games" },
];

export const DEFAULT_TOPIC = TOPICS[0].subject;

export const topicLabel = (subject) =>
  TOPICS.find((t) => t.subject === subject)?.label ?? "Anything";

export const preferencesForTopic = (subject = DEFAULT_TOPIC) => ({
  ...DEFAULT_MATCH_PREFERENCES,
  subject,
});

const ADJECTIVES = [
  "Quiet", "Sleepy", "Brave", "Chill", "Sunny", "Curious",
  "Gentle", "Lucky", "Mellow", "Witty", "Calm", "Bright",
];
const NOUNS = [
  "Butanding", "Pili", "Bulusan", "Kasoy", "Sili", "Bangka",
  "Pandan", "Kalamansi", "Laing", "Bagoong", "Tarsier", "Niyog",
];

/** Stable random-looking nickname for a chat, e.g. "Quiet Butanding". */
export const nicknameFor = (seed) => {
  const n = Math.imul(Number(seed) || 0, 2654435761) >>> 0;
  return `${ADJECTIVES[n % ADJECTIVES.length]} ${NOUNS[(n >>> 8) % NOUNS.length]}`;
};

const TOPIC_KEY = "soTalk:topic";
const chatKey = (chatId) => `soTalk:chat:${chatId}`;

const read = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: fall back to defaults after a reload
  }
};

export const getStoredTopic = () => {
  const stored = read(TOPIC_KEY);
  return TOPICS.some((t) => t.subject === stored) ? stored : DEFAULT_TOPIC;
};
export const storeTopic = (subject) => write(TOPIC_KEY, subject);

/** When this tab first saw the chat, and which topic it searched with. */
export const getChatDetails = (chatId) => {
  if (!chatId) return null;
  const existing = read(chatKey(chatId));
  if (existing) return existing;
  const details = { matchedAt: new Date().toISOString(), topic: getStoredTopic() };
  write(chatKey(chatId), details);
  return details;
};
