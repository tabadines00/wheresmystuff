import { Hono } from 'hono';
import { AuditService } from '../services/auditService';

const audit = new Hono<{ Bindings: { DB: D1Database } }>();

audit.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const service = new AuditService(c.env.DB);
  const result = await service.listLogs(limit, offset);
  return c.json(result);
});

audit.get('/:type/:id', async (c) => {
  const { type, id } = c.req.param();
  const service = new AuditService(c.env.DB);
  const result = await service.getLogsByEntity(type, id);
  return c.json(result);
});

export { audit };
