const directory = document.querySelector(".editor-directory");
const toggle = directory?.querySelector(".editor-directory-toggle");
const panel = directory?.querySelector(".editor-panel");
const teamsContainer = directory?.querySelector(".data-teams");
const status = directory?.querySelector(".data-status");
const workbookInput = directory?.querySelector(".data-workbook-input");
const boardTitleInput = directory?.querySelector(".board-company-input");
let organization;
let boardState;
let saveTimer;
let changeVersion = 0;
let savedVersion = 0;
let saveQueue = Promise.resolve();
const expandedTeams = new Set();
const avatarPalette = [
  ["#f1b83f", "#9c6418"], ["#f2d547", "#a78616"], ["#4f79ca", "#29467e"],
  ["#65b9df", "#39799c"], ["#e47972", "#954843"], ["#65b779", "#39784a"],
  ["#3f9661", "#245d3c"], ["#a278d2", "#67458f"],
];

async function fileAsBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function uniqueId(prefix, label) {
  const base = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || prefix;
  const used = new Set([
    ...organization.teams.map((team) => team.id),
    ...organization.colleagues.map((person) => person.id),
  ]);
  let candidate = `${prefix}-${base}`;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${prefix}-${base}-${suffix++}`;
  return candidate;
}

function persist() {
  clearTimeout(saveTimer);
  if (savedVersion === changeVersion) return saveQueue;
  const targetVersion = changeVersion;
  const snapshot = JSON.stringify(organization);
  status.textContent = "Saving…";
  saveQueue = saveQueue.then(async () => {
    const response = await fetch("/api/organization", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: snapshot,
    });
    if (!response.ok) throw new Error("Could not save Board Data.");
    savedVersion = Math.max(savedVersion, targetVersion);
    status.textContent = savedVersion === changeVersion ? "Saved" : "Saving…";
  }).catch((error) => { status.textContent = error.message; });
  return saveQueue;
}

function changed() {
  changeVersion += 1;
  status.textContent = "Unsaved changes";
  dispatchEvent(new CustomEvent("boatboard:organization-changed", {
    detail: { organization: structuredClone(organization) },
  }));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 550);
}

function avatarFor(person) {
  const avatar = document.createElement("button");
  avatar.className = "data-colleague-avatar";
  avatar.type = "button";
  avatar.title = `Delete ${person.name}`;
  avatar.setAttribute("aria-label", `Delete ${person.name}`);
  const hash = [...person.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  const [light, dark] = avatarPalette[hash % avatarPalette.length];
  avatar.style.setProperty("--avatar-light", light);
  avatar.style.setProperty("--avatar-dark", dark);
  if (person.imageUrl) {
    const image = document.createElement("img");
    image.src = person.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => { image.remove(); avatar.textContent = person.name[0] || "?"; });
    avatar.append(image);
  } else avatar.textContent = person.name.trim().charAt(0).toUpperCase() || "?";
  avatar.addEventListener("click", () => {
    organization.colleagues = organization.colleagues.filter((candidate) => candidate.id !== person.id);
    changed();
    renderTeams();
  });
  return avatar;
}

function teamAction(className, label, svg) {
  const button = document.createElement("button");
  button.className = `${className} data-icon-button`;
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = svg;
  return button;
}

function renderTeams(focusTeamId = null, focusPersonId = null) {
  teamsContainer.replaceChildren();
  const sorted = [...organization.teams].sort((left, right) => {
    const placement = Number(Boolean(boardState?.teams?.[left.id]?.placed)) - Number(Boolean(boardState?.teams?.[right.id]?.placed));
    return placement || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
  const firstPlacedIndex = sorted.findIndex((team) => boardState?.teams?.[team.id]?.placed);
  sorted.forEach((team, index) => {
    const section = document.createElement("article");
    section.className = "data-team-section";
    section.dataset.teamId = team.id;
    if (index === firstPlacedIndex && firstPlacedIndex > 0) section.classList.add("starts-placed");
    const heading = document.createElement("div");
    heading.className = "data-team-heading";
    const expanded = expandedTeams.has(team.id);
    const teamName = document.createElement(expanded ? "input" : "div");
    teamName.className = expanded ? "data-team-name" : "data-team-drag-label";
    if (expanded) teamName.value = team.name; else teamName.textContent = team.name;
    teamName.draggable = !expanded;
    teamName.title = expanded ? "Rename team" : `Drag ${team.name} onto the board`;
    if (expanded) teamName.addEventListener("input", () => { team.name = teamName.value; changed(); });
    teamName.addEventListener("dragstart", (event) => {
      if (expanded) return event.preventDefault();
      event.dataTransfer.setData("application/x-boatboard-team", team.id);
      event.dataTransfer.effectAllowed = "move";
      const transparent = document.createElement("canvas");
      transparent.width = transparent.height = 1;
      event.dataTransfer.setDragImage(transparent, 0, 0);
      dispatchEvent(new CustomEvent("boatboard:tray-drag-start", { detail: { teamId: team.id } }));
    });
    teamName.addEventListener("drag", (event) => {
      if (event.clientX || event.clientY) dispatchEvent(new CustomEvent("boatboard:tray-drag-move", { detail: { x: event.clientX, y: event.clientY } }));
    });
    teamName.addEventListener("dragend", () => dispatchEvent(new CustomEvent("boatboard:tray-drag-end")));
    const actions = document.createElement("div");
    actions.className = "data-team-actions";
    const add = teamAction("data-add-colleague", "Add colleague", '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="7" r="2.5"/><path d="M3.5 14.5c.6-2.2 2.1-3.5 4.5-3.5s3.9 1.3 4.5 3.5M15.5 6v5M13 8.5h5"/></svg>');
    const remove = teamAction("data-delete-team", "Delete team", '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8"/></svg>');
    const expand = teamAction("data-expand-team", expandedTeams.has(team.id) ? "Collapse team" : "Expand team", '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5.75 4.25 4.25-4.25 4.25"/></svg>');
    expand.setAttribute("aria-expanded", String(expandedTeams.has(team.id)));
    expand.addEventListener("click", () => {
      if (expandedTeams.has(team.id)) expandedTeams.delete(team.id); else expandedTeams.add(team.id);
      renderTeams();
    });
    add.addEventListener("click", () => {
      const person = { id: uniqueId("person", "new-colleague"), name: "", teamId: team.id, imageFilename: "", role: "" };
      organization.colleagues.unshift(person);
      expandedTeams.add(team.id);
      changed();
      renderTeams(null, person.id);
    });
    remove.addEventListener("click", () => {
      organization.teams = organization.teams.filter((candidate) => candidate.id !== team.id);
      organization.colleagues = organization.colleagues.filter((person) => person.teamId !== team.id);
      changed();
      renderTeams();
    });
    actions.append(add, remove, expand);
    heading.append(teamName, actions);
    const colleagues = document.createElement("div");
    colleagues.className = "data-colleagues";
    organization.colleagues.filter((person) => person.teamId === team.id)
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
      .forEach((person) => {
        const row = document.createElement("div");
        row.className = "data-colleague-row";
        const avatar = avatarFor(person);
        const personName = document.createElement("input");
        personName.className = "data-colleague-name";
        personName.value = person.name;
        personName.placeholder = "Colleague name";
        personName.addEventListener("input", () => { person.name = personName.value; changed(); });
        if (person.id === focusPersonId) queueMicrotask(() => personName.focus());
        row.append(avatar, personName);
        colleagues.append(row);
      });
    section.classList.toggle("is-expanded", expandedTeams.has(team.id));
    section.append(heading, colleagues);
    teamsContainer.append(section);
    if (team.id === focusTeamId && expanded) queueMicrotask(() => teamName.select());
  });
}

async function openPanel() {
  if (!organization) {
    [organization, boardState] = await Promise.all([
      fetch("/api/organization", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/board", { cache: "no-store" }).then((response) => response.json()),
    ]);
    organization.colleagues.forEach((person) => { person.imageFilename = person.imageUrl?.split("/").pop() ?? ""; });
  }
  boardTitleInput.value = organization.companyName;
  renderTeams();
  document.body.classList.add("editor-mode");
  dispatchEvent(new CustomEvent("boatboard:enter-edit-mode"));
  directory.classList.add("is-open");
  toggle.setAttribute("aria-expanded", "true");
  panel.setAttribute("aria-hidden", "false");
}

async function closePanel() {
  await persist();
  directory.classList.remove("is-open");
  document.body.classList.remove("editor-mode");
  dispatchEvent(new CustomEvent("boatboard:exit-edit-mode"));
  toggle.setAttribute("aria-expanded", "false");
  panel.setAttribute("aria-hidden", "true");
}

toggle?.addEventListener("click", openPanel);
boardTitleInput?.addEventListener("input", () => {
  if (!organization) return;
  organization.companyName = boardTitleInput.value;
  changed();
});
addEventListener("boatboard:board-changed", (event) => {
  if (!event.detail?.boardState) return;
  boardState = event.detail.boardState;
  if (directory.classList.contains("is-open")) renderTeams();
});
directory?.querySelector(".data-close")?.addEventListener("click", closePanel);
directory?.querySelector(".data-add-team")?.addEventListener("click", async () => {
  if (!organization) await openPanel();
  const team = { id: uniqueId("team", "new-team"), name: "New team" };
  organization.teams.unshift(team);
  expandedTeams.add(team.id);
  changed();
  renderTeams(team.id);
});
directory?.querySelector(".data-choose-workbook")?.addEventListener("click", () => workbookInput.click());
workbookInput?.addEventListener("change", async () => {
  const file = workbookInput.files[0];
  if (!file) return;
  await persist();
  const response = await fetch("/api/workbook", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, data: await fileAsBase64(file) }),
  });
  if (response.ok) {
    organization = await fetch("/api/organization", { cache: "no-store" }).then((result) => result.json());
    organization.colleagues.forEach((person) => { person.imageFilename = person.imageUrl?.split("/").pop() ?? ""; });
    boardTitleInput.value = organization.companyName;
    changeVersion = savedVersion = 0;
    dispatchEvent(new CustomEvent("boatboard:organization-changed", {
      detail: { organization: structuredClone(organization) },
    }));
    renderTeams();
    status.textContent = "Saved";
  } else status.textContent = (await response.json()).error ?? "Invalid workbook.";
  workbookInput.value = "";
});
directory?.querySelector(".data-open-folder")?.addEventListener("click", async () => {
  await fetch("/api/open-instance-folder", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
});
