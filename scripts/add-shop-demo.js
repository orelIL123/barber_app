const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBiDFQNbnExTE03YS_6xoNE6_RrX4HBN4Q",
  authDomain: "barber-app-template.firebaseapp.com",
  projectId: "barber-app-template",
  storageBucket: "barber-app-template.firebasestorage.app",
  messagingSenderId: "246646930767",
  appId: "1:246646930767:web:d1bdd3b156eda443f2193a",
  measurementId: "G-S6VSPNP5LH"
};

(async () => {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  await addDoc(collection(db, 'shop'), {
    name: 'שמפו מקצועי',
    description: 'שמפו איכותי לטיפוח השיער הגברי',
    category: 'hair_care',
    imageUrl: 'https://via.placeholder.com/200x200/007bff/ffffff?text=שמפו',
    inStock: true,
    createdAt: new Date()
  });
  console.log('✅ מוצר דוגמה נוסף ל-shop!');
  process.exit(0);
})(); 