import { loadRuntimeContext } from "./data/runtime-source.js?v=boatboard-20260821-153";

const runtime = await loadRuntimeContext();

if (runtime.mode === "development") {
  const storageKey = "boatboard:dev-line-tuning";
  const defaults = { minZoom: .5, maxZoom: 3, minWidth: 1.5, maxWidth: 3.5 };
  let tuning = defaults;
  try {
    tuning = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? "{}") };
  } catch {
    tuning = defaults;
  }

  const controls = [
    { key: "minZoom", label: "Min zoom", min: .05, max: 1.5, step: .05, suffix: "×" },
    { key: "maxZoom", label: "Max zoom", min: .1, max: 3, step: .05, suffix: "×" },
    { key: "minWidth", label: "Min line", min: .25, max: 3, step: .05, suffix: "px" },
    { key: "maxWidth", label: "Max line", min: .5, max: 6, step: .05, suffix: "px" },
  ];

  const panel = document.createElement("aside");
  panel.className = "dev-line-tuner";
  panel.setAttribute("aria-label", "Development connection line tuning");
  panel.innerHTML = `<strong>Connection lines</strong>
    <div class="dev-line-current"><span>Current zoom</span><output data-current-zoom>1.00×</output></div>${controls.map((control) => `
    <label>
      <span>${control.label}</span>
      <input type="range" data-key="${control.key}" min="${control.min}" max="${control.max}" step="${control.step}" value="${tuning[control.key]}">
      <output data-value="${control.key}"></output>
    </label>`).join("")}`;
  document.body.append(panel);

  function publish() {
    if (tuning.maxZoom <= tuning.minZoom) tuning.maxZoom = tuning.minZoom + .05;
    if (tuning.maxWidth < tuning.minWidth) tuning.maxWidth = tuning.minWidth;
    controls.forEach(({ key, suffix }) => {
      const input = panel.querySelector(`[data-key="${key}"]`);
      input.value = tuning[key];
      panel.querySelector(`[data-value="${key}"]`).textContent = `${Number(tuning[key]).toFixed(2)}${suffix}`;
    });
    localStorage.setItem(storageKey, JSON.stringify(tuning));
    dispatchEvent(new CustomEvent("boatboard:line-tuning", { detail: { ...tuning } }));
  }

  panel.addEventListener("input", (event) => {
    const key = event.target.dataset.key;
    if (!key) return;
    tuning = { ...tuning, [key]: Number(event.target.value) };
    publish();
  });

  addEventListener("boatboard:line-zoom", (event) => {
    panel.querySelector("[data-current-zoom]").textContent = `${Number(event.detail?.zoom ?? 1).toFixed(2)}×`;
  });

  publish();
}
