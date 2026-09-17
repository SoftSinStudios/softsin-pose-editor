const clean = value => String(value || "").trim().replace(/\s+/g, " ");
const cleanBlock = value => String(value || "").trim();

function sentence(value) {
  const text = clean(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function sectionInstruction(section) {
  const parts = [
    clean(section.direction),
    section.energy ? `${clean(section.energy)} energy` : "",
    clean(section.vocal),
    clean(section.instruments),
    clean(section.arrangement),
    clean(section.mix)
  ].filter(Boolean);
  return parts.join("; ");
}

export function compileProject(project) {
  const global = project.global || {};
  const styleParts = [global.identity, global.pulse, global.players, global.performance, global.arc, global.mix]
    .map(sentence)
    .filter(Boolean);
  const style = styleParts.join(" ");

  const lyrics = (project.sections || []).map(section => {
    const instruction = sectionInstruction(section);
    const header = instruction ? `[${clean(section.name)} - ${instruction}]` : `[${clean(section.name)}]`;
    const body = cleanBlock(section.lyrics);
    const exclusion = clean(section.exclude);
    return [header, body, exclusion ? `[Exclude: ${exclusion}]` : ""].filter(Boolean).join("\n");
  }).join("\n\n");

  const exclude = clean(global.constraints);
  const title = clean(project.title) || "Untitled Song";
  const packageText = [
    `TITLE:\n${title}`,
    `MODEL PROFILE:\n${project.model || "v6"}`,
    `STYLE:\n${style || "Add creative direction before export."}`,
    exclude ? `EXCLUDE:\n${exclude}` : "",
    `LYRICS AND STRUCTURE:\n${lyrics || "Add at least one song section before export."}`
  ].filter(Boolean).join("\n\n");

  return { title, style, lyrics, exclude, packageText };
}

export function diagnoseProject(project) {
  const issues = [];
  const global = project.global || {};
  const sections = project.sections || [];
  const combined = Object.values(global).join(" ");

  if (!clean(global.identity)) issues.push({ level: "warning", text: "Add one clear primary musical identity." });
  if (!clean(global.pulse)) issues.push({ level: "note", text: "Describe how time feels, not only an exact BPM." });
  if (!sections.length) issues.push({ level: "warning", text: "The song needs at least one user-defined section." });
  if (sections.length && !sections.some(section => cleanBlock(section.lyrics))) issues.push({ level: "note", text: "No lyrics are present. This is valid for an instrumental, but verify that it is intentional." });

  const artistPattern = /\b(?:in the style of|sounds? like|sing like|voice of|imitat(?:e|ing)|exactly like)\b/i;
  if (artistPattern.test(combined)) issues.push({ level: "error", text: "Remove artist-imitation language and describe the musical attributes directly." });

  const genres = clean(global.identity).split(/[,/+]/).map(item => item.trim()).filter(Boolean);
  if (genres.length > 3) issues.push({ level: "warning", text: "The identity contains several competing styles. Establish one primary identity and assign supporting styles specific jobs." });

  const instrumentItems = clean(global.players).split(/[,;]/).filter(Boolean);
  if (instrumentItems.length > 5 && !/\b(carr(?:y|ies)|plays?|provides?|supports?|enters?|drives?|answers?|holds?|builds?)\b/i.test(global.players || "")) {
    issues.push({ level: "warning", text: "The players field reads like an inventory. Give the important instruments specific musical roles." });
  }

  if (clean(global.constraints).split(/[,;]/).filter(Boolean).length > 6) issues.push({ level: "warning", text: "The exclusion list is crowded. Keep only failures that materially damage the result." });
  if (/\b(?:at \d+:\d+|exactly \d+ bars?|guarantee|must be exactly)\b/i.test(combined)) issues.push({ level: "note", text: "Exact timing and bar counts are soft conditioning in V6, not deterministic DAW commands." });

  sections.forEach((section, index) => {
    const detail = [section.direction, section.vocal, section.instruments, section.arrangement, section.mix].filter(Boolean).join(" ");
    if (detail.length > 700) issues.push({ level: "warning", text: `${section.name || `Section ${index + 1}`} is over-specified. Keep only the behaviors that define the section.` });
    if (/\b(?:whisper|breathy)\b/i.test(detail) && /\b(?:belt|shout|scream)\b/i.test(detail) && !/then|before|after|only|into/i.test(detail)) {
      issues.push({ level: "warning", text: `${section.name || `Section ${index + 1}`} contains conflicting vocal behaviors without explaining when each occurs.` });
    }
  });

  if (!issues.length) issues.push({ level: "good", text: "The brief is focused and ready for controlled V6 testing." });
  return issues;
}
