const RECENT_KEY = 'sonora-recent-searches';
const MAX_RECENT = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentSearches(terms: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)));
}

export function addRecentSearch(term: string) {
  const prev = loadRecentSearches().filter(t => t !== term);
  saveRecentSearches([term, ...prev]);
}

export function removeRecentSearch(term: string) {
  saveRecentSearches(loadRecentSearches().filter(t => t !== term));
}
