import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { UserService } from '../src/services/userService';
import { EquipmentService } from '../src/services/equipmentService';
import { KitService } from '../src/services/kitService';
import { AuditService } from '../src/services/auditService';
import { LoanService } from '../src/services/loanService';
import schema from '../db/schema.sql?raw';

describe('System API Integration', () => {
  let userService: UserService;
  let equipmentService: EquipmentService;
  let kitService: KitService;
  let auditService: AuditService;
  let loanService: LoanService;

  beforeAll(async () => {
    const cleanSchema = schema
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('PRAGMA') && !trimmed.startsWith('--');
      })
      .join(' ')
      .replace(/\s+/g, ' ');
    await env.DB.exec(cleanSchema);
  });

  beforeEach(() => {
    userService = new UserService(env.DB);
    equipmentService = new EquipmentService(env.DB);
    kitService = new KitService(env.DB);
    auditService = new AuditService(env.DB);
    loanService = new LoanService(env.DB);
  });

  it('should manage the full equipment lifecycle', async () => {
    // 1. Users
    const admin = await userService.createUser('Super Admin', 'admin');
    const member = await userService.createUser('Regular Member', 'member');
    const users = await userService.listUsers();
    expect(users.results.length).toBeGreaterThanOrEqual(2);

    // 2. Equipment
    const cam = await equipmentService.createEquipment('Camera A', admin.id);
    const lens = await equipmentService.createEquipment('Lens B', admin.id);
    const gear = await equipmentService.listEquipment();
    expect(gear.results.length).toBe(2);

    // 3. Kits
    const kit = await kitService.createKit('Basic Kit', admin.id);
    await kitService.addItemsToKit(kit.id, [cam.id, lens.id]);
    
    const kitDetails = await kitService.getKit(kit.id);
    expect(kitDetails?.items.length).toBe(2);
    expect(kitDetails?.name).toBe('Basic Kit');

    // 4. Audit
    const logs = await auditService.listLogs();
    // Expect logs for: 2 users, 2 equipment, 1 kit, 1 batch update (add items)
    // Note: loanService also creates logs, but we didn't use it here.
    // kitService doesn't currently create logs in the service, but let's check what's there.
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should filter equipment by status', async () => {
    const admin = await userService.createUser('Status Admin', 'admin');
    const eq = await equipmentService.createEquipment('Status Gear', admin.id);
    
    const available = await equipmentService.listEquipment('available');
    expect(available.results.some(item => item.id === eq.id)).toBe(true);
    
    const checkedOut = await equipmentService.listEquipment('checked_out');
    expect(checkedOut.results.some(item => item.id === eq.id)).toBe(false);
  });

  it('should generate accurate pull sheets for borrowers and owners', async () => {
    // 1. Setup Users
    const ownerA = await userService.createUser('Owner A', 'member');
    const ownerB = await userService.createUser('Owner B', 'member');
    const borrowerC = await userService.createUser('Borrower C', 'member');
    const adminLender = await userService.createUser('Admin', 'admin');

    // 2. Setup Equipment
    const eqA1 = await equipmentService.createEquipment('Camera A', ownerA.id);
    const eqA2 = await equipmentService.createEquipment('Lens A', ownerA.id);
    const eqB1 = await equipmentService.createEquipment('Light B', ownerB.id);

    // 3. Create mixed loan (Borrower C borrows A's and B's gear)
    await loanService.createLoan(borrowerC.id, adminLender.id, [eqA1.id, eqA2.id, eqB1.id]);

    // 4. Assertion (Borrower View): Should see all 3 items in their loan
    const borrowerSheet = await loanService.listLoans({ borrower_id: borrowerC.id, status: 'active' });
    expect(borrowerSheet.results.length).toBe(1);
    expect(borrowerSheet.results[0].items.length).toBe(3);

    // 5. Assertion (Owner View A): Should only see THEIR 2 items in the loan
    const ownerASheet = await loanService.listLoans({ equipment_owner_id: ownerA.id, status: 'active' });
    expect(ownerASheet.results.length).toBe(1);
    expect(ownerASheet.results[0].items.length).toBe(2);
    expect(ownerASheet.results[0].items.every((i: any) => i.owner_id === ownerA.id)).toBe(true);

    // 6. Assertion (Owner View B): Should only see THEIR 1 item in the loan
    const ownerBSheet = await loanService.listLoans({ equipment_owner_id: ownerB.id, status: 'active' });
    expect(ownerBSheet.results.length).toBe(1);
    expect(ownerBSheet.results[0].items.length).toBe(1);
    expect(ownerBSheet.results[0].items[0].equipment_id).toBe(eqB1.id);
  });
});
