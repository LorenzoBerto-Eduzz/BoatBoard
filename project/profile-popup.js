import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-79";

const popup = document.querySelector(".profile-popup");
const closeButton = popup?.querySelector(".profile-popup-close");
const content = popup?.querySelector(".profile-popup-content");
let pinnedPersonId = null;
let previewPersonId = null;
let placement = "top-left";
const organization = popup ? await loadOrganization() : null;
const peopleById = new Map(organization?.colleagues.map((person) => [person.id, person]) ?? []);

function automaticPlacement(x, y) {
  const horizontal = x < innerWidth / 2 ? "right" : "left";
  const vertical = y < innerHeight / 2 ? "bottom" : "top";
  return `${vertical}-${horizontal}`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function renderPerson(personId) {
  const person = peopleById.get(personId);
  if (!person || !content) return;
  content.replaceChildren();
  const avatar = document.createElement("div");
  avatar.className = "profile-popup-avatar";
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

  const name = document.createElement("div");
  name.className = "profile-popup-name";
  name.textContent = person.name;

  const contact = (labelText, value) => {
    const block = document.createElement("section");
    block.className = "profile-popup-detail";
    const label = document.createElement("small");
    label.textContent = labelText;
    const contentValue = document.createElement("div");
    const fallback = labelText === "WhatsApp" ? "+55 (00) 00000-0000" : "@example-user";
    contentValue.textContent = value || fallback;
    block.append(label, contentValue);
    return block;
  };

  const description = document.createElement("div");
  description.className = "profile-popup-description";
  description.textContent = person.description || "Example colleague description.\nAdditional information can continue on a new line.";
  const reserved = document.createElement("div");
  reserved.className = "profile-popup-reserved";
  content.append(avatar, name, contact("WhatsApp", person.whatsapp), contact("Discord", person.discord), description, reserved);
}

if (popup) {
  function closePopup() {
    pinnedPersonId = null;
    previewPersonId = null;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    dispatchEvent(new CustomEvent("boatboard:close-colleague"));
  }

  addEventListener("boatboard:select-colleague", (event) => {
    if (event.detail?.source === "canvas" && pinnedPersonId === event.detail?.personId && popup.classList.contains("is-open")) {
      closePopup();
      return;
    }
    pinnedPersonId = event.detail?.personId ?? null;
    previewPersonId = null;
    placement = event.detail?.placement === "auto"
      ? automaticPlacement(event.detail.x, event.detail.y)
      : event.detail?.placement ?? "top-left";
    popup.dataset.placement = placement;
    if (pinnedPersonId) renderPerson(pinnedPersonId);
    popup.classList.toggle("is-open", Boolean(pinnedPersonId));
    popup.setAttribute("aria-hidden", String(!pinnedPersonId));
  });

  addEventListener("boatboard:preview-colleague", (event) => {
    if (pinnedPersonId) return;
    previewPersonId = event.detail?.personId ?? null;
    placement = automaticPlacement(event.detail.x, event.detail.y);
    popup.dataset.placement = placement;
    if (previewPersonId) renderPerson(previewPersonId);
    popup.classList.toggle("is-open", Boolean(previewPersonId));
    popup.setAttribute("aria-hidden", String(!previewPersonId));
  });

  addEventListener("boatboard:preview-colleague-end", (event) => {
    if (pinnedPersonId || event.detail?.personId !== previewPersonId) return;
    previewPersonId = null;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
  });

  addEventListener("boatboard:profile-position", (event) => {
    const displayedPersonId = pinnedPersonId ?? previewPersonId;
    if (!displayedPersonId || event.detail?.personId !== displayedPersonId) return;
    const offset = Math.max(0, event.detail.radius);
    const right = placement.endsWith("right");
    const bottom = placement.startsWith("bottom");
    popup.style.setProperty("--profile-anchor-x", `${event.detail.x + (right ? offset : -offset)}px`);
    popup.style.setProperty("--profile-anchor-y", `${event.detail.y + (bottom ? offset : -offset)}px`);
  });

  closeButton.addEventListener("click", closePopup);
  closeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  closeButton.addEventListener("dblclick", (event) => event.stopPropagation());
}
