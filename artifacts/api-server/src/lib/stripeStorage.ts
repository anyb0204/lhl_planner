import { db, usersTable, scholarshipRequestsTable } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';

export class StripeStorage {
  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async listPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getPricesForProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getUser(id: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  async upsertUser(id: string, email?: string | null) {
    const [user] = await db
      .insert(usersTable)
      .values({ id, email: email ?? null })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    const [user] = await db
      .update(usersTable)
      .set(stripeInfo)
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user ?? null;
  }

  async grantLifetimeAccess(email: string): Promise<{ found: boolean; updated: boolean }> {
    const user = await this.getUserByEmail(email);
    if (!user) return { found: false, updated: false };
    if (user.lifetimeAccess) return { found: true, updated: false };
    await db.update(usersTable).set({ lifetimeAccess: true }).where(eq(usersTable.id, user.id));
    return { found: true, updated: true };
  }

  async revokeLifetimeAccess(email: string): Promise<{ found: boolean; updated: boolean }> {
    const user = await this.getUserByEmail(email);
    if (!user) return { found: false, updated: false };
    if (!user.lifetimeAccess) return { found: true, updated: false };
    await db.update(usersTable).set({ lifetimeAccess: false }).where(eq(usersTable.id, user.id));
    return { found: true, updated: true };
  }

  async updateScholarshipStatus(userId: string, status: string) {
    const [user] = await db
      .update(usersTable)
      .set({ scholarshipStatus: status })
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  }

  async getScholarshipRequest(userId: string) {
    const [req] = await db
      .select()
      .from(scholarshipRequestsTable)
      .where(eq(scholarshipRequestsTable.userId, userId));
    return req ?? null;
  }

  async createScholarshipRequest(userId: string, story?: string) {
    const existing = await this.getScholarshipRequest(userId);
    if (existing) return existing;
    const [req] = await db
      .insert(scholarshipRequestsTable)
      .values({ userId, story: story ?? null })
      .returning();
    return req;
  }
}

export const stripeStorage = new StripeStorage();
