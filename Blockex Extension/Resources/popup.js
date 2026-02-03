const input = document.getElementById("urlInput");
const blockBtn = document.getElementById("blockBtn");
const blockedList = document.getElementById("blockedList");
const errorMsg = document.getElementById("errorMsg");
const emptyState = document.getElementById("emptyState");

const api = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener("DOMContentLoaded", loadBlockedSites);

blockBtn.addEventListener("click", () => {
  addSite();
});

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addSite();
  }
});

async function loadBlockedSites() {
  const data = await getStorage("blockedSites");
  const sites = data.blockedSites || [];
  renderList(sites);
}

function renderList(sites) {
  blockedList.innerHTML = "";

  if (sites.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    sites.forEach((site) => {
      const li = document.createElement("li");
      li.textContent = site;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Remove";
      removeBtn.onclick = () => removeSite(site);

      li.appendChild(removeBtn);
      blockedList.appendChild(li);
    });
  }
}

async function addSite() {
  const rawUrl = input.value.trim();
  if (!rawUrl) return;

  const rulePattern = normalizeRule(rawUrl);
  if (!rulePattern) {
    showError("Invalid URL");
    return;
  }

  const data = await getStorage("blockedSites");
  let sites = data.blockedSites || [];

  if (sites.includes(rulePattern)) {
    showError("Site is already blocked");
    return;
  }

  sites.push(rulePattern);
  await setStorage({ blockedSites: sites });
  await updateBlockingRules(sites);

  input.value = "";
  errorMsg.classList.add("hidden");
  renderList(sites);
}

async function removeSite(patternToRemove) {
  const data = await getStorage("blockedSites");
  let sites = data.blockedSites || [];

  sites = sites.filter((site) => site !== patternToRemove);

  await setStorage({ blockedSites: sites });
  await updateBlockingRules(sites);
  renderList(sites);
}

async function updateBlockingRules(sites) {
  const currentRules = await api.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = currentRules.map((rule) => rule.id);

  const newRules = sites.map((site, index) => {
    const urlFilter = "||" + site;

    return {
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: urlFilter,
        resourceTypes: ["main_frame"],
      },
    };
  });

  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeRuleIds,
    addRules: newRules,
  });
}

function normalizeRule(inputUrl) {
  try {
    let urlStr = inputUrl;
    if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
      urlStr = "https://" + urlStr;
    }

    const urlObj = new URL(urlStr);
    let clean = urlObj.hostname;

    // Append path if it's not just '/'
    if (urlObj.pathname && urlObj.pathname !== "/") {
      clean += urlObj.pathname;
    }

    return clean;
  } catch (e) {
    return null;
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  setTimeout(() => {
    errorMsg.classList.add("hidden");
  }, 3000);
}

// Wrapper for storage to support promise-based usage across browsers if needed
// (Chrome uses callbacks for storage.local.get/set in older MV2, but MV3 supports promises. Safest to wrap.)
function getStorage(key) {
  return new Promise((resolve) => {
    api.storage.local.get(key, (opts) => {
      resolve(opts);
    });
  });
}

function setStorage(obj) {
  return new Promise((resolve) => {
    api.storage.local.set(obj, () => {
      resolve();
    });
  });
}

const hideAccordionHeader = document.getElementById("hideAccordionHeader");
const hideAccordionContent = document.getElementById("hideAccordionContent");
const hiddenList = document.getElementById("hiddenList");
const hiddenEmptyState = document.getElementById("hiddenEmptyState");

const HIDE_OPTIONS = {
  "youtube-shorts": "YouTube Shorts",
};

document.addEventListener("DOMContentLoaded", loadHiddenFeatures);

hideAccordionHeader.addEventListener("click", () => {
  hideAccordionHeader.classList.toggle("open");
  hideAccordionContent.classList.toggle("hidden");
});

document.querySelectorAll(".hide-option").forEach((option) => {
  option.addEventListener("click", () => toggleHideOption(option));
});

async function loadHiddenFeatures() {
  const data = await getStorage("hiddenFeatures");
  const features = data.hiddenFeatures || [];

  // Update UI checkboxes
  document.querySelectorAll(".hide-option").forEach((option) => {
    const feature = option.dataset.feature;
    if (features.includes(feature)) {
      option.classList.add("selected");
    }
  });

  renderHiddenList(features);
}

async function toggleHideOption(optionEl) {
  const feature = optionEl.dataset.feature;
  const data = await getStorage("hiddenFeatures");
  let features = data.hiddenFeatures || [];

  if (features.includes(feature)) {
    features = features.filter((f) => f !== feature);
    optionEl.classList.remove("selected");
  } else {
    features.push(feature);
    optionEl.classList.add("selected");
  }

  await setStorage({ hiddenFeatures: features });
  renderHiddenList(features);
}

function renderHiddenList(features) {
  hiddenList.innerHTML = "";

  if (features.length === 0) {
    hiddenEmptyState.classList.remove("hidden");
    hiddenList.classList.add("hidden");
  } else {
    hiddenEmptyState.classList.add("hidden");
    hiddenList.classList.remove("hidden");

    features.forEach((feature) => {
      const li = document.createElement("li");
      li.textContent = HIDE_OPTIONS[feature] || feature;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Remove";
      removeBtn.onclick = () => removeHiddenFeature(feature);

      li.appendChild(removeBtn);
      hiddenList.appendChild(li);
    });
  }
}

async function removeHiddenFeature(feature) {
  const data = await getStorage("hiddenFeatures");
  let features = data.hiddenFeatures || [];

  features = features.filter((f) => f !== feature);

  // Update checkbox
  const optionEl = document.querySelector(
    `.hide-option[data-feature="${feature}"]`,
  );
  if (optionEl) optionEl.classList.remove("selected");

  await setStorage({ hiddenFeatures: features });
  renderHiddenList(features);
}
