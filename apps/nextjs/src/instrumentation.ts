export async function register() {
  // Polyfill localStorage for server-side rendering.
  // next-themes accesses localStorage during SSR and crashes if it's
  // a stub without real methods (e.g. in Cloudflare Workers runtime).
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    } as Storage;
  } else if (typeof globalThis.localStorage.getItem !== "function") {
    // localStorage exists but getItem is not a function — patch it
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    } as Storage;
  }
}
