import { Hono } from 'hono';
import { UserService } from '../services/userService';

const users = new Hono<{ Bindings: { DB: D1Database } }>();

users.post('/', async (c) => {
  const { name, role } = await c.req.json<{ name: string; role: any }>();
  const service = new UserService(c.env.DB);
  const result = await service.createUser(name, role);
  return c.json(result, 201);
});

users.get('/', async (c) => {
  const service = new UserService(c.env.DB);
  const result = await service.listUsers();
  return c.json(result);
});

export { users };
