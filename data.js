// Shelf Control Initial Seed Data and LocalStorage Manager

// Default lists
const DEFAULT_LISTS = [
  { id: 'currently-reading', title: 'Currently Reading', color: 'blue', isSystem: true },
  { id: 'want-to-read', title: 'Want to Read', color: 'yellow', isSystem: true },
  { id: 'completed', title: 'Completed', color: 'green', isSystem: true },
  { id: 'favorites', title: 'Favorites ❤️', color: 'pink', isSystem: false },
  { id: 'summer-reads', title: 'Summer Reads ☀️', color: 'purple', isSystem: false }
];

// Default books seed (Now with Open Library covers)
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
    dateAdded: new Date().toISOString()
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
    dateCompleted: new Date().toISOString()
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
    dateAdded: new Date().toISOString()
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
    dateAdded: new Date().toISOString()
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
    dateCompleted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
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
    dateAdded: new Date().toISOString()
  }
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
  // Safe default load (with sample if not initialized)
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
}
