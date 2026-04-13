import { Hono } from 'hono';
import { KitService } from '../services/kitService';

const kits = new Hono<{ Bindings: { DB: D1Database } }>();

kits.post('/', async (c) => {
  const { name, owner_id } = await c.req.json<{ name: string; owner_id: string }>();
  const service = new KitService(c.env.DB);
  const result = await service.createKit(name, owner_id);
  return c.json(result, 201);
});

kits.get('/', async (c) => {
  const service = new KitService(c.env.DB);
  const result = await service.listKits();
  return c.json(result);
});

kits.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new KitService(c.env.DB);
  const result = await service.getKit(id);
  if (!result) return c.json({ error: 'Kit not found' }, 404);
  return c.json(result);
});

kits.post('/:id/items', async (c) => {
  const id = c.req.param('id');
  const { equipment_ids } = await c.req.json<{ equipment_ids: string[] }>();
  const service = new KitService(c.env.DB);
  const result = await service.addItemsToKit(id, equipment_ids);
  return c.json(result);
});

export { kits };
