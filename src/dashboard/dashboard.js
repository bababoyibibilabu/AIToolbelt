import gsap from 'gsap';
import { 
  getLocalBookmarks, 
  saveBookmark, 
  deleteBookmark, 
  getTags, 
  updateCustomTags, 
  getSupabaseConfig, 
  saveSupabaseConfig 
} from '../utils/storage.js';
import { 
  getCurrentUser, 
  signOut, 
  sendOtp, 
  verifyOtp, 
  syncBookmarks, 
  getSupabaseClient 
} from '../utils/supabase.js';

// Application State
let allBookmarks = [];
let filteredBookmarks = [];
let activeCategory = 'all';
let activeTag = null;
let searchQuery = '';

// DOM Elements - Sidebar & Main Layout
const searchInput = document.getElementById('search-input');
const sidebarNavItems = document.querySelectorAll('.nav-item');
const sidebarTagsContainer = document.getElementById('sidebar-tags');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const cardsContainer = document.getElementById('cards-container');
const emptyStateView = document.getElementById('empty-state-view');
const btnSync = document.getElementById('btn-sync');
const btnAddBookmark = document.getElementById('btn-add-bookmark');
const currentFilterTitle = document.getElementById('current-filter-title');
const filterDescription = document.getElementById('filter-description');
const syncIndicator = document.getElementById('dashboard-sync-indicator');

// DOM Elements - Modals
const modalBookmark = document.getElementById('modal-bookmark');
const modalSettings = document.getElementById('modal-settings');
const syncLoader = document.getElementById('sync-loader');
const formBookmark = document.getElementById('form-bookmark');

// Bookmark Form Inputs
const editId = document.getElementById('edit-id');
const editTitle = document.getElementById('edit-title');
const editCategory = document.getElementById('edit-category');
const editUrl = document.getElementById('edit-url');
const editDescription = document.getElementById('edit-description');
const modalTagsList = document.getElementById('modal-tags-list');
const editNewTag = document.getElementById('edit-new-tag');
const btnModalAddTag = document.getElementById('btn-modal-add-tag');

// Settings Inputs & Controls
const settingsDbUrl = document.getElementById('settings-db-url');
const settingsDbKey = document.getElementById('settings-db-key');
const btnSaveDb = document.getElementById('btn-save-db');
const settingsEmail = document.getElementById('settings-email');
const settingsOtp = document.getElementById('settings-otp');
const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const groupOtp = document.getElementById('group-otp');
const authLoggedOutSection = document.getElementById('settings-auth-logged-out');
const authLoggedInSection = document.getElementById('settings-auth-logged-in');
const loggedInEmailDisplay = document.getElementById('logged-in-email-display');
const btnSignOut = document.getElementById('btn-sign-out');

// Local Temp States
let modalSelectedTags = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  await checkAuthStatus();
});

// Load bookmarks and tags from database
async function loadData() {
  allBookmarks = await getLocalBookmarks();
  applyFiltersAndRender();
  updateCategoryCounts();
  await renderSidebarTags();
}

// Check if user is logged into Supabase
async function checkAuthStatus() {
  try {
    const user = await getCurrentUser();
    const indicatorDot = syncIndicator.querySelector('.status-indicator-dot');
    const indicatorText = syncIndicator.querySelector('.status-indicator-text');
    
    if (user) {
      // Logged in
      indicatorDot.classList.remove('offline');
      indicatorText.textContent = `已同步: ${user.email}`;
      
      authLoggedInSection.classList.remove('hidden');
      authLoggedOutSection.classList.add('hidden');
      loggedInEmailDisplay.textContent = user.email;
    } else {
      // Logged out / offline
      indicatorDot.classList.add('offline');
      indicatorText.textContent = '数据仅保存在本地 (未登录)';
      
      authLoggedInSection.classList.add('hidden');
      authLoggedOutSection.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Check auth status failed:', err);
  }
}

// Calculate bookmark count per category
function updateCategoryCounts() {
  const counts = { all: 0, skill: 0, mcp: 0, prompt: 0, tool: 0 };
  allBookmarks.forEach(item => {
    counts.all++;
    if (counts[item.category] !== undefined) {
      counts[item.category]++;
    }
  });

  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-skill').textContent = counts.skill;
  document.getElementById('count-mcp').textContent = counts.mcp;
  document.getElementById('count-prompt').textContent = counts.prompt;
  document.getElementById('count-tool').textContent = counts.tool;
}

// Draw tags and count filters in the sidebar
async function renderSidebarTags() {
  const allTags = await getTags();
  sidebarTagsContainer.innerHTML = '';
  
  // Calculate counts for each tag based on matching items
  const tagCounts = {};
  allBookmarks.forEach(item => {
    if (item.tags) {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  allTags.forEach(tag => {
    const count = tagCounts[tag] || 0;
    if (count === 0 && tag !== activeTag) return; // Hide tags with zero entries unless active

    const pill = document.createElement('div');
    pill.className = `tag-filter-pill ${activeTag === tag ? 'active' : ''}`;
    pill.innerHTML = `
      <span class="tag-filter-name"># ${tag}</span>
      <span class="tag-filter-count">${count}</span>
    `;
    pill.addEventListener('click', () => {
      toggleTagFilter(tag);
    });
    sidebarTagsContainer.appendChild(pill);
  });
}

// Toggle active tag filter
function toggleTagFilter(tag) {
  if (activeTag === tag) {
    activeTag = null;
  } else {
    activeTag = tag;
  }
  
  // Reset navigation selection visually if we filter by tag
  if (activeTag !== null) {
    sidebarNavItems.forEach(item => item.classList.remove('active'));
  } else {
    // Return focus to active category
    document.querySelector(`.nav-item[data-filter="${activeCategory}"]`).classList.add('active');
  }

  renderSidebarTags();
  applyFiltersAndRender();
}

// Filter the bookmark list based on search queries and category choices
function applyFiltersAndRender() {
  filteredBookmarks = allBookmarks.filter(item => {
    // 1. Category Filter
    if (activeTag === null && activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    
    // 2. Tag Filter
    if (activeTag !== null && (!item.tags || !item.tags.includes(activeTag))) {
      return false;
    }

    // 3. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title && item.title.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      const matchUrl = item.url && item.url.toLowerCase().includes(q);
      const matchTags = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
      
      return matchTitle || matchDesc || matchUrl || matchTags;
    }

    return true;
  });

  // Sort bookmarks by newest updated date first
  filteredBookmarks.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  // Update header text
  if (activeTag !== null) {
    currentFilterTitle.textContent = `标签: #${activeTag}`;
    filterDescription.textContent = `展示带有 #${activeTag} 标记的所有收藏项目（共 ${filteredBookmarks.length} 项）。`;
  } else {
    const titles = {
      all: '全部 AI 粮食',
      skill: 'Skill (AI 技能)',
      mcp: 'MCP Server (配置服务)',
      prompt: 'Prompt (提示词)',
      tool: 'AI Tool & Product (产品工具)'
    };
    const desc = {
      all: '显示仓鼠为您囤积的所有 AI 粮食卡片。',
      skill: '用于规范 AI 行为的技能文件 (.impeccable.md, SYSTEM 预设等)。',
      mcp: '模型上下文协议 (Model Context Protocol) 配置文件或服务器代码。',
      prompt: '精心调试的 AI 提示词 (Prompt)、引导词及上下文定义。',
      tool: '各类优质的 AI 独立产品、效率工具、Web 网站和框架。'
    };
    currentFilterTitle.textContent = titles[activeCategory];
    filterDescription.textContent = `${desc[activeCategory]}（共 ${filteredBookmarks.length} 项）`;
  }

  renderCards();
}

// Render bookmark cards list
function renderCards() {
  // Clear container leaving empty-state behind
  const cards = cardsContainer.querySelectorAll('.bookmark-card');
  cards.forEach(c => c.remove());

  if (filteredBookmarks.length === 0) {
    emptyStateView.classList.remove('hidden');
    return;
  }

  emptyStateView.classList.add('hidden');

  filteredBookmarks.forEach(item => {
    const card = document.createElement('article');
    card.className = `bookmark-card glass-panel cat-${item.category}`;
    card.id = `card-${item.id}`;

    // Format local time
    const formattedDate = new Date(item.updated_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const categoryNames = {
      skill: 'Skill',
      mcp: 'MCP Server',
      prompt: 'Prompt',
      tool: 'AI Tool'
    };

    // Card top headers
    let cardContent = `
      <div class="card-meta">
        <span class="badge-cat">${categoryNames[item.category]}</span>
        <span class="card-date">${formattedDate}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
    `;

    // Clickable link if URL exists
    if (item.url) {
      cardContent += `
        <a href="${item.url}" target="_blank" class="card-link">
          🔗 ${escapeHtml(item.url.substring(0, 45))}${item.url.length > 45 ? '...' : ''}
        </a>
      `;
    }

    // Description or Prompt Code Blocks
    const isCodeCategory = item.category === 'prompt' || item.category === 'mcp' || item.category === 'skill';
    if (isCodeCategory && item.description) {
      // Monospaced prompt display
      cardContent += `
        <div class="prompt-container">
          <button class="copy-btn" data-id="${item.id}">复制内容</button>
          <code style="display:block; white-space:pre-wrap;">${escapeHtml(item.description)}</code>
        </div>
      `;
    } else if (item.description) {
      // Normal text description
      cardContent += `
        <p class="card-desc">${escapeHtml(item.description)}</p>
      `;
    } else {
      // Empty content spacing
      cardContent += `<div style="flex-grow:1;"></div>`;
    }

    // Tags bottom list
    cardContent += `<div class="card-tags">`;
    if (item.tags && item.tags.length > 0) {
      item.tags.forEach(tag => {
        cardContent += `<span class="card-tag-pill" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`;
      });
    }
    cardContent += `</div>`;

    // Actions block
    cardContent += `
      <div class="card-actions">
        <button class="card-action-btn btn-edit" data-id="${item.id}">✏️ 编辑</button>
        <button class="card-action-btn btn-delete" data-id="${item.id}">🗑️ 删除</button>
      </div>
    `;

    card.innerHTML = cardContent;
    cardsContainer.appendChild(card);
  });

  // Attach card event handlers
  setupCardEvents();

  // STAGGER ENTRANCE ANIMATION (GSAP Integration)
  gsap.from('.bookmark-card', {
    opacity: 0,
    y: 20,
    duration: 0.35,
    stagger: 0.04,
    ease: 'power2.out'
  });
}

// Bind clicks to dynamically rendered card buttons
function setupCardEvents() {
  // Copy prompt contents
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = btn.getAttribute('data-id');
      const item = allBookmarks.find(b => b.id === cardId);
      if (item && item.description) {
        navigator.clipboard.writeText(item.description)
          .then(() => {
            const origText = btn.textContent;
            btn.textContent = '已复制！';
            btn.style.color = 'var(--color-primary)';
            setTimeout(() => {
              btn.textContent = origText;
              btn.style.color = '';
            }, 2000);
          })
          .catch(err => console.error('Copy failed:', err));
      }
    });
  });

  // Edit action
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = btn.getAttribute('data-id');
      openEditModal(cardId);
    });
  });

  // Delete action
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cardId = btn.getAttribute('data-id');
      const item = allBookmarks.find(b => b.id === cardId);
      if (confirm(`确定要删除“${item.title}”吗？此操作无法撤销。`)) {
        await deleteBookmark(cardId);
        await loadData();
        triggerBackgroundSync();
      }
    });
  });

  // Tag click search toggle
  document.querySelectorAll('.card-tag-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const tag = pill.getAttribute('data-tag');
      toggleTagFilter(tag);
    });
  });
}

// Helper to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event bindings for dashboard layout controls
function setupEventListeners() {
  // Global search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFiltersAndRender();
  });

  // Nav category filters
  sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarNavItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      activeCategory = item.getAttribute('data-filter');
      activeTag = null; // reset active tag filter
      
      applyFiltersAndRender();
      renderSidebarTags();
    });
  });

  // Toggle Settings modal
  btnSettingsToggle.addEventListener('click', async () => {
    // Fill saved Supabase configuration URL/Key fields
    const config = await getSupabaseConfig();
    if (config) {
      settingsDbUrl.value = config.url || '';
      settingsDbKey.value = config.anonKey || '';
    }
    
    await checkAuthStatus();
    modalSettings.classList.remove('hidden');
    gsap.fromTo('#modal-settings .modal-card', 
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.7)' }
    );
  });

  // Toggle add item modal
  btnAddBookmark.addEventListener('click', () => {
    openAddModal();
  });

  // Close modals
  document.querySelectorAll('.modal-overlay, .modal-close-btn, .btn-cancel').forEach(el => {
    el.addEventListener('click', (e) => {
      // Close only if overlay or close button clicked
      if (e.target === el || el.classList.contains('modal-close-btn') || el.classList.contains('btn-cancel')) {
        const modal = el.closest('.modal-overlay');
        if (modal) {
          gsap.to(modal.querySelector('.modal-card'), {
            scale: 0.95,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
              modal.classList.add('hidden');
              gsap.set(modal.querySelector('.modal-card'), { clearProps: 'all' });
            }
          });
        }
      }
    });
  });

  // Trigger sync manually
  btnSync.addEventListener('click', async () => {
    await performSync();
  });

  // Modal tags creation
  btnModalAddTag.addEventListener('click', async () => {
    const tagText = editNewTag.value.trim();
    if (!tagText) return;

    await updateCustomTags([tagText]);
    if (!modalSelectedTags.includes(tagText)) {
      modalSelectedTags.push(tagText);
    }
    editNewTag.value = '';
    await renderModalTags();
  });

  editNewTag.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnModalAddTag.click();
    }
  });

  // Save Bookmark form submit
  formBookmark.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editId.value || undefined;
    const title = editTitle.value.trim();
    const category = editCategory.value;
    const url = editUrl.value.trim();
    const description = editDescription.value.trim();

    await saveBookmark({
      id,
      title,
      category,
      url,
      description,
      tags: modalSelectedTags
    });

    modalBookmark.classList.add('hidden');
    await loadData();
    animateMainHamster();
    triggerBackgroundSync();
  });

  // Settings: Save Supabase Project Config URL/Key
  btnSaveDb.addEventListener('click', async () => {
    const rawUrl = settingsDbUrl.value.trim();
    const anonKey = settingsDbKey.value.trim();

    if (!rawUrl || !anonKey) {
      alert('请填写完整的 URL 和 Anon Key！');
      return;
    }

    let url = rawUrl;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      const parsedUrl = new URL(url);
      url = parsedUrl.origin;
    } catch (e) {
      alert('请输入有效的 URL 地址！');
      btnSaveDb.textContent = '保存配置';
      btnSaveDb.disabled = false;
      return;
    }

    // Update input field visually
    settingsDbUrl.value = url;

    btnSaveDb.textContent = '测试并保存中...';
    btnSaveDb.disabled = true;

    try {
      // Save locally
      await saveSupabaseConfig({ url, anonKey });
      
      // Attempt connection test
      const client = await getSupabaseClient();
      if (client) {
        btnSaveDb.textContent = '保存成功 ✓';
        btnSaveDb.style.borderColor = 'var(--color-primary)';
        setTimeout(() => {
          btnSaveDb.textContent = '保存配置';
          btnSaveDb.disabled = false;
          btnSaveDb.style.borderColor = '';
        }, 2000);
        
        await checkAuthStatus();
      } else {
        throw new Error('Supabase 客户端初始化失败。');
      }
    } catch (err) {
      console.error(err);
      alert('连接失败，请检查 URL 和 Anon Key 是否正确！');
      btnSaveDb.textContent = '保存配置';
      btnSaveDb.disabled = false;
    }
  });

  // Settings: Send OTP Email Verification Code
  btnSendOtp.addEventListener('click', async () => {
    const email = settingsEmail.value.trim();
    if (!email) {
      alert('请输入邮箱地址！');
      return;
    }

    btnSendOtp.textContent = '发送中...';
    btnSendOtp.disabled = true;

    try {
      await sendOtp(email);
      alert('验证码已发送至您的邮箱，请查收！');
      
      groupOtp.classList.remove('hidden');
      btnVerifyOtp.classList.remove('hidden');
      btnSendOtp.textContent = '重新发送';
      btnSendOtp.disabled = false;
    } catch (err) {
      alert(`发送失败: ${err.message}`);
      btnSendOtp.textContent = '发送验证码';
      btnSendOtp.disabled = false;
    }
  });

  // Settings: Verify OTP and Login
  btnVerifyOtp.addEventListener('click', async () => {
    const email = settingsEmail.value.trim();
    const otp = settingsOtp.value.trim();

    if (!email || !otp) {
      alert('请输入邮箱和验证码！');
      return;
    }

    btnVerifyOtp.textContent = '登录中...';
    btnVerifyOtp.disabled = true;

    try {
      const data = await verifyOtp(email, otp);
      if (data.session) {
        alert('登录成功！已启用云端自动同步。');
        modalSettings.classList.add('hidden');
        await checkAuthStatus();
        await performSync(); // Instantly sync data on login success
      } else {
        throw new Error('无有效 Session 产生，验证码可能已过期。');
      }
    } catch (err) {
      alert(`登录失败: ${err.message}`);
      btnVerifyOtp.textContent = '验证登录';
      btnVerifyOtp.disabled = false;
    }
  });

  // Settings: Sign Out
  btnSignOut.addEventListener('click', async () => {
    if (confirm('确定要退出登录吗？退出后数据将仅保存在本地。')) {
      await signOut();
      await checkAuthStatus();
      alert('已安全退出登录。');
    }
  });
}

// Open bookmark details modal for creating
function openAddModal() {
  editId.value = '';
  formBookmark.reset();
  modalSelectedTags = [];
  document.getElementById('modal-title-text').textContent = '添加 AI 收藏';
  
  renderModalTags();
  modalBookmark.classList.remove('hidden');
  gsap.fromTo('#modal-bookmark .modal-card',
    { scale: 0.95, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.7)' }
  );
}

// Open bookmark details modal for editing
async function openEditModal(id) {
  const item = allBookmarks.find(b => b.id === id);
  if (!item) return;

  editId.value = item.id;
  editTitle.value = item.title;
  editCategory.value = item.category;
  editUrl.value = item.url || '';
  editDescription.value = item.description || '';
  modalSelectedTags = [...(item.tags || [])];
  
  document.getElementById('modal-title-text').textContent = '编辑收藏项';
  
  await renderModalTags();
  modalBookmark.classList.remove('hidden');
  gsap.fromTo('#modal-bookmark .modal-card',
    { scale: 0.95, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.7)' }
  );
}

// Render dynamic tag cloud selectors inside details modal
async function renderModalTags() {
  const allTags = await getTags();
  modalTagsList.innerHTML = '';

  allTags.forEach(tag => {
    const isSelected = modalSelectedTags.includes(tag);
    const pill = document.createElement('div');
    pill.className = `modal-tag-pill ${isSelected ? 'active' : ''}`;
    pill.textContent = `# ${tag}`;
    
    pill.addEventListener('click', () => {
      const idx = modalSelectedTags.indexOf(tag);
      if (idx >= 0) {
        modalSelectedTags.splice(idx, 1);
        pill.classList.remove('active');
      } else {
        modalSelectedTags.push(tag);
        pill.classList.add('active');
      }
    });

    modalTagsList.appendChild(pill);
  });
}

// Launch bidirectional synchronization workflow
async function performSync() {
  btnSync.classList.add('spinning');
  btnSync.disabled = true;
  syncLoader.classList.remove('hidden');

  try {
    const res = await syncBookmarks();
    if (res.success) {
      document.getElementById('loader-text').textContent = `同步成功！共合并了 ${res.count} 个收藏项。`;
      setTimeout(async () => {
        syncLoader.classList.add('hidden');
        await loadData();
        animateMainHamster();
        await checkAuthStatus();
      }, 1000);
    } else {
      if (res.reason === 'unconfigured') {
        alert('请先在设置中配置您的 Supabase Project URL 和 Anon Key。');
      } else if (res.reason === 'unauthenticated') {
        alert('请先在设置中登录您的同步邮箱。');
      } else {
        alert(`同步失败: ${res.error || '未知网络错误'}`);
      }
      syncLoader.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
    alert('同步发生未知异常。');
    syncLoader.classList.add('hidden');
  } finally {
    btnSync.classList.remove('spinning');
    btnSync.disabled = false;
  }
}

// Background Sync Trigger helper
function triggerBackgroundSync() {
  chrome.runtime.sendMessage({ action: 'trigger_sync' }, (res) => {
    // Silence responses to avoid console noise
  });
}

// GSAP Hamster cheeks-puff animation
function animateMainHamster() {
  const logoHamsterMain = document.getElementById('logo-hamster-main');
  if (logoHamsterMain) {
    gsap.timeline()
      .to(logoHamsterMain, { scaleX: 1.5, scaleY: 1.25, duration: 0.15, ease: "power2.out" })
      .to(logoHamsterMain, { rotation: 10, duration: 0.05, repeat: 4, yoyo: true })
      .to(logoHamsterMain, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(2)" });
  }
}
