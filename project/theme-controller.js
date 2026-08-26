const storageKey = "boatboard:color-theme";
const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const toggle = document.querySelector(".theme-toggle");

function storedTheme() {
  try {
    return localStorage.getItem(storageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme, persist = false) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  themeColor?.setAttribute("content", resolvedTheme === "light" ? "#eef3f5" : "#182027");
  if (toggle) {
    const isLight = resolvedTheme === "light";
    toggle.setAttribute("aria-pressed", String(isLight));
    toggle.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
    toggle.title = `Switch to ${isLight ? "dark" : "light"} mode`;
  }
  if (persist) {
    try { localStorage.setItem(storageKey, resolvedTheme); } catch { /* Storage may be unavailable. */ }
  }
  dispatchEvent(new CustomEvent("boatboard:theme-changed", { detail: { theme: resolvedTheme } }));
}

applyTheme(storedTheme());

toggle?.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "light" ? "dark" : "light", true);
});
