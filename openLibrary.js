// Open Library API helpers (no API key required)

const SEARCH_URL = 'https://openlibrary.org/search.json';
const WORKS_URL = 'https://openlibrary.org';

export const SEARCH_DEBOUNCE_MS = 350;

export function debounce(fn, delay = SEARCH_DEBOUNCE_MS) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getCoverUrl(doc) {
  if (doc.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }
  const isbn = doc.isbn && doc.isbn[0];
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  }
  return '';
}

export function extractDescription(description) {
  if (!description) return '';
  if (typeof description === 'string') return description;
  if (typeof description === 'object' && description.value) return description.value;
  return '';
}

export function getShortDescription(doc) {
  if (doc.first_sentence) {
    const sentence = Array.isArray(doc.first_sentence)
      ? doc.first_sentence[0]
      : doc.first_sentence;
    if (sentence) return sentence;
  }
  return 'No description available.';
}

export function mapSubjectsToGenre(subjects = []) {
  const raw = subjects.join(' ').toLowerCase();
  if (raw.includes('science fiction') || raw.includes('fantasy')) return 'Sci-Fi';
  if (raw.includes('self-help') || raw.includes('self help') || raw.includes('business')) return 'Self-Improvement';
  if (raw.includes('biograph') || raw.includes('memoir')) return 'Biographies';
  if (raw.includes('mystery') || raw.includes('thriller') || raw.includes('crime')) return 'Mystery';
  if (raw.includes('history')) return 'History';
  return 'Fiction';
}

export function normalizeSearchDoc(doc) {
  const workKey = doc.key || '';
  const workId = workKey.split('/').pop() || '';
  const authors = doc.author_name ? doc.author_name.join(', ') : 'Unknown Author';
  const isbn = doc.isbn ? doc.isbn[0] : '';
  const publishYear = doc.first_publish_year || null;

  return {
    id: `api-${workId}`,
    openLibraryKey: workKey,
    openLibraryWorkId: workId,
    title: doc.title || 'Unknown Title',
    author: authors,
    pages: doc.number_of_pages_median || 300,
    description: getShortDescription(doc),
    coverUrl: getCoverUrl(doc),
    genre: mapSubjectsToGenre(doc.subject || []),
    isbn,
    publishDate: publishYear ? String(publishYear) : 'Unknown',
    color: getRandomPastelColor(),
    isApiPreview: true,
    rating: 0,
    currentPage: 0,
    lists: ['want-to-read'],
    readingLogs: [],
    quotes: [],
    notes: ''
  };
}

function getRandomPastelColor() {
  const colors = ['blue', 'pink', 'yellow', 'green', 'purple', 'peach'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function searchOpenLibrary(query, limit = 10) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: 'key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median,first_sentence,isbn'
  });

  const response = await fetch(`${SEARCH_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Open Library search failed (${response.status})`);
  }

  const data = await response.json();
  return (data.docs || []).map(normalizeSearchDoc);
}

export async function fetchWorkDetails(workKey) {
  const key = workKey.startsWith('/') ? workKey : `/works/${workKey}`;
  const response = await fetch(`${WORKS_URL}${key}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load book details (${response.status})`);
  }
  return response.json();
}

export async function enrichBookWithDetails(book) {
  if (!book.openLibraryKey && !book.openLibraryWorkId) return book;

  try {
    const key = book.openLibraryKey || `/works/${book.openLibraryWorkId}`;
    const work = await fetchWorkDetails(key);
    const fullDescription = extractDescription(work.description);

    return {
      ...book,
      description: fullDescription || book.description,
      publishDate: book.publishDate !== 'Unknown'
        ? book.publishDate
        : (work.first_publish_date ? work.first_publish_date.split('-')[0] : 'Unknown')
    };
  } catch {
    return book;
  }
}
