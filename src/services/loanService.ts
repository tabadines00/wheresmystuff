import { Equipment, Loan, LoanItem } from '../types/models';
import { createAuditLog } from '../db/client';

export class LoanService {
  constructor(private db: D1Database) {}

  async createLoan(borrower_id: string, lender_id: string, equipment_ids: string[]) {
    if (equipment_ids.length === 0) {
      throw new Error('No equipment selected');
    }

    // Check if all equipment exists and is available
    const placeholders = equipment_ids.map(() => '?').join(',');
    const equipment = await this.db.prepare(
      `SELECT * FROM equipment WHERE id IN (${placeholders})`
    ).bind(...equipment_ids).all<Equipment>();

    if (equipment.results.length !== equipment_ids.length) {
      throw new Error('Some equipment could not be found');
    }

    const unavailable = equipment.results.filter(e => e.status !== 'available');
    if (unavailable.length > 0) {
      throw new Error(`Equipment unavailable: ${unavailable.map(e => e.name).join(', ')}`);
    }

    const loan_id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    const statements: D1PreparedStatement[] = [];

    // 1. Create Loan
    statements.push(
      this.db.prepare(
        'INSERT INTO loans (id, borrower_id, lender_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(loan_id, borrower_id, lender_id, 'active', created_at)
    );

    // 2. Create Loan Items and Update Equipment Status
    for (const eq_id of equipment_ids) {
      statements.push(
        this.db.prepare(
          'INSERT INTO loan_items (id, loan_id, equipment_id) VALUES (?, ?, ?)'
        ).bind(crypto.randomUUID(), loan_id, eq_id)
      );
      statements.push(
        this.db.prepare(
          "UPDATE equipment SET status = 'checked_out' WHERE id = ?"
        ).bind(eq_id)
      );
    }

    // 3. Audit Log
    const logId = crypto.randomUUID();
    statements.push(
      this.db.prepare(
        'INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(logId, 'loan', loan_id, 'create', lender_id, JSON.stringify({ equipment_ids }), created_at)
    );

    await this.db.batch(statements);

    return { loan_id };
  }

  async returnLoan(loan_id: string, lender_id: string) {
    const loan = await this.db.prepare(
      'SELECT * FROM loans WHERE id = ?'
    ).bind(loan_id).first<Loan>();

    if (!loan) throw new Error('Loan not found');
    if (loan.status === 'returned') throw new Error('Loan already returned');

    const items = await this.db.prepare(
      'SELECT * FROM loan_items WHERE loan_id = ?'
    ).bind(loan_id).all<LoanItem>();

    const returned_at = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    // 1. Update Loan Status
    statements.push(
      this.db.prepare(
        'UPDATE loans SET status = ?, returned_at = ? WHERE id = ?'
      ).bind('returned', returned_at, loan_id)
    );

    // 2. Update Equipment Status
    for (const item of items.results) {
      statements.push(
        this.db.prepare(
          "UPDATE equipment SET status = 'available' WHERE id = ?"
        ).bind(item.equipment_id)
      );
    }

    // 3. Audit Log
    const logId = crypto.randomUUID();
    statements.push(
      this.db.prepare(
        'INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(logId, 'loan', loan_id, 'return', lender_id, null, returned_at)
    );

    await this.db.batch(statements);

    return { success: true };
  }

  async listLoans(status?: 'active' | 'returned') {
    let query = `
      SELECT 
        l.*, 
        b.name as borrower_name, 
        lend.name as lender_name 
      FROM loans l
      JOIN users b ON l.borrower_id = b.id
      JOIN users lend ON l.lender_id = lend.id
    `;
    const params: string[] = [];
    
    if (status) {
      query += ' WHERE l.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY l.created_at DESC';

    const loans = await this.db.prepare(query).bind(...params).all<any>();
    
    const loanIds = loans.results.map((l: any) => l.id);
    if (loanIds.length === 0) return { results: [] };

    const placeholders = loanIds.map(() => '?').join(',');
    const items = await this.db.prepare(`
      SELECT li.loan_id, e.name as equipment_name, e.id as equipment_id
      FROM loan_items li
      JOIN equipment e ON li.equipment_id = e.id
      WHERE li.loan_id IN (${placeholders})
    `).bind(...loanIds).all<any>();

    const results = loans.results.map((loan: any) => ({
      ...loan,
      items: items.results.filter((i: any) => i.loan_id === loan.id)
    }));

    return { results };
  }
}
