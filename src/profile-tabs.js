const tabRegion = document.querySelector(".tab-region");
const tabs = [...document.querySelectorAll("[data-tab]")];
const panels = [...tabRegion.querySelectorAll("[role='tabpanel']")];
const tabNames = new Set(tabs.map((tab) => tab.dataset.tab));
const header = document.querySelector("body > header");
const mobileLayout = window.matchMedia("(max-width: 720px)");
const researchPath = document.querySelector("#tab-research").pathname;
const scroller = document.scrollingElement;
const scrollFloor = "--tab-scroll-floor";
let activeTab = null;

function showTab(name) {
  activeTab = tabNames.has(name) ? name : null;
  tabRegion.hidden = activeTab === null;
  tabs.forEach((tab, index) => {
    const isActive = tab.dataset.tab === activeTab;
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = (isActive || (activeTab === null && index === 0)) ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== activeTab;
  });
  document.title = activeTab === "research"
    ? document.body.dataset.researchTitle
    : document.body.dataset.homeTitle;
}

function minHeightToKeepScroll() {
  const { scrollTop, clientHeight, scrollHeight } = scroller;
  if (scrollTop <= 0) return 0;
  // Keep enough space below the current viewport when the new panel is shorter.
  return Math.max(0, Math.ceil(tabRegion.offsetHeight + scrollTop + clientHeight - scrollHeight));
}

function releaseScrollFloor() {
  if (!tabRegion.style.getPropertyValue(scrollFloor)) return;
  const panel = panels.find((item) => item.id === activeTab);
  if (minHeightToKeepScroll() <= (panel?.offsetHeight ?? 0)) {
    tabRegion.style.removeProperty(scrollFloor);
  }
}

function selectTab(tab) {
  if (tab.dataset.tab !== activeTab) {
    const height = minHeightToKeepScroll();
    if (height) tabRegion.style.setProperty(scrollFloor, `${height}px`);
    showTab(tab.dataset.tab);
    window.history.pushState(null, "", tab.getAttribute("href"));
    releaseScrollFloor();
  }

  if (mobileLayout.matches) {
    const panelTop = tabRegion.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: panelTop - header.getBoundingClientRect().height });
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectTab(tab);
  });
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === " ") nextIndex = index;
    else if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    selectTab(nextTab);
    nextTab.focus({ preventScroll: true });
  });
});

function showTabFromLocation() {
  const { pathname, hash } = window.location;
  let name = hash.slice(1);
  if (pathname === researchPath || `${pathname}/` === researchPath) {
    name = "research";
  } else if (hash === "#work") {
    // This old direct link still goes straight to the publications.
    window.location.replace(`${researchPath}#work`);
    return;
  } else if (hash === "#research") {
    window.history.replaceState(null, "", researchPath);
  }
  if (name !== activeTab) {
    tabRegion.style.removeProperty(scrollFloor);
    showTab(name);
  }
}

window.addEventListener("scroll", releaseScrollFloor, { passive: true });
window.addEventListener("resize", releaseScrollFloor);
window.addEventListener("popstate", showTabFromLocation);
window.addEventListener("hashchange", showTabFromLocation);
showTabFromLocation();
