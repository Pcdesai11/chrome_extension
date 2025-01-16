function cleanPage() {
    const unwantedElements = ['.ad', '.sidebar', '.footer', '.popup'];
    unwantedElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    document.body.style.margin = '20px';
  }
  
  function applySettings(fontSize, backgroundColor) {
    document.body.style.fontSize = fontSize;
    document.body.style.backgroundColor = backgroundColor;
  }
  
  function readAloud() {
    const text = document.body.innerText;
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'applySettings') {
      applySettings(message.fontSize, message.backgroundColor);
    } else if (message.action === 'readAloud') {
      readAloud();
    }
  });
  
  cleanPage();
