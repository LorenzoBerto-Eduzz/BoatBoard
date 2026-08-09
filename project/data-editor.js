const modal = document.querySelector(".data-editor");
const form = document.querySelector(".data-editor-form");
const teamsContainer = document.querySelector(".data-teams");
const status = document.querySelector(".data-status");
const workbookInput = document.querySelector(".data-workbook-input");
let organization;
let saveTimer;
let changeVersion = 0;
let savedVersion = 0;
let saveQueue = Promise.resolve();
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: snapshot,
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
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 550);
}

function nameInput(value, className, placeholder, onInput) {
  const element = document.createElement("input");
  element.className = className;
  element.value = value ?? "";
  element.placeholder = placeholder;
  element.addEventListener("input", () => { onInput(element.value); changed(); });
  return element;
}

function avatarFor(person) {
  const avatar = document.createElement("span");
  avatar.className = "data-colleague-avatar";
  const hash = [...person.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  const [light, dark] = avatarPalette[hash % avatarPalette.length];
  avatar.style.setProperty("--avatar-light", light);
  avatar.style.setProperty("--avatar-dark", dark);
  if (person.imageUrl) {
    const image = document.createElement("img");
    image.src = person.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
      image.remove();
      avatar.textContent = person.name.trim().charAt(0).toUpperCase() || "?";
    });
    avatar.append(image);
  } else {
    avatar.textContent = person.name.trim().charAt(0).toUpperCase() || "?";
  }
  return avatar;
}

function renderTeams(focusTeamId = null, focusPersonId = null) {
  teamsContainer.replaceChildren();
  organization.teams.forEach((team) => {
    const section = document.createElement("article");
    section.className = "data-team-section";
    const heading = document.createElement("div");
    heading.className = "data-team-heading";
    const teamName = nameInput(team.name, "data-team-name", "Team name", (value) => { team.name = value; });
    const addColleague = document.createElement("button");
    addColleague.className = "data-add-colleague";
    addColleague.type = "button";
    addColleague.title = "Add colleague";
    addColleague.setAttribute("aria-label", "Add colleague");
    addColleague.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="7" r="2.5"/><path d="M3.5 14.5c.6-2.2 2.1-3.5 4.5-3.5s3.9 1.3 4.5 3.5M15.5 6v5M13 8.5h5"/></svg>';
    addColleague.addEventListener("click", () => {
      const person = { id: uniqueId("person", "new-colleague"), name: "", teamId: team.id, imageFilename: "", role: "" };
      organization.colleagues.unshift(person);
      changed();
      renderTeams(null, person.id);
    });
    heading.append(teamName, addColleague);
    const colleagues = document.createElement("div");
    colleagues.className = "data-colleagues";
    organization.colleagues.filter((person) => person.teamId === team.id).forEach((person) => {
      const row = document.createElement("div");
      row.className = "data-colleague-row";
      const avatar = avatarFor(person);
      const personName = nameInput(person.name, "data-colleague-name", "Colleague name", (value) => {
        person.name = value;
        if (!person.imageUrl) avatar.textContent = value.trim().charAt(0).toUpperCase() || "?";
      });
      if (person.id === focusPersonId) queueMicrotask(() => personName.focus());
      row.append(avatar, personName);
      colleagues.append(row);
    });
    section.append(heading, colleagues);
    teamsContainer.append(section);
    if (team.id === focusTeamId) queueMicrotask(() => teamName.select());
  });
}

document.querySelector(".data-open").addEventListener("click", async () => {
  organization = await fetch("/api/organization", { cache: "no-store" }).then((response) => response.json());
  organization.colleagues.forEach((person) => { person.imageFilename = person.imageUrl?.split("/").pop() ?? ""; });
  form.elements.companyName.value = organization.companyName;
  changeVersion = 0;
  savedVersion = 0;
  status.textContent = "";
  renderTeams();
  modal.showModal();
  modal.focus({ preventScroll: true });
});

form.elements.companyName.addEventListener("input", () => {
  organization.companyName = form.elements.companyName.value;
  changed();
});

async function closeEditor() {
  const hadChanges = changeVersion > 0;
  await persist();
  modal.close();
  if (hadChanges && savedVersion === changeVersion) location.reload();
}

document.querySelector(".data-close").addEventListener("click", closeEditor);
modal.addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });

document.querySelector(".data-add-team").addEventListener("click", () => {
  const team = { id: uniqueId("team", "new-team"), name: "New team" };
  organization.teams.unshift(team);
  changed();
  renderTeams(team.id);
});

document.querySelector(".data-choose-workbook").addEventListener("click", () => workbookInput.click());
workbookInput.addEventListener("change", async () => {
  const file = workbookInput.files[0];
  if (!file) return;
  await persist();
  status.textContent = "Validating workbook…";
  const response = await fetch("/api/workbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, data: await fileAsBase64(file) }),
  });
  const result = await response.json();
  status.textContent = response.ok ? "Workbook activated. Reloading…" : result.error ?? "Invalid workbook.";
  if (response.ok) location.reload();
  workbookInput.value = "";
});

document.querySelector(".data-open-folder").addEventListener("click", async () => {
  status.textContent = "Opening instance folder…";
  const response = await fetch("/api/open-instance-folder", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  status.textContent = response.ok ? "Instance folder opened." : "Could not open the instance folder.";
});
