import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LoanService } from '../src/services/loanService';
import { UserService } from '../src/services/userService';
import { EquipmentService } from '../src/services/equipmentService';
import schema from '../db/schema.sql?raw';

describe('Loan Lifecycle', () => {
  let loanService: LoanService;
  let userService: UserService;
  let equipmentService: EquipmentService;

  beforeAll(async () => {
    // D1 .exec() has issues with newlines and PRAGMAs in some environments
    const cleanSchema = schema
      .split('\n')
      .filter((line: string) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('PRAGMA') && !trimmed.startsWith('--');
      })
      .join(' ')
      .replace(/\s+/g, ' ');
    await env.DB.exec(cleanSchema);
  });

  beforeEach(() => {
    loanService = new LoanService(env.DB);
    userService = new UserService(env.DB);
    equipmentService = new EquipmentService(env.DB);
  });

  it('should checkout and return equipment', async () => {
    // 1. Create Users
    const lender = await userService.createUser('Admin User', 'admin');
    const borrower = await userService.createUser('Member User', 'member');

    // 2. Create Equipment
    const gear = await equipmentService.createEquipment('Red Komodo', lender.id);

    // 3. Checkout
    const loan = await loanService.createLoan(borrower.id, lender.id, [gear.id]);
    expect(loan.loan_id).toBeDefined();

    // Verify gear is checked out
    const gearStatus = await equipmentService.getEquipment(gear.id);
    expect(gearStatus?.status).toBe('checked_out');

    // 4. Return
    const returnResult = await loanService.returnLoan(loan.loan_id, lender.id);
    expect(returnResult.success).toBe(true);

    // Verify gear is available
    const finalGearStatus = await equipmentService.getEquipment(gear.id);
    expect(finalGearStatus?.status).toBe('available');
  });
});
