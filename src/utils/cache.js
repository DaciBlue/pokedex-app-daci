const PREFIX = "pokedex_cache_v1:";

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignoramos errores de storage (modo privado, cuota llena, etc.)
  }
}
