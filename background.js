
let activeTabStates = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  
  const defaultSettings = {
    fontSize: '18px',
    fontFamily: 'Georgia',
    bgColor: '#f5f5f5',
    readingSpeed: '200',
    enableAutoMode: false,
    excludedDomains: [],
    keyboardShortcuts: {
      toggleReadingMode: 'Alt+R',
      toggleAutoMode: 'Alt+A'
    },
    customStyles: '',
    lastUpdateTimestamp: Date.now()
  };

  
  await chrome.storage.sync.set({
    readingSettings: defaultSettings,
    readingModeActive: false
  });

  
  chrome.contextMenus.create({
    id: 'toggleReadingMode',
    title: 'Toggle Reading Mode',
    contexts: ['page', 'selection']
  });

  chrome.contextMenus.create({
    id: 'addToExclusions',
    title: 'Never Show Reading Mode on This Site',
    contexts: ['page']
  });

  
  await updateExtensionBadge();
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getTabState':
      handleGetTabState(sender.tab?.id, sendResponse);
      break;
    case 'updateSettings':
      handleSettingsUpdate(request.settings, sendResponse);
      break;
    case 'toggleAutoMode':
      handleAutoModeToggle(request.enabled, sendResponse);
      break;
    case 'getStatistics':
      handleGetStatistics(sendResponse);
      break;
    case 'clearHistory':
      handleClearHistory(sendResponse);
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true; 
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'toggleReadingMode') {
    await toggleReadingMode(tab.id);
  } else if (info.menuItemId === 'addToExclusions') {
    await addDomainToExclusions(new URL(tab.url).hostname);
  }
});


chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await handleTabUpdate(tabId, tab);
  }
});


chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateExtensionBadge(activeInfo.tabId);
});


async function handleTabUpdate(tabId, tab) {
  const { readingSettings } = await chrome.storage.sync.get('readingSettings');
  
  if (readingSettings.enableAutoMode) {
    const shouldEnableReading = await shouldEnableReadingMode(tab.url);
    if (shouldEnableReading) {
      await enableReadingMode(tabId);
    }
  }
  
  await updateExtensionBadge(tabId);
  await updateStatistics(tab.url);
}

async function toggleReadingMode(tabId) {
  const state = activeTabStates.get(tabId) || { isEnabled: false };
  const newState = !state.isEnabled;
  
  activeTabStates.set(tabId, { ...state, isEnabled: newState });
  
  await chrome.tabs.sendMessage(tabId, {
    action: 'toggleReadingMode',
    enabled: newState
  });
  
  await updateExtensionBadge(tabId);
}

async function enableReadingMode(tabId) {
  const { readingSettings } = await chrome.storage.sync.get('readingSettings');
  
  await chrome.tabs.sendMessage(tabId, {
    action: 'updateReadingMode',
    settings: readingSettings
  });
  
  activeTabStates.set(tabId, { isEnabled: true });
  await updateExtensionBadge(tabId);
}

async function updateExtensionBadge(tabId) {
  if (!tabId) return;
  
  const state = activeTabStates.get(tabId);
  await chrome.action.setBadgeText({
    text: state?.isEnabled ? 'ON' : '',
    tabId
  });
  
  await chrome.action.setBadgeBackgroundColor({
    color: '#4a90e2',
    tabId
  });
}

async function shouldEnableReadingMode(url) {
  if (!url) return false;
  
  const { readingSettings } = await chrome.storage.sync.get('readingSettings');
  const hostname = new URL(url).hostname;
  
  
  if (readingSettings.excludedDomains.includes(hostname)) {
    return false;
  }
  
  
  const articlePatterns = [
    /article/i,
    /blog/i,
    /news/i,
    /post/i,
    /story/i
  ];
  
  return articlePatterns.some(pattern => url.match(pattern));
}

async function addDomainToExclusions(domain) {
  const { readingSettings } = await chrome.storage.sync.get('readingSettings');
  
  if (!readingSettings.excludedDomains.includes(domain)) {
    readingSettings.excludedDomains.push(domain);
    await chrome.storage.sync.set({ readingSettings });
  }
}


async function updateStatistics(url) {
  if (!url) return;
  
  const stats = await chrome.storage.local.get('readingStats') || { readingStats: {} };
  const hostname = new URL(url).hostname;
  
  if (!stats.readingStats[hostname]) {
    stats.readingStats[hostname] = {
      visits: 0,
      timeSpent: 0,
      lastVisit: null
    };
  }
  
  stats.readingStats[hostname].visits++;
  stats.readingStats[hostname].lastVisit = Date.now();
  
  await chrome.storage.local.set(stats);
}


chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    
    await handleExtensionUpdate(details.previousVersion);
  }
});

async function handleExtensionUpdate(previousVersion) {
  const { readingSettings } = await chrome.storage.sync.get('readingSettings');
  
  
  const updates = {
    
    lastUpdateTimestamp: Date.now()
  };
  
  await chrome.storage.sync.set({
    readingSettings: { ...readingSettings, ...updates }
  });
}


function handleError(error, context = '') {
  console.error(`Reading Mode Error [${context}]:`, error);
  
  
}


process.on('unhandledRejection', (error) => {
  handleError(error, 'Unhandled Rejection');
});


setInterval(() => {
  
  chrome.tabs.query({}, (tabs) => {
    const activeTabIds = new Set(tabs.map(tab => tab.id));
    for (const [tabId] of activeTabStates) {
      if (!activeTabIds.has(tabId)) {
        activeTabStates.delete(tabId);
      }
    }
  });
}, 30 * 60 * 1000); 