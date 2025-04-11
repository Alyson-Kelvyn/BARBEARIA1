export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  client_name: string;
  phone_number: string;
  service_id: string;
  appointment_date: string;
  created_at: string;
  status?: string;
  service?: Service;
}

export interface User {
  id: string;
  email: string;
  role?: string;
}