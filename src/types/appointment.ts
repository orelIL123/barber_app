import { Timestamp } from 'firebase/firestore';

export interface Appointment {
  id: string;
  userId: string;
  serviceId: string;
  staffId: string;
  dateTime: Timestamp | Date; // Use Timestamp or Date
  // Add other fields relevant to your Appointment data model
  clientName?: string;
  clientNotes?: string;
  status?: 'booked' | 'completed' | 'cancelled';
  [key: string]: any; // Allow other fields
} 