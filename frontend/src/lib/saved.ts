import { useSyncExternalStore } from 'react';
import type { Post } from './api';

// Sauvegardes gardées sur l'appareil, en attendant une route serveur dédiée.
const KEY = 'hw.saved';
const EVENT = 'hw:saved';

function read(): Post[] {
  try {
    const value = localStorage.getItem(KEY);
    return value ? (JSON.parse(value) as Post[]) : [];
  } catch {
    return [];
  }
}

let cache: Post[] = read();

function write(list: Post[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible : la sauvegarde reste valable pour cette visite.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function useSaved(): Post[] {
  return useSyncExternalStore(subscribe, () => cache);
}

export function isSaved(list: Post[], id: string) {
  return list.some((post) => post.id === id);
}

export function toggleSaved(post: Post): boolean {
  const on = !isSaved(cache, post.id);
  write(on ? [post, ...cache] : cache.filter((p) => p.id !== post.id));
  return on;
}
