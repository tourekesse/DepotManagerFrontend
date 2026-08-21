import knowledgeBase from '../data/knowledge-base.json';

function normalize(text) {
  return text.toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ôö]/g, 'o')
    .replace(/[îï]/g, 'i')
    .replace(/[ç]/g, 'c')
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function tokenize(text) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function computeRelevance(queryTokens, entry) {
  const text = normalize(`${entry.question} ${entry.answer} ${entry.tags.join(' ')}`);
  const titleTokens = tokenize(entry.question);
  const tagTokens = entry.tags.map(normalize);

  let score = 0;

  for (const qt of queryTokens) {
    if (titleTokens.includes(qt)) score += 10;
    if (tagTokens.includes(qt)) score += 8;
    if (text.includes(qt)) score += 3;
  }

  const fullQuery = queryTokens.join(' ');
  const fullText = normalize(`${entry.question} ${entry.answer}`);

  if (fullText.includes(fullQuery)) score += 15;

  return score;
}

export function searchKnowledgeBase(query, maxResults = 5) {
  if (!query || query.trim().length < 2) return [];

  const queryTokens = tokenize(query);
  const results = knowledgeBase
    .map(entry => ({
      ...entry,
      score: computeRelevance(queryTokens, entry),
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}

export function getAllEntries() {
  return knowledgeBase;
}

export function getEntryById(id) {
  return knowledgeBase.find(entry => entry.id === id) || null;
}

export function getEntriesByCategory(category) {
  return knowledgeBase.filter(entry => entry.category === category);
}

export function getCategories() {
  return [...new Set(knowledgeBase.map(entry => entry.category))];
}

export default knowledgeBase;
