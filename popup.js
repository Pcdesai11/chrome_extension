
chrome.storage.local.get(['fontSize', 'backgroundColor'], (data) => {
    document.getElementById('fontSize').value = data.fontSize || '16px';
    document.getElementById('bgColor').value = data.backgroundColor || '#f5f5f5';
  });
  

  document.getElementById('saveBtn').addEventListener('click', () => {
    const fontSize = document.getElementById('fontSize').value;
    const backgroundColor = document.getElementById('bgColor').value;
    
    chrome.storage.local.set({ fontSize, backgroundColor });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'applySettings', fontSize, backgroundColor });
    });
  });
  
  document.getElementById('readAloudBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'readAloud' });
    });
  });
  