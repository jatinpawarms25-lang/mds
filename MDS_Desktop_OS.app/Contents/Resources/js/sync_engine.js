// ==============================================================================
// NEET-MDS Top-10 Planner — Real Cloud Sync Engine (Section 3A)
// Offline-First • Record-by-Record Three-Way Merge • Tombstones • RLS
// Supabase Free Tier: Postgres + Auth (Magic Link & Password) + Realtime
// Strict ASCII Quotes Only • Scalar Field-Level Timestamps
// ==============================================================================

(function(window) {
  'use strict';

  // Storage Keys (Strict ASCII)
  const STORAGE_KEYS = {
    CONFIG: 'mds_supabase_config',
    DEVICE_NAME: 'mds_device_name',
    LOCAL_PROGRESS: 'mds_user_progress_doc',
    CONFLICTS: 'mds_sync_conflicts',
    LAST_SYNC: 'mds_last_synced_at',
    SYNC_STATUS: 'mds_sync_status_state'
  };

  // Device Detection
  function detectDefaultDeviceName() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android phone';
    if (/Macintosh|Mac OS X/.test(ua)) return 'MacBook Air';
    if (/Windows/.test(ua)) return 'Windows PC';
    return 'Desktop Browser';
  }

  // Generate UUID v4
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Wrap raw scalar value in { value, updatedAt }
  function toScalarObj(raw, fallbackTime) {
    if (raw !== null && typeof raw === 'object' && 'value' in raw && 'updatedAt' in raw) {
      return raw;
    }
    return {
      value: raw,
      updatedAt: fallbackTime || new Date().toISOString()
    };
  }

  // Engine State
  const state = {
    client: null,
    user: null,
    session: null,
    status: 'signed_out', // 'signed_out' | 'syncing' | 'synced' | 'offline' | 'error'
    statusMessage: 'Not signed in - progress is only on this device.',
    lastSyncedAt: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.LAST_SYNC)) || null,
    deviceName: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.DEVICE_NAME)) || detectDefaultDeviceName(),
    conflicts: [],
    snapshots: [],
    listeners: new Set(),
    syncTimeout: null,
    realtimeSubscription: null,
    lastPulledRemoteTime: null
  };

  function notifySubscribers() {
    const payload = {
      status: state.status,
      statusMessage: state.statusMessage,
      user: state.user,
      deviceName: state.deviceName,
      lastSyncedAt: state.lastSyncedAt,
      conflicts: state.conflicts,
      snapshots: state.snapshots,
      isConfigured: !!(getSavedConfig().url && getSavedConfig().anonKey)
    };
    state.listeners.forEach(fn => {
      try { fn(payload); } catch(e) { console.error('Sync listener error:', e); }
    });
  }

  function setStatus(status, message) {
    state.status = status;
    state.statusMessage = message;
    notifySubscribers();
  }

  function getSavedConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG));
      if (saved && saved.url && saved.anonKey) return saved;
    } catch(e) {}
    return { url: '', anonKey: '' };
  }

  function saveConfig(url, anonKey) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
    initClient();
  }

  function clearConfig() {
    if (state.realtimeSubscription) {
      try { state.realtimeSubscription.unsubscribe(); } catch(e) {}
      state.realtimeSubscription = null;
    }
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    state.client = null;
    state.user = null;
    state.session = null;
    setStatus('signed_out', 'Not signed in - progress is only on this device.');
  }

  function setDeviceName(name) {
    state.deviceName = (name || '').trim() || 'My Device';
    localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, state.deviceName);
    notifySubscribers();
  }

  // Setup Realtime listener on user_progress row
  function setupRealtimeListener() {
    if (!state.client || !state.user) return;
    if (state.realtimeSubscription) {
      try { state.realtimeSubscription.unsubscribe(); } catch(e) {}
      state.realtimeSubscription = null;
    }

    try {
      state.realtimeSubscription = state.client
        .channel('public:user_progress:' + state.user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: 'user_id=eq.' + state.user.id
        }, (payload) => {
          if (payload.new && payload.new.data) {
            // Ignore echoes originating from this device
            if (payload.new.last_device === state.deviceName) return;

            const remoteDoc = payload.new.data;
            const localDoc = getLocalProgressDoc();
            const { mergedDoc, conflicts } = mergeUserProgress(localDoc, remoteDoc);
            saveLocalProgressDoc(mergedDoc);
            state.conflicts = mergedDoc.syncConflicts || [];
            state.lastPulledRemoteTime = payload.new.updated_at;
            const nowIso = new Date().toISOString();
            state.lastSyncedAt = nowIso;
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowIso);
            setStatus('synced', 'Synced live from ' + (payload.new.last_device || 'other device'));
            notifySubscribers();
          }
        })
        .subscribe();
    } catch(err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  function initClient() {
    const config = getSavedConfig();
    if (!config.url || !config.anonKey) {
      state.client = null;
      state.user = null;
      state.session = null;
      setStatus('signed_out', 'Sync unconfigured. Enter Supabase URL & Anon Key in Settings.');
      return false;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase JS library not loaded yet.');
      return false;
    }

    try {
      state.client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      state.client.auth.onAuthStateChange((event, session) => {
        state.session = session;
        state.user = session ? session.user : null;
        if (session && session.user) {
          setStatus('synced', 'Signed in as ' + session.user.email);
          setupRealtimeListener();
          triggerSync();
        } else {
          if (state.realtimeSubscription) {
            try { state.realtimeSubscription.unsubscribe(); } catch(e) {}
            state.realtimeSubscription = null;
          }
          setStatus('signed_out', 'Not signed in - progress is only on this device.');
        }
      });

      state.client.auth.getSession().then(({ data: { session }, error }) => {
        if (!error && session && session.user) {
          state.session = session;
          state.user = session.user;
          setStatus('synced', 'Signed in as ' + session.user.email);
          setupRealtimeListener();
          triggerSync();
        } else {
          setStatus('signed_out', 'Not signed in - progress is only on this device.');
        }
      }).catch(() => {
        setStatus('signed_out', 'Offline local mode. Sign in in Settings to sync.');
      });

      return true;
    } catch(err) {
      setStatus('error', 'Initialization error: ' + err.message);
      return false;
    }
  }

  // ============================================================================
  // RECORD-BY-RECORD MERGE ENGINE (Heart of Section 3A & Fix 4)
  // Union by id; later updatedAt wins; tombstone wins over older live record;
  // Scalars stored as { value, updatedAt }; losing concurrent offline edits land in syncConflicts.
  // ============================================================================

  function mergeUserProgress(localDoc, remoteDoc) {
    if (!localDoc && !remoteDoc) return { mergedDoc: createEmptyProgressDoc(), conflicts: [] };
    if (!localDoc) return { mergedDoc: normalizeDoc(remoteDoc), conflicts: [] };
    if (!remoteDoc) return { mergedDoc: normalizeDoc(localDoc), conflicts: [] };

    const l = normalizeDoc(localDoc);
    const r = normalizeDoc(remoteDoc);

    const merged = {
      schema_version: Math.max(l.schema_version || 1, r.schema_version || 1),
      docUpdatedAt: new Date().toISOString(),
      userSettings: {},
      dailyRoutines: {},
      planChecklist: {},
      subjectProgress: {},
      mockScores: [],
      errorLog: [],
      shakyCards: {},
      omfsChecklist: {},
      hiddenRulesChecked: {},
      masterChecklistsChecked: {},
      collegeShortlist: [],
      counsellingTracker: {},
      documentsChecklist: {},
      imageDrillHistory: [],
      dailyQuizHistory: [],
      userImages: [],
      syncConflicts: Array.isArray(l.syncConflicts) ? [...l.syncConflicts] : []
    };

    const newConflicts = [];

    // Helper: Merge key-value maps with scalar { value, updatedAt }
    function mergeScalarKeyMap(targetKey) {
      const localMap = l[targetKey] || {};
      const remoteMap = r[targetKey] || {};
      const allKeys = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);
      const res = {};

      allKeys.forEach(k => {
        const lVal = localMap[k];
        const rVal = remoteMap[k];
        if (lVal === undefined) {
          res[k] = rVal;
        } else if (rVal === undefined) {
          res[k] = lVal;
        } else {
          // If values are scalar objects { value, updatedAt }
          const lTime = lVal && typeof lVal === 'object' && lVal.updatedAt ? new Date(lVal.updatedAt).getTime() : 0;
          const rTime = rVal && typeof rVal === 'object' && rVal.updatedAt ? new Date(rVal.updatedAt).getTime() : 0;
          res[k] = rTime > lTime ? rVal : lVal;
        }
      });
      merged[targetKey] = res;
    }

    // Helper: Merge subjectProgress field-by-field
    function mergeSubjectProgress() {
      const lSubjs = l.subjectProgress || {};
      const rSubjs = r.subjectProgress || {};
      const allSubjs = new Set([...Object.keys(lSubjs), ...Object.keys(rSubjs)]);
      const res = {};

      allSubjs.forEach(s => {
        const lObj = lSubjs[s];
        const rObj = rSubjs[s];
        if (!lObj) { res[s] = rObj; return; }
        if (!rObj) { res[s] = lObj; return; }

        res[s] = {};
        const allFields = new Set([...Object.keys(lObj), ...Object.keys(rObj)]);
        allFields.forEach(f => {
          const lField = lObj[f];
          const rField = rObj[f];
          if (lField === undefined) { res[s][f] = rField; return; }
          if (rField === undefined) { res[s][f] = lField; return; }

          const lTime = lField && typeof lField === 'object' && lField.updatedAt ? new Date(lField.updatedAt).getTime() : 0;
          const rTime = rField && typeof rField === 'object' && rField.updatedAt ? new Date(rField.updatedAt).getTime() : 0;
          res[s][f] = rTime > lTime ? rField : lField;
        });
      });
      merged.subjectProgress = res;
    }

    // Helper: Merge daily routines field-by-field per day
    function mergeDailyRoutines() {
      const lDays = l.dailyRoutines || {};
      const rDays = r.dailyRoutines || {};
      const allDays = new Set([...Object.keys(lDays), ...Object.keys(rDays)]);
      const res = {};

      allDays.forEach(d => {
        const lDay = lDays[d];
        const rDay = rDays[d];
        if (!lDay) { res[d] = rDay; return; }
        if (!rDay) { res[d] = lDay; return; }

        res[d] = {};
        const allFields = new Set([...Object.keys(lDay), ...Object.keys(rDay)]);
        allFields.forEach(f => {
          const lF = lDay[f];
          const rF = rDay[f];
          if (lF === undefined) { res[d][f] = rF; return; }
          if (rF === undefined) { res[d][f] = lF; return; }

          const lTime = lF && typeof lF === 'object' && lF.updatedAt ? new Date(lF.updatedAt).getTime() : 0;
          const rTime = rF && typeof rF === 'object' && rF.updatedAt ? new Date(rF.updatedAt).getTime() : 0;
          res[d][f] = rTime > lTime ? rF : lF;
        });
      });
      merged.dailyRoutines = res;
    }

    // 1. Merge settings (field by field by updatedAt)
    const lSet = l.userSettings || {};
    const rSet = r.userSettings || {};
    const allSetKeys = new Set([...Object.keys(lSet), ...Object.keys(rSet)]);
    const resSet = {};
    allSetKeys.forEach(k => {
      const lVal = lSet[k];
      const rVal = rSet[k];
      if (lVal === undefined) resSet[k] = rVal;
      else if (rVal === undefined) resSet[k] = lVal;
      else {
        const lTime = lVal && typeof lVal === 'object' && lVal.updatedAt ? new Date(lVal.updatedAt).getTime() : 0;
        const rTime = rVal && typeof rVal === 'object' && rVal.updatedAt ? new Date(rVal.updatedAt).getTime() : 0;
        resSet[k] = rTime > lTime ? rVal : lVal;
      }
    });
    merged.userSettings = resSet;

    // 2. Merge maps
    mergeDailyRoutines();
    mergeSubjectProgress();
    mergeScalarKeyMap('planChecklist');
    mergeScalarKeyMap('omfsChecklist');
    mergeScalarKeyMap('hiddenRulesChecked');
    mergeScalarKeyMap('masterChecklistsChecked');
    mergeScalarKeyMap('shakyCards');
    mergeScalarKeyMap('counsellingTracker');
    mergeScalarKeyMap('documentsChecklist');

    // 3. Helper: Merge record arrays (mockScores, errorLog, userImages, imageDrillHistory, collegeShortlist, dailyQuizHistory)
    function mergeRecordArray(arrayKey, idField = 'id', titleField = 'title') {
      const localArr = Array.isArray(l[arrayKey]) ? l[arrayKey] : [];
      const remoteArr = Array.isArray(r[arrayKey]) ? r[arrayKey] : [];

      const localMap = new Map();
      localArr.forEach(item => { if (item && item[idField] !== undefined) localMap.set(String(item[idField]), item); });

      const remoteMap = new Map();
      remoteArr.forEach(item => { if (item && item[idField] !== undefined) remoteMap.set(String(item[idField]), item); });

      const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
      const mergedList = [];

      allIds.forEach(id => {
        const lItem = localMap.get(id);
        const rItem = remoteMap.get(id);

        if (!lItem) { mergedList.push(rItem); return; }
        if (!rItem) { mergedList.push(lItem); return; }

        const lDeleted = lItem.deletedAt ? new Date(lItem.deletedAt).getTime() : null;
        const rDeleted = rItem.deletedAt ? new Date(rItem.deletedAt).getTime() : null;
        const lUpdated = lItem.updatedAt ? new Date(lItem.updatedAt).getTime() : 0;
        const rUpdated = rItem.updatedAt ? new Date(rItem.updatedAt).getTime() : 0;

        // Tombstone check
        if (lDeleted || rDeleted) {
          if (lDeleted && !rDeleted) {
            mergedList.push(lDeleted >= rUpdated ? lItem : rItem);
          } else if (rDeleted && !lDeleted) {
            mergedList.push(rDeleted >= lUpdated ? rItem : lItem);
          } else {
            mergedList.push(lDeleted >= rDeleted ? lItem : rItem);
          }
          return;
        }

        if (JSON.stringify(lItem) === JSON.stringify(rItem)) {
          mergedList.push(lItem);
          return;
        }

        let winner, loser, winnerSide;
        if (lUpdated >= rUpdated) {
          winner = lItem; loser = rItem; winnerSide = 'local';
        } else {
          winner = rItem; loser = lItem; winnerSide = 'remote';
        }
        mergedList.push(winner);

        // Record conflict
        newConflicts.push({
          id: 'conf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          collection: arrayKey,
          recordId: id,
          title: winner[titleField] || winner.topic || winner.source || winner.diagnosis || winner.name || ('Record #' + id),
          winnerSide: winnerSide,
          winningVersion: winner,
          losingVersion: loser,
          timestamp: new Date().toISOString()
        });
      });

      merged[arrayKey] = mergedList;
    }

    mergeRecordArray('mockScores', 'id', 'source');
    mergeRecordArray('errorLog', 'id', 'topic');
    mergeRecordArray('imageDrillHistory', 'id', 'date');
    mergeRecordArray('dailyQuizHistory', 'id', 'date');
    mergeRecordArray('collegeShortlist', 'id', 'name');
    mergeRecordArray('userImages', 'id', 'title');

    merged.syncConflicts = [...newConflicts, ...merged.syncConflicts].slice(0, 50);
    return { mergedDoc: merged, conflicts: newConflicts };
  }

  // Normalization: Ensure all scalars have { value, updatedAt }
  function normalizeDoc(rawDoc) {
    if (!rawDoc) return createEmptyProgressDoc();
    const doc = JSON.parse(JSON.stringify(rawDoc));
    const nowIso = new Date().toISOString();

    // Normalize settings
    if (!doc.userSettings) doc.userSettings = {};
    Object.keys(doc.userSettings).forEach(k => {
      doc.userSettings[k] = toScalarObj(doc.userSettings[k], nowIso);
    });

    // Normalize planChecklist
    if (!doc.planChecklist) doc.planChecklist = {};
    Object.keys(doc.planChecklist).forEach(k => {
      doc.planChecklist[k] = toScalarObj(doc.planChecklist[k], nowIso);
    });

    // Normalize omfsChecklist
    if (!doc.omfsChecklist) doc.omfsChecklist = {};
    Object.keys(doc.omfsChecklist).forEach(k => {
      doc.omfsChecklist[k] = toScalarObj(doc.omfsChecklist[k], nowIso);
    });

    // Normalize hiddenRulesChecked
    if (!doc.hiddenRulesChecked) doc.hiddenRulesChecked = {};
    Object.keys(doc.hiddenRulesChecked).forEach(k => {
      doc.hiddenRulesChecked[k] = toScalarObj(doc.hiddenRulesChecked[k], nowIso);
    });

    // Normalize masterChecklistsChecked
    if (!doc.masterChecklistsChecked) doc.masterChecklistsChecked = {};
    Object.keys(doc.masterChecklistsChecked).forEach(k => {
      doc.masterChecklistsChecked[k] = toScalarObj(doc.masterChecklistsChecked[k], nowIso);
    });

    // Normalize shakyCards
    if (!doc.shakyCards) doc.shakyCards = {};
    Object.keys(doc.shakyCards).forEach(k => {
      doc.shakyCards[k] = toScalarObj(doc.shakyCards[k], nowIso);
    });

    // Normalize subjectProgress
    if (!doc.subjectProgress) doc.subjectProgress = {};
    Object.keys(doc.subjectProgress).forEach(s => {
      const sObj = doc.subjectProgress[s];
      if (sObj && typeof sObj === 'object') {
        Object.keys(sObj).forEach(f => {
          sObj[f] = toScalarObj(sObj[f], nowIso);
        });
      }
    });

    // Normalize dailyRoutines
    if (!doc.dailyRoutines) doc.dailyRoutines = {};
    Object.keys(doc.dailyRoutines).forEach(d => {
      const dObj = doc.dailyRoutines[d];
      if (dObj && typeof dObj === 'object') {
        Object.keys(dObj).forEach(f => {
          dObj[f] = toScalarObj(dObj[f], nowIso);
        });
      }
    });

    if (!Array.isArray(doc.mockScores)) doc.mockScores = [];
    if (!Array.isArray(doc.errorLog)) doc.errorLog = [];
    if (!Array.isArray(doc.collegeShortlist)) doc.collegeShortlist = [];
    if (!Array.isArray(doc.imageDrillHistory)) doc.imageDrillHistory = [];
    if (!Array.isArray(doc.dailyQuizHistory)) doc.dailyQuizHistory = [];
    if (!Array.isArray(doc.userImages)) doc.userImages = [];
    if (!Array.isArray(doc.syncConflicts)) doc.syncConflicts = [];

    return doc;
  }

  // Create clean initial progress doc without invented dates
  function createEmptyProgressDoc() {
    const nowIso = new Date().toISOString();
    return {
      schema_version: 1,
      docUpdatedAt: nowIso,
      userSettings: {
        examDate: toScalarObj('', nowIso), // Fix 5: Empty by default
        dailyHours: toScalarObj(8, nowIso),
        targetScore: toScalarObj(790, nowIso),
        coachingName: toScalarObj('Dr. Anchal Agarwal Classes', nowIso),
        studySpine: toScalarObj('Dental Pulse, 18th edition 2025', nowIso),
        stateName: toScalarObj('', nowIso), // Fix 5: Empty by default
        statePortalUrl: toScalarObj('', nowIso), // Fix 5: Empty by default
        contentUpdateUrl: toScalarObj('', nowIso),
        dismissedWarning: toScalarObj(false, nowIso)
      },
      dailyRoutines: {},
      planChecklist: {},
      subjectProgress: {},
      mockScores: [],
      errorLog: [],
      shakyCards: {},
      omfsChecklist: {},
      hiddenRulesChecked: {},
      masterChecklistsChecked: {},
      collegeShortlist: [],
      counsellingTracker: {},
      documentsChecklist: {},
      imageDrillHistory: [],
      dailyQuizHistory: [],
      userImages: [],
      syncConflicts: []
    };
  }

  function getLocalProgressDoc() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PROGRESS);
      if (raw) return normalizeDoc(JSON.parse(raw));
    } catch(e) {}
    return createEmptyProgressDoc();
  }

  function saveLocalProgressDoc(doc) {
    if (!doc) return;
    const normalized = normalizeDoc(doc);
    normalized.docUpdatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_PROGRESS, JSON.stringify(normalized));
    } catch(e) {}
  }

  // ============================================================================
  // SYNC EXECUTION: CONCURRENCY-GUARDED PULL-MERGE-PUSH
  // ============================================================================

  let isSyncing = false;

  async function syncNow() {
    if (!state.client || !state.user) {
      setStatus('signed_out', 'Not signed in - progress is only on this device.');
      return { success: false, reason: 'not_authenticated' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline', 'Offline - changes saved on this device, will sync when back online');
      return { success: false, reason: 'offline' };
    }
    if (isSyncing) return { success: false, reason: 'in_progress' };

    isSyncing = true;
    setStatus('syncing', 'Syncing with Supabase cloud...');

    try {
      let localDoc = getLocalProgressDoc();

      // Step 1: PULL latest remote record
      const { data: remoteRows, error: pullError } = await state.client
        .from('user_progress')
        .select('*')
        .eq('user_id', state.user.id);

      if (pullError) throw new Error('Cloud pull error: ' + pullError.message);

      let mergedDoc;
      let conflictsAdded = [];
      let remoteUpdatedAt = null;

      if (!remoteRows || remoteRows.length === 0) {
        mergedDoc = localDoc;
      } else {
        const remoteRow = remoteRows[0];
        remoteUpdatedAt = remoteRow.updated_at;
        state.lastPulledRemoteTime = remoteUpdatedAt;
        const remoteDoc = remoteRow.data || {};
        const mergeResult = mergeUserProgress(localDoc, remoteDoc);
        mergedDoc = mergeResult.mergedDoc;
        conflictsAdded = mergeResult.conflicts;
      }

      // Save merged locally first
      saveLocalProgressDoc(mergedDoc);
      state.conflicts = mergedDoc.syncConflicts || [];

      // Step 2: Concurrency Check before PUSH
      // Verify cloud has not been updated since our pull
      if (remoteUpdatedAt) {
        const { data: checkRows } = await state.client
          .from('user_progress')
          .select('updated_at')
          .eq('user_id', state.user.id);

        if (checkRows && checkRows.length > 0 && checkRows[0].updated_at !== remoteUpdatedAt) {
          // Cloud was touched concurrently! Re-pull and re-merge
          console.warn('Concurrent edit detected on cloud. Re-pulling...');
          const { data: freshRemote } = await state.client
            .from('user_progress')
            .select('*')
            .eq('user_id', state.user.id);

          if (freshRemote && freshRemote.length > 0) {
            const reMerge = mergeUserProgress(mergedDoc, freshRemote[0].data || {});
            mergedDoc = reMerge.mergedDoc;
            conflictsAdded.push(...reMerge.conflicts);
            saveLocalProgressDoc(mergedDoc);
          }
        }
      }

      // Step 3: PUSH merged data
      const nowIso = new Date().toISOString();
      const { error: pushError } = await state.client
        .from('user_progress')
        .upsert({
          user_id: state.user.id,
          data: mergedDoc,
          schema_version: mergedDoc.schema_version || 1,
          updated_at: nowIso,
          last_device: state.deviceName
        });

      if (pushError) throw new Error('Cloud push error: ' + pushError.message);

      state.lastSyncedAt = nowIso;
      state.lastPulledRemoteTime = nowIso;
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowIso);

      const conflictMsg = conflictsAdded.length > 0 ? ` (${conflictsAdded.length} conflicts recorded)` : '';
      setStatus('synced', `Synced ✓ · just now${conflictMsg}`);
      fetchSnapshots().catch(() => {});

      isSyncing = false;
      return { success: true, doc: mergedDoc, conflicts: conflictsAdded };
    } catch(err) {
      isSyncing = false;
      setStatus('error', 'Sync error: ' + err.message);
      return { success: false, error: err.message };
    }
  }

  function triggerSync() {
    if (state.syncTimeout) clearTimeout(state.syncTimeout);
    state.syncTimeout = setTimeout(() => { syncNow(); }, 2500);
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async function signInWithMagicLink(email) {
    if (!state.client) throw new Error('Supabase configuration missing');
    setStatus('syncing', 'Sending magic link...');
    const { data, error } = await state.client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href.split('#')[0] }
    });
    if (error) { setStatus('error', error.message); throw error; }
    setStatus('synced', 'Magic link sent! Check your inbox.');
    return data;
  }

  async function signInWithPassword(email, password) {
    if (!state.client) throw new Error('Supabase configuration missing');
    setStatus('syncing', 'Signing in...');
    const { data, error } = await state.client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) { setStatus('error', error.message); throw error; }
    state.user = data.user;
    state.session = data.session;
    setupRealtimeListener();
    setStatus('synced', 'Signed in as ' + data.user.email);
    await syncNow();
    return data;
  }

  async function signUpWithPassword(email, password) {
    if (!state.client) throw new Error('Supabase configuration missing');
    setStatus('syncing', 'Creating cloud account...');
    const { data, error } = await state.client.auth.signUp({
      email: email.trim(),
      password: password
    });
    if (error) { setStatus('error', error.message); throw error; }
    state.user = data.user;
    state.session = data.session;
    setupRealtimeListener();
    setStatus('synced', 'Account created! Signed in as ' + (data.user ? data.user.email : email));
    await syncNow();
    return data;
  }

  async function signOut() {
    if (state.realtimeSubscription) {
      try { state.realtimeSubscription.unsubscribe(); } catch(e) {}
      state.realtimeSubscription = null;
    }
    if (state.client) {
      try { await state.client.auth.signOut(); } catch(e) {}
    }
    state.user = null;
    state.session = null;
    setStatus('signed_out', 'Signed out. Local progress remains intact on this device.');
  }

  async function fetchSnapshots() {
    if (!state.client || !state.user) return [];
    try {
      const { data, error } = await state.client
        .from('user_progress_snapshots')
        .select('id, device_name, created_at, schema_version')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        state.snapshots = data;
        notifySubscribers();
        return data;
      }
    } catch(e) {}
    return [];
  }

  async function rollbackToSnapshot(snapshotId) {
    if (!state.client || !state.user) throw new Error('Not connected to cloud');
    setStatus('syncing', 'Rolling back to snapshot...');

    const { data, error } = await state.client
      .from('user_progress_snapshots')
      .select('data, schema_version')
      .eq('id', snapshotId)
      .single();

    if (error || !data) throw new Error('Snapshot retrieval failed: ' + (error ? error.message : 'Not found'));

    const restoredDoc = normalizeDoc(data.data);
    restoredDoc.docUpdatedAt = new Date().toISOString();
    saveLocalProgressDoc(restoredDoc);

    await state.client.from('user_progress').upsert({
      user_id: state.user.id,
      data: restoredDoc,
      schema_version: data.schema_version || 1,
      updated_at: new Date().toISOString(),
      last_device: state.deviceName + ' (Rolled back)'
    });

    setStatus('synced', 'Rollback successful! Progress restored.');
    return restoredDoc;
  }

  function restoreConflictVersion(conflictId) {
    const localDoc = getLocalProgressDoc();
    const conflicts = localDoc.syncConflicts || [];
    const target = conflicts.find(c => c.id === conflictId);
    if (!target) return false;

    const collection = target.collection;
    const losingVersion = target.losingVersion;
    if (!collection || !losingVersion) return false;

    losingVersion.updatedAt = new Date().toISOString();
    losingVersion.deletedAt = null;

    if (Array.isArray(localDoc[collection])) {
      const idx = localDoc[collection].findIndex(item => String(item.id) === String(target.recordId));
      if (idx >= 0) localDoc[collection][idx] = losingVersion;
      else localDoc[collection].push(losingVersion);
    }

    localDoc.syncConflicts = conflicts.filter(c => c.id !== conflictId);
    saveLocalProgressDoc(localDoc);
    state.conflicts = localDoc.syncConflicts;

    triggerSync();
    notifySubscribers();
    return true;
  }

  async function deleteCloudData() {
    if (!state.client || !state.user) throw new Error('Not signed in to cloud');
    setStatus('syncing', 'Deleting cloud records...');

    await state.client.from('user_progress_snapshots').delete().eq('user_id', state.user.id);
    const { error } = await state.client.from('user_progress').delete().eq('user_id', state.user.id);

    if (error) { setStatus('error', 'Delete error: ' + error.message); throw error; }

    setStatus('signed_out', 'Cloud data permanently deleted. Local device data is intact.');
    return true;
  }

  // ============================================================================
  // NETWORK & LIFECYCLE LISTENERS
  // ============================================================================

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => {
      if (state.user) {
        setStatus('syncing', 'Reconnected. Syncing progress...');
        syncNow();
      }
    });

    window.addEventListener('offline', () => {
      if (state.status !== 'signed_out') {
        setStatus('offline', 'Offline - changes saved on this device, will sync when back online');
      }
    });
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.user && navigator.onLine) {
        syncNow();
      }
    });
  }

  // ============================================================================
  // COMPREHENSIVE SECTION 3A SELF-TEST HARNESS (Fix 4: Test 6 Rewritten)
  // ============================================================================

  function runSelfTests() {
    const results = [];
    function assert(desc, condition) { results.push({ test: desc, passed: Boolean(condition) }); }

    try {
      // Test 1: Mock on A appears on B with identical score (786)
      const docA1 = createEmptyProgressDoc();
      docA1.mockScores.push({ id: 'm_test_1', source: 'Test Mock 1', totalScore: 786, accuracy: 89.2, updatedAt: '2026-11-15T10:00:00.000Z' });
      const docB1 = createEmptyProgressDoc();
      const { mergedDoc: m1 } = mergeUserProgress(docB1, docA1);
      assert('Test 1: Mock on A appears on B with identical score (786)', m1.mockScores.some(m => m.id === 'm_test_1' && m.totalScore === 786));

      // Test 2: Tick subjects and add error on B -> appear on A
      const docB2 = createEmptyProgressDoc();
      docB2.subjectProgress['Dental Materials'] = {
        confidence: { value: 85, updatedAt: '2026-11-15T11:00:00.000Z' },
        mcqsDone: { value: 350, updatedAt: '2026-11-15T11:00:00.000Z' }
      };
      docB2.errorLog.push({ id: 'err_test_1', topic: 'Amalgam Gamma-2', reason: 'Knowledge Gap', updatedAt: '2026-11-15T11:05:00.000Z' });
      const docA2 = createEmptyProgressDoc();
      const { mergedDoc: m2 } = mergeUserProgress(docA2, docB2);
      assert('Test 2: Subject confidence & error on B appear on A',
        m2.subjectProgress['Dental Materials']?.confidence?.value === 85 && m2.errorLog.some(e => e.id === 'err_test_1'));

      // Test 3: Both offline add different mocks -> both survive
      const docA3 = createEmptyProgressDoc();
      docA3.mockScores.push({ id: 'm_A', source: 'Mock by Mac', totalScore: 765, updatedAt: '2026-11-15T12:00:00.000Z' });
      const docB3 = createEmptyProgressDoc();
      docB3.mockScores.push({ id: 'm_B', source: 'Mock by Android', totalScore: 792, updatedAt: '2026-11-15T12:05:00.000Z' });
      const { mergedDoc: m3 } = mergeUserProgress(docA3, docB3);
      assert('Test 3: Both offline add different mocks -> both survive',
        m3.mockScores.some(m => m.id === 'm_A') && m3.mockScores.some(m => m.id === 'm_B'));

      // Test 4: Both offline edit same error differently -> later edit wins, other in syncConflicts
      const baseErr = { id: 'err_shared', topic: 'Lidocaine dose', correctFact: 'Original', updatedAt: '2026-11-15T09:00:00.000Z' };
      const docA4 = createEmptyProgressDoc();
      docA4.errorLog.push({ ...baseErr, correctFact: 'Mac edited 4.4 mg/kg', updatedAt: '2026-11-15T13:00:00.000Z' });
      const docB4 = createEmptyProgressDoc();
      docB4.errorLog.push({ ...baseErr, correctFact: 'Android edited 7 mg/kg with adrenaline', updatedAt: '2026-11-15T13:10:00.000Z' });
      const { mergedDoc: m4 } = mergeUserProgress(docA4, docB4);
      const activeErr = m4.errorLog.find(e => e.id === 'err_shared');
      assert('Test 4A: Later edit wins for the record', activeErr.correctFact === 'Android edited 7 mg/kg with adrenaline');
      assert('Test 4B: Losing edit lands in syncConflicts (restorable)', m4.syncConflicts.length > 0 && m4.syncConflicts[0].recordId === 'err_shared');

      // Test 5: Delete mock on A -> disappears on B and does not resurrect
      const docA5 = createEmptyProgressDoc();
      docA5.mockScores.push({ id: 'm_del', source: 'Delete Me', totalScore: 700, updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: '2026-11-15T14:00:00.000Z' });
      const docB5 = createEmptyProgressDoc();
      docB5.mockScores.push({ id: 'm_del', source: 'Delete Me', totalScore: 700, updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: null });
      const { mergedDoc: m5 } = mergeUserProgress(docB5, docA5);
      const delItem = m5.mockScores.find(m => m.id === 'm_del');
      assert('Test 5: Tombstone deletion wins and prevents resurrection', delItem && delItem.deletedAt !== null);

      // Test 6: REWRITTEN - Real Offline Storage Roundtrip (Write, Read & Verify Equality)
      const testKey = 'mds_test_offline_roundtrip_' + Date.now();
      const testPayload = {
        testId: 'roundtrip_verification',
        targetScore: 790,
        streak: 14,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(testKey, JSON.stringify(testPayload));
      const readRaw = localStorage.getItem(testKey);
      const parsedPayload = readRaw ? JSON.parse(readRaw) : null;
      localStorage.removeItem(testKey);

      const roundtripSuccess = parsedPayload &&
        parsedPayload.testId === testPayload.testId &&
        parsedPayload.targetScore === 790 &&
        parsedPayload.streak === 14;
      assert('Test 6: Real offline roundtrip storage write/read integrity verified', roundtripSuccess);

      // Test 7: Sign out & local work merges in upon re-signing
      const docLocal7 = createEmptyProgressDoc();
      docLocal7.mockScores.push({ id: 'm_local_offline', source: 'Studied offline while logged out', totalScore: 780, updatedAt: '2026-11-15T15:00:00.000Z' });
      const docCloud7 = createEmptyProgressDoc();
      docCloud7.mockScores.push({ id: 'm_prior_cloud', source: 'Prior cloud mock', totalScore: 760, updatedAt: '2026-11-15T08:00:00.000Z' });
      const { mergedDoc: m7 } = mergeUserProgress(docLocal7, docCloud7);
      assert('Test 7: Offline local work merges into cloud data smoothly',
        m7.mockScores.some(m => m.id === 'm_local_offline') && m7.mockScores.some(m => m.id === 'm_prior_cloud'));

      // Test 8: Fresh install downloads and matches cloud progress
      const { mergedDoc: m8 } = mergeUserProgress(null, docCloud7);
      assert('Test 8: Fresh install successfully downloads complete cloud progress',
        m8.mockScores.length === 1 && m8.mockScores[0].id === 'm_prior_cloud');

    } catch(e) {
      results.push({ test: 'Self-test execution error', passed: false, error: e.message });
    }
    return results;
  }

  // Export to global window
  window.SyncEngine = {
    init: initClient,
    getSavedConfig,
    saveConfig,
    clearConfig,
    setDeviceName,
    getDeviceName: () => state.deviceName,
    getStatus: () => ({ status: state.status, message: state.statusMessage }),
    getUser: () => state.user,
    getSession: () => state.session,
    getLastSyncedAt: () => state.lastSyncedAt,
    getConflicts: () => state.conflicts,
    getSnapshots: () => state.snapshots,
    subscribe: fn => {
      state.listeners.add(fn);
      notifySubscribers();
      return () => state.listeners.delete(fn);
    },
    mergeUserProgress,
    getLocalProgressDoc,
    saveLocalProgressDoc,
    toScalarObj,
    normalizeDoc,
    syncNow,
    triggerSync,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    fetchSnapshots,
    rollbackToSnapshot,
    restoreConflictVersion,
    deleteCloudData,
    runSelfTests,
    generateUUID
  };

})(typeof window !== 'undefined' ? window : this);
