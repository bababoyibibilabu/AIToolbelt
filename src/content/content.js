// AIToolbelt Content Script - Toast Injector

// Listen to message calls from service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'show_sync_toast') {
    showSyncToast(request.title, request.message, request.status);
    sendResponse({ received: true });
  }
});

/**
 * Creates and animations a premium Toast notification on the current webpage
 * @param {String} title Title of the Toast
 * @param {String} message Short description message
 * @param {String} status 'success' or 'error'
 */
function showSyncToast(title, message, status) {
  // Inject style block if it doesn't exist yet
  injectStyles();

  // Create toast container if it doesn't exist
  let container = document.getElementById('ai-toolbelt-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-toolbelt-toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `ai-toast ${status === 'error' ? 'ai-toast-error' : 'ai-toast-success'}`;
  
  toast.innerHTML = `
    <div class="ai-toast-icon">${status === 'error' ? '⚠️' : '✨'}</div>
    <div class="ai-toast-content">
      <div class="ai-toast-title">${title}</div>
      <div class="ai-toast-msg">${message}</div>
    </div>
    <button class="ai-toast-close">&times;</button>
  `;

  // Close button trigger
  toast.querySelector('.ai-toast-close').addEventListener('click', () => {
    removeToast(toast);
  });

  // Append toast
  container.appendChild(toast);

  // Trigger animation after append
  setTimeout(() => {
    toast.classList.add('ai-toast-visible');
  }, 50);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    removeToast(toast);
  }, 3500);
}

function removeToast(toast) {
  if (toast.parentNode) {
    toast.classList.remove('ai-toast-visible');
    // Wait for transition before DOM removal
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }
}

/**
 * Injects CSS rules directly into the host website page.
 * Keeps styles isolated using specific prefixes.
 */
function injectStyles() {
  const styleId = 'ai-toolbelt-toast-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #ai-toolbelt-toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483647; /* Maximum z-index to overlay on any page elements */
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      pointer-events: none;
    }

    .ai-toast {
      pointer-events: auto;
      width: 320px;
      background: rgba(18, 18, 22, 0.85) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 12px !important;
      padding: 14px 16px !important;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: #e2e8f0 !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
      transform: translateX(360px);
      opacity: 0;
      transition: all 400ms cubic-bezier(0.175, 0.885, 0.32, 1.15) !important;
    }

    .ai-toast-visible {
      transform: translateX(0);
      opacity: 1;
    }

    .ai-toast-success {
      border-left: 4px solid oklch(75% 0.18 200) !important; /* Neon Teal */
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(50, 220, 180, 0.08) !important;
    }

    .ai-toast-error {
      border-left: 4px solid oklch(65% 0.22 25) !important; /* Amber / Orange-Red */
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(220, 80, 50, 0.08) !important;
    }

    .ai-toast-icon {
      font-size: 20px;
      line-height: 1;
      margin-top: 2px;
      filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.2));
    }

    .ai-toast-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .ai-toast-title {
      font-weight: 700 !important;
      font-size: 14px !important;
      color: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .ai-toast-msg {
      font-size: 12px !important;
      color: #94a3b8 !important;
      line-height: 1.4 !important;
      margin: 0 !important;
      padding: 0 !important;
      word-break: break-all;
    }

    .ai-toast-close {
      background: transparent !important;
      border: none !important;
      color: #64748b !important;
      font-size: 18px !important;
      cursor: pointer !important;
      padding: 0 !important;
      margin: 0 !important;
      line-height: 1 !important;
      transition: color 200ms !important;
    }

    .ai-toast-close:hover {
      color: #ffffff !important;
    }
  `;
  document.head.appendChild(style);
}
