#!/usr/bin/env node
// ─── Seed Script — Crée le compte admin par défaut ───────────────────────────
// Usage : node scripts/seed-admin.js

const { initializeApp }  = require('firebase/app');
const {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile, signOut,
} = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyBWL6eifzR4QmaPH7vh5oxsJ9ExXKlXyjw',
  authDomain:        'bamako-thrif.firebaseapp.com',
  projectId:         'bamako-thrif',
  storageBucket:     'bamako-thrif.firebasestorage.app',
  messagingSenderId: '84148343844',
  appId:             '1:84148343844:web:9a6c388d7ab37e558834b1',
};

const ADMINS_TO_SEED = [
  {
    email:       'admin@danaya.ml',
    password:    'password123',
    displayName: 'Admin DANAYA',
    role:        'admin',
  },
];

async function writeAdminDoc(firestore, uid, admin) {
  const ref  = doc(firestore, 'admin_users', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    console.log(`   ℹ️  Document Firestore déjà existant — ignoré`);
    return;
  }

  await setDoc(ref, {
    uid,
    email:       admin.email,
    displayName: admin.displayName,
    role:        admin.role,
    isActive:    true,
    createdAt:   Timestamp.now(),
    updatedAt:   Timestamp.now(),
  });
  console.log(`   ✅ Document Firestore créé`);
}

async function seedAdmins() {
  const app       = initializeApp(firebaseConfig, `seed-${Date.now()}`);
  const auth      = getAuth(app);
  const firestore = getFirestore(app);

  console.log('🌱 Début du seeding des comptes admin...\n');

  for (const admin of ADMINS_TO_SEED) {
    console.log(`📧 Traitement de ${admin.email}...`);

    let uid;

    try {
      // Essaie de créer le compte
      const cred = await createUserWithEmailAndPassword(auth, admin.email, admin.password);
      uid = cred.user.uid;
      await updateProfile(cred.user, { displayName: admin.displayName });
      console.log(`   ✅ Compte Firebase Auth créé (uid: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // Compte existe déjà — on se connecte pour récupérer l'UID
        console.log(`   ℹ️  Compte Auth existant — connexion pour récupérer l'UID...`);
        const cred = await signInWithEmailAndPassword(auth, admin.email, admin.password);
        uid = cred.user.uid;
        console.log(`   ✅ Connecté (uid: ${uid})`);
      } else {
        console.error(`   ❌ Erreur Auth : ${err.message}`);
        continue;
      }
    }

    // Écrire le document Firestore
    try {
      await writeAdminDoc(firestore, uid, admin);
    } catch (err) {
      console.error(`   ❌ Erreur Firestore : ${err.message}`);
    }

    console.log(`\n📋 Résumé :`);
    console.log(`   Email       : ${admin.email}`);
    console.log(`   Mot de passe: ${admin.password}`);
    console.log(`   Rôle        : ${admin.role}`);
    console.log(`   UID         : ${uid}\n`);
  }

  await signOut(auth);
  console.log('✨ Seeding terminé !');
  console.log('🌐 Dashboard : http://localhost:4200/login');
  process.exit(0);
}

seedAdmins().catch(err => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});
