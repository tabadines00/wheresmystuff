import { Hono } from 'hono';
import { EquipmentService } from '../services/equipmentService';
import { EquipmentStatus } from '../types/models';

const equipment = new Hono<{ Bindings: { DB: D1Database } }>();

equipment.post('/', async (c) => {
  const { name, owner_id } = await c.req.json<{ name: string; owner_id: string }>();
  const service = new EquipmentService(c.env.DB);
  const result = await service.createEquipment(name, owner_id);
  return c.json(result, 201);
});

equipment.get('/', async (c) => {
  const status = c.req.query('status') as EquipmentStatus;
  const owner_id = c.req.query('owner_id');
  const service = new EquipmentService(c.env.DB);
  const result = await service.listEquipment(status, owner_id);
  return c.json(result);
});

equipment.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new EquipmentService(c.env.DB);
  const result = await service.getEquipment(id);
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

export { equipment };
