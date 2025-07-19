import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>תנאי שימוש באפליקציה – ron turgeman</Text>
        <Text style={styles.section}>
          ברוך הבא לאפליקציית ניהול התורים של ron turgeman. השימוש באפליקציה מעיד על הסכמתך המלאה לתנאים אלו.
        </Text>
        <Text style={styles.heading}>1. כללי</Text>
        <Text style={styles.section}>
          תנאי השימוש מנוסחים בלשון זכר אך מיועדים לכולם.{"\n"}
          השימוש באפליקציה (מכל מכשיר) מהווה הסכמה לתנאים אלו.{"\n"}
          אם אינך מסכים – אנא הימנע מהשימוש.
        </Text>
        <Text style={styles.heading}>2. על האפליקציה</Text>
        <Text style={styles.section}>
          האפליקציה משמשת לניהול וזימון תורים לעסקים. היא מופעלת ומתוחזקת באופן עצמאי על-ידי ron turgeman.
        </Text>
        <Text style={styles.heading}>3. הרשמה ושימוש</Text>
        <Text style={styles.section}>
          כדי להשתמש באפליקציה תידרש לספק פרטים כמו שם, טלפון ו/או אימייל.{"\n"}
          המידע שתמסור יישמר באופן מאובטח ולא יועבר לצד שלישי, למעט לצרכים תפעוליים.{"\n"}
          הזנת פרטים שגויים אסורה ועלולה להוביל לחסימת השימוש.
        </Text>
        <Text style={styles.heading}>4. אחריות המשתמש</Text>
        <Text style={styles.section}>
          כל פעולה שתבצע באפליקציה היא באחריותך בלבד.{"\n"}
          אין להשתמש באפליקציה לפעולות בלתי חוקיות או מזיקות.{"\n"}
          אין להעביר את פרטי ההתחברות לאחרים.
        </Text>
        <Text style={styles.heading}>5. הגבלת אחריות</Text>
        <Text style={styles.section}>
          האפליקציה מסופקת כפי שהיא (As-Is).{"\n"}
          ייתכנו תקלות או זמינות מוגבלת. ron turgeman אינו אחראי לנזק עקיף או ישיר.{"\n"}
          לא תתאפשר העברת זכויות שימוש ללא אישור מראש.
        </Text>
        <Text style={styles.heading}>6. פרטיות ואבטחה</Text>
        <Text style={styles.section}>
          הנתונים נשמרים על שרתים מאובטחים.{"\n"}
          ננקטים אמצעים למניעת גישה לא מורשית, אך אין אחריות מלאה על תקלות או פריצות.
        </Text>
        <Text style={styles.heading}>7. קניין רוחני</Text>
        <Text style={styles.section}>
          כל הזכויות על העיצוב, הפיתוח והתוכן באפליקציה שייכות ל-ron turgeman.{"\n"}
          אין להעתיק, לשכפל או להשתמש בתוכן ללא אישור בכתב.
        </Text>
        <Text style={styles.heading}>8. תקשורת ושיווק</Text>
        <Text style={styles.section}>
          ייתכן שתישלח אליך הודעה בנוגע לשירות. תוכל להסיר את עצמך מרשימת התפוצה בכל עת.
        </Text>
        <Text style={styles.heading}>9. שינוי תנאים</Text>
        <Text style={styles.section}>
          ron turgeman שומר לעצמו את הזכות לעדכן את תנאי השימוש ללא הודעה מוקדמת.
        </Text>
        <Text style={styles.heading}>10. יצירת קשר</Text>
        <Text style={styles.section}>
          לשאלות או פניות:
          {"\n"}✉️ orel895@gmail.com
          {"\n"}📞 052-398-5505
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 4,
  },
  section: {
    fontSize: 15,
    marginBottom: 10,
    lineHeight: 24,
    textAlign: 'right',
  },
}); 