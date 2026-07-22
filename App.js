import {
  FAMOUS_QUOTES
} from './data.js';
import {
  debounce,
  searchOpenLibrary,
  enrichBookWithDetails,
  SEARCH_DEBOUNCE_MS
} from './openLibrary.js';
import {
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  getDisplayName
} from './auth.js';
import {
  fetchLists,
  createList,
  renameList,
  deleteList,
  fetchSavedBooks,
  saveBookToList,
  removeSavedBook,
  removeSavedBookFromList,
  getListBookCounts,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowCounts,
  findUserByEmail,
  searchUsersByUsername,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  fetchPublicLists,
  updateListPublicStatus,
  updateBookCompletedAt,
  fetchCompletedBooksByYear
} from './database.js';

// Application State
let currentUser = null;
let books = [];
let lists = [];
let listBookCounts = {};
let profile = null;
let currentActiveView = 'home';
let selectedBookForDetail = null;
let currentListSubview = null;
let viewedUserProfile = null;
let darkMode = false;
let searchRequestId = 0;
let addBookSearchRequestId = 0;
let detailBookInitialListIds = new Set();
let detailListSaveInProgress = false;

// DOM Elements

const appContainer = document.getElementById('app-container');
const onboardingScreen = document.getElementById('onboarding-screen');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signupNameInput = document.getElementById('signup-name');
const authErrorEl = document.getElementById('auth-error');
const authTabSignin = document.getElementById('auth-tab-signin');
const authTabSignup = document.getElementById('auth-tab-signup');

const headerUsername = document.getElementById('header-username');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const sidebarNavbar = document.querySelector('.sidebar-navbar');
const navItems = document.querySelectorAll('.nav-item');
const appViews = document.querySelectorAll('.app-view');

// Modal / Sheet elements
const modalCreateList = document.getElementById('modal-create-list');
const sheetAddBook = document.getElementById('sheet-add-book');
const sheetBookDetail = document.getElementById('sheet-book-detail');
const modalShareShelf = document.getElementById('modal-share-shelf');
const modalRenameList = document.getElementById('modal-rename-list');

// Profile Settings Elements
const btnToggleSettings = document.getElementById('btn-toggle-settings');
const profileSettingsSection = document.getElementById('profile-settings-section');
const profileEditForm = document.getElementById('profile-edit-form');
const editProfileName = document.getElementById('edit-profile-name');
const editProfileGoal = document.getElementById('edit-profile-goal');
const editProfileGenre = document.getElementById('edit-profile-genre');
const btnCancelSettings = document.getElementById('btn-cancel-settings');

// Reminder settings triggers
const reminderToggle = document.getElementById('reminder-toggle');
const reminderTime = document.getElementById('reminder-time');

// Book Detail tabs
const tabButtons = document.querySelectorAll('.detail-tab-btn');
const tabPanels = document.querySelectorAll('.detail-tab-panel');

// Init application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function showAuthError(message) {
  authErrorEl.textContent = message;
  authErrorEl.classList.remove('hidden');
}

function hideAuthError() {
  authErrorEl.textContent = '';
  authErrorEl.classList.add('hidden');
}

function isAuthenticated() {
  return !!currentUser;
}

function requireAuth(actionLabel = 'do that') {
  if (isAuthenticated()) return true;
  showToast(`Please sign in to ${actionLabel}.`);
  showLoginScreen();
  return false;
}

function showLoginScreen() {
  onboardingScreen.classList.add('onboarding-active');
  onboardingScreen.classList.remove('onboarding-hidden');
  appContainer.classList.add('app-hidden');
  hideAuthError();
}

function showAppScreen() {
  onboardingScreen.classList.add('onboarding-hidden');
  onboardingScreen.classList.remove('onboarding-active');
  appContainer.classList.remove('app-hidden');
}

function getProfileStorageKey() {
  return currentUser ? `shelf_control_profile_${currentUser.id}` : 'shelf_control_profile';
}

function loadLocalProfile() {
  const stored = localStorage.getItem(getProfileStorageKey());
  if (stored) return JSON.parse(stored);

  return {
    name: getDisplayName(currentUser),
    annualGoal: 12,
    favoriteGenre: 'Fiction',
    streak: 0,
    lastReadDate: '',
    reminderEnabled: false,
    reminderTime: '20:00',
    lastReminderSentDate: ''
  };
}

function saveLocalProfile() {
  if (!profile) return;
  localStorage.setItem(getProfileStorageKey(), JSON.stringify(profile));
}

async function loadUserData() {
  if (!currentUser) return;

  profile = loadLocalProfile();
  profile.name = profile.name || getDisplayName(currentUser);

  const [listsResult, booksResult, countsResult] = await Promise.all([
    fetchLists(currentUser.id),
    fetchSavedBooks(currentUser.id),
    getListBookCounts(currentUser.id)
  ]);

  if (listsResult.error) showToast(listsResult.error);
  if (booksResult.error) showToast(booksResult.error);
  if (countsResult.error) showToast(countsResult.error);

  lists = listsResult.lists;
  books = booksResult.books;
  listBookCounts = countsResult.counts;

  if (lists.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const retry = await fetchLists(currentUser.id);
    if (!retry.error) lists = retry.lists;
  }

  updateHeader();
  renderActiveView();
  updateQuoteOfTheDay();
}

async function handleAuthenticatedUser(user) {
  currentUser = user;
  showAppScreen();
  await loadUserData();
}

async function initApp() {
  const savedDarkMode = localStorage.getItem('shelf_control_dark_mode') === 'true';
  setTheme(savedDarkMode);

  const { session, error } = await getSession();
  if (error) showToast(error);

  if (session?.user) {
    await handleAuthenticatedUser(session.user);
  } else {
    showLoginScreen();
  }

  onAuthStateChange(async (session) => {
    if (session?.user) {
      if (!currentUser || currentUser.id !== session.user.id) {
        await handleAuthenticatedUser(session.user);
      }
    } else {
      currentUser = null;
      lists = [];
      books = [];
      listBookCounts = {};
      profile = null;
      showLoginScreen();
    }
  });

  setupEventListeners();
  setupDragAndDrop();
  lucide.createIcons();
  setInterval(checkReadingReminders, 60000);
}

// THEME MANAGER
function setTheme(isDark) {
  darkMode = isDark;
  localStorage.setItem('shelf_control_dark_mode', darkMode);
  
  const icon = btnThemeToggle.querySelector('i');
  
  if (darkMode) {
    document.body.classList.add('dark-theme');
    if (icon) {
      icon.setAttribute('data-lucide', 'sun');
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (icon) {
      icon.setAttribute('data-lucide', 'moon');
    }
  }
  
  lucide.createIcons();
}

// DYNAMIC discover CATEGORIES RECOMMENDATIONS FETCH
async function fetchDiscoverRecommendations(genre) {
  const skeletons = document.getElementById('discover-skeletons');
  const grid = document.getElementById('discover-results-grid');
  
  skeletons.classList.remove('hidden');
  grid.classList.add('hidden');
  grid.innerHTML = '';
  
  try {
    let subject = 'fiction';
    if (genre === 'Sci-Fi') subject = 'science_fiction';
    if (genre === 'Self-Improvement') subject = 'self-help';
    if (genre === 'Biographies') subject = 'biography';
    if (genre === 'Mystery') subject = 'mystery';
    if (genre === 'History') subject = 'history';

    const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=10`);
    if (!response.ok) throw new Error('API failure');
    const data = await response.json();
    
    if (data.works && data.works.length > 0) {
      data.works.forEach(work => {
        const itemBook = {
          id: 'discover-' + work.key.split('/').pop(),
          title: work.title,
          author: work.authors && work.authors.length > 0 ? work.authors[0].name : 'Unknown Author',
          pages: 320,
          description: `A curated literary pick recommendation in ${genre} from Open Library.`,
          coverUrl: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg` : '',
          genre: genre,
          rating: (4.0 + Math.random() * 0.9).toFixed(1),
          color: getRandomPastelColor()
        };
        grid.appendChild(createDiscoverCard(itemBook));
      });
    } else {
      renderDiscoverFallback(genre);
    }
  } catch (error) {
    console.error('Discover API fetch failed, loading fallback:', error);
    renderDiscoverFallback(genre);
  } finally {
    skeletons.classList.add('hidden');
    grid.classList.remove('hidden');
    lucide.createIcons();
  }
}

// Offline fallback lists for Discover View
function renderDiscoverFallback(genre) {
  const grid = document.getElementById('discover-results-grid');
  grid.innerHTML = '';

  const fallbackData = {
    'Fiction': [
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', pages: 180, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg', color: 'pink' },
      { title: 'The Midnight Library', author: 'Matt Haig', pages: 304, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780525559474-M.jpg', color: 'blue' },
      { title: 'The Alchemist', author: 'Paulo Coelho', pages: 167, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780061122415-M.jpg', color: 'yellow' }
    ],
    'Sci-Fi': [
      { title: 'Dune', author: 'Frank Herbert', pages: 604, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg', color: 'peach' },
      { title: 'Project Hail Mary', author: 'Andy Weir', pages: 476, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg', color: 'green' },
      { title: 'Neuromancer', author: 'William Gibson', pages: 271, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441569595-M.jpg', color: 'purple' }
    ],
    'Self-Improvement': [
      { title: 'Atomic Habits', author: 'James Clear', pages: 320, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg', color: 'yellow' },
      { title: 'Deep Work', author: 'Cal Newport', pages: 304, coverUrl: 'https://covers.openlibrary.org/b/isbn/9781455586691-M.jpg', color: 'blue' },
      { title: 'The Power of Habit', author: 'Charles Duhigg', pages: 371, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780812981605-M.jpg', color: 'pink' }
    ],
    'Biographies': [
      { title: 'Educated', author: 'Tara Westover', pages: 352, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780399590504-M.jpg', color: 'purple' },
      { title: 'Steve Jobs', author: 'Walter Isaacson', pages: 656, coverUrl: 'https://covers.openlibrary.org/b/isbn/9781451648539-M.jpg', color: 'green' },
      { title: 'Becoming', author: 'Michelle Obama', pages: 448, coverUrl: 'https://covers.openlibrary.org/b/isbn/9781524763138-M.jpg', color: 'pink' }
    ],
    'Mystery': [
      { title: 'The Silent Patient', author: 'Alex Michaelides', pages: 336, coverUrl: 'https://covers.openlibrary.org/b/isbn/9781250301697-M.jpg', color: 'peach' },
      { title: 'Gone Girl', author: 'Gillian Flynn', pages: 432, coverUrl: 'https://covers.openlibrary.org/b/isbn/9780307588371-M.jpg', color: 'blue' }
    ]
  };

  const selectedList = fallbackData[genre] || fallbackData['Fiction'];
  selectedList.forEach(book => {
    const itemBook = {
      id: 'fallback-' + Date.now() + '-' + Math.round(Math.random()*100),
      title: book.title,
      author: book.author,
      pages: book.pages,
      description: `A highly recommended curated classic in ${genre}.`,
      coverUrl: book.coverUrl,
      genre: genre,
      rating: (4.2 + Math.random() * 0.7).toFixed(1),
      color: book.color
    };
    grid.appendChild(createDiscoverCard(itemBook));
  });
}

function getRandomPastelColor() {
  const colors = ['blue', 'pink', 'yellow', 'green', 'purple', 'peach'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createDiscoverCard(apiBook) {
  const card = document.createElement('div');
  card.className = 'book-card discover-card-wrapper';
  
  const hasCoverUrl = apiBook.coverUrl && apiBook.coverUrl.trim().length > 0;
  const isAlreadyAdded = books.some(b => b.title.toLowerCase() === apiBook.title.toLowerCase());

  card.innerHTML = `
    <div class="cover-wrapper">
      ${hasCoverUrl ? `
        <div class="cover-image-wrapper">
          <img src="${apiBook.coverUrl}" alt="${apiBook.title}" class="book-cover-img" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="rendered-book-cover pastel-${apiBook.color}">
        <span class="cover-title">${apiBook.title}</span>
        <div class="cover-decor-line"></div>
        <span class="cover-author">${apiBook.author}</span>
      </div>
    </div>
    
    <!-- One-Tap Add Button -->
    <button class="discover-card-add-btn animate-btn ${isAlreadyAdded ? 'added' : ''}" title="Add to Want to Read">
      <i data-lucide="${isAlreadyAdded ? 'check' : 'plus'}"></i>
    </button>
    
    <div class="book-card-info">
      <h4 class="book-card-title">${apiBook.title}</h4>
      <p class="book-card-author">${apiBook.author}</p>
      <div class="discover-rating-badge">
        <i data-lucide="star"></i>
        <span>${apiBook.rating}</span>
      </div>
    </div>
  `;

  // One tap add list event - opens detail sheet instead of popup
  const addBtn = card.querySelector('.discover-card-add-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bookIsInLibrary(apiBook)) {
      showToast('Book already in library!');
      return;
    }
    // Open detail sheet with API preview mode
    const mockBook = {
      id: apiBook.id,
      title: apiBook.title,
      author: apiBook.author,
      pages: apiBook.pages,
      currentPage: 0,
      rating: 0,
      lists: [],
      color: apiBook.color,
      genre: apiBook.genre,
      description: apiBook.description,
      coverUrl: apiBook.coverUrl,
      readingLogs: [],
      quotes: [],
      notes: '',
      isApiPreview: true
    };
    openBookDetailSheet(mockBook);
  });

  card.addEventListener('click', () => {
    // Load Discover details dynamically
    const mockBook = {
      id: apiBook.id,
      title: apiBook.title,
      author: apiBook.author,
      pages: apiBook.pages,
      currentPage: 0,
      rating: 0,
      lists: ['want-to-read'],
      color: apiBook.color,
      genre: apiBook.genre,
      description: apiBook.description,
      coverUrl: apiBook.coverUrl,
      readingLogs: [],
      quotes: [],
      notes: ''
    };
    openBookDetailSheet(mockBook);
  });

  return card;
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  btnThemeToggle.addEventListener('click', () => {
    setTheme(!darkMode);
  });

  // Auth tab switching
  authTabSignin.addEventListener('click', () => {
    authTabSignin.classList.add('active');
    authTabSignup.classList.remove('active');
    signinForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    hideAuthError();
  });

  authTabSignup.addEventListener('click', () => {
    authTabSignup.classList.add('active');
    authTabSignin.classList.remove('active');
    signupForm.classList.remove('hidden');
    signinForm.classList.add('hidden');
    hideAuthError();
  });

  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn = document.getElementById('btn-signin');
    btn.disabled = true;

    const { user, error } = await signIn(email, password);
    btn.disabled = false;

    if (error) {
      showAuthError(error);
      return;
    }

    if (user) {
      await handleAuthenticatedUser(user);
      switchView('home');
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    const name = signupNameInput.value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn = document.getElementById('btn-signup');
    btn.disabled = true;

    const { user, session, error } = await signUp(email, password, { name });
    btn.disabled = false;

    if (error) {
      showAuthError(error);
      return;
    }

    if (session?.user || user) {
      showToast('Account created! Welcome to Shelf Control.');
      await handleAuthenticatedUser(session?.user || user);
      switchView('home');
    } else {
      showAuthError('Check your email to confirm your account, then sign in.');
    }
  });

  // Tab switching links
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view;
      switchView(viewId);
    });
  });

  // Action Buttons clicks
  document.getElementById('btn-create-list').addEventListener('click', () => {
    if (!requireAuth('create lists')) return;
    openModal(modalCreateList);
  });

  document.getElementById('btn-add-book').addEventListener('click', () => {
    if (!requireAuth('add books')) return;
    openSheet(sheetAddBook);
    populateAddBookLists();
  });

  // Modal Closures
  document.getElementById('btn-close-create-list').addEventListener('click', () => {
    closeModal(modalCreateList);
  });
  
  document.getElementById('btn-close-add-book').addEventListener('click', () => {
    closeSheet(sheetAddBook);
  });
  
  document.getElementById('btn-close-book-detail').addEventListener('click', async () => {
    await saveDetailBookListChanges();
    closeSheet(sheetBookDetail);
  });

  document.getElementById('btn-close-share-shelf').addEventListener('click', () => {
    closeModal(modalShareShelf);
  });

  document.getElementById('btn-close-rename-list').addEventListener('click', () => {
    closeModal(modalRenameList);
  });

  // Create Custom List Form
  document.getElementById('create-list-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAuth('create lists')) return;

    const title = document.getElementById('list-name').value.trim();
    const color = document.querySelector('input[name="list-color"]:checked').value;

    const { list, error } = await createList(currentUser.id, title, 'folder', color);
    if (error) {
      showToast(error);
      return;
    }

    lists.push(list);
    closeModal(modalCreateList);
    document.getElementById('create-list-form').reset();
    renderHome();
    showToast(`Created list "${title}"`);
  });

  // Add Book Modal form
  document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAuth('add books')) return;

    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const genre = document.getElementById('book-genre').value;
    const description = document.getElementById('book-description').value.trim();
    const coverUrl = document.getElementById('book-cover-url').value.trim();

    const checkedBoxes = document.querySelectorAll('#add-book-lists-checkboxes input:checked');
    const assignedListIds = Array.from(checkedBoxes).map(box => box.value);

    if (assignedListIds.length === 0) {
      const wantList = lists.find(l => l.title === 'Want to Read' || l.title.includes('Want to Read'));
      if (wantList) assignedListIds.push(wantList.id);
    }

    const bookPayload = {
      title,
      author,
      coverUrl,
      description: description || 'No summary available.',
      isbn: ''
    };

    let addedCount = 0;
    for (const listId of assignedListIds) {
      const { book, error } = await saveBookToList(currentUser.id, listId, bookPayload);

      if (error) {
        showToast(error);
        return;
      }

      if (book && !books.some(b => b.id === book.id)) {
        books.push(book);
        listBookCounts[listId] = (listBookCounts[listId] || 0) + 1;
        addedCount += 1;
      }
    }

    if (addedCount === 0) {
      showToast('This book is already in the selected lists.');
      return;
    }

    closeSheet(sheetAddBook);
    document.getElementById('add-book-form').reset();
    document.getElementById('book-cover-url').value = '';
    document.getElementById('search-online-results').classList.add('hidden');

    renderActiveView();
    showToast(`Added "${title}" to your shelf!`);
  });

  // Open Library search in Add Book sheet (debounced)
  const bookSearchInput = document.getElementById('book-search-online');
  const bookSearchResults = document.getElementById('search-online-results');

  async function searchOpenLibraryForAddBook(query) {
    const requestId = ++addBookSearchRequestId;

    if (!query || query.length < 2) {
      bookSearchResults.classList.add('hidden');
      bookSearchResults.innerHTML = '';
      return;
    }

    bookSearchResults.innerHTML = '<div class="search-result-status">Searching Open Library…</div>';
    bookSearchResults.classList.remove('hidden');

    try {
      const results = await searchOpenLibrary(query, 6);
      if (requestId !== addBookSearchRequestId) return;

      bookSearchResults.innerHTML = '';
      if (results.length === 0) {
        bookSearchResults.innerHTML = '<div class="search-result-status">No books found. Try a different title or author.</div>';
        return;
      }

      results.forEach(book => {
        const itemEl = createAddBookSearchResultItem(book);
        bookSearchResults.appendChild(itemEl);
      });
    } catch (err) {
      if (requestId !== addBookSearchRequestId) return;
      bookSearchResults.innerHTML = '<div class="search-result-status search-result-error">Could not reach Open Library. Please fill in the details manually.</div>';
    }
  }

  function createAddBookSearchResultItem(book) {
    const initials = book.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const itemEl = document.createElement('div');
    itemEl.className = 'book-search-result-item';
    itemEl.innerHTML = `
      ${book.coverUrl
        ? `<img src="${book.coverUrl}" alt="${book.title}" class="book-result-thumb" onerror="this.style.display='none'">`
        : `<div class="book-result-thumb-placeholder">${initials}</div>`
      }
      <div class="book-result-meta">
        <div class="book-result-title">${book.title}</div>
        <div class="book-result-author">${book.author}</div>
      </div>
    `;
    itemEl.addEventListener('click', () => {
      document.getElementById('book-title').value = book.title;
      document.getElementById('book-author').value = book.author;
      document.getElementById('book-pages').value = book.pages || 300;
      document.getElementById('book-description').value = book.description.slice(0, 500);
      const genreSelect = document.getElementById('book-genre');
      [...genreSelect.options].forEach(opt => {
        opt.selected = opt.value === book.genre;
      });
      document.getElementById('book-cover-url').value = book.coverUrl;
      bookSearchResults.classList.add('hidden');
      bookSearchInput.value = '';
    });
    return itemEl;
  }

  const debouncedAddBookSearch = debounce((query) => {
    searchOpenLibraryForAddBook(query);
  }, SEARCH_DEBOUNCE_MS);

  bookSearchInput.addEventListener('input', () => {
    debouncedAddBookSearch(bookSearchInput.value.trim());
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sheet-add-book')) bookSearchResults.classList.add('hidden');
  });

  // Back from details subview list
  document.getElementById('btn-back-to-lists').addEventListener('click', () => {
    document.getElementById('list-books-subview').classList.add('hidden');
    document.getElementById('lists-container').classList.remove('hidden');
  });

  // Delete List button trigger
  document.getElementById('btn-delete-list').addEventListener('click', async () => {
    if (!requireAuth('delete lists')) return;
    const listId = document.getElementById('btn-delete-list').dataset.targetListId;
    const listObj = lists.find(l => l.id === listId);

    if (!listObj || listObj.isSystem) {
      showToast('Default lists cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete the list "${listObj.title}"? Books in this list will also be removed.`)) {
      const { error } = await deleteList(listId);
      if (error) {
        showToast(error);
        return;
      }

      books = books.filter(b => b.listId !== listId);
      delete listBookCounts[listId];
      lists = lists.filter(l => l.id !== listId);

      document.getElementById('list-books-subview').classList.add('hidden');
      document.getElementById('lists-container').classList.remove('hidden');
      renderHome();
      showToast('List deleted.');
    }
  });

  document.getElementById('btn-rename-list').addEventListener('click', () => {
    if (!currentListSubview || currentListSubview.isSystem) return;
    document.getElementById('rename-list-name').value = currentListSubview.title;
    openModal(modalRenameList);
  });

  document.getElementById('rename-list-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAuth('rename lists') || !currentListSubview) return;

    const newName = document.getElementById('rename-list-name').value.trim();
    const { list, error } = await renameList(currentListSubview.id, newName);

    if (error) {
      showToast(error);
      return;
    }

    lists = lists.map(l => l.id === list.id ? list : l);
    currentListSubview = list;
    closeModal(modalRenameList);
    openListBooksSubview(list);
    renderHome();
    showToast('List renamed.');
  });

  // Profile - Edit Goal
  document.getElementById('btn-update-goal').addEventListener('click', () => {
    if (!requireAuth('update your goal')) return;
    const inputVal = parseInt(document.getElementById('challenge-goal-input').value);
    if (inputVal > 0) {
      profile.annualGoal = inputVal;
      saveLocalProfile();
      renderProfile();
      showToast(`Annual challenge goal set to ${inputVal} books!`);
    }
  });

  // Profile - Edit settings toggle
  btnToggleSettings.addEventListener('click', () => {
    editProfileName.value = profile.name;
    editProfileGoal.value = profile.annualGoal;
    editProfileGenre.value = profile.favoriteGenre || 'Fiction';
    
    // Check reminders toggles
    reminderToggle.checked = profile.reminderEnabled || false;
    reminderTime.value = profile.reminderTime || '20:00';
    
    profileSettingsSection.classList.remove('hidden');
    document.querySelector('.profile-actions-grid').classList.add('hidden');
  });

  btnCancelSettings.addEventListener('click', () => {
    profileSettingsSection.classList.add('hidden');
    document.querySelector('.profile-actions-grid').classList.remove('hidden');
  });

  profileEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    profile.name = editProfileName.value.trim();
    profile.annualGoal = parseInt(editProfileGoal.value) || 12;
    profile.favoriteGenre = editProfileGenre.value;
    
    // Reminder updates
    const reminderEnabledVal = reminderToggle.checked;
    profile.reminderEnabled = reminderEnabledVal;
    profile.reminderTime = reminderTime.value;
    
    if (reminderEnabledVal && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast("Notifications enabled!");
        } else {
          showToast("Notification permission blocked.");
          profile.reminderEnabled = false;
          reminderToggle.checked = false;
        }
        saveLocalProfile();
      });
    } else {
      saveLocalProfile();
    }

    updateHeader();
    renderProfile();

    profileSettingsSection.classList.add('hidden');
    document.querySelector('.profile-actions-grid').classList.remove('hidden');
  });

  // Follow tabs switching
  document.querySelectorAll('.follow-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.follow-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.getElementById('followers-grid').classList.toggle('hidden', tabName !== 'followers');
      document.getElementById('following-grid').classList.toggle('hidden', tabName !== 'following');
      
      renderFollowSection(tabName);
    });
  });

  // Profile - Sign Out
  document.getElementById('btn-reset-data').addEventListener('click', async () => {
    if (confirm('Sign out of Shelf Control?')) {
      const { error } = await signOut();
      if (error) {
        showToast(error);
        return;
      }
      currentUser = null;
      lists = [];
      books = [];
      listBookCounts = {};
      profile = null;
      showLoginScreen();
      showToast('Signed out successfully.');
    }
  });

  // Search type toggle
  let currentSearchType = 'books';
  document.querySelectorAll('.search-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.search-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSearchType = btn.dataset.type;
      
      const searchInput = document.getElementById('search-input');
      const searchHint = document.getElementById('search-hint-text');
      const searchCategories = document.getElementById('search-categories');
      const bookResults = document.getElementById('search-results-container');
      const userResults = document.getElementById('user-search-results-container');
      
      if (currentSearchType === 'books') {
        searchInput.placeholder = 'Search Open Library by title or author...';
        searchHint.textContent = 'Results powered by Open Library — select a book to view details and save to your shelf.';
        searchCategories.classList.remove('hidden');
        userResults.classList.add('hidden');
      } else {
        searchInput.placeholder = 'Search readers by username...';
        searchHint.textContent = 'Find readers to follow and discover their public shelves.';
        searchCategories.classList.add('hidden');
        bookResults.classList.add('hidden');
      }
      
      // Clear current results
      searchInput.value = '';
      document.getElementById('search-clear-btn').classList.add('hidden');
      hideSearchStatusMessage();
    });
  });

  // Search input typing (Open Library, debounced)
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');

  const debouncedOpenLibrarySearch = debounce((query) => {
    if (currentSearchType === 'books') {
      performSearch(query);
    } else {
      performUserSearch(query);
    }
  }, SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (val.length > 0) {
      searchClearBtn.classList.remove('hidden');
      debouncedOpenLibrarySearch(val);
    } else {
      searchClearBtn.classList.add('hidden');
      if (currentSearchType === 'books') {
        document.getElementById('search-results-container').classList.add('hidden');
        document.getElementById('search-categories').classList.remove('hidden');
      } else {
        document.getElementById('user-search-results-container').classList.add('hidden');
      }
      hideSearchStatusMessage();
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    if (currentSearchType === 'books') {
      document.getElementById('search-results-container').classList.add('hidden');
      document.getElementById('search-categories').classList.remove('hidden');
    } else {
      document.getElementById('user-search-results-container').classList.add('hidden');
    }
    hideSearchStatusMessage();
  });

  document.querySelectorAll('.search-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetGenre = card.dataset.searchGenre;
      const subjectMap = {
        'Fiction': 'fiction',
        'Sci-Fi': 'science fiction',
        'Self-Improvement': 'self-help',
        'Biographies': 'biography',
        'Mystery': 'mystery',
        'History': 'history'
      };
      const query = `subject:${subjectMap[targetGenre] || targetGenre.toLowerCase()}`;
      searchInput.value = targetGenre;
      searchClearBtn.classList.remove('hidden');
      performSearch(query);
    });
  });

  // Discover chips selectors clicking
  document.querySelectorAll('#discover-genre-chips .genre-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#discover-genre-chips .genre-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      fetchDiscoverRecommendations(chip.dataset.genre);
    });
  });

  // Synchronize ranges slider page numbers
  const progressSlider = document.getElementById('detail-progress-slider');
  const progressCurrent = document.getElementById('detail-progress-current');

  progressSlider.addEventListener('input', () => {
    const pageVal = Math.round((progressSlider.value / 100) * selectedBookForDetail.pages);
    progressCurrent.value = pageVal;
    updateDetailProgressLive(pageVal);
  });

  progressCurrent.addEventListener('input', () => {
    let pageVal = parseInt(progressCurrent.value) || 0;
    if (pageVal > selectedBookForDetail.pages) {
      pageVal = selectedBookForDetail.pages;
      progressCurrent.value = pageVal;
    }
    if (pageVal < 0) {
      pageVal = 0;
      progressCurrent.value = pageVal;
    }
    progressSlider.value = Math.round((pageVal / selectedBookForDetail.pages) * 100);
    updateDetailProgressLive(pageVal);
  });

  // Event delegation for detail rating star clicks
  document.getElementById('detail-stars-container').addEventListener('click', (e) => {
    const star = e.target.closest('.star-icon');
    if (star) {
      const val = parseInt(star.getAttribute('data-value') || star.dataset.value);
      if (val) {
        updateBookRating(val);
      }
    }
  });

  // Book Detail Tabs switching triggers
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`detail-panel-${targetTab}`).classList.add('active');
    });
  });

  // Auto-save descriptions & notes textareas on input
  document.getElementById('detail-description-input').addEventListener('change', (e) => {
    if (selectedBookForDetail) {
      selectedBookForDetail.description = e.target.value;
      saveBookDetailChanges();
    }
  });

  document.getElementById('detail-notes-input').addEventListener('change', (e) => {
    if (selectedBookForDetail) {
      selectedBookForDetail.notes = e.target.value;
      saveBookDetailChanges();
    }
  });

  // Add highlight quotes button click
  document.getElementById('btn-add-quote').addEventListener('click', () => {
    const textVal = document.getElementById('quote-input-text').value.trim();
    if (textVal && selectedBookForDetail) {
      selectedBookForDetail.quotes = selectedBookForDetail.quotes || [];
      selectedBookForDetail.quotes.push({
        text: textVal,
        dateAdded: new Date().toISOString()
      });
      document.getElementById('quote-input-text').value = '';
      
      saveBookDetailChanges();
      renderDetailQuotes(selectedBookForDetail);
      showToast("Quote highlight added!");
      updateQuoteOfTheDay();
    }
  });

  // Share shelf Instagram Story trigger
  document.getElementById('btn-trigger-share').addEventListener('click', () => {
    openModal(modalShareShelf);
    renderShareCanvas();
  });

  document.getElementById('btn-download-share').addEventListener('click', () => {
    const canvas = document.getElementById('share-canvas');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(' ', '_')}_Shelf_Control_Stats.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Story card image downloaded!");
  });

  // Quote card on Home page clicking (shuffles to another one!)
  document.getElementById('quote-of-the-day-container').addEventListener('click', () => {
    updateQuoteOfTheDay();
  });

  // Open Library API preview actions
  document.getElementById('btn-add-api-to-library').addEventListener('click', async () => {
    if (!selectedBookForDetail || !selectedBookForDetail.isApiPreview) return;
    if (!requireAuth('add books')) return;

    // Add to "Want to Read" list by default
    const wantList = lists.find(l => l.title === 'Want to Read' || l.title.includes('Want to Read'));
    if (!wantList) {
      showToast('Please create a "Want to Read" list first.');
      return;
    }

    const { book, error } = await saveBookToList(currentUser.id, wantList.id, selectedBookForDetail);
    if (error) {
      showToast(error);
      return;
    }

    books.push(book);
    listBookCounts[wantList.id] = (listBookCounts[wantList.id] || 0) + 1;

    // Convert from API preview to actual saved book
    selectedBookForDetail = { ...book, isApiPreview: false };
    
    // Re-open detail sheet to show Shelves & Lists section
    openBookDetailSheet(selectedBookForDetail);
    
    renderActiveView();
    showToast(`Added "${book.title}" to Want to Read!`);
  });

  document.getElementById('btn-add-api-to-favorites').addEventListener('click', async () => {
    if (!selectedBookForDetail || !selectedBookForDetail.isApiPreview) return;
    if (!requireAuth('add books')) return;

    // Add to "Favorites" list by default
    const favoritesList = lists.find(l => l.title === 'Favorites' || l.title.includes('Favorites'));
    if (!favoritesList) {
      showToast('Please create a "Favorites" list first.');
      return;
    }

    const { book, error } = await saveBookToList(currentUser.id, favoritesList.id, selectedBookForDetail);
    if (error) {
      showToast(error);
      return;
    }

    books.push(book);
    listBookCounts[favoritesList.id] = (listBookCounts[favoritesList.id] || 0) + 1;

    // Convert from API preview to actual saved book
    selectedBookForDetail = { ...book, isApiPreview: false };
    
    // Re-open detail sheet to show Shelves & Lists section
    openBookDetailSheet(selectedBookForDetail);
    
    renderActiveView();
    showToast(`Added "${book.title}" to Favorites!`);
  });

  // Delete Book
  document.getElementById('btn-delete-book').addEventListener('click', async () => {
    if (!requireAuth('remove books') || !selectedBookForDetail) return;
    if (confirm(`Remove "${selectedBookForDetail.title}" from this list?`)) {
      const listId = selectedBookForDetail.listId;
      const { error } = await removeSavedBook(selectedBookForDetail.id);

      if (error) {
        showToast(error);
        return;
      }

      books = books.filter(b => b.id !== selectedBookForDetail.id);
      if (listId) {
        listBookCounts[listId] = Math.max(0, (listBookCounts[listId] || 1) - 1);
      }

      closeSheet(sheetBookDetail);
      renderActiveView();
      updateQuoteOfTheDay();
      showToast('Book removed from list.');
    }
  });
}

// DRAG AND DROP REORDER LISTS
function setupDragAndDrop() {
  const container = document.getElementById('lists-container');
  if (!container) return;

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector('.list-card.dragging');
    if (!draggingCard) return;
    
    const siblings = [...container.querySelectorAll('.list-card:not(.dragging)')];
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      const offsetHoriz = e.clientX - box.left - box.width / 2;
      return (offset < 0 && offsetHoriz < 0) || (offset < 0);
    });

    container.insertBefore(draggingCard, nextSibling);
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    // Visual reorder only — list order is managed in Supabase by name/default flag
  });
}

// VIEW SWITCHER
function switchView(viewId) {
  currentActiveView = viewId;
  
  navItems.forEach(item => {
    if (item.dataset.view === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  appViews.forEach(view => {
    if (view.id === `view-${viewId}`) {
      view.classList.add('view-active');
    } else {
      view.classList.remove('view-active');
    }
  });

  if (viewId !== 'home') {
    document.getElementById('list-books-subview').classList.add('hidden');
    document.getElementById('lists-container').classList.remove('hidden');
  }

  renderActiveView();
  lucide.createIcons();
}

function renderActiveView() {
  if (!isAuthenticated()) return;
  profile = loadLocalProfile();

  switch (currentActiveView) {
    case 'home':
      renderHome();
      break;
    case 'discover':
      // Initialize discovery Recommendations on load
      const activeDiscoverGenre = document.querySelector('#discover-genre-chips .genre-chip.active').dataset.genre;
      fetchDiscoverRecommendations(activeDiscoverGenre);
      break;
    case 'search':
      const searchVal = document.getElementById('search-input').value.trim();
      if (searchVal) {
        performSearch(searchVal);
      }
      break;
    case 'profile':
      renderProfile();
      break;
  }
}

function updateHeader() {
  if (profile && currentUser) {
    headerUsername.textContent = profile.name || getDisplayName(currentUser);
  }
}

function getListBookCount(listId) {
  return listBookCounts[listId] || books.filter(b => b.listId === listId).length;
}

function bookIsInLibrary(apiBook) {
  return books.some(b =>
    b.title.toLowerCase() === apiBook.title.toLowerCase() &&
    b.author.toLowerCase() === apiBook.author.toLowerCase()
  );
}


async function lookupUserByEmail() {
  if (!requireAuth('find readers')) return;

  const email = document.getElementById('user-lookup-email').value.trim();
  const resultEl = document.getElementById('user-lookup-result');

  if (!email) {
    showToast('Enter an email address to search.');
    return;
  }

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = '<p class="lookup-status">Searching…</p>';

  const { user, error } = await findUserByEmail(email);

  if (error || !user) {
    resultEl.innerHTML = `<p class="lookup-error">${error || 'No reader found.'}</p>`;
    return;
  }

  if (user.id === currentUser.id) {
    resultEl.innerHTML = '<p class="lookup-status">That\'s you! Share your email so others can follow you.</p>';
    return;
  }

  viewedUserProfile = user;
  await renderUserLookupResult(user, resultEl);
}

async function renderUserLookupResult(user, container) {
  const { following, error: followError } = await isFollowing(currentUser.id, user.id);
  if (followError) {
    container.innerHTML = `<p class="lookup-error">${followError}</p>`;
    return;
  }

  const { followers, following: followingCount, error: countError } = await getFollowCounts(user.id);
  if (countError) {
    container.innerHTML = `<p class="lookup-error">${countError}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="lookup-user-card glass">
      <div class="lookup-user-info">
        <strong>${user.name}</strong>
        <span>${user.email}</span>
        <span class="lookup-follow-counts">${followers} followers · ${followingCount} following</span>
      </div>
      <button type="button" id="btn-follow-toggle" class="btn-primary animate-btn">
        ${following ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  `;

  container.querySelector('#btn-follow-toggle').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-follow-toggle');
    btn.disabled = true;

    if (following) {
      const { error } = await unfollowUser(currentUser.id, user.id);
      if (error) {
        showToast(error);
        btn.disabled = false;
        return;
      }
      showToast(`Unfollowed ${user.name}.`);
    } else {
      const { error } = await followUser(currentUser.id, user.id);
      if (error) {
        showToast(error);
        btn.disabled = false;
        return;
      }
      showToast(`Now following ${user.name}!`);
    }

    await renderUserLookupResult(user, container);
    renderProfileFollowStats();
  });
}

async function renderProfileFollowStats() {
  // This function is now handled by renderFollowSection
  renderFollowSection('followers');
}

async function renderFollowSection(tabName) {
  if (!currentUser) return;

  const gridId = tabName === 'followers' ? 'followers-grid' : 'following-grid';
  const grid = document.getElementById(gridId);
  
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state"><i data-lucide="loader-2"></i><p>Loading...</p></div>';
  lucide.createIcons();

  const userIdsResult = tabName === 'followers' 
    ? await getFollowers(currentUser.id)
    : await getFollowing(currentUser.id);

  if (userIdsResult.error) {
    grid.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><p>${userIdsResult.error}</p></div>`;
    lucide.createIcons();
    return;
  }

  if (userIdsResult.userIds.length === 0) {
    const message = tabName === 'followers' 
      ? "No followers yet. Share your profile to get discovered!"
      : "Not following anyone yet. Search for readers to follow!";
    grid.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><p>${message}</p></div>`;
    lucide.createIcons();
    return;
  }

  // Fetch user profiles for all user IDs
  const userPromises = userIdsResult.userIds.map(userId => getUserProfile(userId));
  const userResults = await Promise.all(userPromises);

  const validUsers = userResults.filter(result => !result.error && result.user).map(result => result.user);

  if (validUsers.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><p>No users found.</p></div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = '';
  
  for (const user of validUsers) {
    const { following: isFollowing } = await isFollowing(currentUser.id, user.id);
    const card = createUserCard(user, isFollowing);
    grid.appendChild(card);
  }

  lucide.createIcons();
}

function createUserCard(user, isFollowing) {
  const card = document.createElement('div');
  card.className = 'user-card';
  
  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarHtml = user.avatarUrl 
    ? `<img src="${user.avatarUrl}" alt="${user.name}" onerror="this.style.display='none'; this.parentElement.textContent='${initials}'">`
    : initials;

  card.innerHTML = `
    <div class="user-card-avatar">${avatarHtml}</div>
    <div class="user-card-info">
      <h4 class="user-card-name">${user.name}</h4>
      <p class="user-card-bio">${user.bio || 'No bio yet'}</p>
    </div>
    <div class="user-card-action">
      <button class="btn-follow ${isFollowing ? 'following' : ''}" data-user-id="${user.id}">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  `;

  // Follow/unfollow button
  const followBtn = card.querySelector('.btn-follow');
  followBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    if (!requireAuth('follow users')) return;

    if (isFollowing) {
      const { error } = await unfollowUser(currentUser.id, user.id);
      if (error) {
        showToast(error);
        return;
      }
      followBtn.classList.remove('following');
      followBtn.textContent = 'Follow';
      isFollowing = false;
      showToast(`Unfollowed ${user.name}`);
    } else {
      const { error } = await followUser(currentUser.id, user.id);
      if (error) {
        showToast(error);
        return;
      }
      followBtn.classList.add('following');
      followBtn.textContent = 'Following';
      isFollowing = true;
      showToast(`Following ${user.name}`);
    }
  });

  // Click card to view profile
  card.addEventListener('click', () => {
    viewUserProfile(user.id);
  });

  return card;
}

async function viewUserProfile(userId) {
  if (!requireAuth('view profiles')) return;
  
  const { user, error } = await getUserProfile(userId);
  if (error) {
    showToast(error);
    return;
  }

  // Store viewed user profile
  viewedUserProfile = user;
  
  // Switch to a new view or show a modal for viewing other user's profile
  // For now, let's create a simple modal-based view
  showUserProfileModal(user);
}

function showUserProfileModal(user) {
  // Create a modal for viewing user profile
  const existingModal = document.getElementById('modal-user-profile');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'modal-user-profile';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box glass animate-slide-up user-profile-modal">
      <div class="modal-header">
        <h2>${user.name}'s Profile</h2>
        <button class="btn-close-modal" id="btn-close-user-profile">
          <i data-lucide="x"></i>
        </button>
      </div>
      
      <div class="user-profile-content">
        <div class="user-profile-header">
          <div class="user-profile-avatar glass">
            ${user.avatarUrl 
              ? `<img src="${user.avatarUrl}" alt="${user.name}" onerror="this.style.display='none'; this.parentElement.textContent='${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}'">`
              : user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            }
          </div>
          <div class="user-profile-meta">
            <h3>${user.name}</h3>
            <p class="user-profile-bio">${user.bio || 'No bio yet'}</p>
          </div>
        </div>
        
        <div class="user-profile-section">
          <h4>Public Shelves</h4>
          <div id="user-public-lists-grid" class="lists-grid">
            <div class="empty-state"><i data-lucide="loader-2"></i><p>Loading...</p></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();

  // Close button
  document.getElementById('btn-close-user-profile').addEventListener('click', () => {
    modal.remove();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Load public lists
  loadUserPublicLists(user.id);
}

async function loadUserPublicLists(userId) {
  const grid = document.getElementById('user-public-lists-grid');
  if (!grid) return;

  const { lists, error } = await fetchPublicLists(userId);
  
  if (error) {
    grid.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><p>${error}</p></div>`;
    lucide.createIcons();
    return;
  }

  if (lists.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i data-lucide="book-open"></i><p>This reader hasn't shared any lists yet.</p></div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = '';
  
  for (const list of lists) {
    const listCard = document.createElement('div');
    listCard.className = 'list-card glass animate-btn';
    listCard.innerHTML = `
      <div class="list-card-header">
        <div class="list-icon-wrapper pastel-${list.color}">
          <i data-lucide="${list.icon || 'folder'}"></i>
        </div>
        <div class="list-card-title-group">
          <h4 class="list-card-title">${list.title}</h4>
          <span class="list-card-count">${getListBookCount(list.id)} books</span>
        </div>
      </div>
    `;
    
    // Make it clickable to view the list (read-only)
    listCard.addEventListener('click', () => {
      viewPublicList(list);
    });
    
    grid.appendChild(listCard);
  }

  lucide.createIcons();
}

function viewPublicList(list) {
  // For now, just show a toast - we could expand this to show the actual books
  showToast(`Viewing "${list.title}" - coming soon!`);
}

// 1. RENDER HOME
function renderHome() {
  const container = document.getElementById('lists-container');
  container.innerHTML = '';

  lists.forEach(list => {
    const count = getListBookCount(list.id);
    const iconName = list.icon || 'folder';

    const card = document.createElement('div');
    card.className = `list-card pastel-${list.color} animate-btn`;
    card.dataset.listId = list.id;
    card.innerHTML = `
      <div class="list-card-icon-wrap">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="list-card-details">
        <h3 class="list-card-title">${list.title}</h3>
        <span class="list-card-count">${count} ${count === 1 ? 'book' : 'books'}</span>
      </div>
    `;

    // Drag events
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    card.addEventListener('click', () => {
      openListBooksSubview(list);
    });

    container.appendChild(card);
  });
  
  lucide.createIcons();
}

function openListBooksSubview(list) {
  currentListSubview = list;
  const listsContainer = document.getElementById('lists-container');
  const subview = document.getElementById('list-books-subview');
  const subviewTitle = document.getElementById('subview-list-title');
  const subviewCount = document.getElementById('subview-list-count');
  const subviewGrid = document.getElementById('list-books-grid');
  const deleteBtn = document.getElementById('btn-delete-list');
  const renameBtn = document.getElementById('btn-rename-list');

  listsContainer.classList.add('hidden');
  subview.classList.remove('hidden');

  subviewTitle.textContent = list.title;

  if (list.isSystem) {
    deleteBtn.classList.add('hidden');
    renameBtn.classList.add('hidden');
  } else {
    deleteBtn.classList.remove('hidden');
    renameBtn.classList.remove('hidden');
    deleteBtn.dataset.targetListId = list.id;
  }

  const listBooks = books.filter(b => b.listId === list.id);
  subviewCount.textContent = `${listBooks.length} ${listBooks.length === 1 ? 'book' : 'books'}`;
  listBookCounts[list.id] = listBooks.length;
  
  subviewGrid.innerHTML = '';
  
  if (listBooks.length === 0) {
    subviewGrid.innerHTML = `
      <div class="empty-state-notice" style="grid-column: span 2; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
        <i data-lucide="inbox" style="width: 40px; height: 40px; margin-bottom: 8px; opacity: 0.5;"></i>
        <p style="font-size: 14px; font-weight: 500;">No books in this list yet.</p>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Log pages or add new titles.</p>
      </div>
    `;
  } else {
    listBooks.forEach(book => {
      subviewGrid.appendChild(createBookCard(book));
    });
  }
  
  lucide.createIcons();
}

function getAveragePace(book) {
  if (!book.readingLogs || book.readingLogs.length === 0) {
    return (profile && profile.averagePace) ? profile.averagePace : 20; // default 20
  }
  const totalRead = book.readingLogs.reduce((sum, l) => sum + l.pagesLogged, 0);
  const days = book.readingLogs.length;
  return Math.max(1, Math.round(totalRead / days));
}

// Generate Book Cards (With Visual Reading Progress bars)
function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  
  const hasProgress = book.currentPage > 0;
  const percent = Math.min(100, Math.round((book.currentPage / book.pages) * 100)) || 0;

  const pace = getAveragePace(book);
  const pagesLeft = book.pages - book.currentPage;
  const estDays = Math.ceil(pagesLeft / pace);
  const readingList = getListByNameFragment('Currently Reading');
  const isCurrentlyReading = readingList && book.listId === readingList.id;
  const estText = (isCurrentlyReading && book.currentPage < book.pages) ? ` · Est. ${estDays}d left` : '';

  const hasCoverUrl = book.coverUrl && book.coverUrl.trim().length > 0;
  
  card.innerHTML = `
    <div class="cover-wrapper">
      ${hasCoverUrl ? `
        <div class="cover-image-wrapper">
          <img src="${book.coverUrl}" alt="${book.title}" class="book-cover-img" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="rendered-book-cover pastel-${book.color}">
        <span class="cover-title">${book.title}</span>
        <div class="cover-decor-line"></div>
        <span class="cover-author">${book.author}</span>
      </div>
    </div>
    <div class="book-card-info">
      <h4 class="book-card-title">${book.title}</h4>
      <p class="book-card-author">${book.author}</p>
      ${hasProgress ? `
        <div class="progress-mini-bar-wrap">
          <div class="progress-mini-track">
            <div class="progress-mini-fill" style="width: ${percent}%; background-color: var(--accent-${book.color});"></div>
          </div>
          <span class="progress-mini-text">${percent}%${estText}</span>
        </div>
      ` : ''}
    </div>
  `;
  
  card.addEventListener('click', () => {
    openBookDetailSheet(book);
  });
  
  return card;
}

// 2. RENDER SEARCH (Open Library)
function showSearchStatusMessage(message, isError = false, isUserSearch = false) {
  const statusEl = isUserSearch ? document.getElementById('user-search-status-message') : document.getElementById('search-status-message');
  statusEl.textContent = message;
  statusEl.classList.remove('hidden', 'search-status-error', 'search-status-loading');
  statusEl.classList.add(isError ? 'search-status-error' : 'search-status-loading');
}

function hideSearchStatusMessage() {
  const statusEl = document.getElementById('search-status-message');
  const userStatusEl = document.getElementById('user-search-status-message');
  statusEl.classList.add('hidden');
  statusEl.textContent = '';
  userStatusEl.classList.add('hidden');
  userStatusEl.textContent = '';
}

async function performUserSearch(query) {
  const categoriesGrid = document.getElementById('search-categories');
  const resultsContainer = document.getElementById('user-search-results-container');
  const resultsGrid = document.getElementById('user-search-results-grid');
  const resultsHeader = document.getElementById('user-search-results-header');

  categoriesGrid.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsGrid.innerHTML = '';
  resultsHeader.textContent = 'Search Results';
  showSearchStatusMessage('Searching readers...', false, true);

  try {
    const { users, error } = await searchUsersByUsername(query);
    
    if (error) {
      showSearchStatusMessage(error, true, true);
      return;
    }

    if (users.length === 0) {
      showSearchStatusMessage('No readers found. Try a different username.', false, true);
      return;
    }

    hideSearchStatusMessage();
    resultsHeader.textContent = `Found ${users.length} reader${users.length !== 1 ? 's' : ''}`;

    for (const user of users) {
      const { following: isFollowing } = currentUser ? await isFollowing(currentUser.id, user.id) : { following: false };
      const card = createUserCard(user, isFollowing);
      resultsGrid.appendChild(card);
    }

    lucide.createIcons();
  } catch (err) {
    console.error('User search failed:', err);
    showSearchStatusMessage('Search failed. Please try again.', true, true);
  }
}

function truncateText(text, maxLen = 140) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen).trim() + '…';
}

function createApiSearchResultCard(apiBook) {
  const card = document.createElement('div');
  card.className = 'api-search-result-card animate-btn';
  const initials = apiBook.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const inLibrary = books.some(b =>
    b.title.toLowerCase() === apiBook.title.toLowerCase() &&
    b.author.toLowerCase() === apiBook.author.toLowerCase()
  );

  card.innerHTML = `
    <div class="api-result-cover">
      ${apiBook.coverUrl
        ? `<img src="${apiBook.coverUrl}" alt="${apiBook.title}" class="api-result-cover-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'api-result-cover-placeholder\\'>${initials}</div>'">`
        : `<div class="api-result-cover-placeholder">${initials}</div>`
      }
    </div>
    <div class="api-result-body">
      <div class="api-result-header">
        <h4 class="api-result-title">${apiBook.title}</h4>
        ${inLibrary ? '<span class="api-result-badge">In Library</span>' : ''}
      </div>
      <p class="api-result-author">${apiBook.author}</p>
      <p class="api-result-desc">${truncateText(apiBook.description)}</p>
    </div>
    <i data-lucide="chevron-right" class="api-result-chevron"></i>
  `;

  card.addEventListener('click', () => openApiBookDetail(apiBook));
  return card;
}

async function openApiBookDetail(apiBook) {
  openBookDetailSheet({ ...apiBook, isApiPreview: true });

  const descInput = document.getElementById('detail-description-input');
  descInput.value = 'Loading full description…';
  descInput.readOnly = true;

  try {
    const enriched = await enrichBookWithDetails(apiBook);
    if (selectedBookForDetail && selectedBookForDetail.id === apiBook.id) {
      selectedBookForDetail.description = enriched.description;
      selectedBookForDetail.publishDate = enriched.publishDate;
      descInput.value = enriched.description || 'No description available.';
      document.getElementById('detail-publish-date').textContent = enriched.publishDate || 'Unknown';
    }
  } catch {
    if (selectedBookForDetail && selectedBookForDetail.id === apiBook.id) {
      descInput.value = apiBook.description || 'No description available.';
    }
  }
}

function getListByNameFragment(fragment) {
  return lists.find(l => l.title === fragment || l.title.includes(fragment));
}

function getBooksInListName(fragment) {
  const list = getListByNameFragment(fragment);
  if (!list) return [];
  return books.filter(b => b.listId === list.id);
}

function addBookFromApi(apiBook, targetLists) {
  // Open detail sheet with API preview mode
  const mockBook = {
    id: apiBook.id,
    title: apiBook.title,
    author: apiBook.author,
    pages: apiBook.pages,
    currentPage: 0,
    rating: 0,
    lists: [],
    color: apiBook.color,
    genre: apiBook.genre,
    description: apiBook.description,
    coverUrl: apiBook.coverUrl,
    readingLogs: [],
    quotes: [],
    notes: '',
    isApiPreview: true
  };
  openBookDetailSheet(mockBook);
}

async function performSearch(query) {
  const categoriesGrid = document.getElementById('search-categories');
  const resultsContainer = document.getElementById('search-results-container');
  const resultsGrid = document.getElementById('search-results-grid');
  const resultsHeader = document.getElementById('search-results-header');
  const requestId = ++searchRequestId;

  categoriesGrid.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsGrid.innerHTML = '';
  resultsHeader.textContent = 'Searching…';
  showSearchStatusMessage('Searching Open Library…');

  if (query.length < 2) {
    hideSearchStatusMessage();
    resultsHeader.textContent = 'Search Results';
    resultsGrid.innerHTML = `
      <div class="search-empty-state">
        <i data-lucide="search"></i>
        <p>Type at least 2 characters to search.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  try {
    const results = await searchOpenLibrary(query, 12);
    if (requestId !== searchRequestId) return;

    hideSearchStatusMessage();
    resultsHeader.textContent = `Search Results (${results.length})`;

    if (results.length === 0) {
      resultsGrid.innerHTML = `
        <div class="search-empty-state">
          <i data-lucide="book-x"></i>
          <p>No books found for "${query}"</p>
          <span>Try a different title, author, or spelling.</span>
        </div>
      `;
    } else {
      results.forEach(book => {
        resultsGrid.appendChild(createApiSearchResultCard(book));
      });
    }
  } catch (error) {
    if (requestId !== searchRequestId) return;

    hideSearchStatusMessage();
    resultsHeader.textContent = 'Search Results';
    resultsGrid.innerHTML = `
      <div class="search-empty-state search-empty-error">
        <i data-lucide="wifi-off"></i>
        <p>Could not reach Open Library</p>
        <span>Check your connection and try again.</span>
      </div>
    `;
    console.error('Open Library search failed:', error);
  }

  lucide.createIcons();
}

// 3. RENDER PROFILE
function renderProfile() {
  const profileName = document.getElementById('profile-name');
  const profileInitials = document.getElementById('profile-initials');
  const statBooks = document.getElementById('stat-books-count');
  const statPages = document.getElementById('stat-pages-count');
  const statAvg = document.getElementById('stat-avg-rating');
  const goalDisplay = document.getElementById('challenge-goal-display');
  const goalInput = document.getElementById('challenge-goal-input');
  
  // Streak metrics
  const profileStreakCount = document.getElementById('profile-streak-count');
  
  profileName.textContent = profile.name;
  profileInitials.textContent = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'R';

  const profileEmail = document.getElementById('profile-email');
  if (profileEmail && currentUser) {
    profileEmail.textContent = currentUser.email;
  }

  renderProfileFollowStats();

  const completedBooks = getBooksInListName('Completed');
  
  // Calculate total pages logged in history
  const totalPagesLogged = books.reduce((sum, b) => {
    if (b.readingLogs) {
      return sum + b.readingLogs.reduce((s, l) => s + l.pagesLogged, 0);
    }
    return sum + (b.currentPage || 0);
  }, 0);
  
  const ratedBooks = books.filter(b => b.rating > 0);
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
    : '0.0';
    
  // Check Reading Streak status
  let streakDays = profile.streak || 0;
  const today = new Date().toISOString().split('T')[0];
  
  if (profile.lastReadDate) {
    const lastDate = new Date(profile.lastReadDate);
    const currDate = new Date(today);
    const diffTime = Math.abs(currDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      streakDays = 0;
      profile.streak = 0;
      saveLocalProfile();
    }
  }

  const currentlyReadingList = getListByNameFragment('Currently Reading');
  let totalPace = 0;
  let readingBookCounts = 0;
  books.forEach(b => {
    if (currentlyReadingList && b.listId === currentlyReadingList.id) {
      totalPace += getAveragePace(b);
      readingBookCounts++;
    }
  });
  const avgDailyPace = readingBookCounts > 0 ? Math.round(totalPace / readingBookCounts) : 20;

  statBooks.textContent = completedBooks.length;
  statPages.textContent = totalPagesLogged;
  statAvg.textContent = avgRating;
  document.getElementById('stat-pace-display').textContent = avgDailyPace;
  profileStreakCount.textContent = streakDays;

  profile.averagePace = avgDailyPace;
  saveLocalProfile();
  
  const annualGoal = profile.annualGoal || 12;
  goalDisplay.textContent = annualGoal;
  goalInput.value = annualGoal;
  
  renderProgressRing(completedBooks.length, annualGoal);
  renderHeatmapGrid();
  renderGenreDonutChart();
}

function renderProgressRing(completed, goal) {
  const ring = document.getElementById('challenge-ring-progress');
  const completedText = document.getElementById('challenge-completed-display');
  const ringDenom = document.querySelector('.ring-denom');
  
  completedText.textContent = completed;
  ringDenom.textContent = `/${goal}`;
  
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  ring.style.strokeDasharray = `${circumference} ${circumference}`;
  
  const progressRatio = Math.min(1, completed / goal);
  const offset = circumference - (progressRatio * circumference);
  
  ring.style.strokeDashoffset = offset;
}

// 4. RENDER MONTHLY HEATMAP GRID
function renderHeatmapGrid() {
  const grid = document.getElementById('heatmap-grid');
  const monthLabel = document.getElementById('heatmap-month-name');
  grid.innerHTML = '';

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // weekday index (0-6)
  const monthName = now.toLocaleString('default', { month: 'long' });
  
  monthLabel.textContent = `${monthName} ${year}`;

  // Process logged dates across books
  let dailyPages = {};
  books.forEach(b => {
    if (b.readingLogs) {
      b.readingLogs.forEach(log => {
        dailyPages[log.date] = (dailyPages[log.date] || 0) + log.pagesLogged;
      });
    }
  });

  // Align weekday headings (Sun - Sat)
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  weekdays.forEach(day => {
    const box = document.createElement('div');
    box.className = 'heatmap-day-box header-day';
    box.style.background = 'transparent';
    box.style.border = 'none';
    box.style.fontWeight = '800';
    box.style.fontSize = '9px';
    box.textContent = day;
    grid.appendChild(box);
  });

  // Pad empty starting days of weekday
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'heatmap-day-box empty-box';
    emptyBox.style.opacity = '0';
    grid.appendChild(emptyBox);
  }

  // Draw day squares
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const loggedPages = dailyPages[dateStr] || 0;
    
    let level = 'level-0';
    if (loggedPages > 40) level = 'level-3';
    else if (loggedPages > 15) level = 'level-2';
    else if (loggedPages > 0) level = 'level-1';

    const box = document.createElement('div');
    box.className = `heatmap-day-box ${level}`;
    box.textContent = d;
    box.title = `${loggedPages} pages logged on ${dateStr}`;
    
    grid.appendChild(box);
  }
}

// 5. RENDER GENRE DONUT CHART
function renderGenreDonutChart() {
  const canvas = document.getElementById('genre-chart');
  const legendContainer = document.getElementById('genre-chart-legend');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  legendContainer.innerHTML = '';

  // Calculate stats
  let genreCounts = {};
  books.forEach(b => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });

  const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = {
    'Fiction': '#9C4362',
    'Sci-Fi': '#2E5F8A',
    'Self-Improvement': '#856715',
    'Biographies': '#683F99',
    'Mystery': '#2F6A3E',
    'History': '#9E5124'
  };

  const borderThemeColor = darkMode ? '#161311' : '#FAF8F5';

  if (total === 0) {
    // Empty state chart
    ctx.beginPath();
    ctx.arc(80, 80, 70, 0, 2 * Math.PI);
    ctx.fillStyle = '#EBEBEB';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(80, 80, 42, 0, 2 * Math.PI);
    ctx.fillStyle = borderThemeColor;
    ctx.fill();

    legendContainer.innerHTML = `
      <div class="legend-item">
        <div class="legend-color-dot" style="background: #EBEBEB"></div>
        <span>No books logged</span>
      </div>
    `;
    return;
  }

  let startAngle = -Math.PI / 2;
  
  Object.entries(genreCounts).forEach(([genre, count]) => {
    const share = count / total;
    const endAngle = startAngle + (share * 2 * Math.PI);
    const color = colors[genre] || '#7C7A78';

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(80, 80);
    ctx.arc(80, 80, 70, startAngle, endAngle);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw boundary border
    ctx.strokeStyle = borderThemeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;

    // Build Legend item
    const pct = Math.round(share * 100);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-color-dot" style="background: ${color}"></div>
      <span>${genre}</span>
      <span class="legend-percentage">${pct}%</span>
    `;
    legendContainer.appendChild(item);
  });

  // Draw Inner circle to form Donut
  ctx.beginPath();
  ctx.arc(80, 80, 42, 0, 2 * Math.PI);
  ctx.fillStyle = borderThemeColor;
  ctx.fill();
}

// SLIDE-UP DETAIL SHEETS
function openBookDetailSheet(book) {
  selectedBookForDetail = book;
  
  // Reset active tab to Info panel
  tabButtons.forEach(b => {
    if (b.dataset.tab === 'info') b.classList.add('active');
    else b.classList.remove('active');
  });
  tabPanels.forEach(p => {
    if (p.id === 'detail-panel-info') p.classList.add('active');
    else p.classList.remove('active');
  });

  const detailGenre = document.getElementById('detail-genre');
  const detailCoverImageContainer = document.getElementById('detail-cover-image-container');
  const detailCoverImage = document.getElementById('detail-cover-image');
  const detailCoverRendered = document.getElementById('detail-cover-rendered');
  
  const detailCoverTitle = document.getElementById('detail-cover-title');
  const detailCoverAuthor = document.getElementById('detail-cover-author');
  const detailTitle = document.getElementById('detail-title');
  const detailAuthor = document.getElementById('detail-author');

  const progressPercent = document.getElementById('detail-progress-percent');
  const progressSlider = document.getElementById('detail-progress-slider');
  const progressCurrent = document.getElementById('detail-progress-current');
  const progressTotal = document.getElementById('detail-progress-total');

  detailGenre.textContent = book.genre;
  detailCoverTitle.textContent = book.title;
  detailCoverAuthor.textContent = book.author;
  detailTitle.textContent = book.title;
  detailAuthor.textContent = `by ${book.author}`;

  const isApiPreview = book.isApiPreview === true;
  const metadataSection = document.getElementById('detail-metadata-section');
  const apiActions = document.getElementById('detail-api-actions');
  const deleteBtn = document.getElementById('btn-delete-book');
  const descInput = document.getElementById('detail-description-input');
  const listsSection = document.getElementById('detail-lists-checkboxes')?.closest('.detail-section');
  const ratingSection = document.getElementById('detail-stars-container')?.closest('.detail-section');

  if (isApiPreview) {
    metadataSection.classList.remove('hidden');
    apiActions.classList.remove('hidden');
    deleteBtn.classList.add('hidden');
    if (listsSection) listsSection.classList.add('hidden');
    if (ratingSection) ratingSection.classList.add('hidden');
    document.getElementById('detail-isbn').textContent = book.isbn || 'Not available';
    document.getElementById('detail-publish-date').textContent = book.publishDate || 'Unknown';
    descInput.readOnly = true;
  } else {
    metadataSection.classList.toggle('hidden', !book.isbn && !book.publishDate);
    apiActions.classList.add('hidden');
    deleteBtn.classList.remove('hidden');
    if (listsSection) listsSection.classList.remove('hidden');
    if (ratingSection) ratingSection.classList.remove('hidden');
    if (book.isbn || book.publishDate) {
      document.getElementById('detail-isbn').textContent = book.isbn || '—';
      document.getElementById('detail-publish-date').textContent = book.publishDate || '—';
    }
    descInput.readOnly = false;
  }
  
  // Fill text description
  descInput.value = book.description || '';
  document.getElementById('detail-notes-input').value = book.notes || '';
  
  // Cover displays
  if (book.coverUrl && book.coverUrl.trim().length > 0) {
    detailCoverImage.src = book.coverUrl;
    detailCoverImageContainer.classList.remove('hidden');
    detailCoverRendered.classList.add('hidden');
  } else {
    detailCoverImageContainer.classList.add('hidden');
    detailCoverRendered.classList.remove('hidden');
    detailCoverRendered.className = `rendered-book-cover large-cover pastel-${book.color}`;
  }
  
  // Reading Slider Setup
  progressTotal.textContent = book.pages;
  progressCurrent.value = book.currentPage;
  
  const percent = Math.min(100, Math.round((book.currentPage / book.pages) * 100)) || 0;
  progressPercent.textContent = `${percent}%`;
  progressSlider.value = percent;
  
  populateDetailBookLists(book);
  updateStarsUI(book.rating || 0);
  updatePaceEstimatorUI(book);
  renderDetailLogsList(book);
  renderDetailQuotes(book);

  if (isApiPreview) {
    document.querySelectorAll('.detail-tab-btn[data-tab="progress"]').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.detail-tab-btn[data-tab="quotes"]').forEach(b => b.classList.add('hidden'));
  } else {
    document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('hidden'));
  }

  openSheet(sheetBookDetail);
  lucide.createIcons();
}

function updateDetailProgressLive(currentPageVal) {
  if (!selectedBookForDetail) return;
  
  const oldPage = selectedBookForDetail.currentPage;
  selectedBookForDetail.currentPage = currentPageVal;
  
  const percent = Math.min(100, Math.round((currentPageVal / selectedBookForDetail.pages) * 100)) || 0;
  document.getElementById('detail-progress-percent').textContent = `${percent}%`;
  
  // Log daily reading entries
  const delta = currentPageVal - oldPage;
  if (delta > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    selectedBookForDetail.readingLogs = selectedBookForDetail.readingLogs || [];
    
    const existingLog = selectedBookForDetail.readingLogs.find(l => l.date === todayStr);
    if (existingLog) {
      existingLog.pagesLogged += delta;
    } else {
      selectedBookForDetail.readingLogs.push({ date: todayStr, pagesLogged: delta });
    }
    
    updateStreakOnRead();
    renderDetailLogsList(selectedBookForDetail);
  }

  // Auto-assign status lists based on reading progress
  const completedList = getListByNameFragment('Completed');
  const currentlyReadingList = getListByNameFragment('Currently Reading');
  const wantToReadList = getListByNameFragment('Want to Read');

  if (currentPageVal === selectedBookForDetail.pages && completedList) {
    const completedCheck = document.querySelector(`.detail-list-opt[value="${completedList.id}"]`);
    if (completedCheck && !completedCheck.checked) {
      completedCheck.checked = true;
      uncheckStatusListsExcept('Completed');
      selectedBookForDetail.dateCompleted = new Date().toISOString();
      updateBookListAssociationsFromChecks();
    }
  } else if (currentPageVal > 0 && currentPageVal < selectedBookForDetail.pages && currentlyReadingList) {
    const currentlyReadingCheck = document.querySelector(`.detail-list-opt[value="${currentlyReadingList.id}"]`);
    if (currentlyReadingCheck && !currentlyReadingCheck.checked) {
      currentlyReadingCheck.checked = true;
      uncheckStatusListsExcept('Currently Reading');
      updateBookListAssociationsFromChecks();
    }
  } else if (currentPageVal === 0 && wantToReadList && completedList) {
    const wantToReadCheck = document.querySelector(`.detail-list-opt[value="${wantToReadList.id}"]`);
    const completedCheck = document.querySelector(`.detail-list-opt[value="${completedList.id}"]`);
    if (wantToReadCheck && !wantToReadCheck.checked && completedCheck && !completedCheck.checked) {
      wantToReadCheck.checked = true;
      uncheckStatusListsExcept('Want to Read');
      updateBookListAssociationsFromChecks();
    }
  }

  saveBookDetailChanges();
  updatePaceEstimatorUI(selectedBookForDetail);
}

function updateStreakOnRead() {
  const today = new Date().toISOString().split('T')[0];
  if (profile.lastReadDate !== today) {
    profile.streak = (profile.streak || 0) + 1;
    profile.lastReadDate = today;
    saveLocalProfile();
  }
}

function updateBookRating(ratingVal) {
  if (!selectedBookForDetail) return;
  selectedBookForDetail.rating = ratingVal;
  updateStarsUI(ratingVal);
  saveBookDetailChanges();
}

function updateStarsUI(ratingVal) {
  const stars = document.querySelectorAll('#detail-stars-container .star-icon');
  stars.forEach(star => {
    const val = parseInt(star.getAttribute('data-value') || star.dataset.value);
    if (val <= ratingVal) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function updatePaceEstimatorUI(book) {
  const paceRate = document.getElementById('detail-pace-rate');
  const paceTime = document.getElementById('detail-pace-time');
  
  if (book.currentPage >= book.pages) {
    paceRate.textContent = '-';
    paceTime.textContent = 'Completed!';
    return;
  }
  
  const pace = getAveragePace(book);
  const pagesLeft = book.pages - book.currentPage;
  const estDays = Math.ceil(pagesLeft / pace);
  
  paceRate.textContent = pace;
  paceTime.textContent = `Est. ${estDays}d`;
}

// Render progress reading logs in sheet
function renderDetailLogsList(book) {
  const listEl = document.getElementById('detail-logs-list');
  listEl.innerHTML = '';
  
  const logs = book.readingLogs || [];
  
  if (logs.length === 0) {
    listEl.innerHTML = '<li class="empty-log-msg" style="color:var(--text-secondary);font-size:11px;">No pages logged yet. Slide progress bar above to write logs.</li>';
    return;
  }

  // Reverse list order
  [...logs].reverse().forEach(log => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="log-date">${log.date}</span>
      <span class="log-pages">+${log.pagesLogged} pages</span>
    `;
    listEl.appendChild(li);
  });
}

// Render highlighted quotes in sheet
function renderDetailQuotes(book) {
  const listEl = document.getElementById('detail-quotes-list');
  listEl.innerHTML = '';
  
  const quotes = book.quotes || [];
  
  if (quotes.length === 0) {
    listEl.innerHTML = '<li class="empty-log-msg" style="color:var(--text-secondary);font-size:11px;">No quotes saved. Type quote text above.</li>';
    return;
  }

  quotes.forEach((q, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="quote-text-val">“${q.text}”</span>
      <button class="btn-delete-quote" data-idx="${idx}" title="Delete Quote">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
      </button>
    `;
    
    li.querySelector('.btn-delete-quote').addEventListener('click', (e) => {
      e.stopPropagation();
      book.quotes.splice(idx, 1);
      saveBookDetailChanges();
      renderDetailQuotes(book);
      updateQuoteOfTheDay();
      showToast("Quote deleted.");
    });
    
    listEl.appendChild(li);
  });
  lucide.createIcons();
}

function booksMatch(a, b) {
  if (a.isbn && b.isbn && a.isbn.trim() && a.isbn === b.isbn) {
    return true;
  }
  return (
    a.title.toLowerCase() === b.title.toLowerCase() &&
    a.author.toLowerCase() === b.author.toLowerCase()
  );
}

function getMatchingSavedBooks(book) {
  return books.filter(b => booksMatch(b, book));
}

function getCheckedDetailListIds() {
  const container = document.getElementById('detail-lists-checkboxes');
  if (!container) return new Set();
  return new Set(
    Array.from(container.querySelectorAll('input:checked')).map(input => input.value)
  );
}

function populateAddBookLists() {
  const container = document.getElementById('add-book-lists-checkboxes');
  container.innerHTML = '';

  const wantList = getListByNameFragment('Want to Read');

  lists.forEach(list => {
    const label = document.createElement('label');
    label.className = 'checkbox-option';

    const isChecked = wantList ? list.id === wantList.id : false;

    label.innerHTML = `
      <input type="checkbox" name="add-book-list" value="${list.id}" ${isChecked ? 'checked' : ''}>
      <span>${list.title}</span>
    `;
    container.appendChild(label);
  });
}

function populateDetailBookLists(book) {
  const container = document.getElementById('detail-lists-checkboxes');
  container.innerHTML = '';

  const matchingBooks = getMatchingSavedBooks(book);
  const checkedListIds = new Set(matchingBooks.map(b => b.listId).filter(Boolean));
  detailBookInitialListIds = new Set(checkedListIds);

  lists.forEach(list => {
    const label = document.createElement('label');
    label.className = 'checkbox-option';

    const isChecked = checkedListIds.has(list.id);

    label.innerHTML = `
      <input type="checkbox" class="detail-list-opt" value="${list.id}" ${isChecked ? 'checked' : ''}>
      <span>${list.title}</span>
    `;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (!requireAuth('update lists') || !selectedBookForDetail) return;
      saveDetailBookListChanges();
    });

    container.appendChild(label);
  });
}

async function saveDetailBookListChanges() {
  if (!selectedBookForDetail || !currentUser || detailListSaveInProgress) return;
  if (selectedBookForDetail.isApiPreview) return;
  if (
    selectedBookForDetail.id?.startsWith('discover-') ||
    selectedBookForDetail.id?.startsWith('fallback-')
  ) {
    return;
  }

  const currentListIds = getCheckedDetailListIds();
  const toAdd = [...currentListIds].filter(id => !detailBookInitialListIds.has(id));
  const toRemove = [...detailBookInitialListIds].filter(id => !currentListIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    saveBookDetailChanges();
    return;
  }

  detailListSaveInProgress = true;

  const bookPayload = {
    title: selectedBookForDetail.title,
    author: selectedBookForDetail.author,
    coverUrl: selectedBookForDetail.coverUrl,
    isbn: selectedBookForDetail.isbn,
    description: selectedBookForDetail.description
  };

  for (const listId of toAdd) {
    const { book, error } = await saveBookToList(currentUser.id, listId, bookPayload);
    if (error) {
      showToast(error);
      populateDetailBookLists(selectedBookForDetail);
      detailListSaveInProgress = false;
      return;
    }

    if (book && !books.some(b => b.id === book.id)) {
      books.push({ ...selectedBookForDetail, ...book, listId: book.listId });
      listBookCounts[listId] = (listBookCounts[listId] || 0) + 1;
    }
  }

  for (const listId of toRemove) {
    const savedRow = getMatchingSavedBooks(selectedBookForDetail).find(b => b.listId === listId);
    const { error } = savedRow
      ? await removeSavedBook(savedRow.id)
      : await removeSavedBookFromList(currentUser.id, listId, bookPayload);

    if (error) {
      showToast(error);
      populateDetailBookLists(selectedBookForDetail);
      detailListSaveInProgress = false;
      return;
    }

    books = books.filter(b => !(booksMatch(b, selectedBookForDetail) && b.listId === listId));
    listBookCounts[listId] = Math.max(0, (listBookCounts[listId] || 1) - 1);
  }

  detailBookInitialListIds = new Set(currentListIds);

  if (toRemove.includes(selectedBookForDetail.listId)) {
    const remaining = getMatchingSavedBooks(selectedBookForDetail);
    if (remaining.length === 0) {
      detailListSaveInProgress = false;
      renderActiveView();
      closeSheet(sheetBookDetail);
      showToast('Book removed from all selected lists.');
      return;
    }
    selectedBookForDetail = { ...remaining[0] };
  }

  detailListSaveInProgress = false;
  saveBookDetailChanges();

  if (toAdd.length > 0 || toRemove.length > 0) {
    const message =
      toAdd.length > 0 && toRemove.length > 0
        ? 'List assignments updated.'
        : toAdd.length > 0
          ? `Added to ${toAdd.length} list${toAdd.length === 1 ? '' : 's'}.`
          : `Removed from ${toRemove.length} list${toRemove.length === 1 ? '' : 's'}.`;
    showToast(message);
  }
}

function uncheckStatusListsExcept(...keepNameFragments) {
  const container = document.getElementById('detail-lists-checkboxes');
  if (!container) return;

  const keepIds = new Set(
    keepNameFragments
      .map(fragment => getListByNameFragment(fragment)?.id)
      .filter(Boolean)
  );

  ['Currently Reading', 'Want to Read', 'Completed', 'Abandoned'].forEach(fragment => {
    const list = getListByNameFragment(fragment);
    if (!list || keepIds.has(list.id)) return;
    const input = container.querySelector(`input[value="${list.id}"]`);
    if (input) input.checked = false;
  });
}

function updateBookListAssociationsFromChecks() {
  saveDetailBookListChanges();
}

function saveBookDetailChanges() {
  if (!selectedBookForDetail) return;

  if (selectedBookForDetail.isApiPreview) return;
  if (selectedBookForDetail.id?.startsWith('discover-') || selectedBookForDetail.id?.startsWith('fallback-')) {
    return;
  }

  books = books.map(b => b.id === selectedBookForDetail.id ? selectedBookForDetail : b);
  renderActiveView();
}

// 6. UPDATE HOMESCREEN QUOTE OF THE DAY
function updateQuoteOfTheDay() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  
  // Fetch quotes lists
  let userQuotes = [];
  books.forEach(b => {
    if (b.quotes && b.quotes.length > 0) {
      b.quotes.forEach(q => {
        userQuotes.push({ text: q.text, author: b.title });
      });
    }
  });

  if (userQuotes.length > 0) {
    const randomQuote = userQuotes[Math.floor(Math.random() * userQuotes.length)];
    quoteText.textContent = `“${randomQuote.text}”`;
    quoteAuthor.textContent = `— From: ${randomQuote.author}`;
  } else {
    const randomQuote = FAMOUS_QUOTES[Math.floor(Math.random() * FAMOUS_QUOTES.length)];
    quoteText.textContent = `“${randomQuote.text}”`;
    quoteAuthor.textContent = `— ${randomQuote.author}`;
  }
}

// 7. RENDER INSTAGRAM STORY CANVAS RENDERER (Share Shelf Modal)
function renderShareCanvas() {
  const canvas = document.getElementById('share-canvas');
  const canvasPreview = document.getElementById('share-canvas-preview');
  if (!canvas || !canvasPreview) return;

  const ctx = canvas.getContext('2d');
  
  // Theme styling configurations
  const lightBgGrad1 = '#FAF9F6';
  const lightBgGrad2 = '#EBE7DD';
  const darkBgGrad1 = '#0F0E0C';
  const darkBgGrad2 = '#1C1915';
  
  const bgGrad1 = darkMode ? darkBgGrad1 : lightBgGrad1;
  const bgGrad2 = darkMode ? darkBgGrad2 : lightBgGrad2;
  
  const textMainColor = darkMode ? '#FAF7F2' : '#1A1612';
  const textSubColor = darkMode ? '#A09587' : '#6E6458';

  // 1. Draw background gradient wallpaper
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, bgGrad1);
  gradient.addColorStop(1, bgGrad2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw ambient blurry background color spots
  ctx.save();
  ctx.globalAlpha = darkMode ? 0.08 : 0.15;
  ctx.fillStyle = '#93C6F7'; // blue spot
  ctx.beginPath();
  ctx.arc(200, 400, 350, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = '#F8ADC4'; // pink spot
  ctx.beginPath();
  ctx.arc(880, 1500, 400, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // 3. Draw clean border borders framing
  ctx.strokeStyle = textMainColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // 4. Draw Header Title
  ctx.textAlign = 'center';
  ctx.fillStyle = textMainColor;
  
  // App Title
  ctx.font = 'bold 72px "Playfair Display", Georgia, serif';
  ctx.fillText('Shelf Control', canvas.width / 2, 180);
  
  // Tagline
  ctx.font = 'italic 32px "Playfair Display", Georgia, serif';
  ctx.fillStyle = textSubColor;
  ctx.fillText('“because your books won\'t control themselves”', canvas.width / 2, 235);

  // 5. Draw Profile details card
  ctx.fillStyle = darkMode ? 'rgba(22, 19, 17, 0.65)' : 'rgba(255, 255, 255, 0.45)';
  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 4;
  
  // Rounded rect
  roundRect(ctx, 100, 320, canvas.width - 200, 300, 32, true, true);
  
  // Reader Name heading
  ctx.fillStyle = textMainColor;
  ctx.font = '800 48px "Outfit", sans-serif';
  ctx.fillText(profile.name, canvas.width / 2, 420);
  
  // Streak metrics
  ctx.fillStyle = '#E26E2F';
  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.fillText(`🔥 ${profile.streak || 0} DAY STREAK`, canvas.width / 2, 480);
  
  // Annual Challenge sub
  ctx.fillStyle = textSubColor;
  ctx.font = '600 28px "Outfit", sans-serif';
  const completedBooks = books.filter(b => b.lists.includes('completed'));
  ctx.fillText(`Goal Progress: ${completedBooks.length} of ${profile.annualGoal || 12} books read`, canvas.width / 2, 540);

  // 6. Draw circular motivational Ring charts
  const ratio = Math.min(1, completedBooks.length / (profile.annualGoal || 12));
  ctx.save();
  ctx.translate(canvas.width / 2, 800);
  
  // Circle BG track
  ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(26, 22, 18, 0.08)';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Circular arc progress
  ctx.strokeStyle = textMainColor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 100, -Math.PI / 2, (-Math.PI / 2) + (ratio * 2 * Math.PI));
  ctx.stroke();
  
  // Center Text labels
  ctx.fillStyle = textMainColor;
  ctx.font = 'bold 54px "Playfair Display", Georgia, serif';
  ctx.fillText(`${Math.round(ratio * 100)}%`, 0, 18);
  ctx.restore();

  // Draw statistics badge labels below ring
  ctx.fillStyle = textSubColor;
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.fillText('CHALLENGE COMPLETION', canvas.width / 2, 970);

  // 7. Draw Books Grid showcase
  ctx.fillStyle = textMainColor;
  ctx.font = 'bold 42px "Playfair Display", Georgia, serif';
  ctx.fillText('Top Shelved Books', canvas.width / 2, 1100);

  // Draw 3 top book cover representations using CSS canvas colors
  const topBooks = books.slice(0, 3);
  const startX = 150;
  const cardWidth = 220;
  const cardHeight = 330;
  const spacing = 60;
  
  const colorsMap = {
    'blue': '#D6E6F5',
    'pink': '#F8DEE6',
    'yellow': '#FAF0D2',
    'green': '#DAF0DC',
    'purple': '#EBEEFA',
    'peach': '#FCE2D2'
  };

  topBooks.forEach((book, idx) => {
    const x = startX + idx * (cardWidth + spacing);
    const y = 1180;
    
    // Draw card shadows and rect
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;
    
    ctx.fillStyle = colorsMap[book.color] || '#DCDCDC';
    roundRect(ctx, x, y, cardWidth, cardHeight, 18, true, false);
    ctx.restore();

    // Draw Book spine left highlight
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(x, y, 16, cardHeight);
    
    // Draw Title Text inside cover card
    ctx.fillStyle = darkMode ? '#1A1612' : '#1A1612'; // keep cover text dark for contrast
    ctx.font = 'bold 24px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'left';
    
    // Multi line title drawer helper
    wrapCanvasText(ctx, book.title, x + 30, y + 60, cardWidth - 50, 32, 4);
    
    // Draw Author Text at bottom
    ctx.font = '800 16px "Outfit", sans-serif';
    ctx.fillText(book.author.toUpperCase(), x + 30, y + cardHeight - 35, cardWidth - 50);
  });

  // Footer branding tag
  ctx.textAlign = 'center';
  ctx.fillStyle = textSubColor;
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.fillText('shelfcontrol.app', canvas.width / 2, 1830);

  // 8. Draw Preview scaling onto canvas preview elements
  const previewCtx = canvasPreview.getContext('2d');
  previewCtx.drawImage(canvas, 0, 0, canvasPreview.width, canvasPreview.height);
}

// Canvas Rounded rectangle drawer helper
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Canvas text wrap utility
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line.trim() + '...', x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// 8. SCHEDULER: DAILY REMINDERS ALARM
function checkReadingReminders() {
  if (!profile || !profile.reminderEnabled) return;
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Trigger once daily
  if (profile.lastReminderSentDate === todayStr) return;
  
  const [remHour, remMin] = profile.reminderTime.split(':').map(Number);
  if (now.getHours() > remHour || (now.getHours() === remHour && now.getMinutes() >= remMin)) {
    if (Notification.permission === 'granted') {
      new Notification("📚 Shelf Control Daily Reminder", {
        body: `Hey ${profile.name}! It's time for your daily reading challenge. Let's flip some pages!`,
        icon: 'https://covers.openlibrary.org/b/isbn/9780593465066-M.jpg'
      });
      profile.lastReminderSentDate = todayStr;
      saveUserProfile(profile);
    }
  }
}

// Premium Toast alert system
function showToast(msg) {
  const oldToast = document.querySelector('.premium-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'premium-toast glass';
  
  // Apply style parameters in script to avoid stylesheet breaking
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    padding: '12px 20px',
    borderRadius: '16px',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-md)',
    opacity: '0',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
  });

  toast.innerHTML = `<i data-lucide="sparkles" style="color:var(--accent-yellow)"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  lucide.createIcons();
  
  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 50);
  
  // Remove out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

// MODAL CONTROLLERS
function openModal(modal) {
  modal.classList.remove('hidden');
  modal.style.opacity = '1';
}

function closeModal(modal) {
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function openSheet(sheet) {
  sheet.classList.remove('hidden');
  sheet.style.opacity = '1';
}

function closeSheet(sheet) {
  sheet.style.opacity = '0';
  setTimeout(() => {
    sheet.classList.add('hidden');
    if (sheet === sheetBookDetail) {
      detailBookInitialListIds = new Set();
    }
    selectedBookForDetail = null;
  }, 200);
}
