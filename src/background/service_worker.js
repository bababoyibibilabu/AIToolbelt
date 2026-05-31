import { saveBookmark } from '../utils/storage.js';
import { syncBookmarks } from '../utils/supabase.js';

// Register Chrome Context Menu on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'collect_selection_prompt',
    title: '收藏选中文本到 AIToolbelt (Prompt)',
    contexts: ['selection']
  });
  console.log('AIToolbelt context menu registered.');
});

// Handle right-click context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'collect_selection_prompt' && info.selectionText) {
    try {
      const selectedText = info.selectionText.trim();
      const pageUrl = info.pageUrl || '';
      const pageTitle = tab ? tab.title : '划词收藏来源';
      
      // Limit title length
      let cleanTitle = pageTitle.trim();
      if (cleanTitle.length > 40) {
        cleanTitle = cleanTitle.substring(0, 37) + '...';
      }

      // Save selection directly as a Prompt category bookmark
      await saveBookmark({
        title: cleanTitle,
        url: pageUrl,
        category: 'prompt',
        description: selectedText,
        tags: ['Prompt']
      });

      // Send trigger message to display a beautiful toast notification in the page context
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'show_sync_toast',
          status: 'success',
          title: '划词收藏成功',
          message: `已成功保存选中提示词（共 ${selectedText.length} 字）`
        });
      }

      // Asynchronously trigger Supabase sync
      await syncBookmarks();
    } catch (err) {
      console.error('Failed to save context menu selection:', err);
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'show_sync_toast',
          status: 'error',
          title: '收藏失败',
          message: err.message || '未知错误'
        });
      }
    }
  }
});

// Listen to message calls from Popup or Dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger_sync') {
    syncBookmarks()
      .then(res => {
        sendResponse({ success: true, data: res });
      })
      .catch(err => {
        console.error('Background sync failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep response channel open
  }
});
