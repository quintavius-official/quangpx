const THEME_KEY = "theme";
const SYSTEM = "system";
const LIGHT = "light";
const DARK = "dark";

type ThemeMode = typeof SYSTEM | typeof LIGHT | typeof DARK;
type ResolvedTheme = typeof LIGHT | typeof DARK;

interface ThemeState {
  mode?: ThemeMode;
  value?: ResolvedTheme;
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === LIGHT || stored === DARK ? stored : SYSTEM;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === SYSTEM ? getSystemTheme() : mode;
}

const initialWindowTheme = (window as unknown as { __theme?: ThemeState })
  .__theme;
let themeMode: ThemeMode = initialWindowTheme?.mode ?? getStoredMode();
let themeValue: ResolvedTheme =
  initialWindowTheme?.value ?? resolveTheme(themeMode);

function cycleMode(current: ThemeMode): ThemeMode {
  const systemTheme = getSystemTheme();
  if (current === SYSTEM) {
    return systemTheme === LIGHT ? DARK : LIGHT;
  }
  if (current === DARK) {
    return systemTheme === LIGHT ? LIGHT : SYSTEM;
  }
  return systemTheme === LIGHT ? SYSTEM : DARK;
}

function persist(): void {
  if (themeMode === SYSTEM) {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, themeMode);
  }
  reflect();
}

function reflect(): void {
  themeValue = resolveTheme(themeMode);

  const root = document.firstElementChild;
  root?.setAttribute("data-theme-mode", themeMode);
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);

  const themeBtn = document.querySelector("#theme-btn");
  if (themeBtn) {
    themeBtn.setAttribute("data-mode", themeMode);
    themeBtn.setAttribute("aria-label", themeMode);
    const title = themeBtn.getAttribute(`data-title-${themeMode}`);
    if (title) {
      themeBtn.setAttribute("title", title);
    }
  }

  // Fill <meta name="theme-color"> with the computed background colour so
  // Android's browser chrome matches the page background.
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

function setup(): void {
  reflect();
  const themeBtn = document.querySelector("#theme-btn");
  themeBtn?.addEventListener("click", () => {
    themeMode = cycleMode(themeMode);
    persist();
  });
}

setup();

// Re-run after View Transitions navigation.
document.addEventListener("astro:after-swap", setup);

// Carry the theme-color value across View Transitions to prevent the
// Android navigation bar from flashing during page transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});

// Sync with OS-level dark/light preference changes when in SYSTEM mode.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (themeMode === SYSTEM) {
      reflect();
    }
  });
