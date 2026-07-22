import { supabase } from './supabase.js';

export function getFriendlyDbError(error) {
  if (!error) return 'Something went wrong. Please try again.';

  const message = error.message || '';
  const code = error.code || '';

  if (code === '23505') {
    if (message.includes('follows')) {
      return 'You are already following this reader.';
    }
    return 'This item already exists.';
  }
  if (code === '23503') {
    return 'That list or book no longer exists.';
  }
  if (code === '42501' || message.includes('permission denied') || message.includes('RLS')) {
    return 'You do not have permission to do that. Please sign in again.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Network error. Check your connection and try again.';
  }
  if (message.includes('JWT')) {
    return 'Your session expired. Please sign in again.';
  }
  if (
    code === 'PGRST116' ||
    message.includes('Cannot coerce the result to a single JSON object') ||
    message.includes('JSON object requested, multiple (or no) rows returned')
  ) {
    return 'The requested item was not found.';
  }

  return message;
}

const DEFAULT_LIST_COLORS = {
  'Currently Reading': 'blue',
  'Want to Read': 'yellow',
  'Completed': 'green',
  'Abandoned': 'peach',
  'Favorites': 'pink'
};

const CUSTOM_COLOR_PREFIX = 'color:';

export function mapListRow(row, index = 0) {
  let icon = row.icon || 'folder';
  let color = DEFAULT_LIST_COLORS[row.name];

  if (icon.startsWith(CUSTOM_COLOR_PREFIX)) {
    color = icon.slice(CUSTOM_COLOR_PREFIX.length);
    icon = 'folder';
  }

  if (!color) {
    const palette = ['blue', 'pink', 'yellow', 'green', 'purple', 'peach'];
    color = palette[index % palette.length];
  }

  return {
    id: row.id,
    title: row.name,
    icon,
    color,
    isSystem: row.is_default === true,
    userId: row.user_id
  };
}

export function mapSavedBookRow(row) {
  return {
    id: row.id,
    title: row.book_title,
    author: row.author || 'Unknown Author',
    coverUrl: row.cover_url || '',
    isbn: row.isbn || '',
    description: row.description || 'No summary available.',
    listId: row.list_id,
    userId: row.user_id,
    pages: 300,
    currentPage: 0,
    rating: 0,
    color: getRandomPastelColor(),
    genre: 'Fiction',
    readingLogs: [],
    quotes: [],
    notes: ''
  };
}

function getRandomPastelColor() {
  const colors = ['blue', 'pink', 'yellow', 'green', 'purple', 'peach'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function fetchLists(userId) {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return { lists: [], error: getFriendlyDbError(error) };
  }

  return { lists: (data || []).map(mapListRow), error: null };
}

export async function createList(userId, name, icon, color) {
  const iconValue = color ? `${CUSTOM_COLOR_PREFIX}${color}` : icon;

  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      icon: iconValue,
      is_default: false
    })
    .select()
    .maybeSingle();

  if (error) {
    return { list: null, error: getFriendlyDbError(error) };
  }

  return { list: mapListRow(data), error: null };
}

export async function renameList(listId, name) {
  const { data, error } = await supabase
    .from('lists')
    .update({ name })
    .eq('id', listId)
    .select()
    .maybeSingle();

  if (error) {
    return { list: null, error: getFriendlyDbError(error) };
  }

  if (!data) {
    return { list: null, error: 'That list no longer exists.' };
  }

  return { list: mapListRow(data), error: null };
}

export async function deleteList(listId) {
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId);

  if (error) {
    return { error: getFriendlyDbError(error) };
  }

  return { error: null };
}

export async function fetchSavedBooks(userId) {
  const { data, error } = await supabase
    .from('saved_books')
    .select('*')
    .eq('user_id', userId)
    .order('book_title', { ascending: true });

  if (error) {
    return { books: [], error: getFriendlyDbError(error) };
  }

  return { books: (data || []).map(mapSavedBookRow), error: null };
}

export async function fetchSavedBooksByList(listId) {
  const { data, error } = await supabase
    .from('saved_books')
    .select('*')
    .eq('list_id', listId)
    .order('book_title', { ascending: true });

  if (error) {
    return { books: [], error: getFriendlyDbError(error) };
  }

  return { books: (data || []).map(mapSavedBookRow), error: null };
}

export async function findSavedBookInList(userId, listId, book) {
  let query = supabase
    .from('saved_books')
    .select('*')
    .eq('user_id', userId)
    .eq('list_id', listId);

  if (book.isbn && book.isbn.trim()) {
    query = query.eq('isbn', book.isbn.trim());
  } else {
    query = query
      .eq('book_title', book.title)
      .eq('author', book.author || 'Unknown Author');
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { book: null, error: getFriendlyDbError(error) };
  }

  return { book: data ? mapSavedBookRow(data) : null, error: null };
}

export async function saveBookToList(userId, listId, book) {
  const existing = await findSavedBookInList(userId, listId, book);
  if (existing.error) {
    return { book: null, error: existing.error };
  }
  if (existing.book) {
    return { book: existing.book, error: null };
  }

  const { data, error } = await supabase
    .from('saved_books')
    .insert({
      user_id: userId,
      list_id: listId,
      book_title: book.title,
      author: book.author,
      cover_url: book.coverUrl || '',
      isbn: book.isbn || '',
      description: book.description || ''
    })
    .select()
    .maybeSingle();

  if (error) {
    return { book: null, error: getFriendlyDbError(error) };
  }

  return { book: data ? mapSavedBookRow(data) : null, error: null };
}

export async function removeSavedBookFromList(userId, listId, book) {
  const { book: savedBook, error: findError } = await findSavedBookInList(userId, listId, book);
  if (findError) {
    return { error: findError };
  }
  if (!savedBook) {
    return { error: null };
  }

  return removeSavedBook(savedBook.id);
}

export async function removeSavedBook(bookId) {
  const { error } = await supabase
    .from('saved_books')
    .delete()
    .eq('id', bookId);

  if (error) {
    return { error: getFriendlyDbError(error) };
  }

  return { error: null };
}

export async function getListBookCounts(userId) {
  const { data, error } = await supabase
    .from('saved_books')
    .select('list_id')
    .eq('user_id', userId);

  if (error) {
    return { counts: {}, error: getFriendlyDbError(error) };
  }

  const counts = {};
  (data || []).forEach(row => {
    counts[row.list_id] = (counts[row.list_id] || 0) + 1;
  });

  return { counts, error: null };
}

export async function followUser(followerId, followingId) {
  if (followerId === followingId) {
    return { error: 'You cannot follow yourself.' };
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    return { error: getFriendlyDbError(error) };
  }

  return { error: null };
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    return { error: getFriendlyDbError(error) };
  }

  return { error: null };
}

export async function isFollowing(followerId, followingId) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) {
    return { following: false, error: getFriendlyDbError(error) };
  }

  return { following: !!data, error: null };
}

export async function getFollowers(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);

  if (error) {
    return { userIds: [], error: getFriendlyDbError(error) };
  }

  return { userIds: (data || []).map(row => row.follower_id), error: null };
}

export async function getFollowing(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) {
    return { userIds: [], error: getFriendlyDbError(error) };
  }

  return { userIds: (data || []).map(row => row.following_id), error: null };
}

export async function getFollowCounts(userId) {
  const [followersResult, followingResult] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
  ]);

  if (followersResult.error) {
    return { followers: 0, following: 0, error: getFriendlyDbError(followersResult.error) };
  }
  if (followingResult.error) {
    return { followers: 0, following: 0, error: getFriendlyDbError(followingResult.error) };
  }

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    error: null
  };
}

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    return { user: null, error: getFriendlyDbError(error) };
  }

  if (!data) {
    return { user: null, error: 'No reader found with that email.' };
  }

  return {
    user: {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0]
    },
    error: null
  };
}
