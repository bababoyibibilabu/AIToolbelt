// Chrome Local Storage Wrapper for AIToolbelt (Local-First Design)

// Default preset tags
export const DEFAULT_TAGS = ['Skill', 'MCP', 'Prompt', 'AI Tool', 'UI', 'Framework'];

/**
 * Get all bookmarks from local storage
 * @returns {Promise<Array>} List of bookmark objects
 */
export async function getLocalBookmarks() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ bookmarks: [] }, (result) => {
      resolve(result.bookmarks);
    });
  });
}

/**
 * Save all bookmarks to local storage
 * @param {Array} bookmarks List of bookmark objects
 */
export async function saveLocalBookmarks(bookmarks) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ bookmarks }, () => {
      resolve();
    });
  });
}

/**
 * Add or update a single bookmark locally
 * @param {Object} bookmark Bookmark object to save
 * @returns {Promise<Object>} The saved bookmark
 */
export async function saveBookmark(bookmark) {
  const bookmarks = await getLocalBookmarks();
  const now = new Date().toISOString();
  
  let savedItem;
  const index = bookmarks.findIndex(item => item.id === bookmark.id || (bookmark.url && item.url === bookmark.url));
  
  if (index >= 0) {
    // Update existing item
    savedItem = {
      ...bookmarks[index],
      ...bookmark,
      updated_at: now
    };
    bookmarks[index] = savedItem;
  } else {
    // Create new item
    savedItem = {
      id: bookmark.id || 'bc_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      title: bookmark.title || 'Untitled',
      url: bookmark.url || '',
      category: bookmark.category || 'tool',
      description: bookmark.description || '',
      tags: bookmark.tags || [],
      created_at: bookmark.created_at || now,
      updated_at: now
    };
    bookmarks.push(savedItem);
  }
  
  await saveLocalBookmarks(bookmarks);
  
  // Update custom tags list
  await updateCustomTags(savedItem.tags);
  
  return savedItem;
}

/**
 * Delete a bookmark by ID
 * @param {String} id Bookmark ID
 */
export async function deleteBookmark(id) {
  const bookmarks = await getLocalBookmarks();
  const filtered = bookmarks.filter(item => item.id !== id);
  await saveLocalBookmarks(filtered);
  
  // Add ID to deleted queue for Supabase sync
  return new Promise((resolve) => {
    chrome.storage.local.get({ deletedBookmarkIds: [] }, (result) => {
      const deletedIds = new Set(result.deletedBookmarkIds || []);
      deletedIds.add(id);
      chrome.storage.local.set({ deletedBookmarkIds: Array.from(deletedIds) }, () => {
        resolve();
      });
    });
  });
}

/**
 * Check if a URL has already been bookmarked
 * @param {String} url Webpage URL
 * @returns {Promise<Object|null>} The bookmark object if it exists, otherwise null
 */
export async function getBookmarkByUrl(url) {
  if (!url) return null;
  const bookmarks = await getLocalBookmarks();
  return bookmarks.find(item => item.url === url) || null;
}

/**
 * Get all tags (Default presets + custom tags)
 * @returns {Promise<Array>} List of tag strings
 */
export async function getTags() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ customTags: [] }, (result) => {
      const merged = new Set([...DEFAULT_TAGS, ...result.customTags]);
      resolve(Array.from(merged));
    });
  });
}

/**
 * Add tags to the custom tag cache
 * @param {Array} newTags List of tags to add
 */
export async function updateCustomTags(newTags = []) {
  if (!newTags || newTags.length === 0) return;
  
  return new Promise((resolve) => {
    // Find which new tags are not in the default list
    chrome.storage.local.get({ customTags: [] }, (result) => {
      const existingCustom = result.customTags;
      const combined = new Set([...existingCustom, ...newTags]);
      
      // Remove defaults to keep customTags array clean
      DEFAULT_TAGS.forEach(defTag => combined.delete(defTag));
      
      chrome.storage.local.set({ customTags: Array.from(combined) }, () => {
        resolve();
      });
    });
  });
}

/**
 * Get Supabase Configuration
 * @returns {Promise<Object|null>} Project URL and Anon Key if set
 */
export async function getSupabaseConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ supabaseConfig: null }, (result) => {
      resolve(result.supabaseConfig);
    });
  });
}

/**
 * Save Supabase Configuration
 * @param {Object} config { url, anonKey }
 */
export async function saveSupabaseConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ supabaseConfig: config }, () => {
      resolve();
    });
  });
}
