import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, getLocalBookmarks, saveLocalBookmarks } from './storage.js';

let supabaseInstance = null;
let lastUsedConfigStr = '';
let initializationPromise = null;

/**
 * Initialize and get the Supabase Client dynamically based on saved configurations.
 * Caches client if config hasn't changed.
 * @returns {Promise<Object|null>} Supabase Client instance or null if not configured
 */
export async function getSupabaseClient() {
  const config = await getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) {
    supabaseInstance = null;
    lastUsedConfigStr = '';
    initializationPromise = null;
    return null;
  }

  const currentConfigStr = JSON.stringify(config);
  if (supabaseInstance && currentConfigStr === lastUsedConfigStr) {
    return supabaseInstance;
  }

  // If there's an ongoing initialization for the same config, await it
  if (initializationPromise && currentConfigStr === lastUsedConfigStr) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          storageKey: 'ai_toolbelt_supabase_auth',
          storage: {
            getItem: (key) => {
              return new Promise((resolve) => {
                chrome.storage.local.get([key], (res) => resolve(res[key] || null));
              });
            },
            setItem: (key, value) => {
              return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => resolve());
              });
            },
            removeItem: (key) => {
              return new Promise((resolve) => {
                chrome.storage.local.remove([key], () => resolve());
              });
            }
          }
        }
      });
      supabaseInstance = client;
      lastUsedConfigStr = currentConfigStr;
      return client;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      lastUsedConfigStr = '';
      return null;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Send an OTP (Verification code) to the user's email
 * @param {String} email User's email
 */
export async function sendOtp(email) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase项目未配置，请先在设置中填写Project URL和Anon Key。');
  
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });
  
  if (error) throw error;
  return true;
}

/**
 * Verify the OTP sent to user's email
 * @param {String} email User's email
 * @param {String} token 6-digit OTP code
 * @returns {Promise<Object>} Session data
 */
export async function verifyOtp(email, token) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase项目未配置。');
  
  // Try magiclink verification first (standard for passwordless sign-in)
  const res = await client.auth.verifyOtp({
    email,
    token,
    type: 'magiclink'
  });
  
  if (res.error) {
    // Fallback to signup verification (standard for new users confirming signup)
    const signupRes = await client.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });
    
    if (signupRes.error) {
      throw new Error(res.error.message || signupRes.error.message);
    }
    return signupRes.data;
  }
  
  return res.data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const client = await getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

/**
 * Check if the user is currently authenticated
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
  const client = await getSupabaseClient();
  if (!client) return null;
  
  const { data: { session } } = await client.auth.getSession();
  return session ? session.user : null;
}

/**
 * Perform a bidirectional sync between local storage and Supabase.
 * Conflict resolution strategy: Newer updated_at timestamp wins.
 * @returns {Promise<Object>} Sync result status { success: boolean, count: number, reason: string }
 */
export async function syncBookmarks() {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, reason: 'unconfigured' };
  }
  
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    return { success: false, reason: 'unauthenticated' };
  }
  
  try {
    const user = session.user;
    
    // 1. Get local bookmarks and deleted queue
    const localItems = await getLocalBookmarks();
    const { deletedBookmarkIds: storedDeletedIds } = await new Promise((resolve) => {
      chrome.storage.local.get({ deletedBookmarkIds: [] }, (res) => resolve(res));
    });
    const deletedIdsSet = new Set(storedDeletedIds || []);
    
    // 2. Sync local deletions to Supabase first
    if (deletedIdsSet.size > 0) {
      const { error: deleteError } = await client
        .from('bookmarks')
        .delete()
        .in('id', Array.from(deletedIdsSet))
        .eq('user_id', user.id);
        
      if (deleteError) {
        console.error('Failed to sync deletions to Supabase:', deleteError);
      }
    }
    
    // 3. Fetch all remote bookmarks for this user
    const { data: remoteItems, error } = await client
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    // 4. Bidirectional merge
    const remoteMap = new Map(remoteItems.map(item => [item.id, item]));
    
    const localMap = new Map(localItems.map(item => [item.id, item]));
    const mergedMap = new Map();
    
    localItems.forEach(local => {
      // Force ignore if deleted locally
      if (deletedIdsSet.has(local.id)) {
        return;
      }
      
      const remote = remoteMap.get(local.id);
      if (remote) {
        // Exists in both: keep the newer one
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();
        if (remoteTime >= localTime) {
          mergedMap.set(local.id, remote);
        } else {
          mergedMap.set(local.id, local);
        }
      } else {
        // Missing in remote
        if (local.user_id && local.user_id === user.id) {
          // Previously synced, but now missing from remote -> deleted on remote!
          // We discard it locally
        } else {
          // New local item -> keep it (will be uploaded)
          mergedMap.set(local.id, local);
        }
      }
    });
    
    // Add remote items that are not in local storage
    remoteItems.forEach(remote => {
      if (!localMap.has(remote.id)) {
        const isLocallyDeleted = deletedIdsSet.has(remote.id);
        if (!isLocallyDeleted) {
          mergedMap.set(remote.id, remote);
        }
      }
    });
    
    const mergedItems = Array.from(mergedMap.values());
    
    // 5. Identify which items need to be uploaded to Supabase
    // (Items that are new or newer locally than remote)
    const itemsToUpload = [];
    
    for (const merged of mergedItems) {
      const remote = remoteMap.get(merged.id);
      const localTime = new Date(merged.updated_at).getTime();
      const remoteTime = remote ? new Date(remote.updated_at).getTime() : 0;
      
      if (!remote || localTime > remoteTime) {
        itemsToUpload.push({
          ...merged,
          user_id: user.id
        });
      }
    }
    
    // 6. Upload modifications to Supabase
    const successfullyUploadedIds = new Set();
    if (itemsToUpload.length > 0) {
      const { error: upsertError } = await client
        .from('bookmarks')
        .upsert(itemsToUpload);
        
      if (upsertError) throw upsertError;
      
      // Only mark items as synced (assign user_id) after confirmed upload
      itemsToUpload.forEach(item => successfullyUploadedIds.add(item.id));
    }
    
    // Assign user_id only to items that were successfully uploaded,
    // so unsynced items are not mistakenly treated as "deleted on remote" next time
    const mergedItemsWithSyncState = mergedItems.map(item => {
      if (successfullyUploadedIds.has(item.id) || (item.user_id && item.user_id === user.id && remoteMap.has(item.id))) {
        return { ...item, user_id: user.id };
      }
      // Strip user_id from items that haven't been confirmed on remote yet
      const { user_id, ...rest } = item;
      return rest;
    });
    
    // Save merged result back to local storage
    await saveLocalBookmarks(mergedItemsWithSyncState);
    
    // Update deletedBookmarkIds in storage: keep only IDs that failed to delete (still in remoteMap)
    const remainingDeletedIds = [];
    deletedIdsSet.forEach(id => {
      if (remoteMap.has(id)) {
        remainingDeletedIds.push(id);
      }
    });
    await new Promise((resolve) => {
      chrome.storage.local.set({ deletedBookmarkIds: remainingDeletedIds }, () => resolve());
    });
    
    // Also trigger custom tags sync/caching
    const allTags = new Set();
    mergedItems.forEach(item => {
      if (item.tags) item.tags.forEach(t => allTags.add(t));
    });
    
    return { success: true, count: mergedItems.length, uploaded: itemsToUpload.length };
  } catch (err) {
    console.error('Bidirectional sync failed:', err);
    return { success: false, reason: 'error', error: err.message };
  }
}
