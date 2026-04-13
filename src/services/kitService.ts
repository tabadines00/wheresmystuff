import { Kit, Equipment } from '../types/models';
import { createAuditLog } from '../db/client';

export class KitService {
  constructor(private db: D1Database) {}

  async createKit(name: string, owner_id: string) {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    await this.db.prepare(
      'INSERT INTO kits (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, name, owner_id, created_at).run();

    await createAuditLog(this.db, {
      entity_type: 'kit',
      entity_id: id,
      action: 'create',
      user_id: owner_id,
      metadata: JSON.stringify({ name })
    });
    
    return { id };
  }

  async addItemsToKit(kit_id: string, equipment_ids: string[]) {
    const statements: D1PreparedStatement[] = [];
    
    for (const eq_id of equipment_ids) {
      statements.push(
        this.db.prepare(
          'UPDATE equipment SET kit_id = ? WHERE id = ?'
        ).bind(kit_id, eq_id)
      );
    }
    
    await this.db.batch(statements);

    await createAuditLog(this.db, {
      entity_type: 'kit',
      entity_id: kit_id,
      action: 'update_items',
      user_id: null, // Could be improved if we pass user_id to service
      metadata: JSON.stringify({ equipment_ids })
    });

    return { success: true };
  }

  async listKits() {
    return await this.db.prepare('SELECT * FROM kits').all<Kit>();
  }

  async getKit(id: string) {
    const kit = await this.db.prepare(
      'SELECT * FROM kits WHERE id = ?'
    ).bind(id).first<Kit>();
    
    if (!kit) return null;

    const items = await this.db.prepare(
      'SELECT * FROM equipment WHERE kit_id = ?'
    ).bind(id).all<Equipment>();

    return { ...kit, items: items.results };
  }
}
