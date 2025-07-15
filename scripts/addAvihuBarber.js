// סקריפט להוספת ספר חדש בשם אביהו שבת עם זמינות מהשעה הנוכחית עד 20:00
const { addBarber } = require('../services/firebase');

(async () => {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const startHour = now.getHours();
  const startMin = now.getMinutes();
  const slots = [];
  for(let h = startHour; h < 20; h++) {
    for(let m = (h === startHour ? Math.ceil(startMin/10)*10 : 0); m < 60; m+=10) {
      if(h === 19 && m > 50) break;
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  try {
    const barberId = await addBarber({
      name: 'אביהו שבת',
      image: '',
      availableSlots: slots,
      availabilityWindow: {
        start: `${pad(startHour)}:${pad(startMin)}`,
        end: '20:00',
      },
    });
    console.log('ברבר נוסף בהצלחה:', barberId);
  } catch (err) {
    console.error('שגיאה בהוספת ברבר:', err);
  }
})(); 