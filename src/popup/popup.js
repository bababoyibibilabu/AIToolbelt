import gsap from 'gsap';
import { saveBookmark, deleteBookmark, getBookmarkByUrl, getTags, updateCustomTags } from '../utils/storage.js';
import { getCurrentUser, syncBookmarks } from '../utils/supabase.js';

// Global popup states
let currentTab = null;
let currentBookmark = null;
let selectedTags = [];
let currentCategory = 'tool';

// DOM elements
const btnStar = document.getElementById('btn-star');
const starStatus = document.getElementById('star-status');
const inputTitle = document.getElementById('input-title');
const containerQuickTags = document.getElementById('quick-tags');
const inputNewTag = document.getElementById('input-new-tag');
const btnAddTag = document.getElementById('btn-add-tag');
const btnManualToggle = document.getElementById('btn-manual-toggle');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const viewStar = document.getElementById('view-star');
const viewManual = document.getElementById('view-manual');
const syncIndicator = document.getElementById('sync-indicator');
const logoHamster = document.getElementById('logo-hamster');

// Manual form elements
const manualTitle = document.getElementById('manual-title');
const manualUrl = document.getElementById('manual-url');
const manualDesc = document.getElementById('manual-desc');
const containerManualTags = document.getElementById('manual-tags');
const btnManualSave = document.getElementById('btn-manual-save');
const btnManualCancel = document.getElementById('btn-manual-cancel');

// Load page info and initialization
document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
  setupEventListeners();
});

async function initPopup() {
  // 1. Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    currentTab = tabs[0];
    
    // Ignore Chrome internal pages
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('edge://')) {
      starStatus.textContent = '无法收藏 Chrome 系统页面';
      btnStar.style.pointerEvents = 'none';
      btnStar.style.opacity = '0.5';
      return;
    }

    // 2. Check if already bookmarked
    currentBookmark = await getBookmarkByUrl(currentTab.url);
    if (currentBookmark) {
      currentCategory = currentBookmark.category;
      selectedTags = currentBookmark.tags || [];
      
      // Update Star Button visual state
      btnStar.classList.add('bookmarked');
      starStatus.textContent = '🐹 腮帮子鼓鼓 (已囤粮)';
      showTitleInput(currentBookmark.title);
    }
  }

  // 3. Render tags and category chips
  await renderCategoryChips(currentCategory, '#view-star .chip');
  await renderTags();

  // 4. Update sync state indicator
  await updateSyncIndicator();
}

// Render category selectors
function renderCategoryChips(activeCategory, selector) {
  const chips = document.querySelectorAll(selector);
  chips.forEach(chip => {
    const category = chip.getAttribute('data-category');
    if (category === activeCategory) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// Render tags inside popup
async function renderTags() {
  const allTags = await getTags();
  
  // Render quick star tags
  containerQuickTags.innerHTML = '';
  allTags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = `tag-pill ${selectedTags.includes(tag) ? 'selected' : ''}`;
    pill.textContent = tag;
    pill.addEventListener('click', () => toggleTag(tag, pill));
    containerQuickTags.appendChild(pill);
  });

  // Render manual form tags
  containerManualTags.innerHTML = '';
  allTags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = `tag-pill ${selectedTags.includes(tag) ? 'selected' : ''}`;
    pill.textContent = tag;
    pill.addEventListener('click', () => toggleTag(tag, pill));
    containerManualTags.appendChild(pill);
  });
}

// Toggle tag selection
async function toggleTag(tag, element) {
  const index = selectedTags.indexOf(tag);
  if (index >= 0) {
    selectedTags.splice(index, 1);
    element.classList.remove('selected');
  } else {
    selectedTags.push(tag);
    element.classList.add('selected');
  }

  // If already bookmarked, update database instantly
  if (currentBookmark) {
    currentBookmark.tags = selectedTags;
    await saveBookmark(currentBookmark);
    triggerBackgroundSync();
  }
}

// Check and display Supabase login and sync status
async function updateSyncIndicator() {
  const user = await getCurrentUser();
  if (user) {
    syncIndicator.innerHTML = `<span class="dot"></span> <span class="sync-text">已登录云同步: ${user.email}</span>`;
    triggerBackgroundSync();
  } else {
    syncIndicator.innerHTML = `<span class="dot offline"></span> <span class="sync-text">数据仅保存在本地 (未登录)</span>`;
  }
}

// Cute Hamster Cheeks puff animation helper
function animateHamsterPuff() {
  if (logoHamster) {
    gsap.timeline()
      .to(logoHamster, { scaleX: 1.6, scaleY: 1.25, duration: 0.15, ease: "power2.out" }) // puff cheeks
      .to(logoHamster, { rotation: 10, duration: 0.05, repeat: 5, yoyo: true }) // wiggle joy
      .to(logoHamster, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(2)" }); // return with elastic bounce
  }
}

// Event listeners setups
function setupEventListeners() {
  // Star button toggle
  btnStar.addEventListener('click', async () => {
    if (!currentTab) return;
    
    if (btnStar.classList.contains('bookmarked')) {
      // Un-bookmark
      if (currentBookmark) {
        await deleteBookmark(currentBookmark.id);
      }
      btnStar.classList.remove('bookmarked');
      starStatus.textContent = '🐹 吐出了粮食 (取消收藏)';
      hideTitleInput();
      
      // Minor deflation animation
      if (logoHamster) {
        gsap.to(logoHamster, { scale: 0.85, duration: 0.15, yoyo: true, repeat: 1 });
      }

      currentBookmark = null;
      selectedTags = [];
      await renderTags();
    } else {
      // Quick bookmark current tab
      currentBookmark = await saveBookmark({
        title: currentTab.title,
        url: currentTab.url,
        category: currentCategory,
        tags: selectedTags,
        description: '' // empty for quick bookmark
      });
      
      btnStar.classList.add('bookmarked');
      starStatus.textContent = '🐹 囤粮成功！腮帮子又鼓了！';
      showTitleInput(currentBookmark.title);
      animateHamsterPuff();
    }
    triggerBackgroundSync();
  });

  // Category chip toggle for star view
  document.querySelectorAll('#view-star .chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const category = chip.getAttribute('data-category');
      currentCategory = category;
      renderCategoryChips(category, '#view-star .chip');
      
      if (currentBookmark) {
        currentBookmark.category = category;
        await saveBookmark(currentBookmark);
        triggerBackgroundSync();
      }
    });
  });

  // Category chip toggle for manual view
  document.querySelectorAll('#view-manual .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const category = chip.getAttribute('data-category');
      currentCategory = category;
      renderCategoryChips(category, '#view-manual .chip');
    });
  });

  // Add custom tags
  btnAddTag.addEventListener('click', async () => {
    const tagText = inputNewTag.value.trim();
    if (!tagText) return;

    await updateCustomTags([tagText]);
    if (!selectedTags.includes(tagText)) {
      selectedTags.push(tagText);
    }
    inputNewTag.value = '';
    
    // Save to active bookmark if exists
    if (currentBookmark) {
      currentBookmark.tags = selectedTags;
      await saveBookmark(currentBookmark);
    }

    await renderTags();
    triggerBackgroundSync();
  });

  inputNewTag.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnAddTag.click();
    }
  });

  // Switch to manual form view
  btnManualToggle.addEventListener('click', () => {
    if (viewManual.classList.contains('hidden')) {
      // Toggle to manual input form
      viewStar.classList.add('hidden');
      viewManual.classList.remove('hidden');
      btnManualToggle.textContent = '⭐';
      btnManualToggle.title = '星星快速收藏';
      
      // Pre-fill fields
      manualTitle.value = currentBookmark ? currentBookmark.title : (currentTab ? currentTab.title : '');
      manualUrl.value = currentBookmark ? currentBookmark.url : (currentTab ? currentTab.url : '');
      manualDesc.value = currentBookmark ? currentBookmark.description : '';
      
      renderCategoryChips(currentCategory, '#view-manual .chip');
    } else {
      // Toggle back to Star view
      viewManual.classList.add('hidden');
      viewStar.classList.remove('hidden');
      btnManualToggle.textContent = '➕';
      btnManualToggle.title = '手动新建收藏';
    }
  });

  // Save manual form
  btnManualSave.addEventListener('click', async () => {
    const title = manualTitle.value.trim() || '无标题';
    const url = manualUrl.value.trim();
    const description = manualDesc.value.trim();

    const saved = await saveBookmark({
      id: currentBookmark ? currentBookmark.id : undefined,
      title,
      url,
      description,
      category: currentCategory,
      tags: selectedTags
    });

    // Reset view
    currentBookmark = saved;
    btnStar.classList.add('bookmarked');
    starStatus.textContent = '🐹 手动囤粮成功！';
    showTitleInput(saved.title);
    animateHamsterPuff();
    
    viewManual.classList.add('hidden');
    viewStar.classList.remove('hidden');
    btnManualToggle.textContent = '➕';
    btnManualToggle.title = '手动新建收藏';
    
    triggerBackgroundSync();
  });

  // Cancel manual form
  btnManualCancel.addEventListener('click', () => {
    viewManual.classList.add('hidden');
    viewStar.classList.remove('hidden');
    btnManualToggle.textContent = '➕';
    btnManualToggle.title = '手动新建收藏';
  });

  // Open full dashboard panel
  btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
    window.close(); // close popup window
  });

  // Save title on blur or Enter key
  if (inputTitle) {
    inputTitle.addEventListener('blur', async () => {
      if (!currentBookmark) return;
      const newTitle = inputTitle.value.trim() || currentBookmark.title;
      if (newTitle !== currentBookmark.title) {
        currentBookmark.title = newTitle;
        await saveBookmark(currentBookmark);
        triggerBackgroundSync();
      }
    });

    inputTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inputTitle.blur();
    });
  }
}

// Send sync signal to background service worker to keep popup fast
function triggerBackgroundSync() {
  chrome.runtime.sendMessage({ action: 'trigger_sync' }, (response) => {
    if (chrome.runtime.lastError) {
      // Safe fallback if background worker is currently asleep
      console.log('Background worker did not respond immediately, will retry in background.');
    }
  });
}

// Show the inline title input with the given value
function showTitleInput(title) {
  if (!inputTitle) return;
  inputTitle.value = title || '';
  inputTitle.classList.remove('hidden');
}

// Hide the inline title input
function hideTitleInput() {
  if (!inputTitle) return;
  inputTitle.classList.add('hidden');
  inputTitle.value = '';
}
