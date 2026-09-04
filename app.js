/**
 * Application Core & Navigation Controller
 */

// State Management
const appState = {
  activeTab: 'movies', // 'movies' | 'books'
  currentMedia: null,
  isPlaying: false
};

// DOM Elements
const DOM = {
  navbar: document.getElementById('navbar'),
  navLinks: document.querySelectorAll('.nav-link'),
  sections: document.querySelectorAll('.app-section'),
  playerContainer: document.getElementById('player-container'),
  mediaFrame: document.getElementById('media-frame'),
  mediaTitle: document.getElementById('media-title'),
  playPauseBtn: document.getElementById('btn-play-pause'),
  closePlayerBtn: document.getElementById('btn-close-player')
};

/**
 * Initialize Application
 */
function initApp() {
  setupNavigation();
  setupPlayerControls();
  renderSection(appState.activeTab);
}

/**
 * Navigation System
 */
function setupNavigation() {
  DOM.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      if (targetTab && targetTab !== appState.activeTab) {
        switchTab(targetTab);
      }
    });
  });
}

function switchTab(tabName) {
  appState.activeTab = tabName;

  // Update Navigation UI
  DOM.navLinks.forEach(link => {
    const isActive = link.getAttribute('data-tab') === tabName;
    link.classList.toggle('active', isActive);
  });

  // Switch Sections
  DOM.sections.forEach(section => {
    const isTarget = section.id === `section-${tabName}`;
    section.classList.toggle('d-none', !isTarget);
  });
}

/**
 * Persistent Player Controller
 * Directs playback without altering fixed container dimensions.
 */
function setupPlayerControls() {
  if (DOM.playPauseBtn) {
    DOM.playPauseBtn.addEventListener('click', togglePlayback);
  }

  if (DOM.closePlayerBtn) {
    DOM.closePlayerBtn.addEventListener('click', closePlayer);
  }
}

function loadMediaItem(item) {
  if (!item) return;

  appState.currentMedia = item;

  // Set media content without collapsing or expanding fixed container dimensions
  if (DOM.mediaTitle) {
    DOM.mediaTitle.textContent = item.title || 'Reproduciendo...';
  }

  if (DOM.mediaFrame) {
    DOM.mediaFrame.src = item.sourceUrl || '';
  }

  // Ensure player visibility on fixed viewport layout
  if (DOM.playerContainer) {
    DOM.playerContainer.classList.remove('hidden');
    DOM.playerContainer.classList.add('visible');
  }

  appState.isPlaying = true;
  updatePlayerUI();
}

function togglePlayback() {
  appState.isPlaying = !appState.isPlaying;
  updatePlayerUI();
}

function updatePlayerUI() {
  if (!DOM.playPauseBtn) return;
  DOM.playPauseBtn.textContent = appState.isPlaying ? 'Pausar' : 'Reproducir';
}

function closePlayer() {
  if (DOM.mediaFrame) {
    DOM.mediaFrame.src = '';
  }
  if (DOM.playerContainer) {
    DOM.playerContainer.classList.remove('visible');
    DOM.playerContainer.classList.add('hidden');
  }
  appState.isPlaying = false;
  appState.currentMedia = null;
}

// Global exposure for item selection handlers
window.appController = {
  initApp,
  switchTab,
  loadMediaItem
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
