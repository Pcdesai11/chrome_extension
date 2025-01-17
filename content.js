// Store original page styles for restoration
let originalStyles = null;
let isReadingModeActive = false;

// Initialize content script
init();

function init() {
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'updateReadingMode':
        applyReadingMode(request.settings);
        break;
      case 'getPageContent':
        sendResponse({ content: extractReadableContent() });
        break;
      case 'toggleReadingMode':
        toggleReadingMode();
        break;
    }
    return true;
  });

  // Load saved state
  chrome.storage.sync.get(['readingModeActive', 'readingSettings'], (data) => {
    if (data.readingModeActive) {
      applyReadingMode(data.readingSettings);
    }
  });
}

function applyReadingMode(settings) {
  if (!isReadingModeActive) {
    saveOriginalStyles();
  }

  // Create reading mode container
  let readingContainer = document.getElementById('reading-mode-container');
  if (!readingContainer) {
    readingContainer = document.createElement('div');
    readingContainer.id = 'reading-mode-container';
    document.body.appendChild(readingContainer);
  }

  // Extract and format content
  const content = extractReadableContent();
  readingContainer.innerHTML = formatContent(content);

  // Apply styles with animation
  const styles = generateStyles(settings);
  applyStyles(readingContainer, styles);

  // Show container with animation
  readingContainer.style.opacity = '0';
  readingContainer.style.display = 'block';
  requestAnimationFrame(() => {
    readingContainer.style.transition = 'opacity 0.3s ease-out';
    readingContainer.style.opacity = '1';
  });

  // Hide original content
  document.body.childNodes.forEach(node => {
    if (node !== readingContainer) {
      node.style.display = 'none';
    }
  });

  isReadingModeActive = true;
  chrome.storage.sync.set({ readingModeActive: true });
}

function generateStyles(settings) {
  const { fontSize, fontFamily, bgColor } = settings;
  
  // Calculate contrast colors
  const rgb = hexToRgb(bgColor);
  const brightness = Math.round(((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000);
  const textColor = brightness > 125 ? '#000000' : '#FFFFFF';
  const linkColor = brightness > 125 ? '#0066cc' : '#66b3ff';

  return {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    padding: '2rem',
    backgroundColor: bgColor,
    color: textColor,
    fontSize: fontSize,
    fontFamily: fontFamily,
    lineHeight: '1.6',
    overflowY: 'auto',
    zIndex: '9999',
    boxSizing: 'border-box',
    '& p': {
      maxWidth: '800px',
      margin: '1em auto',
      textAlign: 'justify'
    },
    '& h1, & h2, & h3': {
      maxWidth: '800px',
      margin: '1.5em auto 1em',
      color: textColor
    },
    '& a': {
      color: linkColor,
      textDecoration: 'underline',
      transition: 'opacity 0.2s ease'
    },
    '& a:hover': {
      opacity: '0.8'
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      margin: '1em auto',
      display: 'block'
    }
  };
}

function applyStyles(element, styles) {
  Object.entries(styles).forEach(([property, value]) => {
    if (typeof value === 'object') {
      // Handle nested selectors
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        #reading-mode-container ${property} {
          ${Object.entries(value).map(([p, v]) => `${p}: ${v};`).join('\n')}
        }
      `;
      document.head.appendChild(styleSheet);
    } else {
      element.style[property] = value;
    }
  });
}

function extractReadableContent() {
  // Create a deep clone of the body
  const clone = document.body.cloneNode(true);
  
  // Remove unwanted elements
  const selectorsToRemove = [
    'script', 'style', 'iframe', 'nav', 'footer', 'aside',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
    '[role="advertisement"]', '.ad', '.ads', '.advertisement',
    '.social-share', '.comments', '.related-articles'
  ];
  
  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Extract main content
  const mainContent = clone.querySelector('main, [role="main"], article, .article, .content');
  const content = mainContent || clone;

  return content.innerHTML;
}

function formatContent(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // Format paragraphs
  doc.querySelectorAll('p').forEach(p => {
    if (p.textContent.length < 10) p.remove();
  });

  // Format headings
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    heading.style.clear = 'both';
  });

  // Format images
  doc.querySelectorAll('img').forEach(img => {
    if (img.width < 100 || img.height < 100) img.remove();
    else {
      img.style.maxWidth = '800px';
      img.style.height = 'auto';
    }
  });

  return `
    <div class="reading-content">
      ${doc.body.innerHTML}
    </div>
  `;
}

function saveOriginalStyles() {
  originalStyles = {
    bodyStyle: document.body.getAttribute('style'),
    elements: Array.from(document.getElementsByTagName('*')).map(el => ({
      element: el,
      style: el.getAttribute('style')
    }))
  };
}

function restoreOriginalStyles() {
  if (originalStyles) {
    document.body.setAttribute('style', originalStyles.bodyStyle || '');
    originalStyles.elements.forEach(({ element, style }) => {
      element.setAttribute('style', style || '');
    });
  }
}

function toggleReadingMode() {
  if (isReadingModeActive) {
    const container = document.getElementById('reading-mode-container');
    if (container) {
      container.style.opacity = '0';
      setTimeout(() => {
        container.remove();
        document.body.childNodes.forEach(node => {
          node.style.display = '';
        });
        restoreOriginalStyles();
      }, 300);
    }
    isReadingModeActive = false;
    chrome.storage.sync.set({ readingModeActive: false });
  } else {
    chrome.storage.sync.get('readingSettings', (data) => {
      if (data.readingSettings) {
        applyReadingMode(data.readingSettings);
      }
    });
  }
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

// Add keyboard shortcut listener
document.addEventListener('keydown', (e) => {
  // Alt/Option + R to toggle reading mode
  if (e.altKey && e.key === 'r') {
    e.preventDefault();
    toggleReadingMode();
  }
});

// Add progress bar for long articles
function addProgressBar() {
  const progressBar = document.createElement('div');
  progressBar.id = 'reading-progress';
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: #4a90e2;
    transition: width 0.2s ease;
    z-index: 10000;
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    if (isReadingModeActive) {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight - winHeight;
      const scrolled = (window.scrollY / docHeight) * 100;
      progressBar.style.width = `${scrolled}%`;
    }
  });
}

// Initialize progress bar
addProgressBar();