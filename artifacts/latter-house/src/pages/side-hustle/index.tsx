import { useState } from "react";
import { useLocation } from "wouter";
import {
  Package, DollarSign, TrendingUp, Tag, Plus, Trash2,
  Edit3, Check, X, ShoppingBag, Calculator, BarChart3,
  Store, Star, ExternalLink, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useListSideHustleProducts,
  useCreateSideHustleProduct,
  useUpdateSideHustleProduct,
  useDeleteSideHustleProduct,
  useMarkProductSold,
  useListSideHustleSales,
  type SideHustleProduct as ApiProduct,
  type SideHustleSale as ApiSale,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "ebay" | "etsy" | "other";
type ItemStatus = "active" | "sold" | "draft" | "archived";

interface Product {
  id: number;
  title: string;
  platform: Platform;
  status: ItemStatus;
  listingPrice: number;
  costBasis: number;
  quantity: number;
  category: string;
  notes: string;
  listedDate: string;
  soldDate?: string | null;
  soldPrice?: number | null;
}

interface SaleEntry {
  id: number;
  productId?: number | null;
  productTitle: string;
  platform: Platform;
  saleDate: string;
  soldPrice: number;
  fees: number;
  shippingCost: number;
  costBasis: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function toProduct(r: ApiProduct): Product {
  return {
    id: r.id!,
    title: r.title ?? "",
    platform: (r.platform as Platform) ?? "etsy",
    status: (r.status as ItemStatus) ?? "active",
    listingPrice: r.listingPrice ?? 0,
    costBasis: r.costBasis ?? 0,
    quantity: r.quantity ?? 1,
    category: r.category ?? "",
    notes: r.notes ?? "",
    listedDate: r.listedDate ?? format(new Date(), "yyyy-MM-dd"),
    soldDate: r.soldDate,
    soldPrice: r.soldPrice,
  };
}

function toSale(r: ApiSale): SaleEntry {
  return {
    id: r.id!,
    productId: r.productId,
    productTitle: r.productTitle ?? "",
    platform: (r.platform as Platform) ?? "etsy",
    saleDate: r.saleDate ?? "",
    soldPrice: r.soldPrice ?? 0,
    fees: r.fees ?? 0,
    shippingCost: r.shippingCost ?? 0,
    costBasis: r.costBasis ?? 0,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const platformColors: Record<Platform, string> = {
  ebay: "bg-blue-100 text-blue-700",
  etsy: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

const statusColors: Record<ItemStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  sold: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-gray-100 text-gray-500",
};

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Store className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-serif font-semibold text-lg text-foreground">No listings yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Start tracking your eBay, Etsy, or other listings to see your business at a glance.
        </p>
      </div>
      <Button onClick={onAdd} className="gap-2 bg-primary text-primary-foreground">
        <Plus className="w-4 h-4" /> Add Your First Listing
      </Button>
    </div>
  );
}

// ─── Add / Edit product modal ─────────────────────────────────────────────────

const defaultForm = (): Partial<Product> => ({
  title: "",
  platform: "etsy",
  status: "active",
  listingPrice: 0,
  costBasis: 0,
  quantity: 1,
  category: "",
  notes: "",
  listedDate: format(new Date(), "yyyy-MM-dd"),
});

interface ProductFormProps {
  initial?: Partial<Product>;
  onSave: (p: Partial<Product>) => void;
  onCancel: () => void;
}

function ProductForm({ initial, onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<Partial<Product>>(initial ?? defaultForm());
  const set = (k: keyof Product, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {initial?.id ? "Edit Listing" : "Add New Listing"}
            </h3>
            <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
              <Input value={form.title ?? ""} onChange={e => set("title", e.target.value)}
                placeholder="Product or listing title" />
            </div>

            {/* Platform + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</label>
                <select
                  value={form.platform ?? "etsy"}
                  onChange={e => set("platform", e.target.value as Platform)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="etsy">Etsy</option>
                  <option value="ebay">eBay</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <select
                  value={form.status ?? "active"}
                  onChange={e => set("status", e.target.value as ItemStatus)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="sold">Sold</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Price + Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Listing Price ($)</label>
                <Input type="number" min="0" step="0.01"
                  value={form.listingPrice ?? ""}
                  onChange={e => set("listingPrice", parseFloat(e.target.value) || 0)}
                  placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Basis ($)</label>
                <Input type="number" min="0" step="0.01"
                  value={form.costBasis ?? ""}
                  onChange={e => set("costBasis", parseFloat(e.target.value) || 0)}
                  placeholder="0.00" />
              </div>
            </div>

            {/* Quantity + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</label>
                <Input type="number" min="1"
                  value={form.quantity ?? 1}
                  onChange={e => set("quantity", parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                <Input value={form.category ?? ""}
                  onChange={e => set("category", e.target.value)}
                  placeholder="e.g. Jewelry, Art" />
              </div>
            </div>

            {/* Listed Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Listed</label>
              <Input type="date" value={form.listedDate ?? ""}
                onChange={e => set("listedDate", e.target.value)} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea
                value={form.notes ?? ""}
                onChange={e => set("notes", e.target.value)}
                placeholder="Tags, sourcing notes, etc."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Potential profit display */}
          {((form.listingPrice ?? 0) > 0) && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Est. profit (before fees)</span>
              <span className={cn("text-sm font-semibold",
                (form.listingPrice ?? 0) - (form.costBasis ?? 0) >= 0 ? "text-emerald-700" : "text-red-600")}>
                {currency((form.listingPrice ?? 0) - (form.costBasis ?? 0))}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSave(form)}
              disabled={!form.title?.trim()}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {initial?.id ? "Save Changes" : "Add Listing"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "inventory" | "analytics" | "calculator";

export default function SideHustlePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: rawProducts = [] } = useListSideHustleProducts();
  const { data: rawSales = [] } = useListSideHustleSales();
  const createProduct = useCreateSideHustleProduct();
  const updateProductMutation = useUpdateSideHustleProduct();
  const deleteProductMutation = useDeleteSideHustleProduct();
  const markSoldMutation = useMarkProductSold();

  const products: Product[] = (rawProducts as ApiProduct[]).map(toProduct);
  const sales: SaleEntry[] = (rawSales as ApiSale[]).map(toSale);

  const [tab, setTab] = useState<Tab>("inventory");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ItemStatus | "all">("all");
  const [search, setSearch] = useState("");

  // Pricing calculator state
  const [calcCost, setCalcCost] = useState("");
  const [calcDesiredMargin, setCalcDesiredMargin] = useState("40");
  const [calcEtsyFee, setCalcEtsyFee] = useState("6.5");
  const [calcPaypalFee, setCalcPaypalFee] = useState("3.0");
  const [calcShipping, setCalcShipping] = useState("5");

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function addProduct(form: Partial<Product>) {
    createProduct.mutate(
      {
        data: {
          title: form.title ?? "",
          platform: form.platform ?? "etsy",
          status: form.status ?? "active",
          listingPrice: form.listingPrice ?? 0,
          costBasis: form.costBasis ?? 0,
          quantity: form.quantity ?? 1,
          category: form.category ?? null,
          notes: form.notes ?? null,
          listedDate: form.listedDate ?? format(new Date(), "yyyy-MM-dd"),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/business/products"] });
          setShowForm(false);
        },
      }
    );
  }

  function updateProduct(form: Partial<Product>) {
    if (!editProduct) return;
    updateProductMutation.mutate(
      {
        id: editProduct.id,
        data: {
          title: form.title,
          platform: form.platform,
          status: form.status,
          listingPrice: form.listingPrice,
          costBasis: form.costBasis,
          quantity: form.quantity,
          category: form.category ?? null,
          notes: form.notes ?? null,
          listedDate: form.listedDate,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/business/products"] });
          setEditProduct(null);
        },
      }
    );
  }

  function deleteProduct(id: number) {
    deleteProductMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/business/products"] }) }
    );
  }

  function markSold(product: Product) {
    markSoldMutation.mutate(
      {
        id: product.id,
        data: {
          soldPrice: product.listingPrice,
          fees: product.listingPrice * 0.10,
          shippingCost: 5,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/business/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/business/sales"] });
        },
      }
    );
  }

  // ── Analytics ────────────────────────────────────────────────────────────

  const activeListings = products.filter(p => p.status === "active");
  const soldItems = products.filter(p => p.status === "sold");
  const totalInventoryValue = activeListings.reduce((s, p) => s + p.listingPrice * p.quantity, 0);
  const totalCostBasis = products.reduce((s, p) => s + p.costBasis * p.quantity, 0);

  const totalRevenue = sales.reduce((s, e) => s + e.soldPrice, 0);
  const totalFees = sales.reduce((s, e) => s + e.fees, 0);
  const totalCOGS = sales.reduce((s, e) => s + e.costBasis, 0);
  const totalProfit = totalRevenue - totalFees - totalCOGS;

  // ── Pricing Calculator ────────────────────────────────────────────────────

  const cost = parseFloat(calcCost) || 0;
  const etsyFeeRate = parseFloat(calcEtsyFee) / 100;
  const paypalFeeRate = parseFloat(calcPaypalFee) / 100;
  const desiredMarginRate = parseFloat(calcDesiredMargin) / 100;
  const shipping = parseFloat(calcShipping) || 0;

  // Solve: price = cost + shipping + price*etsyFee + price*paypalFee + price*desiredMargin
  // price * (1 - etsyFee - paypalFee - desiredMargin) = cost + shipping
  const denom = 1 - etsyFeeRate - paypalFeeRate - desiredMarginRate;
  const suggestedPrice = denom > 0 ? (cost + shipping) / denom : 0;
  const calcFees = suggestedPrice * (etsyFeeRate + paypalFeeRate);
  const calcProfit = suggestedPrice - cost - shipping - calcFees;
  const actualMargin = suggestedPrice > 0 ? (calcProfit / suggestedPrice) * 100 : 0;

  // ── Filtered products ────────────────────────────────────────────────────

  const filtered = products.filter(p => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary" />
          Side Hustle Hub
        </h1>
        <p className="text-muted-foreground font-serif italic">
          Manage your listings, track sales, and grow your income streams.
        </p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Listings", value: activeListings.length, icon: Tag, color: "text-primary" },
          { label: "Inventory Value", value: currency(totalInventoryValue), icon: Package, color: "text-amber-600" },
          { label: "Total Revenue", value: currency(totalRevenue), icon: DollarSign, color: "text-emerald-600" },
          { label: "Net Profit", value: currency(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? "text-emerald-600" : "text-red-600" },
        ].map(stat => (
          <div key={stat.label} className="journal-page p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className={cn("text-xl font-serif font-semibold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {([
          { key: "inventory", label: "Inventory", icon: Package },
          { key: "analytics", label: "Analytics", icon: BarChart3 },
          { key: "calculator", label: "Pricing Calc", icon: Calculator },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ── */}
      {tab === "inventory" && (
        <section className="space-y-4">
          {/* Filters + Add button */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search listings..."
                className="h-8 w-40 text-sm"
              />
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value as Platform | "all")}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Platforms</option>
                <option value="etsy">Etsy</option>
                <option value="ebay">eBay</option>
                <option value="other">Other</option>
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as ItemStatus | "all")}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="sold">Sold</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-primary text-primary-foreground h-8 text-sm shrink-0">
              <Plus className="w-4 h-4" /> Add Listing
            </Button>
          </div>

          {filtered.length === 0 && products.length === 0 ? (
            <EmptyState onAdd={() => setShowForm(true)} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No listings match your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(product => {
                const grossProfit = product.listingPrice - product.costBasis;
                const margin = product.listingPrice > 0 ? (grossProfit / product.listingPrice) * 100 : 0;
                return (
                  <div
                    key={product.id}
                    className="journal-page p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground text-sm truncate max-w-xs">{product.title}</span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide", platformColors[product.platform])}>
                          {product.platform}
                        </span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide", statusColors[product.status])}>
                          {product.status}
                        </span>
                        {product.category && (
                          <span className="text-[10px] text-muted-foreground">{product.category}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>List: <strong className="text-foreground">{currency(product.listingPrice)}</strong></span>
                        <span>Cost: <strong className="text-foreground">{currency(product.costBasis)}</strong></span>
                        <span className={cn("font-medium", grossProfit >= 0 ? "text-emerald-700" : "text-red-600")}>
                          Margin: {margin.toFixed(0)}% ({currency(grossProfit)})
                        </span>
                        <span>Qty: {product.quantity}</span>
                      </div>
                      {product.notes && (
                        <p className="text-xs text-muted-foreground/70 italic">{product.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {product.status === "active" && (
                        <button
                          onClick={() => markSold(product)}
                          title="Mark as sold"
                          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditProduct(product)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "analytics" && (
        <section className="space-y-6">
          {sales.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-foreground">No sales recorded yet</h3>
              <p className="text-sm text-muted-foreground">
                Mark listings as sold to see your profit analytics here.
              </p>
            </div>
          ) : (
            <>
              {/* Revenue breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="journal-page p-5 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl font-serif font-semibold text-emerald-600">{currency(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{sales.length} sale{sales.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="journal-page p-5 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Fees + COGS</p>
                  <p className="text-3xl font-serif font-semibold text-red-500">{currency(totalFees + totalCOGS)}</p>
                  <p className="text-xs text-muted-foreground">Fees: {currency(totalFees)} · COGS: {currency(totalCOGS)}</p>
                </div>
                <div className="journal-page p-5 space-y-2 border-l-4 border-primary/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit</p>
                  <p className={cn("text-3xl font-serif font-semibold", totalProfit >= 0 ? "text-primary" : "text-red-600")}>
                    {currency(totalProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% profit margin
                  </p>
                </div>
              </div>

              {/* Sales history */}
              <div className="space-y-2">
                <h3 className="font-serif font-semibold text-foreground">Sales History</h3>
                <div className="journal-page divide-y divide-border/40">
                  {sales.map(s => (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.productTitle}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className={cn("font-medium px-1.5 py-0.5 rounded text-[10px]", platformColors[s.platform])}>{s.platform}</span>
                          <span>{s.saleDate}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">{currency(s.soldPrice)}</p>
                        <p className={cn("text-xs font-medium",
                          s.soldPrice - s.fees - s.costBasis >= 0 ? "text-emerald-700" : "text-red-600"
                        )}>
                          net {currency(s.soldPrice - s.fees - s.costBasis)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── PRICING CALCULATOR TAB ── */}
      {tab === "calculator" && (
        <section className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <h3 className="font-serif font-semibold text-lg text-foreground">Pricing Calculator</h3>
            <p className="text-sm text-muted-foreground">
              Enter your costs and desired margin to find the right listing price.
            </p>
          </div>

          <div className="journal-page p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item Cost ($)
                </label>
                <Input type="number" min="0" step="0.01"
                  value={calcCost} onChange={e => setCalcCost(e.target.value)}
                  placeholder="e.g. 4.50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Desired Margin (%)
                </label>
                <Input type="number" min="0" max="95" step="1"
                  value={calcDesiredMargin} onChange={e => setCalcDesiredMargin(e.target.value)}
                  placeholder="40" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform Fee (%)
                </label>
                <Input type="number" min="0" max="25" step="0.1"
                  value={calcEtsyFee} onChange={e => setCalcEtsyFee(e.target.value)}
                  placeholder="6.5" />
                <p className="text-[10px] text-muted-foreground/60">Etsy = 6.5%</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment Fee (%)
                </label>
                <Input type="number" min="0" max="10" step="0.1"
                  value={calcPaypalFee} onChange={e => setCalcPaypalFee(e.target.value)}
                  placeholder="3.0" />
                <p className="text-[10px] text-muted-foreground/60">PayPal = 3%</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Shipping ($)
                </label>
                <Input type="number" min="0" step="0.25"
                  value={calcShipping} onChange={e => setCalcShipping(e.target.value)}
                  placeholder="5.00" />
              </div>
            </div>

            {cost > 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 mt-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Results</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Suggested Listing Price</p>
                    <p className="text-3xl font-serif font-semibold text-foreground mt-1">
                      {suggestedPrice > 0 ? currency(suggestedPrice) : "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-foreground">{currency(suggestedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Platform & Payment Fees</span>
                      <span className="text-red-600">−{currency(calcFees)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Item Cost</span>
                      <span className="text-red-600">−{currency(cost)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-red-600">−{currency(parseFloat(calcShipping) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
                      <span>Net Profit</span>
                      <span className={cn(calcProfit >= 0 ? "text-emerald-700" : "text-red-600")}>
                        {currency(calcProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Actual Margin</span>
                      <span>{actualMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {denom <= 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    Warning: fees + margin exceed 100%. Reduce your desired margin.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* AI Tools link */}
      <div className="journal-page p-5 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-serif font-semibold text-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Need product titles or descriptions?
          </h3>
          <p className="text-sm text-muted-foreground">
            Use the AI Assistant to generate Etsy titles, product descriptions, and social captions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/ai-assistant")}
          className="gap-1.5 shrink-0"
        >
          Open AI <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Forms */}
      {showForm && (
        <ProductForm
          onSave={addProduct}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editProduct && (
        <ProductForm
          initial={editProduct}
          onSave={updateProduct}
          onCancel={() => setEditProduct(null)}
        />
      )}
    </div>
  );
}
