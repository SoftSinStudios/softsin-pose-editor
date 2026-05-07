const DEFAULT_EXCLUDE_LIMIT = 950;

const EXCLUDE_PRIORITY = [
  "post-grunge vocals",
  "butt rock",
  "macho grunts",
  "arena rock chorus",
  "glossy hard rock production",
  "huge vocal reverb",
  "washed-out vocals",
  "distant vocals",
  "echoing vocal delay",
  "ambient vocal wash",
  "wet vocal mix",
  "random growls",
  "harsh barking vocals",
  "gang shouts",
  "metalcore breakdowns",
  "djent guitar tone",
  "over-edited drums",
  "modern metalcore production",
  "screamed breakdown vocals",
  "bright pop chorus",
  "EDM drop",
  "glossy pop vocals",
  "dance-pop production",
  "cheerful radio hook",
  "soundalike imitation language",
  "clone artist vocals",
  "trailer music percussion",
  "massive orchestra"
];

function uniqueClean(parts) {
  return [...new Set(parts.map(part => String(part).trim()).filter(Boolean))];
}

function sortExcludes(parts) {
  const priority = new Map(EXCLUDE_PRIORITY.map((phrase, index) => [phrase, index]));

  return [...parts].sort((a, b) => {
    const aScore = priority.has(a) ? priority.get(a) : 999;
    const bScore = priority.has(b) ? priority.get(b) : 999;
    return aScore - bScore || a.localeCompare(b);
  });
}

function fitToLimit(parts, limit = DEFAULT_EXCLUDE_LIMIT) {
  const result = [];

  for (const part of parts) {
    const candidate = [...result, part].join(", ");
    if (candidate.length <= limit) {
      result.push(part);
    }
  }

  return result;
}

export function compilePrompt({ selectedItems, lyrics, customNotes, excludeLimit = DEFAULT_EXCLUDE_LIMIT }) {
  const promptParts = selectedItems.flatMap(item => item.prompt || []);
  const excludeParts = selectedItems.flatMap(item => item.exclude || []);

  if (customNotes.trim()) {
    promptParts.push(customNotes.trim());
  }

  if (lyrics.trim()) {
    promptParts.push("lyrics or vocal direction provided by user");
  }

  const compactExcludes = fitToLimit(sortExcludes(uniqueClean(excludeParts)), Number(excludeLimit) || DEFAULT_EXCLUDE_LIMIT);

  return {
    prompt: uniqueClean(promptParts).join(", "),
    exclude: compactExcludes.join(", ")
  };
}
