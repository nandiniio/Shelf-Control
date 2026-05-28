import {
  getBooks,
  saveBooks,
  getLists,
  saveLists,
  getUserProfile,
  saveUserProfile,
  clearAllData,
  initializeStorage
} from './data.js';

// Application State
let books = [];
let lists = [];
let profile = null;
let currentActiveView = 'home';
let selectedBookForDetail = null;
let darkMode = false;

// DOM Elements
const onboardingScreen = document.getElementById('onboarding-screen');
const appContainer = document.getElementById('app-container');
const signupForm = document.getElementById('signup-form');
const signupNameInput = document.getElementById('signup-name');
const signupGoalInput = document.getElementById('signup-goal');
const signupGenreInput = document.getElementById('signup-genre');

const headerUsername = document.getElementById('header-username');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const bottomNavbar = document.querySelector('.bottom-navbar');
const navItems = document.querySelectorAll('.nav-item');
const appViews = document.querySelectorAll('.app-view');

// Modal / Sheet elements
const modalCreateList = document.getElementById('modal-create-list');
const sheetAddBook = document.getElementById('sheet-add-book');
const sheetBookDetail = document.getElementById('sheet-book-detail');

// Profile Settings Elements
const btnToggleSettings = document.getElementById('btn-toggle-settings');
const profileSettingsSection = document.getElementById('profile-settings-section');
const profileEditForm = document.getElementById('profile-edit-form');
const editProfileName = document.getElementById('edit-profile-name');
const editProfileGoal = document.getElementById('edit-profile-goal');
const editProfileGenre = document.getElementById('edit-profile-genre');
const btnCancelSettings = document.getElementById('btn-cancel-settings');

// Init application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  profile = getUserProfile();
  
  // Theme check
  const savedDarkMode = localStorage.getItem('shelf_control_dark_mode') === 'true';
  setTheme(savedDarkMode);

  if (!profile) {
    // Show signup onboarding guard
    onboardingScreen.classList.add('onboarding-active');
    onboardingScreen.classList.remove('onboarding-hidden');
    appContainer.classList.add('app-hidden');
  } else {
    // Skip to app
    onboardingScreen.classList.add('onboarding-hidden');
    onboardingScreen.classList.remove('onboarding-active');
    appContainer.classList.remove('app-hidden');
    
    // Load states
    books = getBooks();
    lists = getLists();
    
    updateHeader();
    renderActiveView();
  }
  
  setupEventListeners();
  lucide.createIcons();
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

// OPEN LIBRARY COVER FETCH API
async function fetchBookCover(title, author) {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://openlibrary.org/search.json?q=${query}&limit=1`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      }
    }
  } catch (error) {
    console.error('Failed to retrieve book cover from Open Library:', error);
  }
  return null;
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  // Theme Toggle Button click
  btnThemeToggle.addEventListener('click', () => {
    setTheme(!darkMode);
  });

  // Signup Submit
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = signupNameInput.value.trim();
    const goal = parseInt(signupGoalInput.value) || 12;
    const favoriteGenre = signupGenreInput.value;
    const librarySetupOption = document.querySelector('input[name="signup-library-option"]:checked').value;
    
    // Initialize storage based on their sample vs clean choice
    const startWithSample = librarySetupOption === 'sample';
    initializeStorage(startWithSample);
    
    profile = {
      name: name,
      annualGoal: goal,
      favoriteGenre: favoriteGenre,
      streak: 1,
      lastReadDate: new Date().toISOString().split('T')[0]
    };
    
    saveUserProfile(profile);
    books = getBooks();
    lists = getLists();
    
    updateHeader();
    
    // Transition views
    onboardingScreen.classList.add('onboarding-hidden');
    onboardingScreen.classList.remove('onboarding-active');
    appContainer.classList.remove('app-hidden');
    
    switchView('home');
  });

  // Tab switcher
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view;
      switchView(viewId);
    });
  });

  // Action Buttons clicks
  document.getElementById('btn-create-list').addEventListener('click', () => {
    openModal(modalCreateList);
  });
  
  document.getElementById('btn-add-book').addEventListener('click', () => {
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
  
  document.getElementById('btn-close-book-detail').addEventListener('click', () => {
    closeSheet(sheetBookDetail);
  });

  // Create List Form Submit
  document.getElementById('create-list-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('list-name').value.trim();
    const color = document.querySelector('input[name="list-color"]:checked').value;
    
    const newList = {
      id: 'list-' + Date.now(),
      title: title,
      color: color,
      isSystem: false
    };
    
    lists.push(newList);
    saveLists(lists);
    closeModal(modalCreateList);
    document.getElementById('create-list-form').reset();
    
    renderHome();
  });

  // Add Book Form Submit
  document.getElementById('add-book-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const pages = parseInt(document.getElementById('book-pages').value);
    const genre = document.getElementById('book-genre').value;
    const description = document.getElementById('book-description').value.trim();
    const color = document.querySelector('input[name="book-color"]:checked').value;
    
    const checkedBoxes = document.querySelectorAll('#add-book-lists-checkboxes input:checked');
    const assignedLists = Array.from(checkedBoxes).map(box => box.value);
    
    if (assignedLists.length === 0) {
      assignedLists.push('want-to-read');
    }

    const isCompleted = assignedLists.includes('completed');

    const newBook = {
      id: 'book-' + Date.now(),
      title: title,
      author: author,
      pages: pages,
      currentPage: isCompleted ? pages : 0,
      rating: 0,
      lists: assignedLists,
      color: color,
      genre: genre,
      description: description || 'No summary available.',
      coverUrl: '', // Starts empty, populated by API in background
      dateAdded: new Date().toISOString()
    };

    if (isCompleted) {
      newBook.dateCompleted = new Date().toISOString();
    }

    books.push(newBook);
    saveBooks(books);
    
    closeSheet(sheetAddBook);
    document.getElementById('add-book-form').reset();
    
    // Render current layout immediately
    renderActiveView();

    // Async Fetch Cover from API in the background
    fetchBookCover(title, author).then(coverUrl => {
      if (coverUrl) {
        // Update URL
        newBook.coverUrl = coverUrl;
        books = books.map(b => b.id === newBook.id ? newBook : b);
        saveBooks(books);
        renderActiveView(); // Repopulates view with cover loaded!
      }
    });
  });

  // Back from details subview
  document.getElementById('btn-back-to-lists').addEventListener('click', () => {
    document.getElementById('list-books-subview').classList.add('hidden');
    document.getElementById('lists-container').classList.remove('hidden');
  });

  // Profile - Reading Challenge Goal change
  document.getElementById('btn-update-goal').addEventListener('click', () => {
    const inputVal = parseInt(document.getElementById('challenge-goal-input').value);
    if (inputVal > 0) {
      profile.annualGoal = inputVal;
      saveUserProfile(profile);
      renderProfile();
    }
  });

  // Profile - Settings Edit Toggles
  btnToggleSettings.addEventListener('click', () => {
    editProfileName.value = profile.name;
    editProfileGoal.value = profile.annualGoal;
    editProfileGenre.value = profile.favoriteGenre || 'Fiction';
    
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
    
    saveUserProfile(profile);
    updateHeader();
    renderProfile();
    
    profileSettingsSection.classList.add('hidden');
    document.querySelector('.profile-actions-grid').classList.remove('hidden');
  });

  // Profile - Reset Data / Sign Out
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out and clear all books/lists? This action cannot be undone.')) {
      clearAllData();
      location.reload();
    }
  });

  // Search filter
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  
  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (val.length > 0) {
      searchClearBtn.classList.remove('hidden');
      performSearch(val);
    } else {
      searchClearBtn.classList.add('hidden');
      document.getElementById('search-results-container').classList.add('hidden');
      document.getElementById('search-categories').classList.remove('hidden');
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    document.getElementById('search-results-container').classList.add('hidden');
    document.getElementById('search-categories').classList.remove('hidden');
  });

  document.querySelectorAll('.search-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetGenre = card.dataset.searchGenre;
      searchInput.value = targetGenre;
      searchClearBtn.classList.remove('hidden');
      performSearch(targetGenre);
    });
  });

  // Explore Genre Chip filter click
  document.querySelectorAll('.genre-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderExplore(chip.dataset.genre);
    });
  });

  // Book Detail inputs sync
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

  // Star Ratings Clicks
  document.querySelectorAll('#detail-stars-container .star-icon').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value);
      updateBookRating(val);
    });
  });

  // Delete Book
  document.getElementById('btn-delete-book').addEventListener('click', () => {
    if (confirm(`Remove "${selectedBookForDetail.title}" from your library?`)) {
      books = books.filter(b => b.id !== selectedBookForDetail.id);
      saveBooks(books);
      closeSheet(sheetBookDetail);
      renderActiveView();
    }
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
  books = getBooks();
  lists = getLists();
  profile = getUserProfile();

  switch (currentActiveView) {
    case 'home':
      renderHome();
      break;
    case 'explore':
      renderExplore('all');
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
  if (profile) {
    headerUsername.textContent = profile.name;
  }
}

// 1. RENDER HOME
function renderHome() {
  const container = document.getElementById('lists-container');
  container.innerHTML = '';
  
  const listIcons = {
    'currently-reading': 'book-open',
    'want-to-read': 'bookmark',
    'completed': 'check-circle',
    'favorites': 'heart'
  };

  lists.forEach(list => {
    const count = books.filter(b => b.lists.includes(list.id)).length;
    const iconName = listIcons[list.id] || 'folder';

    const card = document.createElement('div');
    card.className = `list-card pastel-${list.color} animate-btn`;
    card.innerHTML = `
      <div class="list-card-icon-wrap">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="list-card-details">
        <h3 class="list-card-title">${list.title}</h3>
        <span class="list-card-count">${count} ${count === 1 ? 'book' : 'books'}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      openListBooksSubview(list);
    });

    container.appendChild(card);
  });
  
  lucide.createIcons();
}

function openListBooksSubview(list) {
  const listsContainer = document.getElementById('lists-container');
  const subview = document.getElementById('list-books-subview');
  const subviewTitle = document.getElementById('subview-list-title');
  const subviewCount = document.getElementById('subview-list-count');
  const subviewGrid = document.getElementById('list-books-grid');
  
  listsContainer.classList.add('hidden');
  subview.classList.remove('hidden');
  
  subviewTitle.textContent = list.title;
  
  const listBooks = books.filter(b => b.lists.includes(list.id));
  subviewCount.textContent = `${listBooks.length} ${listBooks.length === 1 ? 'book' : 'books'}`;
  
  subviewGrid.innerHTML = '';
  
  if (listBooks.length === 0) {
    subviewGrid.innerHTML = `
      <div class="empty-state-notice" style="grid-column: span 2; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
        <i data-lucide="inbox" style="width: 40px; height: 40px; margin-bottom: 8px; opacity: 0.5;"></i>
        <p style="font-size: 14px; font-weight: 500;">No books in this list yet.</p>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Tap "Add Book" above to stock your shelf.</p>
      </div>
    `;
  } else {
    listBooks.forEach(book => {
      subviewGrid.appendChild(createBookCard(book));
    });
  }
  
  lucide.createIcons();
}

// Generate Book Cards (Supports Real Cover + Fallback Cover styling)
function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  
  const hasProgress = book.currentPage > 0 || book.lists.includes('currently-reading');
  const percent = Math.min(100, Math.round((book.currentPage / book.pages) * 100)) || 0;
  
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
          <span class="progress-mini-text">${percent}%</span>
        </div>
      ` : ''}
    </div>
  `;
  
  card.addEventListener('click', () => {
    openBookDetailSheet(book);
  });
  
  return card;
}

// 2. RENDER EXPLORE
function renderExplore(genreFilter = 'all') {
  const popularRow = document.getElementById('explore-popular-row');
  const picksRow = document.getElementById('explore-picks-row');
  
  popularRow.innerHTML = '';
  picksRow.innerHTML = '';
  
  let popularBooks = [...books];
  if (genreFilter !== 'all') {
    popularBooks = popularBooks.filter(b => b.genre === genreFilter);
  }
  
  let pickBooks = books.filter(b => b.rating >= 4 || b.id === 'book-tomorrow' || b.id === 'book-educated');
  if (genreFilter !== 'all') {
    pickBooks = pickBooks.filter(b => b.genre === genreFilter);
  }

  if (popularBooks.length === 0) {
    popularRow.innerHTML = `<div class="empty-row-text">No books found for this genre.</div>`;
  } else {
    popularBooks.forEach(book => {
      popularRow.appendChild(createBookCard(book));
    });
  }

  if (pickBooks.length === 0) {
    picksRow.innerHTML = `<div class="empty-row-text">No books found for this genre.</div>`;
  } else {
    pickBooks.forEach(book => {
      picksRow.appendChild(createBookCard(book));
    });
  }
  
  lucide.createIcons();
}

// 3. RENDER SEARCH
function performSearch(query) {
  const categoriesGrid = document.getElementById('search-categories');
  const resultsContainer = document.getElementById('search-results-container');
  const resultsGrid = document.getElementById('search-results-grid');
  const resultsHeader = document.getElementById('search-results-header');
  
  categoriesGrid.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsGrid.innerHTML = '';
  
  const lowerQuery = query.toLowerCase();
  const matchedBooks = books.filter(book => {
    return (
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      book.genre.toLowerCase().includes(lowerQuery) ||
      book.description.toLowerCase().includes(lowerQuery)
    );
  });
  
  resultsHeader.textContent = `Search Results (${matchedBooks.length})`;
  
  if (matchedBooks.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state-notice" style="grid-column: span 2; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i data-lucide="frown" style="width: 40px; height: 40px; margin-bottom: 8px; opacity: 0.5;"></i>
        <p style="font-size: 14px; font-weight: 600;">No matches found</p>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Try adjusting spelling or searching other keywords.</p>
      </div>
    `;
  } else {
    matchedBooks.forEach(book => {
      resultsGrid.appendChild(createBookCard(book));
    });
  }
  
  lucide.createIcons();
}

// 4. RENDER PROFILE
function renderProfile() {
  const profileName = document.getElementById('profile-name');
  const profileInitials = document.getElementById('profile-initials');
  const statBooks = document.getElementById('stat-books-count');
  const statPages = document.getElementById('stat-pages-count');
  const statAvg = document.getElementById('stat-avg-rating');
  const statStreak = document.getElementById('stat-streak');
  const goalDisplay = document.getElementById('challenge-goal-display');
  const goalInput = document.getElementById('challenge-goal-input');
  
  profileName.textContent = profile.name;
  profileInitials.textContent = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'R';
  
  const completedBooks = books.filter(b => b.lists.includes('completed'));
  const totalPages = books.reduce((sum, b) => sum + (parseInt(b.currentPage) || 0), 0);
  
  const ratedBooks = books.filter(b => b.rating > 0);
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
    : '0.0';
    
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
      saveUserProfile(profile);
    }
  }

  statBooks.textContent = completedBooks.length;
  statPages.textContent = totalPages;
  statAvg.textContent = avgRating;
  statStreak.textContent = `${streakDays}d`;
  
  const annualGoal = profile.annualGoal || 12;
  goalDisplay.textContent = annualGoal;
  goalInput.value = annualGoal;
  
  renderProgressRing(completedBooks.length, annualGoal);
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

// SLIDE-UP DETAIL SHEETS
function openBookDetailSheet(book) {
  selectedBookForDetail = book;
  
  const detailGenre = document.getElementById('detail-genre');
  const detailCoverImageContainer = document.getElementById('detail-cover-image-container');
  const detailCoverImage = document.getElementById('detail-cover-image');
  const detailCoverRendered = document.getElementById('detail-cover-rendered');
  
  const detailCoverTitle = document.getElementById('detail-cover-title');
  const detailCoverAuthor = document.getElementById('detail-cover-author');
  const detailTitle = document.getElementById('detail-title');
  const detailAuthor = document.getElementById('detail-author');
  const detailDescription = document.getElementById('detail-description');
  
  const progressPercent = document.getElementById('detail-progress-percent');
  const progressSlider = document.getElementById('detail-progress-slider');
  const progressCurrent = document.getElementById('detail-progress-current');
  const progressTotal = document.getElementById('detail-progress-total');

  detailGenre.textContent = book.genre;
  detailCoverTitle.textContent = book.title;
  detailCoverAuthor.textContent = book.author;
  detailTitle.textContent = book.title;
  detailAuthor.textContent = `by ${book.author}`;
  detailDescription.textContent = book.description || 'No description available.';
  
  // Choose Image Cover vs CSS Rendered Cover
  if (book.coverUrl && book.coverUrl.trim().length > 0) {
    detailCoverImage.src = book.coverUrl;
    detailCoverImageContainer.classList.remove('hidden');
    detailCoverRendered.classList.add('hidden');
  } else {
    detailCoverImageContainer.classList.add('hidden');
    detailCoverRendered.classList.remove('hidden');
    detailCoverRendered.className = `rendered-book-cover large-cover pastel-${book.color}`;
  }
  
  progressTotal.textContent = book.pages;
  progressCurrent.value = book.currentPage;
  
  const percent = Math.min(100, Math.round((book.currentPage / book.pages) * 100)) || 0;
  progressPercent.textContent = `${percent}%`;
  progressSlider.value = percent;
  
  populateDetailBookLists(book);
  updateStarsUI(book.rating);

  openSheet(sheetBookDetail);
}

function updateDetailProgressLive(currentPageVal) {
  if (!selectedBookForDetail) return;
  
  selectedBookForDetail.currentPage = currentPageVal;
  const percent = Math.min(100, Math.round((currentPageVal / selectedBookForDetail.pages) * 100)) || 0;
  
  document.getElementById('detail-progress-percent').textContent = `${percent}%`;
  
  const currentlyReadingCheck = document.querySelector('.detail-list-opt[value="currently-reading"]');
  const wantToReadCheck = document.querySelector('.detail-list-opt[value="want-to-read"]');
  const completedCheck = document.querySelector('.detail-list-opt[value="completed"]');
  
  if (currentPageVal === selectedBookForDetail.pages) {
    if (completedCheck && !completedCheck.checked) {
      completedCheck.checked = true;
      if (currentlyReadingCheck) currentlyReadingCheck.checked = false;
      if (wantToReadCheck) wantToReadCheck.checked = false;
      selectedBookForDetail.dateCompleted = new Date().toISOString();
      updateBookListAssociationsFromChecks();
    }
  } else if (currentPageVal > 0 && currentPageVal < selectedBookForDetail.pages) {
    if (currentlyReadingCheck && !currentlyReadingCheck.checked) {
      currentlyReadingCheck.checked = true;
      if (completedCheck) completedCheck.checked = false;
      if (wantToReadCheck) wantToReadCheck.checked = false;
      updateBookListAssociationsFromChecks();
    }
  } else if (currentPageVal === 0) {
    if (wantToReadCheck && !wantToReadCheck.checked && !completedCheck.checked) {
      wantToReadCheck.checked = true;
      if (currentlyReadingCheck) currentlyReadingCheck.checked = false;
      updateBookListAssociationsFromChecks();
    }
  }

  // Reading streak tracking
  const today = new Date().toISOString().split('T')[0];
  if (profile.lastReadDate !== today) {
    profile.streak = (profile.streak || 0) + 1;
    profile.lastReadDate = today;
    saveUserProfile(profile);
  }

  saveBookDetailChanges();
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
    const val = parseInt(star.dataset.value);
    if (val <= ratingVal) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function populateAddBookLists() {
  const container = document.getElementById('add-book-lists-checkboxes');
  container.innerHTML = '';
  
  lists.forEach(list => {
    const label = document.createElement('label');
    label.className = 'checkbox-option';
    
    const isChecked = list.id === 'want-to-read';
    
    label.innerHTML = `
      <input type="checkbox" value="${list.id}" ${isChecked ? 'checked' : ''}>
      <span>${list.title}</span>
    `;
    container.appendChild(label);
  });
}

function populateDetailBookLists(book) {
  const container = document.getElementById('detail-lists-checkboxes');
  container.innerHTML = '';
  
  lists.forEach(list => {
    const label = document.createElement('label');
    label.className = 'checkbox-option';
    
    const isChecked = book.lists.includes(list.id);
    
    label.innerHTML = `
      <input type="checkbox" class="detail-list-opt" value="${list.id}" ${isChecked ? 'checked' : ''}>
      <span>${list.title}</span>
    `;
    
    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      const val = checkbox.value;
      const isChecked = checkbox.checked;
      
      if (isChecked) {
        if (val === 'completed') {
          uncheckDetailOptions(['currently-reading', 'want-to-read']);
          selectedBookForDetail.currentPage = selectedBookForDetail.pages;
          document.getElementById('detail-progress-current').value = selectedBookForDetail.pages;
          document.getElementById('detail-progress-slider').value = 100;
          document.getElementById('detail-progress-percent').textContent = '100%';
          selectedBookForDetail.dateCompleted = new Date().toISOString();
        } else if (val === 'currently-reading') {
          uncheckDetailOptions(['completed', 'want-to-read']);
          if (selectedBookForDetail.currentPage === 0) {
            selectedBookForDetail.currentPage = 1;
            document.getElementById('detail-progress-current').value = 1;
            document.getElementById('detail-progress-slider').value = Math.round((1 / selectedBookForDetail.pages) * 100);
            document.getElementById('detail-progress-percent').textContent = `${Math.round((1 / selectedBookForDetail.pages) * 100)}%`;
          }
        } else if (val === 'want-to-read') {
          uncheckDetailOptions(['currently-reading', 'completed']);
          selectedBookForDetail.currentPage = 0;
          document.getElementById('detail-progress-current').value = 0;
          document.getElementById('detail-progress-slider').value = 0;
          document.getElementById('detail-progress-percent').textContent = '0%';
        }
      }
      
      updateBookListAssociationsFromChecks();
    });

    container.appendChild(label);
  });
}

function uncheckDetailOptions(ids) {
  ids.forEach(id => {
    const opt = document.querySelector(`.detail-list-opt[value="${id}"]`);
    if (opt) opt.checked = false;
  });
}

function updateBookListAssociationsFromChecks() {
  const checkboxes = document.querySelectorAll('.detail-list-opt:checked');
  selectedBookForDetail.lists = Array.from(checkboxes).map(box => box.value);
  
  if (selectedBookForDetail.lists.length === 0) {
    const wantToReadOpt = document.querySelector('.detail-list-opt[value="want-to-read"]');
    if (wantToReadOpt) {
      wantToReadOpt.checked = true;
      selectedBookForDetail.lists.push('want-to-read');
    }
  }
  
  saveBookDetailChanges();
}

function saveBookDetailChanges() {
  if (!selectedBookForDetail) return;
  
  books = books.map(b => b.id === selectedBookForDetail.id ? selectedBookForDetail : b);
  saveBooks(books);
  
  renderActiveView();
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
    selectedBookForDetail = null;
  }, 200);
}
