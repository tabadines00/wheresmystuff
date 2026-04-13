export type UserRole = 'admin' | 'member';
export type EquipmentStatus = 'available' | 'checked_out';
export type LoanStatus = 'active' | 'returned';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  owner_id: string;
  status: EquipmentStatus;
  kit_id: string | null;
  created_at: string;
}

export interface Kit {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  lender_id: string;
  status: LoanStatus;
  created_at: string;
  returned_at: string | null;
}

export interface LoanItem {
  id: string;
  loan_id: string;
  equipment_id: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  metadata: string | null;
  created_at: string;
}
