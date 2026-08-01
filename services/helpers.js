const WORDS_PER_MINUTE = 200;

function estimateReadingTime(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function parseTags(rawTags) {
  return (rawTags || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 8);
}

module.exports = { estimateReadingTime, parseTags };
