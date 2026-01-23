import { NavLink } from "@/components/NavLink";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Combine,
  Columns2,
  Layers,
  Scissors,
  Bookmark,
  SplitSquareHorizontal,
  Ruler,
  Type,
  PenLine,
  FileText,
  Trash2,
  Minimize2,
  ScanLine,
  ShieldCheck,
  KeyRound,
  Stamp,
  Layers3,
} from "lucide-react";

function WaveDivider() {
  return (
    <div aria-hidden className="relative w-full overflow-hidden">
      <svg
        viewBox="0 0 1440 140"
        className="block h-[140px] w-[1600px] max-w-none"
        preserveAspectRatio="none"
      >
        <path
          d="M0,96L80,85.3C160,75,320,53,480,48C640,43,800,53,960,69.3C1120,85,1280,107,1360,117.3L1440,128L1440,140L1360,140C1280,140,1120,140,960,140C800,140,640,140,480,140C320,140,160,140,80,140L0,140Z"
          className="fill-muted"
        />
        <path
          d="M0,72L80,66.7C160,61,320,51,480,58.7C640,67,800,93,960,98.7C1120,104,1280,88,1360,80L1440,72L1440,140L1360,140C1280,140,1120,140,960,140C800,140,640,140,480,140C320,140,160,140,80,140L0,140Z"
          className="fill-accent"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}

function Dots({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "radial-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
        maskImage:
          "radial-gradient(circle at center, rgba(0,0,0,1), rgba(0,0,0,0.2), rgba(0,0,0,0))",
      }}
    />
  );
}

const Index = () => {
  const toolGroups = [
    {
      label: "MERGE",
      items: [
        {
          title: "Alternate & Mix",
          desc: "Mix pages from 2 or more documents, alternating between them.",
          icon: Columns2,
          to: "/alternate-mix",
        },
        {
          title: "Merge",
          desc: "Combine multiple PDFs and images into one.",
          icon: Combine,
          to: "/merge",
        },
        {
          title: "Organize",
          desc: "Arrange and reorder PDF pages.",
          icon: Layers,
          to: "/organize",
        },
      ],
    },
    {
      label: "SPLIT",
      items: [
        {
          title: "Extract Pages",
          desc: "Create a new document containing only the pages you need.",
          icon: Scissors,
          to: "/editor",
        },
        {
          title: "Split by Pages",
          desc: "Split specific page ranges or extract every page into separate PDFs.",
          icon: SplitSquareHorizontal,
          to: "/editor",
        },
        {
          title: "Split by Bookmarks",
          desc: "Split into documents using the PDF's table of contents.",
          icon: Bookmark,
          to: "/editor",
        },
        {
          title: "Split by Size",
          desc: "Get multiple smaller documents with specific file sizes.",
          icon: Ruler,
          to: "/editor",
        },
      ],
    },
    {
      label: "EDIT & SIGN",
      items: [
        {
          title: "PDF Editor",
          desc: "Edit existing text, replace words, and export.",
          icon: Type,
          to: "/editor",
        },
        {
          title: "Fill & Sign",
          desc: "Add signatures and fill PDF forms.",
          icon: PenLine,
          to: "/editor",
        },
        {
          title: "Create Forms",
          desc: "Make PDFs fillable (coming soon).",
          icon: FileText,
          to: "/editor",
        },
        {
          title: "Delete Pages",
          desc: "Remove pages from a PDF (coming soon).",
          icon: Trash2,
          to: "/editor",
        },
      ],
    },
    {
      label: "COMPRESS & SCANS",
      items: [
        {
          title: "Compress",
          desc: "Reduce the size of your PDF (coming soon).",
          icon: Minimize2,
          to: "/compress",
        },
        {
          title: "Deskew",
          desc: "Automatically straighten scanned pages (coming soon).",
          icon: ScanLine,
          to: "/editor",
        },
        {
          title: "OCR",
          desc: "Convert scans into searchable text (coming soon).",
          icon: Layers3,
          to: "/editor",
        },
      ],
    },
    {
      label: "SECURITY",
      items: [
        {
          title: "Protect",
          desc: "Password-protect a PDF (coming soon).",
          icon: ShieldCheck,
          to: "/editor",
        },
        {
          title: "Unlock",
          desc: "Remove password protection (coming soon).",
          icon: KeyRound,
          to: "/editor",
        },
        {
          title: "Watermark",
          desc: "Add a watermark (coming soon).",
          icon: Stamp,
          to: "/editor",
        },
      ],
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav variant="home" />

      <main>
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-[1200px] px-4 py-16 md:py-24">
            <Dots className="-z-10" />

            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                We help with your PDF tasks
              </h1>
              <p className="mt-4 text-pretty text-lg text-muted-foreground md:text-xl">
                Easy, pleasant and productive PDF editor.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="px-8">
                  <NavLink to="/editor" activeClassName="">
                    Edit a PDF document — it’s free
                  </NavLink>
                </Button>
                <Button asChild size="lg" variant="secondary" className="px-8">
                  <NavLink to="#tools" activeClassName="">
                    Browse tools
                  </NavLink>
                </Button>
              </div>
            </div>
          </div>

          <WaveDivider />
        </section>

        <section id="popular" className="bg-muted/40">
          <div className="mx-auto max-w-[1200px] px-4 py-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              Most popular
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[{
                title: "PDF Editor",
                desc: "Edit PDF files for free. Replace text and export.",
                to: "/editor",
              },
              {
                title: "Compress",
                desc: "Reduce the size of your PDF (coming soon).",
                to: "/editor",
              },
              {
                title: "Delete Pages",
                desc: "Remove pages from a document (coming soon).",
                to: "/editor",
              }].map((c) => (
                <Card key={c.title} className="p-5">
                  <div className="text-base font-semibold">{c.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                  <Button asChild className="mt-4" variant="secondary">
                    <NavLink to={c.to} activeClassName="">
                      Open
                    </NavLink>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tools grid (Sejda-style) */}
        <section id="tools" className="bg-muted/40">
          <div className="mx-auto max-w-[1200px] px-4 pb-14 pt-2">
            {toolGroups.map((group) => (
              <div key={group.label} className="mt-10">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {group.label}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Card key={`${group.label}-${t.title}`} className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-tight">
                              {t.title}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t.desc}
                            </p>
                          </div>
                        </div>

                        <Button asChild className="mt-4" variant="secondary">
                          <NavLink to={t.to} activeClassName="">
                            Open
                          </NavLink>
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
