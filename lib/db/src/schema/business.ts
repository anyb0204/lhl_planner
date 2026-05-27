import { pgTable, serial, text, boolean, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Side hustle product listings
export const sideHustleProductsTable = pgTable("side_hustle_products", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  platform: text("platform").notNull().default("etsy"), // ebay | etsy | other
  status: text("status").notNull().default("active"),   // active | sold | draft | archived
  listingPrice: text("listing_price").notNull().default("0"),
  costBasis: text("cost_basis").notNull().default("0"),
  quantity: integer("quantity").notNull().default(1),
  category: text("category"),
  notes: text("notes"),
  listedDate: text("listed_date").notNull(),
  soldDate: text("sold_date"),
  soldPrice: text("sold_price"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertSideHustleProductSchema = createInsertSchema(sideHustleProductsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSideHustleProduct = z.infer<typeof insertSideHustleProductSchema>;
export type SideHustleProduct = typeof sideHustleProductsTable.$inferSelect;

// Side hustle sales records
export const sideHustleSalesTable = pgTable("side_hustle_sales", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productId: integer("product_id"),
  productTitle: text("product_title").notNull(),
  platform: text("platform").notNull().default("etsy"),
  saleDate: text("sale_date").notNull(),
  soldPrice: text("sold_price").notNull(),
  fees: text("fees").notNull().default("0"),
  shippingCost: text("shipping_cost").notNull().default("0"),
  costBasis: text("cost_basis").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertSideHustleSaleSchema = createInsertSchema(sideHustleSalesTable).omit({ id: true, createdAt: true });
export type InsertSideHustleSale = z.infer<typeof insertSideHustleSaleSchema>;
export type SideHustleSale = typeof sideHustleSalesTable.$inferSelect;
