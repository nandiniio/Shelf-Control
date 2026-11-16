// Shelf Control Initial Seed Data and LocalStorage Manager

// Dynamic Date helper for mock logs (keeps logs within current month)
const getPastDateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Default lists (now with Emojis and Abandoned)
const DEFAULT_LISTS = [
  { id: 'currently-reading', title: '📖 Currently Reading', color: 'blue', isSystem: true },
  { id: 'want-to-read', title: '⏳ Want to Read', color: 'yellow', isSystem: true },
  { id: 'completed', title: '✅ Completed', color: 'green', isSystem: true },
  { id: 'abandoned', title: '🛑 Abandoned', color: 'peach', isSystem: true },
  { id: 'favorites', title: '❤️ Favorites', color: 'pink', isSystem: false },
  { id: 'summer-reads', title: '☀️ Summer Reads', color: 'purple', isSystem: false }
];

// Default books seed (Now with Open Library covers, readingLogs, quotes, notes)
const DEFAULT_BOOKS = [
  {
    id: 'book-tomorrow',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    description: 'Two friends—often in love, but never lovers—become creative partners in a dazzling and intricately imagined world of video game design.',
    pages: 416,
    currentPage: 182,
    rating: 5,
    lists: ['currently-reading', 'favorites'],
    color: 'pink',
    genre: 'Fiction',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593465066-M.jpg',
    dateAdded: new Date().toISOString(),
    readingLogs: [
      { date: getPastDateStr(4), pagesLogged: 35 },
      { date: getPastDateStr(3), pagesLogged: 42 },
      { date: getPastDateStr(2), pagesLogged: 20 },
      { date: getPastDateStr(1), pagesLogged: 50 },
      { date: getPastDateStr(0), pagesLogged: 35 }
    ],
    quotes: [
      { text: "To allow yourself to play with another person is no small risk.", dateAdded: new Date().toISOString() }
    ],
    notes: "I love the game development settings! Sam and Sadie are complex characters."
  },
  {
    id: 'book-atomic',
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'No matter your goals, Atomic Habits offers a proven framework for improving—every day. James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.',
    pages: 320,
    currentPage: 320,
    rating: 4,
    lists: ['completed'],
    color: 'yellow',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg',
    genre: 'Self-Improvement',
    dateAdded: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateCompleted: new Date().toISOString(),
    readingLogs: [
      { date: getPastDateStr(15), pagesLogged: 50 },
      { date: getPastDateStr(12), pagesLogged: 80 },
      { date: getPastDateStr(10), pagesLogged: 40 },
      { date: getPastDateStr(8), pagesLogged: 60 },
      { date: getPastDateStr(5), pagesLogged: 90 }
    ],
    quotes: [
      { text: "You do not rise to the level of your goals. You fall to the level of your systems.", dateAdded: new Date().toISOString() }
    ],
    notes: "Very actionable. Designing systems is much better than dreaming about goals."
  },
  {
    id: 'book-dune',
    title: 'Dune',
    author: 'Frank Herbert',
    description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
    pages: 604,
    currentPage: 0,
    rating: 0,
    lists: ['want-to-read'],
    color: 'peach',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg',
    genre: 'Sci-Fi',
    dateAdded: new Date().toISOString(),
    readingLogs: [],
    quotes: [],
    notes: ""
  },
  {
    id: 'book-midnight',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    description: 'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.',
    pages: 304,
    currentPage: 120,
    rating: 0,
    lists: ['currently-reading', 'summer-reads'],
    color: 'blue',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780525559474-M.jpg',
    genre: 'Fiction',
    dateAdded: new Date().toISOString(),
    readingLogs: [
      { date: getPastDateStr(3), pagesLogged: 20 },
      { date: getPastDateStr(2), pagesLogged: 40 },
      { date: getPastDateStr(1), pagesLogged: 60 }
    ],
    quotes: [
      { text: "You don't have to understand life, you just have to live it.", dateAdded: new Date().toISOString() }
    ],
    notes: "Nora's journey is fascinating but a bit melancholic."
  },
  {
    id: 'book-educated',
    title: 'Educated',
    author: 'Tara Westover',
    description: 'An unforgettable memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.',
    pages: 352,
    currentPage: 352,
    rating: 5,
    lists: ['completed', 'favorites'],
    color: 'purple',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780399590504-M.jpg',
    genre: 'Biographies',
    dateAdded: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    dateCompleted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    readingLogs: [
      { date: getPastDateStr(25), pagesLogged: 100 },
      { date: getPastDateStr(24), pagesLogged: 100 },
      { date: getPastDateStr(23), pagesLogged: 152 }
    ],
    quotes: [
      { text: "My life was narrated for me by others. Their voices were forceful, emphatic, absolute. It had never occurred to me that my voice might be as strong as theirs.", dateAdded: new Date().toISOString() }
    ],
    notes: "A breathtaking memoir about independence and education."
  },
  {
    id: 'book-hail-mary',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    description: 'Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity and the earth. Only, right now, he doesn\'t know that. He can\'t even remember his own name.',
    pages: 476,
    currentPage: 0,
    lists: ['want-to-read', 'summer-reads'],
    color: 'green',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg',
    genre: 'Sci-Fi',
    rating: 0,
    dateAdded: new Date().toISOString(),
    readingLogs: [],
    quotes: [],
    notes: ""
  }
];

// Curator Literary Quotes Fallback List
export const FAMOUS_QUOTES = [
  { text: "A room without books is like a body without a soul.", author: "Cicero" },
  { text: "I have always imagined that Paradise will be a kind of library.", author: "Jorge Luis Borges" },
  { text: "So many books, so little time.", author: "Frank Zappa" },
  { text: "The reading of all good books is like a conversation with the finest minds of past centuries.", author: "René Descartes" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "We read to know we are not alone.", author: "C.S. Lewis" }
];

// Initialize and Retrieve State
export function initializeStorage(startWithSample = true) {
  if (!localStorage.getItem('shelf_control_lists')) {
    localStorage.setItem('shelf_control_lists', JSON.stringify(DEFAULT_LISTS));
  }
  if (!localStorage.getItem('shelf_control_books')) {
    const initialBooks = startWithSample ? DEFAULT_BOOKS : [];
    localStorage.setItem('shelf_control_books', JSON.stringify(initialBooks));
  }
}

export function getBooks() {
  if (!localStorage.getItem('shelf_control_books')) {
    initializeStorage(true);
  }
  return JSON.parse(localStorage.getItem('shelf_control_books'));
}

export function saveBooks(books) {
  localStorage.setItem('shelf_control_books', JSON.stringify(books));
}

export function getLists() {
  if (!localStorage.getItem('shelf_control_lists')) {
    initializeStorage(true);
  }
  return JSON.parse(localStorage.getItem('shelf_control_lists'));
}

export function saveLists(lists) {
  localStorage.setItem('shelf_control_lists', JSON.stringify(lists));
}

export function getUserProfile() {
  const profile = localStorage.getItem('shelf_control_profile');
  return profile ? JSON.parse(profile) : null;
}

export function saveUserProfile(profile) {
  localStorage.setItem('shelf_control_profile', JSON.stringify(profile));
}

export function clearAllData() {
  localStorage.removeItem('shelf_control_profile');
  localStorage.removeItem('shelf_control_books');
  localStorage.removeItem('shelf_control_lists');
  localStorage.removeItem('shelf_control_dark_mode');
}
