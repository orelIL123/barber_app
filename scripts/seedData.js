// השתמש ב-db מתוך קובץ מרכזי
const { collection, addDoc } = require('firebase/firestore');
const { db } = require('../app/config/firebase');

const seedData = async () => {
  try {
    // Add barbers
    const barbers = [
      {
        name: "אלי כהן",
        experience: "8 שנות ניסיון",
        rating: 4.8,
        available: true,
        specialties: ["תספורת קלאסית", "עיצוב זקן", "טיפוח שיער"],
        image: ""
      },
      {
        name: "דוד לוי",
        experience: "5 שנות ניסיון",
        rating: 4.6,
        available: true,
        specialties: ["תספורת מודרנית", "הדבקת שיער", "עיצוב גברי"],
        image: ""
      },
      {
        name: "יוסי אברהם",
        experience: "10 שנות ניסיון",
        rating: 4.9,
        available: false,
        specialties: ["תספורת מקצועית", "עיצוב זקן", "טיפוח פנים"],
        image: ""
      }
    ];

    for (const barber of barbers) {
      await addDoc(collection(db, 'barbers'), barber);
    }

    // Add treatments
    const treatments = [
      {
        name: "תספורת קלאסית",
        description: "תספורת גברים קלאסית עם גימור מושלם",
        price: 80,
        duration: 45,
        image: ""
      },
      {
        name: "עיצוב זקן",
        description: "עיצוב וגימור זקן מקצועי",
        price: 60,
        duration: 30,
        image: ""
      },
      {
        name: "תספורת + זקן",
        description: "פקאג' שלם - תספורת ועיצוב זקן",
        price: 120,
        duration: 60,
        image: ""
      },
      {
        name: "טיפוח פנים",
        description: "טיפוח פנים מקצועי לגברים",
        price: 100,
        duration: 50,
        image: ""
      }
    ];

    for (const treatment of treatments) {
      await addDoc(collection(db, 'treatments'), treatment);
    }

    // Add gallery images
    const galleryImages = [
      {
        title: "תספורת 1",
        url: "",
        category: "תספורת"
      },
      {
        title: "עיצוב זקן 1",
        url: "",
        category: "זקן"
      },
      {
        title: "תספורת 2",
        url: "",
        category: "תספורת"
      },
      {
        title: "עיצוב זקן 2",
        url: "",
        category: "זקן"
      }
    ];

    for (const image of galleryImages) {
      await addDoc(collection(db, 'gallery'), image);
    }

    console.log('✅ Sample data seeded successfully!');
    console.log('Data includes:');
    console.log('- 3 barbers');
    console.log('- 4 treatments');
    console.log('- 4 gallery images');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
};

// Run the seed function
seedData();