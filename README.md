# Blockex

A Safari browser extension for macOS and iOS that allows you to block specific websites and hide unwanted web elements like YouTube Shorts.

## Features

- 🚫 **URL Blocking** — Block any website by entering its URL or domain
- 👁️ **Element Hiding** — Hide specific web elements (currently supports YouTube Shorts)
- 📱 **Cross-Platform** — Works on both macOS and iOS Safari
- 🔄 **SPA Support** — Detects navigation in Single Page Applications
- 💾 **Persistent Storage** — Your blocked sites and preferences are saved locally

---

## Installation

### Prerequisites

- macOS 14.0+ or iOS 17.0+
- Xcode 15.0+
- Safari browser

### Build & Install

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Blockex.git
   cd Blockex
   ```

2. **Open in Xcode**
   ```bash
   open Blockex.xcodeproj
   ```

3. **Select your target**
   - For macOS: Select "Blockex" scheme and "My Mac" as destination
   - For iOS: Select "Blockex" scheme and your iOS device/simulator

4. **Build and Run**
   - Press `Cmd + R` to build and run the app
   - The app will launch with instructions to enable the extension

5. **Enable the Extension in Safari**
   - Open Safari → Settings (Cmd + ,)
   - Go to the **Extensions** tab
   - Check the box next to **Blockex** to enable it
   - Grant necessary permissions when prompted

---

## Usage

### Blocking Websites

1. Click the Blockex icon in Safari's toolbar
2. Enter a URL or domain (e.g., `example.com` or `example.com/specific/path`)
3. Click **Block**
4. The site will be added to your blocked list

### Removing Blocked Sites

- Click the **×** button next to any site in the blocked list to unblock it

### Hiding Elements

1. Expand the **Hide Elements** accordion
2. Toggle the checkbox for elements you want to hide (e.g., YouTube Shorts)

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Blockex App                              │
│  ┌─────────────────┐    ┌────────────────────────────────────┐  │
│  │   macOS/iOS     │    │         Safari Extension           │  │
│  │   Container     │    │  ┌──────────┐  ┌────────────────┐  │  │
│  │   App           │    │  │ popup.js │  │  content.js    │  │  │
│  │                 │    │  │          │  │                │  │  │
│  │  ViewController │    │  │ UI Logic │  │ DOM Blocking   │  │  │
│  │     .swift      │    │  │          │  │ & Hiding       │  │  │
│  └─────────────────┘    │  └──────────┘  └────────────────┘  │  │
│                         │        │              │             │  │
│                         │        └──────┬───────┘             │  │
│                         │               ▼                     │  │
│                         │  ┌─────────────────────────┐        │  │
│                         │  │   browser.storage.local │        │  │
│                         │  │   (Persistent Storage)  │        │  │
│                         │  └─────────────────────────┘        │  │
│                         └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Manifest (`manifest.json`)

The extension uses **Manifest V3** with the following key configurations:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{ "matches": ["<all_urls>"] }]
}
```

- **`storage`** — Allows persistent storage of blocked sites
- **`declarativeNetRequest`** — Enables network-level request blocking
- **`host_permissions`** — Grants access to all URLs for content script injection

---

#### 2. Popup UI (`popup.js`)

The popup provides the user interface for managing blocked sites. Key functions:

##### URL Normalization

```javascript
function normalizeRule(inputUrl) {
  // Handles various input formats:
  // - "example.com" → "example.com"
  // - "https://example.com/path" → "example.com/path"
  // - "http://www.example.com" → "www.example.com"
}
```

##### Dynamic Rule Management

Uses the **Declarative Net Request API** to create blocking rules at the network level:

```javascript
async function updateBlockingRules(sites) {
  const newRules = sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "||" + site,  // "||" = domain anchor
      resourceTypes: ["main_frame"]
    }
  }));
  
  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: currentRuleIds,
    addRules: newRules
  });
}
```

The `||` prefix is a domain anchor that matches the beginning of a hostname, allowing:
- `||example.com` to match `https://example.com`, `https://www.example.com`, `https://subdomain.example.com`

---

#### 3. Content Script (`content.js`)

Runs on every page and handles:

##### A. Fallback URL Blocking

Even though `declarativeNetRequest` handles most blocking at the network level, the content script provides an additional layer for already-loaded pages and SPA navigation:

```javascript
function isUrlBlocked(currentUrl, pattern) {
  const urlObj = new URL(currentUrl);
  const fullPath = urlObj.hostname + urlObj.pathname;
  const cleanHost = urlObj.hostname.replace(/^www\./, "");
  
  return (
    fullPath.includes(pattern) ||
    cleanFullPath.includes(pattern) ||
    currentUrl.includes(pattern)
  );
}

function blockPage() {
  window.stop();  // Stop loading immediately
  
  // Stop all media elements
  document.querySelectorAll("video, audio").forEach(m => {
    m.pause();
    m.muted = true;
    m.src = "";
    m.remove();
  });
  
  // Replace page content
  document.body.innerHTML = `<div>Page Blocked by Blockex</div>`;
}
```

##### B. SPA Navigation Detection

Single Page Applications don't trigger traditional page loads, so we use a `MutationObserver` to detect URL changes:

```javascript
const observer = new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkAndBlock();
  }
});

observer.observe(document, { subtree: true, childList: true });
window.addEventListener("popstate", checkAndBlock);
```

##### C. Element Hiding (YouTube Shorts)

For hiding specific elements like YouTube Shorts:

```javascript
function hideYouTubeShorts() {
  const shortsSelectors = [
    "ytd-rich-section-renderer[is-shorts]",  // Shorts shelf on homepage
    "ytd-reel-shelf-renderer",                // Shorts carousel
    '[href*="/shorts/"]',                     // Any link to shorts
    'yt-tab-shape[tab-title="Shorts"]',       // Shorts tab on channels
    "ytd-shorts"                              // Mini shorts player
  ];
  
  shortsSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Find the appropriate container and hide it
      const container = el.closest("ytd-rich-item-renderer") || el;
      container.style.display = "none";
    });
  });
}
```

A separate `MutationObserver` continuously monitors for new Shorts elements that YouTube dynamically loads.

---

#### 4. Background Script (`background.js`)

Handles messaging between the extension components:

```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.greeting === "hello")
    return Promise.resolve({ farewell: "goodbye" });
});
```

---

#### 5. Native App Extension Handler (`SafariWebExtensionHandler.swift`)

Bridges communication between the Safari extension and the native iOS/macOS app:

```swift
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  func beginRequest(with context: NSExtensionContext) {
    // Handles messages from browser.runtime.sendNativeMessage
    // Can be extended for native feature integration
  }
}
```

---

### Data Flow

```
┌──────────────┐  Block "example.com"   ┌──────────────┐
│   Popup UI   │ ─────────────────────► │ popup.js     │
└──────────────┘                        └──────┬───────┘
                                               │
                    ┌──────────────────────────┼─────────────────────────┐
                    │                          ▼                         │
                    │  ┌──────────────────────────────────────────────┐  │
                    │  │         browser.storage.local.set()          │  │
                    │  │         { blockedSites: ["example.com"] }    │  │
                    │  └──────────────────────────────────────────────┘  │
                    │                          │                         │
         ┌─────────────────────────────────────┼────────────────────┐    │
         │                                     ▼                    │    │
         │  ┌──────────────────────────────────────────────────┐    │    │
         │  │     declarativeNetRequest.updateDynamicRules()   │    │    │
         │  │     Creates network-level blocking rule          │    │    │
         │  └──────────────────────────────────────────────────┘    │    │
         │                                                          │    │
         │  Network Level (Fastest - blocks before page loads)     │    │
         └──────────────────────────────────────────────────────────┘    │
                                                                         │
         ┌───────────────────────────────────────────────────────────────┘
         │
         │  When user visits a page:
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  content.js                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  1. checkAndBlock() - Reads blockedSites from storage              │  │
│  │  2. isUrlBlocked() - Compares current URL against patterns         │  │
│  │  3. blockPage() - If matched, replaces page with "Blocked" message │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  MutationObserver continuously watches for URL changes (SPA support)     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Blockex/
├── Blockex/                          # macOS/iOS Container App
│   ├── AppDelegate.swift             # App lifecycle management
│   ├── SceneDelegate.swift           # Scene lifecycle (iOS)
│   ├── ViewController.swift          # Main view controller with WKWebView
│   ├── Info.plist                    # App configuration
│   ├── Assets.xcassets/              # App icons and images
│   └── Base.lproj/                   # Storyboards
│
├── Blockex Extension/                # Safari Web Extension
│   ├── SafariWebExtensionHandler.swift  # Native messaging handler
│   ├── Info.plist                    # Extension configuration
│   └── Resources/
│       ├── manifest.json             # Extension manifest (MV3)
│       ├── background.js             # Service worker / background script
│       ├── content.js                # Content script (injected into pages)
│       ├── popup.html                # Extension popup UI
│       ├── popup.css                 # Popup styles
│       ├── popup.js                  # Popup logic
│       ├── images/                   # Extension icons
│       └── _locales/                 # Internationalization
│
├── Blockex.xcodeproj/                # Xcode project
├── BlockexTests/                     # Unit tests
└── BlockexUITests/                   # UI tests
```

---

## Technical Notes

### Why Two Blocking Mechanisms?

1. **Declarative Net Request (Primary)**
   - Blocks requests at the network level before they reach the browser
   - Most efficient and fastest method
   - Works even when the content script hasn't loaded yet

2. **Content Script (Fallback)**
   - Handles edge cases where `declarativeNetRequest` might not work
   - Essential for SPA navigation where pages don't fully reload
   - Provides immediate visual feedback by replacing page content

### Browser API Compatibility

The extension uses a compatibility shim for cross-browser support:

```javascript
const api = typeof browser !== "undefined" ? browser : chrome;
```

Safari uses the `browser` namespace in its extensions, while Chrome-based browsers use `chrome`.

### Storage

All user data is stored locally using `browser.storage.local`:

- **`blockedSites`** — Array of blocked URL patterns
- **`hiddenFeatures`** — Array of feature IDs to hide (e.g., "youtube-shorts")

---

## License

MIT License

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
