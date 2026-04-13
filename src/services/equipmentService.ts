import { Equipment, EquipmentStatus } from '../types/models';
import { createAuditLog } from '../db/client';

export class EquipmentService {
  constructor(private db: D1Database) {}

  async createEquipment(name: string, owner_id: string) {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    await this.db.prepare(
      'INSERT INTO equipment (id, name, owner_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, owner_id, 'available', created_at).run();

    await createAuditLog(this.db, {
      entity_type: 'equipment',
      entity_id: id,
      action: 'create',
      user_id: owner_id,
      metadata: JSON.stringify({ name })
    });
    
    return { id };
  }

  async listEquipment(status?: EquipmentStatus, owner_id?: string) {
    let query = 'SELECT * FROM equipment';
    const params: any[] = [];
    const wheres: string[] = [];

    if (status) {
      wheres.push('status = ?');
      params.push(status);
    }
    if (owner_id) {
      wheres.push('owner_id = ?');
      params.push(owner_id);
    }

    if (wheres.length > 0) {
      query += ' WHERE ' + wheres.join(' AND ');
    }

    return await this.db.prepare(query).bind(...params).all<Equipment>();
  }

  async getEquipment(id: string) {
    return await this.db.prepare(
      'SELECT * FROM equipment WHERE id = ?'
    ).bind(id).first<Equipment>();
  }
}
