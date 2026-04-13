PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TEXT NOT NULL
);

CREATE TABLE kits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'checked_out')),
  kit_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (kit_id) REFERENCES kits(id)
);

CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'returned')),
  created_at TEXT NOT NULL,
  returned_at TEXT,
  FOREIGN KEY (borrower_id) REFERENCES users(id),
  FOREIGN KEY (lender_id) REFERENCES users(id)
);

CREATE TABLE loan_items (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_items_loan_id ON loan_items(loan_id);
