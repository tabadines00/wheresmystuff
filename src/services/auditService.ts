import { AuditLog } from '../types/models';

export class AuditService {
  constructor(private db: D1Database) {}

  async listLogs(limit: number = 50, offset: number = 0) {
    const result = await this.db.prepare(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all<AuditLog>();
    return result.results;
  }

  async getLogsByEntity(entityType: string, entityId: string) {
    const result = await this.db.prepare(
      'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC'
    ).bind(entityType, entityId).all<AuditLog>();
    return result.results;
  }
}
