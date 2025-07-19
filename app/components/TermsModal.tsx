import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

const termsText = `תנאי שימוש באפליקציה – ron turgeman

ברוך הבא לאפליקציית ניהול התורים של ron turgeman. השימוש באפליקציה מעיד על הסכמתך המלאה לתנאים אלו.

1. כללי
תנאי השימוש מנוסחים בלשון זכר אך מיועדים לכולם.
השימוש באפליקציה (מכל מכשיר) מהווה הסכמה לתנאים אלו.
אם אינך מסכים – אנא הימנע מהשימוש.
2. על האפליקציה
האפליקציה משמשת לניהול וזימון תורים לעסקים. היא מופעלת ומתוחזקת באופן עצמאי על-ידי ron turgeman.

3. הרשמה ושימוש
כדי להשתמש באפליקציה תידרש לספק פרטים כמו שם, טלפון ו/או אימייל.
המידע שתמסור יישמר באופן מאובטח ולא יועבר לצד שלישי, למעט לצרכים תפעוליים.
הזנת פרטים שגויים אסורה ועלולה להוביל לחסימת השימוש.
4. אחריות המשתמש
כל פעולה שתבצע באפליקציה היא באחריותך בלבד.
אין להשתמש באפליקציה לפעולות בלתי חוקיות או מזיקות.
אין להעביר את פרטי ההתחברות לאחרים.
5. הגבלת אחריות
האפליקציה מסופקת כפי שהיא (As-Is).
ייתכנו תקלות או זמינות מוגבלת. ron turgeman אינו אחראי לנזק עקיף או ישיר.
לא תתאפשר העברת זכויות שימוש ללא אישור מראש.
6. פרטיות ואבטחה
הנתונים נשמרים על שרתים מאובטחים.
ננקטים אמצעים למניעת גישה לא מורשית, אך אין אחריות מלאה על תקלות או פריצות.
7. קניין רוחני
כל הזכויות על העיצוב, הפיתוח והתוכן באפליקציה שייכות ל-ron turgeman.
אין להעתיק, לשכפל או להשתמש בתוכן ללא אישור בכתב.
8. תקשורת ושיווק
ייתכן שתישלח אליך הודעה בנוגע לשירות. תוכל להסיר את עצמך מרשימת התפוצה בכל עת.
9. שינוי תנאים
ron turgeman שומר לעצמו את הזכות לעדכן את תנאי השימוש ללא הודעה מוקדמת.
10. יצירת קשר
לשאלות או פניות:
✉️ orel895@gmail.com
📞 052-398-5505`;

const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.overlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.termsText}>{termsText}</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 32,
    paddingBottom: 12,
  },
  termsText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'right',
  },
});

export default TermsModal; 