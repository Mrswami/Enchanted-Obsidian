const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT;
  if (!projectId && !process.env.FIREBASE_CONFIG) {
    console.warn('Firebase not configured — set FIREBASE_* env vars to enable Firestore profiles.');
    return;
  }

  try {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : admin.credential.applicationDefault();

    admin.initializeApp({ credential, projectId });
    initialized = true;
    console.log('Firebase initialized for project:', projectId);
  } catch (err) {
    console.error('Firebase initialization failed:', err.message);
    console.warn('Running without Firebase persistence.');
  }
}

function getDb() {
  if (!initialized) return null;
  return admin.firestore();
}

// ─── User profile helpers ─────────────────────────────────────────────────────

async function upsertUser(uid, profile) {
  const db = getDb();
  if (!db) return null;

  const ref = db.collection('users').doc(uid);
  await ref.set(
    {
      ...profile,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return uid;
}

async function getUser(uid) {
  const db = getDb();
  if (!db) return null;

  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}

async function saveUserSettings(uid, settings) {
  const db = getDb();
  if (!db) return null;

  await db.collection('users').doc(uid).set(
    { settings, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

// ─── Sync history helpers ─────────────────────────────────────────────────────

async function recordSync(uid, syncResult) {
  const db = getDb();
  if (!db) return null;

  const ref = db.collection('users').doc(uid).collection('syncs');
  const doc = await ref.add({
    ...syncResult,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return doc.id;
}

async function getSyncHistory(uid, limit = 20) {
  const db = getDb();
  if (!db) return [];

  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('syncs')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = {
  initFirebase,
  getDb,
  upsertUser,
  getUser,
  saveUserSettings,
  recordSync,
  getSyncHistory,
};
