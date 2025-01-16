chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ fontSize: '16px', backgroundColor: '#f5f5f5' });
  });
  