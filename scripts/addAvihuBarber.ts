import { addBarber } from '../services/firebase';

(async () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startHour = now.getHours();
  const startMin = now.getMinutes();
  const slots: string[] = [];
  let h = startHour;
  let m = Math.ceil(startMin / 20) * 20;
  if (m === 60) { h++; m = 0; }
  while (h < 20) {
    slots.push(`${pad(h)}:${pad(m)}`);
    m += 20;
    if (m >= 60) { h++; m = 0; }
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