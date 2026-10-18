// Optional Auth helpers. AppContext uses the same Supabase client directly.
import { supabase } from './supabase';
function client() {
  if (!supabase) throw Error('Supabase sozlamalari kiritilmagan.');
  return supabase;
}
function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}
export async function signIn(email, password) {
  return checked(await client().auth.signInWithPassword({
    email,
    password
  }));
}
export async function signOut() {
  return checked(await client().auth.signOut());
}
export async function currentSession() {
  return checked(await client().auth.getSession());
}
export async function changeCredentials(fields) {
  return checked(await client().auth.updateUser(fields));
}
export async function requestPasswordReset(email, redirectTo) {
  return checked(await client().auth.resetPasswordForEmail(email, {
    redirectTo
  }));
}
export function observeSession(callback) {
  return client().auth.onAuthStateChange(callback).data.subscription;
}
