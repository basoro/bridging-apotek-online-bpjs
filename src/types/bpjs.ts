
export interface Patient {
  id: string;
  name: string;
  bpjsNumber: string;
  nik: string;
  birthDate: string;
  phone: string;
  address: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastSync?: string;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  category: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  createdAt: string;
  medicines: PrescriptionMedicine[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'dispensed';
  bpjsStatus: 'pending' | 'approved' | 'rejected' | 'error';
  notes?: string;
  totalAmount: number;
}

export interface PrescriptionMedicine {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  instructions: string;
}

export interface ClaimStatus {
  id: string;
  prescriptionId: string;
  status: 'processing' | 'approved' | 'rejected';
  bpjsResponse?: string;
  processedAt?: string;
  amount: number;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
