const speechSynthesis = window.speechSynthesis;
let currentSpeech = null;

// DOM Elements Cache
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    fontSize: document.getElementById('fontSize'),
    fontFamily: document.getElementById('fontFamily'),
    bgColor: document.getElementById('bgColor'),
    readingSpeed: document.getElementById('readingSpeed'),
    speedValue: document.querySelector('.speed-value'),
    themePreview: document.getElementById('themePreview'),
    saveBtn: document.getElementById('saveBtn'),
    readAloudBtn: document.getElementById('readAloudBtn')
  };

  // Load saved settings
  loadSettings();

  // Event Listeners
  elements.fontSize.addEventListener('change', updatePreview);
  elements.fontFamily.addEventListener('change', updatePreview);
  elements.bgColor.addEventListener('input', updatePreview);
  elements.readingSpeed.addEventListener('input', updateSpeedValue);
  elements.saveBtn.addEventListener('click', saveSettings);
  elements.readAloudBtn.addEventListener('click', toggleReadAloud);

  // Add animation classes to buttons on hover
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      const span = button.querySelector('.button-content');
      span.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
      const span = button.querySelector('.button-content');
      span.style.transform = 'translateY(0)';
    });
  });

  // Initialize preview
  updatePreview();
});

// Update speed value display
function updateSpeedValue(e) {
  const speedValue = document.querySelector('.speed-value');
  speedValue.textContent = `${e.target.value} wpm`;
  speedValue.classList.add('animate__animated', 'animate__pulse');
  setTimeout(() => {
    speedValue.classList.remove('animate__animated', 'animate__pulse');
  }, 500);
}

// Update theme preview
function updatePreview() {
  const preview = document.getElementById('themePreview');
  const fontSize = document.getElementById('fontSize').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const bgColor = document.getElementById('bgColor').value;

  // Calculate contrast color for text
  const rgb = hexToRgb(bgColor);
  const brightness = Math.round(((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000);
  const textColor = brightness > 125 ? '#000000' : '#FFFFFF';

  // Apply styles with animation
  preview.style.transition = 'all 0.3s ease-out';
  preview.style.backgroundColor = bgColor;
  preview.style.color = textColor;
  preview.style.fontSize = fontSize;
  preview.style.fontFamily = fontFamily;

  // Add animation
  preview.classList.add('animate__animated', 'animate__pulse');
  setTimeout(() => {
    preview.classList.remove('animate__animated', 'animate__pulse');
  }, 500);
}

// Save settings to chrome.storage
function saveSettings() {
  const settings = {
    fontSize: document.getElementById('fontSize').value,
    fontFamily: document.getElementById('fontFamily').value,
    bgColor: document.getElementById('bgColor').value,
    readingSpeed: document.getElementById('readingSpeed').value
  };

  chrome.storage.sync.set({ readingSettings: settings }, () => {
    // Show save animation
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.classList.add('animate__animated', 'animate__rubberBand');
    
    // Update button text temporarily
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '✓ Saved!';
    
    setTimeout(() => {
      saveBtn.classList.remove('animate__animated', 'animate__rubberBand');
      saveBtn.innerHTML = originalText;
    }, 1500);

    // Send message to content script to update page
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateReadingMode',
        settings: settings
      });
    });
  });
}

// Load settings from chrome.storage
function loadSettings() {
  chrome.storage.sync.get('readingSettings', (data) => {
    if (data.readingSettings) {
      const settings = data.readingSettings;
      document.getElementById('fontSize').value = settings.fontSize;
      document.getElementById('fontFamily').value = settings.fontFamily;
      document.getElementById('bgColor').value = settings.bgColor;
      document.getElementById('readingSpeed').value = settings.readingSpeed;
      updateSpeedValue({ target: document.getElementById('readingSpeed') });
      updatePreview();
    }
  });
}

// Toggle read aloud functionality
function toggleReadAloud() {
  const readAloudBtn = document.getElementById('readAloudBtn');
  
  if (currentSpeech && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentSpeech = null;
    readAloudBtn.innerHTML = '<span class="button-content">Read Aloud</span>';
    readAloudBtn.style.background = '#28a745';
    return;
  }

  // Get current tab's content
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, (response) => {
      if (response && response.content) {
        const utterance = new SpeechSynthesisUtterance(response.content);
        utterance.rate = document.getElementById('readingSpeed').value / 200; // Normalize to speech API rate
        utterance.pitch = 1;
        
        // Update button state
        readAloudBtn.innerHTML = '<span class="button-content">Stop Reading</span>';
        readAloudBtn.style.background = '#dc3545';
        
        utterance.onend = () => {
          readAloudBtn.innerHTML = '<span class="button-content">Read Aloud</span>';
          readAloudBtn.style.background = '#28a745';
          currentSpeech = null;
        };

        currentSpeech = utterance;
        speechSynthesis.speak(utterance);
      }
    });
  });
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }
  
  // Ctrl/Cmd + R to toggle read aloud
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    toggleReadAloud();
  }
});

// Add smooth transitions when opening/closing popup
window.addEventListener('load', () => {
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.3s ease-out';
    document.body.style.opacity = '1';
  });
});

// Clean up before popup closes
window.addEventListener('unload', () => {
  if (currentSpeech) {
    speechSynthesis.cancel();
  }
});