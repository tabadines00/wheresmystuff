import { User, UserRole } from '../types/models';
import { createAuditLog } from '../db/client';

export class UserService {
  constructor(private db: D1Database) {}

  async createUser(name: string, role: UserRole) {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    await this.db.prepare(
      'INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, name, role, created_at).run();

    await createAuditLog(this.db, {
      entity_type: 'user',
      entity_id: id,
      action: 'create',
      user_id: null, // System event
      metadata: JSON.stringify({ name, role })
    });
    
    return { id };
  }

  async listUsers() {
    return await this.db.prepare('SELECT * FROM users').all<User>();
  }

  async getUser(id: string) {
    return await this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first<User>();
  }
}
