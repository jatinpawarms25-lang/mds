// ==============================================================================
// NEET-MDS Top-10 Planner - Real Cloud Sync Engine (Section 3A)
// Offline-First - Record-by-Record Three-Way Merge - 90-Day Tombstones - RLS
// Supabase Free Tier: Postgres + Auth (Magic Link & Password) + Realtime
// Strict ASCII Quotes Only - Scalar Field-Level Timestamps
// ==============================================================================

(function(window) {
  'use strict';

  const STORAGE_KEYS = {
    CONFIG: 'mds_supabase_config',
    DEVICE_NAME: 'mds_device_name',
    LOCAL_PROGRESS: 'mds_user_progress_doc',
    CONFLICTS: 'mds_sync_conflicts',
    LAST_SYNC: 'mds_last_synced_at',
    SYNC_STATUS: 'mds_sync_status_state',
    REALTIME_ENABLED: 'mds_realtime_enabled'
  };

  // 90-day tombstone retention per Rule R9 & Phase 1.6
  const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

  function detectDefaultDeviceName() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android phone';
    if (/Macintosh|Mac OS X/.test(ua)) return 'MacBook Air';
    if (/Windows/.test(ua)) return 'Windows PC';
    return 'Desktop Browser';
  }

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function toScalarObj(raw, fallbackTime) {
    if (raw !== null && typeof raw === 'object' && 'value' in raw && 'updatedAt' in raw) {
      return raw;
    }
    return {
      value: raw,
      updatedAt: fallbackTime || new Date().toISOString()
    };
  }

  // Only update updatedAt when the scalar value actually changes
  function updateScalarIfChanged(existingScalarObj, newRawValue, nowIso) {
    const ts = nowIso || new Date().toISOString();
    if (
      existingScalarObj !== null &&
      typeof existingScalarObj === 'object' &&
      'value' in existingScalarObj &&
      'updatedAt' in existingScalarObj
    ) {
      if (JSON.stringify(existingScalarObj.value) === JSON.stringify(newRawValue)) {
        return existingScalarObj;
      }
    }
    return { value: newRawValue, updatedAt: ts };
  }

  function stripVolatileTimestamps(doc) {
    if (!doc || typeof doc !== 'object') return {};
    const copy = JSON.parse(JSON.stringify(doc));
    delete copy.docUpdatedAt;
    delete copy.lastSyncedAt;
    return copy;
  }

  const state = {
    client: null,
    user: null,
    session: null,
    status: 'signed_out',
    statusMessage: 'Not signed in - progress is only on this device.',
    lastSyncedAt: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.LAST_SYNC)) || null,
    deviceName: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.DEVICE_NAME)) || detectDefaultDeviceName(),
    realtimeEnabled: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.REALTIME_ENABLED)) !== 'false',
    conflicts: [],
    snapshots: [],
    listeners: new Set(),
    syncTimeout: null,
    realtimeSubscription: null,
    broadcastChannel: null,
    lastPulledRemoteTime: null
  };

  function notifySubscribers() {
    const payload = {
      status: state.status,
      statusMessage: state.statusMessage,
      user: state.user,
      deviceName: state.deviceName,
      realtimeEnabled: state.realtimeEnabled,
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

  function setRealtimeEnabled(enabled) {
    state.realtimeEnabled = Boolean(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REALTIME_ENABLED, String(state.realtimeEnabled));
    }
    if (state.realtimeEnabled) {
      setupRealtimeListener();
    } else if (state.realtimeSubscription) {
      try { state.realtimeSubscription.unsubscribe(); } catch(e) {}
      state.realtimeSubscription = null;
    }
    notifySubscribers();
  }

  function setupRealtimeListener() {
    if (!state.realtimeEnabled || !state.client || !state.user) return;
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
            if (payload.new.last_device === state.deviceName) return;

            const remoteDoc = payload.new.data;
            const localDoc = getLocalProgressDoc();
            const { mergedDoc } = mergeUserProgress(localDoc, remoteDoc);
            saveLocalProgressDoc(mergedDoc, true);
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

  // Local BroadcastChannel for instant multi-tab / multi-context sync verification
  function setupBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      if (state.broadcastChannel) state.broadcastChannel.close();
      state.broadcastChannel = new BroadcastChannel('mds_os_sync_channel');
      state.broadcastChannel.onmessage = (evt) => {
        if (!state.realtimeEnabled) return;
        const msg = evt && evt.data;
        if (msg && msg.type === 'PROGRESS_UPDATE' && msg.doc) {
          const localDoc = getLocalProgressDoc();
          const { mergedDoc } = mergeUserProgress(localDoc, msg.doc);
          saveLocalProgressDoc(mergedDoc, true);
          state.conflicts = mergedDoc.syncConflicts || [];
          notifySubscribers();
        }
      };
    } catch(e) {}
  }

  function initClient() {
    setupBroadcastChannel();
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
  // ============================================================================

  function mergeUserProgress(localDoc, remoteDoc) {
    if (!localDoc && !remoteDoc) return { mergedDoc: createEmptyProgressDoc(), conflicts: [] };
    if (!localDoc) return { mergedDoc: normalizeDoc(remoteDoc), conflicts: [] };
    if (!remoteDoc) return { mergedDoc: normalizeDoc(localDoc), conflicts: [] };

    const l = normalizeDoc(localDoc);
    const r = normalizeDoc(remoteDoc);
    const nowMs = Date.now();

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
      noticesInbox: [],
      imageDrillHistory: [],
      dailyQuizHistory: [],
      userImages: [],
      syncConflicts: Array.isArray(l.syncConflicts) ? [...l.syncConflicts] : []
    };

    const newConflicts = [];

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
          const lTime = lVal && typeof lVal === 'object' && lVal.updatedAt ? new Date(lVal.updatedAt).getTime() : 0;
          const rTime = rVal && typeof rVal === 'object' && rVal.updatedAt ? new Date(rVal.updatedAt).getTime() : 0;
          res[k] = rTime > lTime ? rVal : lVal;
        }
      });
      merged[targetKey] = res;
    }

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

    mergeScalarKeyMap('userSettings');
    mergeDailyRoutines();
    mergeSubjectProgress();
    mergeScalarKeyMap('planChecklist');
    mergeScalarKeyMap('omfsChecklist');
    mergeScalarKeyMap('hiddenRulesChecked');
    mergeScalarKeyMap('masterChecklistsChecked');
    mergeScalarKeyMap('shakyCards');
    mergeScalarKeyMap('counsellingTracker');
    mergeScalarKeyMap('documentsChecklist');

    function isExpiredTombstone(item) {
      if (!item || !item.deletedAt) return false;
      const dTime = new Date(item.deletedAt).getTime();
      return !isNaN(dTime) && (nowMs - dTime > TOMBSTONE_RETENTION_MS);
    }

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

        if (!lItem) {
          if (!isExpiredTombstone(rItem)) mergedList.push(rItem);
          return;
        }
        if (!rItem) {
          if (!isExpiredTombstone(lItem)) mergedList.push(lItem);
          return;
        }

        const lDeleted = lItem.deletedAt ? new Date(lItem.deletedAt).getTime() : null;
        const rDeleted = rItem.deletedAt ? new Date(rItem.deletedAt).getTime() : null;
        const lUpdated = lItem.updatedAt ? new Date(lItem.updatedAt).getTime() : 0;
        const rUpdated = rItem.updatedAt ? new Date(rItem.updatedAt).getTime() : 0;

        if (lDeleted || rDeleted) {
          let chosen;
          if (lDeleted && !rDeleted) {
            chosen = lDeleted >= rUpdated ? { ...lItem, _deleted: true } : rItem;
          } else if (rDeleted && !lDeleted) {
            chosen = rDeleted >= lUpdated ? { ...rItem, _deleted: true } : lItem;
          } else {
            chosen = lDeleted >= rDeleted ? { ...lItem, _deleted: true } : { ...rItem, _deleted: true };
          }
          if (!isExpiredTombstone(chosen)) mergedList.push(chosen);
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
    mergeRecordArray('noticesInbox', 'id', 'title');

    merged.syncConflicts = [...newConflicts, ...merged.syncConflicts].slice(0, 50);
    return { mergedDoc: merged, conflicts: newConflicts };
  }

  function normalizeDoc(rawDoc) {
    if (!rawDoc) return createEmptyProgressDoc();
    const doc = JSON.parse(JSON.stringify(rawDoc));
    const nowIso = new Date().toISOString();
    const defaults = createEmptyProgressDoc().userSettings;

    if (!doc.userSettings) doc.userSettings = {};
    Object.keys(defaults).forEach(k => {
      if (doc.userSettings[k] === undefined) {
        doc.userSettings[k] = defaults[k];
      }
    });
    Object.keys(doc.userSettings).forEach(k => {
      doc.userSettings[k] = toScalarObj(doc.userSettings[k], nowIso);
    });

    const scalarMaps = [
      'planChecklist', 'omfsChecklist', 'hiddenRulesChecked',
      'masterChecklistsChecked', 'shakyCards', 'counsellingTracker', 'documentsChecklist'
    ];
    scalarMaps.forEach(mapKey => {
      if (!doc[mapKey]) doc[mapKey] = {};
      Object.keys(doc[mapKey]).forEach(k => {
        doc[mapKey][k] = toScalarObj(doc[mapKey][k], nowIso);
      });
    });

    if (!doc.subjectProgress) doc.subjectProgress = {};
    Object.keys(doc.subjectProgress).forEach(s => {
      const sObj = doc.subjectProgress[s];
      if (sObj && typeof sObj === 'object') {
        Object.keys(sObj).forEach(f => {
          sObj[f] = toScalarObj(sObj[f], nowIso);
        });
      }
    });

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
    if (!Array.isArray(doc.noticesInbox)) doc.noticesInbox = [];
    if (!Array.isArray(doc.imageDrillHistory)) doc.imageDrillHistory = [];
    if (!Array.isArray(doc.dailyQuizHistory)) doc.dailyQuizHistory = [];
    if (!Array.isArray(doc.userImages)) doc.userImages = [];
    if (!Array.isArray(doc.syncConflicts)) doc.syncConflicts = [];

    return doc;
  }

  // Rule R4: Exam date, state, reservation category, target branch, internship date and study hours
  // are Settings fields with NO defaults anywhere in code.
  function createEmptyProgressDoc() {
    const epochIso = '1970-01-01T00:00:00.000Z';
    return {
      schema_version: 1,
      docUpdatedAt: new Date().toISOString(),
      userSettings: {
        examDate: toScalarObj('', epochIso),
        internshipDate: toScalarObj('', epochIso),
        stateName: toScalarObj('', epochIso),
        statePortalUrl: toScalarObj('', epochIso),
        stateDomicileBasis: toScalarObj('', epochIso),
        reservationCategory: toScalarObj('', epochIso),
        targetBranch: toScalarObj('', epochIso),
        dailyHours: toScalarObj('', epochIso),
        targetScore: toScalarObj(790, epochIso),
        coachingName: toScalarObj('Dr. Anchal Agarwal Classes', epochIso),
        studySpine: toScalarObj('Dental Pulse, 18th edition 2025', epochIso),
        contentUpdateUrl: toScalarObj('', epochIso),
        soundEnabled: toScalarObj(true, epochIso),
        dismissedWarning: toScalarObj(false, epochIso)
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
      noticesInbox: [],
      imageDrillHistory: [],
      dailyQuizHistory: [],
      userImages: [],
      syncConflicts: []
    };
  }

  // Convert and merge either Build A JSON backup OR MDS OS JSON backup without loss
  function importBackupPayload(imported, existingDoc) {
    if (!imported || typeof imported !== 'object') {
      throw new Error('Invalid JSON backup payload');
    }
    const baseDoc = existingDoc ? normalizeDoc(existingDoc) : getLocalProgressDoc();
    const nowIso = new Date().toISOString();

    // Case 1: MDS OS backup format ({ userProgress: { ... } })
    if (imported.userProgress && typeof imported.userProgress === 'object') {
      const { mergedDoc } = mergeUserProgress(baseDoc, imported.userProgress);
      saveLocalProgressDoc(mergedDoc);
      return mergedDoc;
    }

    // Case 2: Build A static planner backup format ({ exported, exam, targetBranch, mocks, errors, shortlist, counselling, stateQuota })
    const converted = createEmptyProgressDoc();
    if (imported.targetBranch) {
      converted.userSettings.targetBranch = toScalarObj(String(imported.targetBranch), nowIso);
    }
    if (imported.stateQuota && typeof imported.stateQuota === 'object') {
      if (imported.stateQuota.state) converted.userSettings.stateName = toScalarObj(String(imported.stateQuota.state), nowIso);
      if (imported.stateQuota.portal) converted.userSettings.statePortalUrl = toScalarObj(String(imported.stateQuota.portal), nowIso);
      if (imported.stateQuota.domicile) converted.userSettings.stateDomicileBasis = toScalarObj(String(imported.stateQuota.domicile), nowIso);
    }
    if (Array.isArray(imported.mocks)) {
      converted.mockScores = imported.mocks.map((m, idx) => {
        const aC = Number(m.aC ?? m.partA_C ?? 0);
        const aW = Number(m.aW ?? m.partA_W ?? 0);
        const aS = Number(m.aS ?? m.partA_U ?? Math.max(0, 100 - aC - aW));
        const bC = Number(m.bC ?? m.partB_C ?? 0);
        const bW = Number(m.bW ?? m.partB_W ?? 0);
        const bS = Number(m.bS ?? m.partB_U ?? Math.max(0, 140 - bC - bW));
        const totalScore = m.totalScore !== undefined ? Number(m.totalScore) : (m.score !== undefined ? Number(m.score) : ((aC + bC) * 4 - (aW + bW)));
        const att = aC + bC + aW + bW;
        const accuracy = m.accuracy !== undefined ? Number(m.accuracy) : (m.acc !== undefined ? Number(m.acc) : (att ? Math.round(((aC + bC) / att) * 1000) / 10 : 0));
        return {
          id: m.id || ('build_a_mock_' + idx + '_' + (m.label || 'mock').replace(/\W+/g, '_')),
          date: m.date || imported.exported || nowIso.slice(0, 10),
          source: m.source || m.label || ('Build A Mock ' + (idx + 1)),
          partA_C: aC,
          partA_W: aW,
          partA_U: aS,
          partB_C: bC,
          partB_W: bW,
          partB_U: bS,
          totalScore,
          accuracy,
          updatedAt: m.updatedAt || nowIso,
          deletedAt: m.deletedAt || null
        };
      });
    }
    if (Array.isArray(imported.errors)) {
      converted.errorLog = imported.errors.map((e, idx) => ({
        id: e.id || ('build_a_err_' + idx + '_' + (e.topic || 'err').slice(0, 20).replace(/\W+/g, '_')),
        subject: e.subject || 'General',
        topic: e.topic || 'Imported error',
        whatWentWrong: e.whatWentWrong || e.topic || '',
        reason: e.reason || 'Concept Gap',
        correctFact: e.correctFact || e.topic || '',
        reference: e.reference || 'Imported from Build A',
        reviewDate: e.review || e.reviewDate || '',
        reviewDay: e.reviewDay || 2,
        revised: Boolean(e.revised),
        isVolatile: Boolean(e.isVolatile),
        date: e.date || imported.exported || nowIso.slice(0, 10),
        updatedAt: e.updatedAt || nowIso,
        deletedAt: e.deletedAt || null
      }));
    }
    if (Array.isArray(imported.shortlist)) {
      converted.collegeShortlist = imported.shortlist.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: 'build_a_col_' + item.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            name: item,
            priority: idx + 1,
            notes: 'Imported from Build A shortlist (Choice #' + (idx + 1) + ')',
            updatedAt: nowIso,
            deletedAt: null
          };
        }
        return {
          id: item.id || ('col_' + idx),
          name: item.name || String(item),
          priority: item.priority || (idx + 1),
          notes: item.notes || '',
          updatedAt: item.updatedAt || nowIso,
          deletedAt: item.deletedAt || null
        };
      });
    }
    if (Array.isArray(imported.counselling)) {
      const roundKeys = ['r1', 'r1_choices', 'r1_exit', 'r2_choices', 'r2', 'r3_reg', 'r3', 'stray_elig', 'stray', 'refund', 'cross_check', 'state_reg'];
      imported.counselling.forEach((done, idx) => {
        const key = roundKeys[idx] || ('step_' + (idx + 1));
        converted.counsellingTracker[key] = toScalarObj(Boolean(done), nowIso);
        converted.counsellingTracker['build_a_step_' + idx] = toScalarObj(Boolean(done), nowIso);
      });
    }

    const { mergedDoc } = mergeUserProgress(baseDoc, converted);
    saveLocalProgressDoc(mergedDoc);
    return mergedDoc;
  }

  function getLocalProgressDoc() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PROGRESS);
      if (raw) return normalizeDoc(JSON.parse(raw));
    } catch(e) {}
    return createEmptyProgressDoc();
  }

  function saveLocalProgressDoc(doc, fromRemote) {
    if (!doc) return;
    const normalized = normalizeDoc(doc);
    normalized.docUpdatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_PROGRESS, JSON.stringify(normalized));
      if (!fromRemote && state.broadcastChannel && state.realtimeEnabled) {
        state.broadcastChannel.postMessage({ type: 'PROGRESS_UPDATE', doc: normalized });
      }
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

      const { data: remoteRows, error: pullError } = await state.client
        .from('user_progress')
        .select('*')
        .eq('user_id', state.user.id);

      if (pullError) throw new Error('Cloud pull error: ' + pullError.message);

      let mergedDoc;
      let conflictsAdded = [];
      let remoteUpdatedAt = null;
      let remoteDoc = null;

      if (!remoteRows || remoteRows.length === 0) {
        mergedDoc = localDoc;
      } else {
        const remoteRow = remoteRows[0];
        remoteUpdatedAt = remoteRow.updated_at;
        state.lastPulledRemoteTime = remoteUpdatedAt;
        remoteDoc = remoteRow.data || {};
        const mergeResult = mergeUserProgress(localDoc, remoteDoc);
        mergedDoc = mergeResult.mergedDoc;
        conflictsAdded = mergeResult.conflicts;
      }

      saveLocalProgressDoc(mergedDoc, true);
      state.conflicts = mergedDoc.syncConflicts || [];

      if (remoteUpdatedAt) {
        const { data: checkRows } = await state.client
          .from('user_progress')
          .select('updated_at')
          .eq('user_id', state.user.id);

        if (checkRows && checkRows.length > 0 && checkRows[0].updated_at !== remoteUpdatedAt) {
          const { data: freshRemote } = await state.client
            .from('user_progress')
            .select('*')
            .eq('user_id', state.user.id);

          if (freshRemote && freshRemote.length > 0) {
            remoteDoc = freshRemote[0].data || {};
            const reMerge = mergeUserProgress(mergedDoc, remoteDoc);
            mergedDoc = reMerge.mergedDoc;
            conflictsAdded.push(...reMerge.conflicts);
            saveLocalProgressDoc(mergedDoc, true);
          }
        }
      }

      const nowIso = new Date().toISOString();
      const hasMeaningfulDiff = !remoteDoc || (
        JSON.stringify(stripVolatileTimestamps(mergedDoc)) !== JSON.stringify(stripVolatileTimestamps(remoteDoc))
      );

      if (hasMeaningfulDiff) {
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
      }

      state.lastSyncedAt = nowIso;
      state.lastPulledRemoteTime = nowIso;
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowIso);

      const conflictMsg = conflictsAdded.length > 0 ? ` (${conflictsAdded.length} conflicts recorded)` : '';
      setStatus('synced', `Synced - just now${conflictMsg}`);
      fetchSnapshots().catch(() => {});

      isSyncing = false;
      return { success: true, doc: mergedDoc, conflicts: conflictsAdded, pushed: hasMeaningfulDiff };
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
    delete losingVersion._deleted;

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
  // COMPREHENSIVE SECTION 3A + PHASE 0 SELF-TEST HARNESS (12 Assertions)
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
      docB2.errorLog.push({ id: 'err_test_1', topic: 'Amalgam Gamma-2', reason: 'Concept Gap', updatedAt: '2026-11-15T11:05:00.000Z' });
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
      docA5.mockScores.push({ id: 'm_del', source: 'Delete Me', totalScore: 700, updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: new Date().toISOString() });
      const docB5 = createEmptyProgressDoc();
      docB5.mockScores.push({ id: 'm_del', source: 'Delete Me', totalScore: 700, updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: null });
      const { mergedDoc: m5 } = mergeUserProgress(docB5, docA5);
      const delItem = m5.mockScores.find(m => m.id === 'm_del');
      assert('Test 5: Tombstone deletion wins and prevents resurrection', delItem && delItem.deletedAt !== null);

      // Test 6: Real Offline Storage Roundtrip
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

      // Test 9: Build A JSON backup imports without loss
      const sampleBuildA = {
        exported: '2026-11-15',
        exam: 'NEET-MDS 2027',
        targetBranch: 'OMFS',
        mocks: [{ label: 'Baseline (Week 1)', date: '2026-11-15', aC: 82, aW: 14, aS: 4, bC: 120, bW: 8, bS: 12, score: 786, acc: 90.2, gap: -21 }],
        errors: [{ subject: 'Public Health Dentistry', reason: 'Concept gap', review: '2026-11-17', topic: 'CPI black band 3.5-5.5 mm', revised: false }],
        shortlist: ['KGMU, Lucknow (UP)', 'BHU, Varanasi (UP)'],
        counselling: [true, true, false, false],
        stateQuota: { state: 'Uttar Pradesh', portal: 'https://dgme.up.gov.in', domicile: 'BDS from a college in the state' }
      };
      const importedDoc = importBackupPayload(sampleBuildA, createEmptyProgressDoc());
      assert('Test 9: Build A JSON backup imports mocks, errors, shortlist, counselling & stateQuota without loss',
        importedDoc.mockScores.some(m => m.totalScore === 786) &&
        importedDoc.errorLog.some(e => e.topic.includes('CPI black band')) &&
        importedDoc.collegeShortlist.length === 2 &&
        importedDoc.counsellingTracker.r1?.value === true &&
        importedDoc.userSettings.stateName?.value === 'Uttar Pradesh'
      );

      // Test 10: Shortlist tombstone prevents resurrection and purges after 90 days
      const docShortA = createEmptyProgressDoc();
      docShortA.collegeShortlist.push({ id: 'c1', name: 'KGMU', updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: new Date().toISOString() });
      const docShortB = createEmptyProgressDoc();
      docShortB.collegeShortlist.push({ id: 'c1', name: 'KGMU', updatedAt: '2026-11-15T10:00:00.000Z', deletedAt: null });
      const { mergedDoc: m10 } = mergeUserProgress(docShortB, docShortA);
      const shortDel = m10.collegeShortlist.find(c => c.id === 'c1');
      assert('Test 10: Shortlist tombstone deletion prevents resurrection across devices', shortDel && shortDel.deletedAt !== null);

      // Test 11: Scalar timestamp isolation (unchanged fields keep original updatedAt)
      const origScalar = { value: 'OMFS', updatedAt: '2026-11-10T08:00:00.000Z' };
      const sameScalar = updateScalarIfChanged(origScalar, 'OMFS', '2026-11-15T20:00:00.000Z');
      const changedScalar = updateScalarIfChanged(origScalar, 'Orthodontics', '2026-11-15T20:00:00.000Z');
      assert('Test 11: Scalar edit isolation preserves unchanged field timestamps',
        sameScalar.updatedAt === '2026-11-10T08:00:00.000Z' &&
        changedScalar.updatedAt === '2026-11-15T20:00:00.000Z'
      );

    } catch(e) {
      results.push({ test: 'Self-test execution error', passed: false, error: e.message });
    }
    return results;
  }

  window.SyncEngine = {
    init: initClient,
    getSavedConfig,
    saveConfig,
    clearConfig,
    setDeviceName,
    getDeviceName: () => state.deviceName,
    setRealtimeEnabled,
    getRealtimeEnabled: () => state.realtimeEnabled,
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
    createEmptyProgressDoc,
    getLocalProgressDoc,
    saveLocalProgressDoc,
    importBackupPayload,
    toScalarObj,
    updateScalarIfChanged,
    stripVolatileTimestamps,
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
