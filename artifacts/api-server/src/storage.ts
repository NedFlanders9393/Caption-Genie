import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';

export class Storage {
  async getActiveProPriceId(): Promise<string | null> {
    const result = await db.execute(
      sql`
        SELECT pr.id
        FROM stripe.prices pr
        JOIN stripe.products p ON pr.product = p.id
        WHERE p.active = true
          AND pr.active = true
          AND pr.recurring IS NOT NULL
        ORDER BY pr.unit_amount ASC
        LIMIT 1
      `
    );
    const row = result.rows[0] as { id?: string } | undefined;
    return row?.id ?? null;
  }

  async getSubscriptionByCustomerId(customerId: string): Promise<{ status: string } | null> {
    const result = await db.execute(
      sql`
        SELECT status FROM stripe.subscriptions
        WHERE customer = ${customerId}
          AND status IN ('active', 'trialing')
        LIMIT 1
      `
    );
    const row = result.rows[0] as { status?: string } | undefined;
    return row ? { status: row.status ?? 'unknown' } : null;
  }

  async getCustomerByEmail(email: string): Promise<{ id: string } | null> {
    const result = await db.execute(
      sql`
        SELECT id FROM stripe.customers
        WHERE email = ${email}
          AND deleted = false
        LIMIT 1
      `
    );
    const row = result.rows[0] as { id?: string } | undefined;
    return row?.id ? { id: row.id } : null;
  }
}

export const storage = new Storage();
