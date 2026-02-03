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
  document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f0f0; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <h1 style="color: #333; font-size: 24px; margin-bottom: 16px;">Page Blocked</h1>
            <p style="color: #666;">This page has been blocked by Blockex.</p>
        </div>
    `;
  // Stop media playback
  const media = document.querySelectorAll("video, audio");
  media.forEach((m) => m.pause());
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
