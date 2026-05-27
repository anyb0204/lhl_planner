import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  sideHustleProductsTable,
  sideHustleSalesTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const IdParam = z.object({ id: z.coerce.number() });

// ─── Products ─────────────────────────────────────────────────────────────────

const CreateProductBody = z.object({
  title: z.string().min(1),
  platform: z.string().min(1),
  status: z.string().optional(),
  listingPrice: z.number().optional(),
  costBasis: z.number().optional(),
  quantity: z.number().int().optional(),
  category: z.string().nullish(),
  notes: z.string().nullish(),
  listedDate: z.string().min(1),
});

const UpdateProductBody = z.object({
  title: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  listingPrice: z.number().optional(),
  costBasis: z.number().optional(),
  quantity: z.number().int().optional(),
  category: z.string().nullish(),
  notes: z.string().nullish(),
  listedDate: z.string().optional(),
  soldDate: z.string().nullish(),
  soldPrice: z.number().nullish(),
});

const MarkProductSoldBody = z.object({
  soldPrice: z.number().optional(),
  fees: z.number().optional(),
  shippingCost: z.number().optional(),
});

router.get("/business/products", async (req, res) => {
  try {
    const rows = await db.select().from(sideHustleProductsTable)
      .where(eq(sideHustleProductsTable.userId, req.user!.id))
      .orderBy(desc(sideHustleProductsTable.createdAt));
    res.json(rows.map(formatProduct));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/business/products", async (req, res) => {
  try {
    const body = CreateProductBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(sideHustleProductsTable).values({
      userId: req.user!.id,
      title: body.data.title,
      platform: body.data.platform,
      status: body.data.status ?? "active",
      listingPrice: String(body.data.listingPrice ?? 0),
      costBasis: String(body.data.costBasis ?? 0),
      quantity: body.data.quantity ?? 1,
      category: body.data.category ?? null,
      notes: body.data.notes ?? null,
      listedDate: body.data.listedDate,
    }).returning();
    res.status(201).json(formatProduct(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/business/products/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateProductBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.platform !== undefined) updates.platform = body.data.platform;
    if (body.data.status !== undefined) updates.status = body.data.status;
    if (body.data.listingPrice !== undefined) updates.listingPrice = String(body.data.listingPrice);
    if (body.data.costBasis !== undefined) updates.costBasis = String(body.data.costBasis);
    if (body.data.quantity !== undefined) updates.quantity = body.data.quantity;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    if (body.data.listedDate !== undefined) updates.listedDate = body.data.listedDate;
    if (body.data.soldDate !== undefined) updates.soldDate = body.data.soldDate;
    if (body.data.soldPrice !== undefined) updates.soldPrice = body.data.soldPrice !== null ? String(body.data.soldPrice) : null;
    const [row] = await db.update(sideHustleProductsTable).set(updates)
      .where(and(eq(sideHustleProductsTable.id, params.data.id), eq(sideHustleProductsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatProduct(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/business/products/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(sideHustleProductsTable)
      .where(and(eq(sideHustleProductsTable.id, params.data.id), eq(sideHustleProductsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/business/products/:id/sell", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = MarkProductSoldBody.safeParse(req.body ?? {});
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const userId = req.user!.id;
    const productRows = await db.select().from(sideHustleProductsTable)
      .where(and(eq(sideHustleProductsTable.id, params.data.id), eq(sideHustleProductsTable.userId, userId)))
      .limit(1);

    if (productRows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const product = productRows[0];

    const soldDate = new Date().toISOString().slice(0, 10);
    const soldPrice = body.data.soldPrice ?? parseFloat(product.listingPrice);

    // Update product status
    const [updatedProduct] = await db.update(sideHustleProductsTable)
      .set({
        status: "sold",
        soldDate,
        soldPrice: String(soldPrice),
        updatedAt: new Date(),
      })
      .where(eq(sideHustleProductsTable.id, params.data.id))
      .returning();

    // Create a sale record
    await db.insert(sideHustleSalesTable).values({
      userId,
      productId: params.data.id,
      productTitle: product.title,
      platform: product.platform,
      saleDate: soldDate,
      soldPrice: String(soldPrice),
      fees: String(body.data.fees ?? 0),
      shippingCost: String(body.data.shippingCost ?? 0),
      costBasis: product.costBasis,
    });

    res.json(formatProduct(updatedProduct));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatProduct(row: typeof sideHustleProductsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    platform: row.platform,
    status: row.status,
    listingPrice: parseFloat(row.listingPrice),
    costBasis: parseFloat(row.costBasis),
    quantity: row.quantity,
    category: row.category,
    notes: row.notes,
    listedDate: row.listedDate,
    soldDate: row.soldDate,
    soldPrice: row.soldPrice !== null ? parseFloat(row.soldPrice) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Sales ────────────────────────────────────────────────────────────────────

const CreateSaleBody = z.object({
  productId: z.number().int().nullish(),
  productTitle: z.string().min(1),
  platform: z.string().min(1),
  saleDate: z.string().min(1),
  soldPrice: z.number(),
  fees: z.number().optional(),
  shippingCost: z.number().optional(),
  costBasis: z.number().optional(),
});

router.get("/business/sales", async (req, res) => {
  try {
    const rows = await db.select().from(sideHustleSalesTable)
      .where(eq(sideHustleSalesTable.userId, req.user!.id))
      .orderBy(desc(sideHustleSalesTable.createdAt));
    res.json(rows.map(formatSale));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/business/sales", async (req, res) => {
  try {
    const body = CreateSaleBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(sideHustleSalesTable).values({
      userId: req.user!.id,
      productId: body.data.productId ?? null,
      productTitle: body.data.productTitle,
      platform: body.data.platform,
      saleDate: body.data.saleDate,
      soldPrice: String(body.data.soldPrice),
      fees: String(body.data.fees ?? 0),
      shippingCost: String(body.data.shippingCost ?? 0),
      costBasis: String(body.data.costBasis ?? 0),
    }).returning();
    res.status(201).json(formatSale(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/business/sales/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(sideHustleSalesTable)
      .where(and(eq(sideHustleSalesTable.id, params.data.id), eq(sideHustleSalesTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatSale(row: typeof sideHustleSalesTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    productTitle: row.productTitle,
    platform: row.platform,
    saleDate: row.saleDate,
    soldPrice: parseFloat(row.soldPrice),
    fees: parseFloat(row.fees),
    shippingCost: parseFloat(row.shippingCost),
    costBasis: parseFloat(row.costBasis),
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
