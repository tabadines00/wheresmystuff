import { Hono } from 'hono';
import { users } from './routes/users';
import { equipment } from './routes/equipment';
import { loans } from './routes/loans';
import { kits } from './routes/kits';
import { audit } from './routes/audit';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
  return c.text('Film Equipment Tracker API');
});

// Routes
app.route('/users', users);
app.route('/equipment', equipment);
app.route('/loans', loans);
app.route('/kits', kits);
app.route('/audit', audit);

export default app;
