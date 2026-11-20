const tabRegion = document.querySelector(".tab-region");
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const tabPanels = [...document.querySelectorAll("[role='tabpanel']")];
const tabLinks = [...document.querySelectorAll("[data-select-tab]")];
const tabNames = new Set(tabButtons.map((button) => button.dataset.tab));

function activateTab(tabName, options = {}) {
  const name = tabNames.has(tabName) ? tabName : null;
  tabRegion.hidden = name === null;
  tabButtons.forEach((button, index) => {
    const isActive = button.dataset.tab === name;
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = (isActive || (name === null && index === 0)) ? 0 : -1;
  });
  tabPanels.forEach((tabPanel) => {
    tabPanel.hidden = tabPanel.id !== name;
  });

  if (name && options.updateHash && window.location.hash !== `#${name}`) {
    window.history.pushState(null, "", `#${name}`);
  }

  if (name && options.scrollIntoView && window.matchMedia("(max-width: 720px)").matches) {
    requestAnimationFrame(() => {
      const heading = document.querySelector(`#${name} .section-label`);
      const header = document.querySelector("body > header");
      const top = window.scrollY + heading.getBoundingClientRect().top
        - header.getBoundingClientRect().height - 24;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant" : "smooth"
      });
    });
  }
}

tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab, { updateHash: true, scrollIntoView: true });
  });
  button.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabButtons.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabButtons.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = tabButtons[nextIndex];
    nextButton.focus();
    activateTab(nextButton.dataset.tab, { updateHash: true, scrollIntoView: true });
  });
});

tabLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    activateTab(link.dataset.selectTab, { updateHash: true, scrollIntoView: true });
  });
});

function activateFromHash() {
  const hash = window.location.hash;
  // Keep links to the old homepage research and publication tabs working.
  if (hash === "#work") {
    window.location.replace("/research/#work");
    return;
  }
  if (hash === "#research") {
    window.location.replace("/research/");
    return;
  }
  activateTab(hash.slice(1));
}

window.addEventListener("popstate", activateFromHash);
activateFromHash();
