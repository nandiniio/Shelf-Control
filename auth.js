import { supabase } from './supabase.js';

export function getFriendlyAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';

  const message = error.message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('Unable to validate email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Network error. Check your connection and try again.';
  }

  return message;
}

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });

  if (error) {
    return { user: null, session: null, error: getFriendlyAuthError(error) };
  }

  return { user: data.user, session: data.session, error: null };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, session: null, error: getFriendlyAuthError(error) };
  }

  return { user: data.user, session: data.session, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: getFriendlyAuthError(error) };
  }

  return { error: null };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error: getFriendlyAuthError(error) };
  }

  return { session: data.session, error: null };
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}

export function getDisplayName(user) {
  if (!user) return 'Reader';
  return user.user_metadata?.name || user.email?.split('@')[0] || 'Reader';
}
