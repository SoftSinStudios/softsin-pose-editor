const DATA_FILES = {
  genres: "data/musicprompt/genres.json",
  references: "data/musicprompt/references.json",
  moods: "data/musicprompt/moods.json",
  vocals: "data/musicprompt/vocals.json",
  vocalSpace: "data/musicprompt/vocalSpace.json",
  instruments: "data/musicprompt/instruments.json",
  production: "data/musicprompt/production.json",
  structures: "data/musicprompt/structures.json",
  exclusions: "data/musicprompt/exclusions.json",
  conflicts: "data/musicprompt/conflicts.json",
  helpers: "data/musicprompt/helpers.json",
  presets: "data/musicprompt/presets.json",
  riskProfiles: "data/musicprompt/riskProfiles.json"
};

export async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }
      return [key, await response.json()];
    })
  );

  return Object.fromEntries(entries);
}
