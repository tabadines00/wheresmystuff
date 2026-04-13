import { Hono } from 'hono';
import { LoanService } from '../services/loanService';

const loans = new Hono<{ Bindings: { DB: D1Database } }>();

loans.get('/', async (c) => {
  const status = c.req.query('status') as 'active' | 'returned' | undefined;
  const borrower_id = c.req.query('borrower_id');
  const equipment_owner_id = c.req.query('equipment_owner_id');

  const service = new LoanService(c.env.DB);
  try {
    const result = await service.listLoans({ status, borrower_id, equipment_owner_id });
    return c.json(result);

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

loans.post('/', async (c) => {
  const { borrower_id, lender_id, equipment_ids } = await c.req.json<{
    borrower_id: string;
    lender_id: string;
    equipment_ids: string[];
  }>();

  const service = new LoanService(c.env.DB);
  try {
    const result = await service.createLoan(borrower_id, lender_id, equipment_ids);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

loans.post('/:id/return', async (c) => {
  const id = c.req.param('id');
  const { lender_id } = await c.req.json<{ lender_id: string }>();
  
  const service = new LoanService(c.env.DB);
  try {
    const result = await service.returnLoan(id, lender_id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export { loans };
