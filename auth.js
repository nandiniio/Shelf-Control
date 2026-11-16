import { supabase } from './supabase.js';

export function getFriendlyAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';

  const message = typeof error === 'string'
    ? error
    : (error.message || error.error_description || error.description || '');

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
  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (
    message.includes('access_denied') ||
    message.toLowerCase().includes('cancelled') ||
    message.toLowerCase().includes('canceled') ||
    message.toLowerCase().includes('popup_closed')
  ) {
    return 'Google sign-in was cancelled. Please try again.';
  }
  if (message.includes('provider is not enabled') || message.includes('Unsupported provider')) {
    return 'Google Sign-In is not enabled yet in your Supabase project settings.';
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

export function getRedirectUrl() {
  return import.meta.env.VITE_SITE_URL || window.location.origin;
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  });

  if (error) {
    return { data: null, error: getFriendlyAuthError(error) };
  }

  return { data, error: null };
}

export async function sendPasswordResetEmail(email) {
  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    return { data: null, error: getFriendlyAuthError(error) };
  }

  return { data, error: null };
}

export async function updateUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    return { user: null, error: getFriendlyAuthError(error) };
  }

  return { user: data.user, error: null };
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}

export function getDisplayName(user) {
  if (!user) return 'Reader';
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.username?.split('@')[0] ||
    user.email?.split('@')[0] ||
    'Reader'
  );
}
