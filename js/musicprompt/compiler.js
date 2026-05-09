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

function normalizeBpm(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  return /bpm/i.test(clean) ? clean.replace(/\s+/g, " ") : `${clean} BPM`;
}

export function compilePrompt({
  selectedItems,
  lyrics,
  sectionDetail,
  customNotes,
  bpm,
  excludeLimit = DEFAULT_EXCLUDE_LIMIT
}) {
  const promptParts = [];
  const tempo = normalizeBpm(bpm);

  selectedItems.forEach(item => {
    if (item.prompt?.length) {
      promptParts.push(...item.prompt);
    }
  });

  if (tempo) {
    const genreIndex = selectedItems.findIndex(item => item.category === "metal" || item.id?.includes("metal"));
    const insertAt = genreIndex >= 0 ? 1 : Math.min(1, promptParts.length);
    promptParts.splice(insertAt, 0, tempo);
  }

  if (sectionDetail.trim()) {
    promptParts.push(sectionDetail.trim());
  }

  if (customNotes.trim()) {
    promptParts.push(customNotes.trim());
  }

  if (lyrics.trim()) {
    promptParts.push("lyrics or vocal direction provided by user");
  }

  const excludeParts = selectedItems.flatMap(item => item.exclude || []);
  const compactExcludes = fitToLimit(sortExcludes(uniqueClean(excludeParts)), Number(excludeLimit) || DEFAULT_EXCLUDE_LIMIT);

  return {
    prompt: uniqueClean(promptParts).join(", "),
    exclude: compactExcludes.join(", ")
  };
}
