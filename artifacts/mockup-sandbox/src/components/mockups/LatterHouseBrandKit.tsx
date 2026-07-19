import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toaster, toast } from "sonner";
import { Check, X, Copy, ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Brand data
// ---------------------------------------------------------------------------

const SPARKLY_GOLD =
  "linear-gradient(135deg, #AA7C11 0%, #FCEABB 50%, #D4AF37 100%)";
const FOIL_SHIMMER =
  "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)";

const IMAGES = {
  sage: "https://images.unsplash.com/photo-1606841610375-7cd2adbadded?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHw0fHxzYWdlJTIwZm9saWFnZSUyMHNvZnQlMjBsaWdodHxlbnwwfHx8fDE3ODQwMzUyNjh8MA&ixlib=rb-4.1.0&q=85",
  goldLeaf: "https://images.unsplash.com/photo-1545873509-33e944ca7655?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxnb2xkJTIwbGVhZiUyMHRleHR1cmV8ZW58MHx8fHwxNzg0MDM1MjY4fDA&ixlib=rb-4.1.0&q=85",
  doorway: "https://images.unsplash.com/photo-1591091421779-f5ffb333c27c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwyfHxvcGVuJTIwZG9vcndheSUyMHNvZnQlMjBsaWdodHxlbnwwfHx8fDE3ODQwMzUyNjh8MA&ixlib=rb-4.1.0&q=85",
  hands: "https://images.unsplash.com/photo-1454875392665-2ac2c85e8d3e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxvbGRlciUyMGhhbmRzfGVufDB8fHx8MTc4NDAzNTI2OHww&ixlib=rb-4.1.0&q=85",
};

const COLORS: Array<{ name: string; hex: string; note: string }> = [
  { name: "Cold Night", hex: "#0B171B", note: "Primary ink · deep, near-black teal" },
  { name: "Cream", hex: "#FAF9F6", note: "Primary page — paper-warm white" },
  { name: "Sage", hex: "#8DA399", note: "Grounding accent — living, quiet" },
  { name: "Champagne", hex: "#F2EAD3", note: "Soft surface — warm parchment" },
  { name: "Mint", hex: "#C4D9D2", note: "Cool accent — gentle affirmation" },
  { name: "Gold Base", hex: "#D4AF37", note: "Signature metallic — honor & glory" },
  { name: "Gold Dark", hex: "#AA7C11", note: "Gradient anchor — depth" },
  { name: "Gold Light", hex: "#FCEABB", note: "Gradient highlight — light" },
];

const HIERARCHY: Array<{
  label: string;
  classes: string;
  sample: string;
}> = [
  {
    label: "H1 — Display",
    classes:
      "font-heading text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-none",
    sample: "Latter House Life",
  },
  {
    label: "H2 — Section",
    classes:
      "font-heading text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight",
    sample: "The Colophon",
  },
  {
    label: "H3 — Eyebrow",
    classes:
      "font-body text-sm sm:text-base uppercase tracking-[0.2em] font-semibold text-sage",
    sample: "Brand Kit · Section Label",
  },
  {
    label: "Body",
    classes:
      "font-body text-base sm:text-lg leading-relaxed font-light text-cold-night/80",
    sample:
      "A quiet, dignified voice for scripture-anchored daily practice — never rushed, never cartoonish.",
  },
  {
    label: "Caption",
    classes: "font-body text-sm tracking-wide text-cold-night/60",
    sample: "Haggai 2:9 · The glory of this latter house",
  },
];

const VOICE_ROWS: Array<{ topic: string; doText: string; dontText: string }> = [
  {
    topic: "Warmth & Register",
    doText:
      "Speak with the warm dignity of a trusted pastor and a fine publishing house at once.",
    dontText:
      "Slip into casual slang or cutesy phrasing that undercuts the sacred tone.",
  },
  {
    topic: "Address",
    doText:
      "Invite gently, second person: “Begin your day anchored in the Word.”",
    dontText:
      "Command or guilt the reader: “You MUST finish your devotional now!”",
  },
  {
    topic: "Vocabulary",
    doText:
      "Choose precise, elegant words befitting scripture and a well-bound journal.",
    dontText: "Reach for emoji, exclamation points, or internet shorthand.",
  },
  {
    topic: "Pacing",
    doText:
      "Let sentences breathe — short, confident, unhurried, like a page you want to linger on.",
    dontText:
      "Stack qualifiers and hedges, or rush the reader through dense paragraphs.",
  },
];

const INSPIRATION_COPY = [
  {
    kicker: "Haggai 2:9",
    title: "“The glory of this latter house shall be greater than the former.”",
    body: "The brand's anchor scripture is a promise of renewal — that what comes after can exceed what came before. Every surface of Latter House Life should feel like that promise: unhurried, dignified, and quietly confident that today's page is greater than yesterday's.",
  },
  {
    kicker: "Renewing the Mind",
    title: "Scripture meets neuroscience.",
    body: "Romans 12:2 calls believers to be transformed by the renewing of the mind — a process modern neuroscience recognizes in the slow rewiring of habit through consistent, daily repetition. The planner exists at that intersection: a devotional practice built with the same patience the brain requires to change.",
  },
];

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}`;
}

async function copyToClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`, { description: text });
  } catch {
    toast.error("Couldn't copy to clipboard", {
      description: "Please copy the value manually.",
    });
  }
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
      style={{ transitionDuration: "900ms", transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-body text-sm sm:text-base uppercase tracking-[0.2em] font-semibold text-sage">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Logo mark — line-art doorway + olive branch colophon
// ---------------------------------------------------------------------------

function LogoMark({
  className,
  gradientId,
}: {
  className?: string;
  gradientId: string;
}) {
  const leaves: Array<{ cx: number; cy: number; rx: number; ry: number; rot: number }> = [
    { cx: 148, cy: 168, rx: 9, ry: 4, rot: -38 },
    { cx: 141, cy: 146, rx: 8.5, ry: 3.8, rot: 32 },
    { cx: 134, cy: 122, rx: 8, ry: 3.6, rot: -30 },
    { cx: 128, cy: 98, rx: 7, ry: 3.2, rot: 28 },
    { cx: 124, cy: 78, rx: 5.5, ry: 2.6, rot: -22 },
  ];

  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label="Latter House Life colophon: an open doorway with an olive branch"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AA7C11" />
          <stop offset="50%" stopColor="#FCEABB" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>

      {/* threshold line */}
      <line
        x1="52"
        y1="193"
        x2="188"
        y2="193"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* open doorway arch */}
      <path
        d="M70 191 L70 108 C70 74 92 54 120 54 C148 54 170 74 170 108 L170 191"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
      />

      {/* keystone accent */}
      <rect
        x="115.5"
        y="49.5"
        width="9"
        height="9"
        transform="rotate(45 120 54)"
        fill={`url(#${gradientId})`}
      />

      {/* olive branch */}
      <path
        d="M152 187 C142 152 132 112 123 76"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {leaves.map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}
          fill={`url(#${gradientId})`}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Color swatch
// ---------------------------------------------------------------------------

function ColorSwatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  const slug = slugify(name);
  return (
    <button
      type="button"
      data-testid={`copy-hex-${slug}`}
      onClick={() => copyToClipboard(hex, name)}
      className="group text-left border border-cold-night/10 bg-white shadow-[0_2px_10px_rgb(11,23,27,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(11,23,27,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-base/60"
    >
      <div
        className="h-28 sm:h-36 w-full relative border-b border-cold-night/10"
        style={{ backgroundColor: hex }}
      >
        <span className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 rounded-full bg-cold-night/80 px-3 py-1 font-body text-[10px] uppercase tracking-[0.15em] text-cream">
            <Copy className="h-3 w-3" aria-hidden />
            Tap to copy
          </span>
        </span>
      </div>
      <div className="p-5">
        <p className="font-body text-sm uppercase tracking-[0.15em] font-semibold text-cold-night">
          {name}
        </p>
        <p className="font-body text-sm text-cold-night/60 mt-1">{hex.toUpperCase()}</p>
        <p className="font-body text-xs text-cold-night/40">RGB {hexToRgb(hex)}</p>
        <p className="font-body text-xs text-cold-night/40 mt-2 leading-relaxed">{note}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Class recipe chip (typography documentation, copyable)
// ---------------------------------------------------------------------------

function ClassRecipe({ label, classes }: { label: string; classes: string }) {
  return (
    <button
      type="button"
      data-testid={`copy-class-${slugify(label)}`}
      onClick={() => copyToClipboard(classes, `${label} classes`)}
      className="group flex w-full items-start gap-3 border border-cold-night/10 bg-champagne/40 px-4 py-3 text-left transition-colors hover:bg-champagne/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-base/60"
    >
      <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" aria-hidden />
      <code className="font-body text-xs leading-relaxed text-cold-night/70 break-all">
        {classes}
      </code>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Do / Don't row
// ---------------------------------------------------------------------------

function DoDontRow({ topic, doText, dontText }: { topic: string; doText: string; dontText: string }) {
  return (
    <div className="border border-cold-night/10 bg-white shadow-[0_2px_10px_rgb(11,23,27,0.04)]">
      <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/50 px-6 sm:px-8 pt-6">
        {topic}
      </p>
      <div className="grid sm:grid-cols-2">
        <div className="flex gap-3 p-6 sm:p-8 bg-mint/25">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-cream">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="font-body text-base font-light leading-relaxed text-cold-night/80">
            {doText}
          </p>
        </div>
        <div className="flex gap-3 p-6 sm:p-8 bg-cold-night/[0.035] sm:border-l border-cold-night/10">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cold-night/15 text-cold-night/60">
            <X className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="font-body text-base font-light leading-relaxed text-cold-night/60">
            {dontText}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "palette", label: "Palette" },
  { id: "typography", label: "Type" },
  { id: "logo", label: "Logomark" },
  { id: "voice", label: "Voice & Tone" },
  { id: "inspiration", label: "Inspiration" },
];

function Header({ onShare }: { onShare: () => void }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-cream/85 border-b border-cold-night/10">
      <div className="flex h-[68px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        <a
          href="#overview"
          data-testid="nav-link-overview"
          className="flex shrink-0 items-center gap-2.5"
        >
          <LogoMark className="h-8 w-8" gradientId="lh-gradient-header" />
          <span className="font-heading text-lg tracking-wide text-cold-night">
            Latter House Life
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7 no-scrollbar overflow-x-auto">
          {NAV_ITEMS.slice(1).map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              data-testid={`nav-link-${item.id}`}
              className="whitespace-nowrap font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/70 transition-colors hover:text-sage"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          data-testid="button-nav-share"
          onClick={onShare}
          className="shrink-0 border border-gold-base/40 px-4 sm:px-5 py-2.5 font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night transition-colors hover:bg-gold-base/10"
        >
          Share Kit
        </button>
      </div>

      <div className="md:hidden no-scrollbar flex items-center gap-6 overflow-x-auto border-t border-cold-night/5 px-6 py-2.5">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-testid={`nav-link-mobile-${item.id}`}
            className="whitespace-nowrap font-body text-[11px] uppercase tracking-[0.18em] font-semibold text-cold-night/60"
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section
      id="overview"
      className="relative isolate flex min-h-screen scroll-mt-[68px] items-end overflow-hidden"
    >
      <img
        src={IMAGES.sage}
        alt="Sage foliage in soft natural light"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cold-night/85 via-cold-night/35 to-cold-night/50" />

      <div className="lh-hero-anim relative z-10 w-full px-6 sm:px-12 lg:px-20 pb-20 pt-40 sm:pb-24 lg:max-w-3xl lg:pb-28">
        <LogoMark className="mb-8 h-14 w-14" gradientId="lh-gradient-hero" />

        <p className="font-body text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-gold-light">
          Brand Kit · Est. Haggai 2:9
        </p>

        <h1 className="font-heading mt-4 text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-none">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: SPARKLY_GOLD }}
          >
            Latter House Life
          </span>
        </h1>

        <p className="font-heading mt-6 max-w-xl text-xl italic font-light leading-relaxed text-cream/90">
          “The glory of this latter house shall be greater than the former.”
        </p>

        <p className="font-body mt-4 max-w-xl text-base sm:text-lg font-light leading-relaxed text-cream/70">
          A faith-based digital life planner, designed with the quiet
          confidence of a well-bound book — elegant, mature, and unmistakably
          sacred.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#palette"
            data-testid="button-hero-explore-palette"
            className="inline-flex items-center gap-2 px-7 py-3.5 font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night transition-transform hover:-translate-y-0.5"
            style={{ backgroundImage: SPARKLY_GOLD }}
          >
            Explore the Palette
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
          <a
            href="#voice"
            data-testid="button-hero-voice-tone"
            className="inline-flex items-center gap-2 border border-cream/40 px-7 py-3.5 font-body text-xs uppercase tracking-[0.2em] font-semibold text-cream transition-colors hover:bg-cream/10"
          >
            Read Voice &amp; Tone
          </a>
        </div>
      </div>

      <a
        href="#palette"
        data-testid="link-scroll-cue"
        aria-label="Scroll to explore the brand kit"
        className="lh-scroll-cue absolute bottom-8 right-6 z-10 hidden sm:flex flex-col items-center gap-2 text-cream/70 lg:right-16"
      >
        <span className="font-body text-[10px] uppercase tracking-[0.25em]">Scroll</span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </a>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function PaletteSection() {
  return (
    <section id="palette" className="scroll-mt-[68px] bg-cream px-6 py-24 sm:px-12 sm:py-32 lg:px-20">
      <Reveal>
        <Eyebrow>The Palette</Eyebrow>
        <h2 className="font-heading mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-cold-night">
          Color Palette
        </h2>
        <p className="font-body mt-5 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-cold-night/80">
          Eight tones, one temperament: a near-black night, a warm paper
          cream, and a family of sage, champagne, mint, and gold that never
          shouts. Tap any swatch to copy its hex code.
        </p>
      </Reveal>

      <Reveal
        delay={120}
        className="mt-14 grid grid-cols-2 gap-4 sm:mt-16 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
      >
        {COLORS.map((color) => (
          <ColorSwatch key={color.name} {...color} />
        ))}
      </Reveal>

      <Reveal delay={200} className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2">
        {[
          { name: "Sparkly Gold", css: SPARKLY_GOLD },
          { name: "Foil Shimmer", css: FOIL_SHIMMER },
        ].map((gradient) => (
          <button
            key={gradient.name}
            type="button"
            data-testid={`copy-gradient-${slugify(gradient.name)}`}
            onClick={() => copyToClipboard(gradient.css, gradient.name)}
            className="group text-left border border-cold-night/10 bg-white shadow-[0_2px_10px_rgb(11,23,27,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(11,23,27,0.06)]"
          >
            <div className="h-20 w-full" style={{ backgroundImage: gradient.css }} />
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-body text-sm uppercase tracking-[0.15em] font-semibold text-cold-night">
                  {gradient.name}
                </p>
                <p className="font-body text-xs text-cold-night/40 mt-1">Tap to copy CSS</p>
              </div>
              <Copy className="h-4 w-4 text-sage opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
          </button>
        ))}
      </Reveal>
    </section>
  );
}

function TypographySection() {
  return (
    <section
      id="typography"
      className="scroll-mt-[68px] bg-champagne/30 px-6 py-24 sm:px-12 sm:py-32 lg:px-20"
    >
      <Reveal>
        <Eyebrow>Typography</Eyebrow>
        <h2 className="font-heading mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-cold-night">
          The Type System
        </h2>
        <p className="font-body mt-5 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-cold-night/80">
          Cormorant Garamond carries the voice of the book; Manrope carries
          the voice of the interface. Together they read as one calm,
          literary system.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal delay={100} className="border-b border-cold-night/10 pb-12 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-16">
          <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-sage">
            Display &amp; Headings
          </p>
          <p className="font-heading mt-4 overflow-hidden text-[5.5rem] leading-none font-light text-cold-night sm:text-[7rem]">
            Aa
          </p>
          <p className="font-heading mt-4 text-xl font-light text-cold-night/80 sm:text-2xl">
            A B C D E F G a b c d e f g
          </p>
          <p className="font-heading mt-2 text-xl font-light text-cold-night/60 sm:text-2xl">
            0 1 2 3 4 5 6 7 8 9
          </p>
          <p className="font-body mt-4 text-sm text-cold-night/50">
            Cormorant Garamond · Light, Regular, Medium, Semibold, Bold, Italic
          </p>
        </Reveal>

        <Reveal delay={200} className="lg:pl-4">
          <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-sage">
            Interface &amp; Body
          </p>
          <p className="font-body mt-4 overflow-hidden text-[5.5rem] leading-none font-light text-cold-night sm:text-[7rem]">
            Aa
          </p>
          <p className="font-body mt-4 text-xl font-light text-cold-night/80 sm:text-2xl">
            A B C D E F G a b c d e f g
          </p>
          <p className="font-body mt-2 text-xl font-light text-cold-night/60 sm:text-2xl">
            0 1 2 3 4 5 6 7 8 9
          </p>
          <p className="font-body mt-4 text-sm text-cold-night/50">
            Manrope · Light, Regular, Medium, Semibold
          </p>
        </Reveal>
      </div>

      <Reveal delay={280} className="mt-20 space-y-8">
        <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/50">
          Hierarchy
        </p>
        {HIERARCHY.map((item) => (
          <div
            key={item.label}
            className="grid gap-4 border-t border-cold-night/10 pt-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center sm:gap-10"
          >
            <div>
              <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/40 mb-3">
                {item.label}
              </p>
              <p className={item.classes}>{item.sample}</p>
            </div>
            <ClassRecipe label={item.label} classes={item.classes} />
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function LogoSection() {
  return (
    <section id="logo" className="scroll-mt-[68px] bg-cream px-6 py-24 sm:px-12 sm:py-32 lg:px-20">
      <Reveal>
        <Eyebrow>Logomark</Eyebrow>
        <h2 className="font-heading mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-cold-night">
          The Colophon
        </h2>
        <p className="font-body mt-5 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-cold-night/80">
          An open doorway carries an olive branch upward — the household of
          Haggai 2:9, entered anew each day, growing quietly toward the
          light. Rendered only in fine gold-gradient line work; never filled,
          never cartoonish.
        </p>
      </Reveal>

      <Reveal delay={120} className="mt-16 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center gap-6 border border-cold-night/10 bg-white p-12 shadow-[0_2px_10px_rgb(11,23,27,0.04)]">
          <LogoMark className="h-28 w-28" gradientId="lh-gradient-logo-1" />
          <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/50">
            Primary Mark
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 border border-cold-night/10 bg-cold-night p-12">
          <LogoMark className="h-28 w-28" gradientId="lh-gradient-logo-2" />
          <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cream/60">
            On Cold Night
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-5 border border-cold-night/10 bg-champagne/40 p-12">
          <LogoMark className="h-16 w-16" gradientId="lh-gradient-logo-3" />
          <p className="font-heading text-2xl font-light tracking-[0.15em] text-cold-night">
            Latter House Life
          </p>
          <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-cold-night/50">
            Full Lockup
          </p>
        </div>
      </Reveal>

      <Reveal delay={220} className="mt-14">
        <DoDontRow
          topic="Mark Usage"
          doText="Give the mark generous clear space — at minimum the width of the doorway arch on every side — and let it breathe on cream, champagne, or cold-night."
          dontText="Stretch, recolor outside the gold gradient family, add a drop shadow, or crowd the mark with competing elements."
        />
      </Reveal>
    </section>
  );
}

function VoiceSection() {
  return (
    <section id="voice" className="scroll-mt-[68px] bg-champagne/30 px-6 py-24 sm:px-12 sm:py-32 lg:px-20">
      <Reveal>
        <Eyebrow>Voice &amp; Tone</Eyebrow>
        <h2 className="font-heading mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-cold-night">
          How We Speak
        </h2>
        <p className="font-body mt-5 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-cold-night/80">
          Every line of copy should sound like it was written for a reader
          who deserves reverence, not a user who needs converting.
        </p>
      </Reveal>

      <div className="mt-14 space-y-6">
        {VOICE_ROWS.map((row, i) => (
          <Reveal key={row.topic} delay={i * 90}>
            <DoDontRow topic={row.topic} doText={row.doText} dontText={row.dontText} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function InspirationSection() {
  return (
    <section id="inspiration" className="scroll-mt-[68px] bg-cream px-6 py-24 sm:px-12 sm:py-32 lg:px-20">
      <Reveal>
        <Eyebrow>Inspiration</Eyebrow>
        <h2 className="font-heading mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-cold-night">
          Scripture &amp; the Renewed Mind
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
        {INSPIRATION_COPY.map((block, i) => (
          <Reveal key={block.kicker} delay={i * 100}>
            <p className="font-body text-xs uppercase tracking-[0.2em] font-semibold text-sage">
              {block.kicker}
            </p>
            <p className="font-heading mt-4 text-2xl font-light italic leading-snug text-cold-night sm:text-3xl">
              {block.title}
            </p>
            <p className="font-body mt-4 text-base font-light leading-relaxed text-cold-night/80">
              {block.body}
            </p>
          </Reveal>
        ))}
      </div>

      <Reveal
        delay={160}
        className="mt-16 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-6 lg:grid-rows-2"
      >
        <figure className="col-span-2 row-span-2 overflow-hidden border border-cold-night/10 lg:col-span-3">
          <img
            src={IMAGES.doorway}
            alt="Green plants beside a brown wooden door in soft light"
            className="h-full max-h-[26rem] w-full object-cover lg:max-h-none"
          />
          <figcaption className="font-body p-4 text-xs uppercase tracking-[0.15em] text-cold-night/50">
            The Open Doorway
          </figcaption>
        </figure>
        <figure className="col-span-2 overflow-hidden border border-cold-night/10 lg:col-span-3">
          <img
            src={IMAGES.hands}
            alt="Older hands in shallow focus, grounding and human"
            className="h-48 w-full object-cover sm:h-56"
          />
          <figcaption className="font-body p-4 text-xs uppercase tracking-[0.15em] text-cold-night/50">
            A Mature, Grounded Audience
          </figcaption>
        </figure>
        <figure className="overflow-hidden border border-cold-night/10 lg:col-span-2">
          <img
            src={IMAGES.goldLeaf}
            alt="Gold metallic foil texture"
            className="h-32 w-full object-cover sm:h-40"
          />
          <figcaption className="font-body p-4 text-xs uppercase tracking-[0.15em] text-cold-night/50">
            Gold, Used Sparingly
          </figcaption>
        </figure>
        <figure className="overflow-hidden border border-cold-night/10 lg:col-span-1">
          <img
            src={IMAGES.sage}
            alt="Sage foliage texture accent"
            className="h-32 w-full object-cover sm:h-40"
          />
        </figure>
      </Reveal>
    </section>
  );
}

function ShareSection({ onShare }: { onShare: () => void }) {
  return (
    <section
      id="share"
      className="relative isolate overflow-hidden bg-cold-night px-6 py-24 text-center text-cream sm:px-12 sm:py-32 lg:px-20"
    >
      <div
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: SPARKLY_GOLD }}
        aria-hidden
      />
      <Reveal className="relative mx-auto flex max-w-2xl flex-col items-center">
        <LogoMark className="h-14 w-14" gradientId="lh-gradient-share" />
        <h2 className="font-heading mt-8 text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight">
          Carry the Kit Forward
        </h2>
        <p className="font-body mt-5 text-base sm:text-lg font-light leading-relaxed text-cream/70">
          Share this brand kit with anyone building a page, a slide, or a
          feature for Latter House Life — so the glory of the latter house
          stays consistent, wherever it appears.
        </p>
        <button
          type="button"
          data-testid="button-share-kit"
          onClick={onShare}
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 font-body text-xs uppercase tracking-[0.25em] font-semibold text-cold-night transition-transform hover:-translate-y-0.5"
          style={{ backgroundImage: SPARKLY_GOLD }}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy Brand Kit Link
        </button>
        <p className="font-body mt-10 text-xs uppercase tracking-[0.25em] text-cream/40">
          Latter House Life Planner · Haggai 2:9
        </p>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Grain overlay
// ---------------------------------------------------------------------------

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] opacity-[0.035] mix-blend-overlay"
    >
      <svg className="h-full w-full">
        <filter id="lh-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lh-grain)" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

const BRAND_STYLES = `
  html { scroll-behavior: smooth; }
  .font-heading { font-family: "Cormorant Garamond", serif; }
  .font-body { font-family: "Manrope", sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  @keyframes lh-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lh-hero-anim > * { animation: lh-fade-up 1.1s ease-out both; }
  .lh-hero-anim > *:nth-child(1) { animation-delay: 0.05s; }
  .lh-hero-anim > *:nth-child(2) { animation-delay: 0.2s; }
  .lh-hero-anim > *:nth-child(3) { animation-delay: 0.35s; }
  .lh-hero-anim > *:nth-child(4) { animation-delay: 0.5s; }
  .lh-hero-anim > *:nth-child(5) { animation-delay: 0.65s; }
  .lh-hero-anim > *:nth-child(6) { animation-delay: 0.8s; }
  @keyframes lh-bounce-soft {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }
  .lh-scroll-cue { animation: lh-bounce-soft 2.4s ease-in-out infinite; }
`;

export default function LatterHouseBrandKit() {
  const handleShare = () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    void copyToClipboard(url, "Brand kit link");
  };

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-cream text-cold-night">
      <style>{BRAND_STYLES}</style>
      <GrainOverlay />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#FAF9F6",
            color: "#0B171B",
            border: "1px solid rgba(212,175,55,0.35)",
            fontFamily: "'Manrope', sans-serif",
            borderRadius: "2px",
          },
        }}
      />

      <Header onShare={handleShare} />

      <main>
        <Hero />
        <PaletteSection />
        <TypographySection />
        <LogoSection />
        <VoiceSection />
        <InspirationSection />
      </main>

      <ShareSection onShare={handleShare} />
    </div>
  );
}
