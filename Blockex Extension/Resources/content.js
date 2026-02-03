const api = typeof browser !== "undefined" ? browser : chrome;

async function checkAndBlock() {
  const data = await getStorage("blockedSites");
  const sites = data.blockedSites || [];
  const currentUrl = window.location.href;

  for (const site of sites) {
    if (isUrlBlocked(currentUrl, site)) {
      blockPage();
      return;
    }
  }
}

function isUrlBlocked(currentUrl, pattern) {
  let urlToCheck = currentUrl;

  try {
    const urlObj = new URL(currentUrl);
    const fullPath = urlObj.hostname + urlObj.pathname;

    // Remove 'www.' for looser matching
    const cleanHost = urlObj.hostname.replace(/^www\./, "");
    const cleanFullPath = cleanHost + urlObj.pathname;

    return (
      fullPath.includes(pattern) ||
      cleanFullPath.includes(pattern) ||
      currentUrl.includes(pattern)
    );
  } catch (e) {
    return false;
  }
}

function blockPage() {
  // Stop any active loading immediately
  try {
    window.stop();
  } catch (e) {}

  // Find and stop all media elements BEFORE nuking the DOM
  const media = document.querySelectorAll("video, audio");
  media.forEach((m) => {
    try {
      m.pause();
      m.muted = true;
      m.src = "";
      m.remove();
    } catch (e) {}
  });

  document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f0f0; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <h1 style="color: #333; font-size: 24px; margin-bottom: 16px;">Page Blocked</h1>
            <p style="color: #666;">This page has been blocked by Blockex.</p>
        </div>
    `;
}

// Storage wrapper
function getStorage(key) {
  return new Promise((resolve) => {
    api.storage.local.get(key, (opts) => {
      resolve(opts);
    });
  });
}

// Initial check
checkAndBlock();

// SPA Navigation detection
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkAndBlock();
  }
});

observer.observe(document, { subtree: true, childList: true });

// Also listen for popstate just in case
window.addEventListener("popstate", checkAndBlock);

// === Hide Feature ===
async function checkAndHide() {
  const data = await getStorage("hiddenFeatures");
  const features = data.hiddenFeatures || [];

  if (features.includes("youtube-shorts")) {
    hideYouTubeShorts();
  }
}

function hideYouTubeShorts() {
  const url = window.location.href;

  // Only run on YouTube
  if (!url.includes("youtube.com")) return;

  // Do NOT hide on search results page
  if (url.includes("/results")) return;

  // Selectors for Shorts elements on YouTube
  const shortsSelectors = [
    // Shorts shelf on homepage
    "ytd-rich-section-renderer[is-shorts]",
    "ytd-reel-shelf-renderer",
    // Shorts in sidebar on watch page
    "ytd-reel-shelf-renderer",
    // Individual shorts in various places
    '[href*="/shorts/"]',
    // Shorts tab in channel pages
    'yt-tab-shape[tab-title="Shorts"]',
    // Mini shorts player
    "ytd-shorts",
  ];

  shortsSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      // For links, hide their parent container
      if (el.tagName === "A" || el.hasAttribute("href")) {
        const container =
          el.closest("ytd-rich-item-renderer") ||
          el.closest("ytd-video-renderer") ||
          el.closest("ytd-grid-video-renderer") ||
          el.closest("ytd-compact-video-renderer") ||
          el;
        if (container) {
          container.style.display = "none";
        }
      } else {
        el.style.display = "none";
      }
    });
  });
}

// Initial hide check
checkAndHide();

// Observe for new elements
const hideObserver = new MutationObserver(() => {
  checkAndHide();
});

hideObserver.observe(document, { subtree: true, childList: true });

// Re-check on URL change (SPA navigation)
let lastHideUrl = window.location.href;
const urlHideObserver = new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastHideUrl) {
    lastHideUrl = url;
    checkAndHide();
  }
});

urlHideObserver.observe(document, { subtree: true, childList: true });
