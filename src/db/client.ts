import { AuditLog } from '../types/models';

export async function createAuditLog(
  db: D1Database,
  log: Omit<AuditLog, 'id' | 'created_at'>
) {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await db.prepare(
    'INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, log.entity_type, log.entity_id, log.action, log.user_id, log.metadata, created_at)
    .run();
}
