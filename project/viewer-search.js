import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-63";

const search = document.querySelector(".viewer-search");
const toggle = search?.querySelector(".viewer-search-toggle");
const panel = search?.querySelector(".viewer-search-panel");
const closeButton = search?.querySelector(".viewer-search-close");
const input = search?.querySelector("input");
const results = search?.querySelector(".viewer-search-results");

if (search) {
  const organization = await loadOrganization();
  const teamsById = new Map(organization.teams.map((team) => [team.id, team]));
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const createAvatar = (person) => {
    const avatar = document.createElement("span");
    avatar.className = "viewer-search-avatar";
    avatar.style.setProperty("--avatar-light", person.colors[0]);
    avatar.style.setProperty("--avatar-dark", person.colors[1]);
    if (person.imageUrl) {
      const image = document.createElement("img");
      image.src = person.imageUrl;
      image.alt = "";
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = initials(person.name);
      });
      avatar.append(image);
    } else avatar.textContent = initials(person.name);
    return avatar;
  };

  [...organization.colleagues]
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
    .forEach((person) => {
      const teamName = teamsById.get(person.teamId)?.name ?? "";
      const row = document.createElement("button");
      row.className = "viewer-search-result";
      row.type = "button";
      row.role = "listitem";
      row.dataset.searchTerms = normalize(`${person.name} ${teamName}`);
      const name = document.createElement("span");
      name.className = "viewer-search-name";
      name.textContent = person.name;
      const team = document.createElement("span");
      team.className = "viewer-search-team";
      team.textContent = teamName;
      row.append(createAvatar(person), name, team);
      row.addEventListener("click", () => {
        dispatchEvent(new CustomEvent("boatboard:focus-colleague", {
          detail: { personId: person.id, scale: .5 },
        }));
        dispatchEvent(new CustomEvent("boatboard:select-colleague", {
          detail: { personId: person.id, placement: "top-left", source: "search" },
        }));
      });
      results.append(row);
    });

  function filterResults() {
    const query = normalize(input.value.trim());
    results.querySelectorAll(".viewer-search-result").forEach((row) => {
      const hidden = !row.dataset.searchTerms.includes(query);
      clearTimeout(row.filterTimer);
      if (hidden) {
        row.classList.add("is-filtered-out");
        row.filterTimer = setTimeout(() => row.classList.add("is-collapsed"), 120);
      } else {
        row.classList.remove("is-collapsed");
        requestAnimationFrame(() => row.classList.remove("is-filtered-out"));
      }
    });
  }

  function openSearch() {
    search.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      const margin = 18;
      const panelRectangle = panel.getBoundingClientRect();
      const activePopups = document.querySelectorAll(
        ".profile-popup.is-open:not(.popup-outgoing), .team-popup.is-open:not(.popup-outgoing)",
      );
      let dx = 0;
      activePopups.forEach((popup) => {
        const rectangle = popup.getBoundingClientRect();
        const overlaps = Math.min(rectangle.right, panelRectangle.right) > Math.max(rectangle.left, panelRectangle.left)
          && Math.min(rectangle.bottom, panelRectangle.bottom) > Math.max(rectangle.top, panelRectangle.top);
        if (overlaps) dx = Math.max(dx, panelRectangle.right + margin - rectangle.left);
      });
      if (dx > 0) dispatchEvent(new CustomEvent("boatboard:ensure-popup-visible", { detail: { dx, dy: 0 } }));
    });
  }

  function closeSearch() {
    search.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    input.value = "";
    filterResults();
  }

  toggle.addEventListener("click", openSearch);
  closeButton.addEventListener("click", closeSearch);
  input.addEventListener("input", filterResults);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
  });
  addEventListener("boatboard:enter-edit-mode", closeSearch);
  search.addEventListener("pointerdown", (event) => event.stopPropagation());
  search.addEventListener("dblclick", (event) => event.stopPropagation());
  search.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
}
