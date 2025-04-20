export interface Service {
  id: string;
  name: string;
  duration: number; // Example field
  price: number; // Example field
  // Add other fields relevant to your Service data model
  [key: string]: any; // Allow other fields
} 