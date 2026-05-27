import { useState, useRef } from "react";
import {
  ImagePlus, Trash2, Edit3, X, Move, Eye, EyeOff,
  Heart, Star, Sparkles, LayoutGrid, Rows, Plus, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useListVisionBoardItems,
  useCreateVisionBoardItem,
  useUpdateVisionBoardItem,
  useDeleteVisionBoardItem,
  type VisionBoardItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisionItem {
  id: number;
  type: "image" | "quote" | "affirmation";
  content: string;
  caption?: string | null;
  category: string;
  color?: string | null;
  pinned: boolean;
  createdAt: string;
}

type Layout = "masonry" | "grid";

const CATEGORIES = [
  "All",
  "Faith",
  "Family",
  "Business",
  "Health",
  "Home",
  "Travel",
  "Purpose",
  "Finance",
];

const QUOTE_COLORS = [
  "from-emerald-700 to-teal-800",
  "from-amber-600 to-yellow-700",
  "from-purple-700 to-indigo-800",
  "from-rose-600 to-pink-700",
  "from-sky-600 to-blue-700",
  "from-stone-600 to-stone-800",
];

const INSPIRATIONAL_QUOTES = [
  { text: "Your latter glory shall be greater than your former.", ref: "Haggai 2:9" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For I know the plans I have for you, plans to prosper you.", ref: "Jeremiah 29:11" },
  { text: "She is clothed with strength and dignity, and she laughs without fear of the future.", ref: "Proverbs 31:25" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", ref: "" },
  { text: "Your best chapter isn't behind you — it's still being written.", ref: "" },
];

// ─── Add Item Modal ───────────────────────────────────────────────────────────

type AddType = "image" | "quote" | "affirmation" | "url";

interface AddItemModalProps {
  onSave: (item: Omit<VisionItem, "id" | "createdAt" | "pinned">) => void;
  onClose: () => void;
}

function AddItemModal({ onSave, onClose }: AddItemModalProps) {
  const [addType, setAddType] = useState<AddType>("url");
  const [imageUrl, setImageUrl] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quoteRef, setQuoteRef] = useState("");
  const [category, setCategory] = useState("Faith");
  const [caption, setCaption] = useState("");
  const [color, setColor] = useState(QUOTE_COLORS[0]);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    setAddType("url");
  }

  function handleSelectQuote(i: number) {
    setSelectedQuote(i);
    setQuoteText(INSPIRATIONAL_QUOTES[i].text);
    setQuoteRef(INSPIRATIONAL_QUOTES[i].ref);
  }

  function handleSave() {
    if (addType === "url" || addType === "image") {
      if (!imageUrl.trim()) return;
      onSave({
        type: "image",
        content: imageUrl.trim(),
        caption: caption || undefined,
        category,
        color: undefined,
      });
    } else if (addType === "quote") {
      if (!quoteText.trim()) return;
      const text = quoteRef ? `"${quoteText}"\n— ${quoteRef}` : `"${quoteText}"`;
      onSave({ type: "quote", content: text, category, color, caption: undefined });
    } else {
      if (!quoteText.trim()) return;
      onSave({ type: "affirmation", content: quoteText, category, color, caption: undefined });
    }
  }

  const canSave = addType === "url" ? imageUrl.trim().length > 0
    : addType === "image" ? imageUrl.trim().length > 0
    : quoteText.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-foreground">Add to Vision Board</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          {/* Type tabs */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            {(["url", "quote", "affirmation"] as const).map(t => (
              <button
                key={t}
                onClick={() => setAddType(t)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                  addType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "url" ? "Image URL" : t}
              </button>
            ))}
          </div>

          {/* Image input */}
          {(addType === "url" || addType === "image") && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Image URL
                </label>
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-border/40" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border/40" />
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">Upload from device</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {imageUrl && (
                <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" onError={() => {}} />
              )}
              <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)" />
            </div>
          )}

          {/* Quote / Affirmation input */}
          {(addType === "quote" || addType === "affirmation") && (
            <div className="space-y-3">
              {addType === "quote" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quick select
                  </p>
                  <div className="space-y-1.5">
                    {INSPIRATIONAL_QUOTES.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectQuote(i)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                          selectedQuote === i
                            ? "bg-primary/10 border border-primary/30 text-foreground"
                            : "border border-border/30 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        "{q.text.slice(0, 60)}{q.text.length > 60 ? "…" : ""}"
                        {q.ref && <span className="text-[10px] ml-1 opacity-60">— {q.ref}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {addType === "quote" ? "Quote text" : "Affirmation"}
                </label>
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  placeholder={addType === "quote" ? "Type your quote..." : "I am strong. I am called. I am enough."}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              {addType === "quote" && (
                <Input value={quoteRef} onChange={e => setQuoteRef(e.target.value)} placeholder="Reference (optional)" />
              )}

              {/* Color picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Card color</p>
                <div className="flex gap-2 flex-wrap">
                  {QUOTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        `w-7 h-7 rounded-full bg-gradient-to-br ${c} transition-all`,
                        color === c ? "ring-2 ring-primary ring-offset-1" : "opacity-60 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.slice(1).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 bg-primary text-primary-foreground"
            >
              Add to Board
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vision Item Card ─────────────────────────────────────────────────────────

function VisionCard({ item, onDelete, onTogglePin }: {
  item: VisionItem;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (item.type === "image") {
    return (
      <div
        className="relative group rounded-2xl overflow-hidden break-inside-avoid mb-3"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {imgError ? (
          <div className="w-full h-40 bg-muted flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Image unavailable</p>
          </div>
        ) : (
          <img
            src={item.content}
            alt={item.caption ?? "Vision board image"}
            className="w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {item.caption && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="text-white text-xs font-medium">{item.caption}</p>
          </div>
        )}
        {hover && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => onTogglePin(item.id)}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                item.pinned ? "bg-primary text-primary-foreground" : "bg-white/90 text-gray-600 hover:bg-white"
              )}
            >
              <Star className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full">{item.category}</span>
        </div>
      </div>
    );
  }

  // Quote or affirmation card
  return (
    <div
      className={cn(
        "relative group rounded-2xl overflow-hidden break-inside-avoid mb-3 p-5 bg-gradient-to-br",
        item.color ?? "from-emerald-700 to-teal-800"
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">{item.category}</span>
          {item.type === "affirmation"
            ? <Sparkles className="w-4 h-4 text-white/60" />
            : <Heart className="w-4 h-4 text-white/60" />}
        </div>
        <p className="font-serif italic text-white leading-relaxed text-sm whitespace-pre-line">
          {item.content}
        </p>
      </div>
      {hover && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => onTogglePin(item.id)}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-all",
              item.pinned ? "bg-white text-amber-500" : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function toVisionItem(raw: VisionBoardItem): VisionItem {
  return {
    id: raw.id!,
    type: (raw.type as VisionItem["type"]) ?? "image",
    content: raw.content ?? "",
    caption: raw.caption,
    category: raw.category ?? "Faith",
    color: raw.color,
    pinned: raw.pinned ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export default function VisionBoardPage() {
  const queryClient = useQueryClient();
  const { data: rawItems = [] } = useListVisionBoardItems();
  const createItem = useCreateVisionBoardItem();
  const updateItem = useUpdateVisionBoardItem();
  const deleteItemMutation = useDeleteVisionBoardItem();

  const items: VisionItem[] = (rawItems as VisionBoardItem[]).map(toVisionItem);

  const [showAdd, setShowAdd] = useState(false);
  const [layout, setLayout] = useState<Layout>("masonry");
  const [activeCategory, setActiveCategory] = useState("All");
  const [pinnedOnly, setPinnedOnly] = useState(false);

  function addItem(data: Omit<VisionItem, "id" | "createdAt" | "pinned">) {
    createItem.mutate(
      {
        data: {
          type: data.type,
          content: data.content,
          caption: data.caption ?? null,
          category: data.category,
          color: data.color ?? null,
          pinned: false,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
          setShowAdd(false);
        },
      }
    );
  }

  function deleteItem(id: number) {
    deleteItemMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] }) }
    );
  }

  function togglePin(id: number) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    updateItem.mutate(
      { id, data: { pinned: !item.pinned } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] }) }
    );
  }

  const filtered = items
    .filter(i => activeCategory === "All" || i.category === activeCategory)
    .filter(i => !pinnedOnly || i.pinned)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  const categoryCounts: Record<string, number> = { All: items.length };
  items.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] ?? 0) + 1;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">
            Vision Board
          </h1>
          <p className="text-muted-foreground font-serif italic">
            See the life you're building. Believe it before you see it.
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="gap-2 bg-primary text-primary-foreground shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {cat} {categoryCounts[cat] ? <span className="opacity-60">({categoryCounts[cat]})</span> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPinnedOnly(!pinnedOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              pinnedOnly ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            <Star className="w-3 h-3" /> Pinned
          </button>
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setLayout("masonry")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                layout === "masonry" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                layout === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Rows className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            <Eye className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif font-semibold text-xl text-foreground">Your vision board is empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Add images, scriptures, quotes, and affirmations that represent the life you're
              building. See it. Believe it. Live it.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Add Your First Item
          </Button>

          {/* Inspiration prompts */}
          <div className="max-w-md mx-auto grid grid-cols-2 gap-2 mt-4">
            {[
              "Your dream home",
              "Places you want to travel",
              "Your thriving business",
              "Who you're becoming",
            ].map(prompt => (
              <div
                key={prompt}
                className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground text-left"
              >
                {prompt}
              </div>
            ))}
          </div>
        </div>
      ) : layout === "masonry" ? (
        <div className="columns-2 md:columns-3 gap-3">
          {filtered.map(item => (
            <VisionCard
              key={item.id}
              item={item}
              onDelete={deleteItem}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(item => (
            <VisionCard
              key={item.id}
              item={item}
              onDelete={deleteItem}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && <AddItemModal onSave={addItem} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
