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
          to: "/extract",
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
          to: "/fill-sign",
        },
        {
          title: "Create Forms",
          desc: "Make PDFs fillable by adding text fields and checkboxes.",
          icon: FileText,
          to: "/create-forms",
        },
        {
          title: "Delete Pages",
          desc: "Remove pages from a PDF.",
          icon: Trash2,
          to: "/delete-pages",
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
          desc: "Extract text from scanned PDFs or images.",
          icon: Layers3,
          to: "/ocr",
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
          to: "/protect",
        },
        {
          title: "Unlock",
          desc: "Remove password protection (coming soon).",
          icon: KeyRound,
          to: "/unlock",
        },
        {
          title: "Watermark",
          desc: "Add a watermark to all pages.",
          icon: Stamp,
          to: "/watermark",
        },
      ],
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav variant="home" />

      <main>
        <section className="relative overflow-hidden">
          <div className="container mx-auto max-w-6xl px-4 py-32 md:py-48">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-balance text-5xl font-extrabold tracking-tight md:text-7xl">
                We help with your PDF tasks
              </h1>
              <p className="mt-6 text-pretty text-lg text-muted-foreground md:text-xl">
                Easy, pleasant and productive PDF editor.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="px-8 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
                  <NavLink to="/editor" activeClassName="">
                    Edit a PDF document — it’s free
                  </NavLink>
                </Button>
                <Button asChild size="lg" variant="secondary" className="px-8 shadow-sm hover:shadow-md transition-shadow">
                  <NavLink to="/browse-tools" activeClassName="">
                    Browse tools
                  </NavLink>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="popular" className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-sm font-semibold uppercase tracking-wider text-primary">
              Most popular
            </div>

            <div className="mt-6 grid gap-8 md:grid-cols-3">
              {[{
                title: "PDF Editor",
                desc: "Edit PDF files for free. Replace text and export.",
                to: "/editor",
              },
              {
                title: "Compress",
                desc: "Reduce the size of your PDF.",
                to: "/compress",
              },
              {
                title: "Delete Pages",
                desc: "Remove pages from a document.",
                to: "/delete-pages",
              }].map((c) => (
                <Card key={c.title} className="glass p-6 rounded-2xl transform hover:-translate-y-2 transition-transform">
                  <div className="text-lg font-semibold">{c.title}</div>
                  <p className="mt-2 text-muted-foreground">{c.desc}</p>
                  <Button asChild className="mt-6" variant="secondary">
                    <NavLink to={c.to} activeClassName="">
                      Open
                    </NavLink>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tools grid */}
        <section id="tools" className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            {toolGroups.map((group) => (
              <div key={group.label} className="mt-16 first:mt-0">
                <div className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {group.label}
                </div>

                <div className="mt-6 grid gap-8 md:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Card key={`${group.label}-${t.title}`} className="glass p-6 rounded-2xl transform hover:-translate-y-2 transition-transform">
                        <div className="flex items-start gap-4">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-lg font-semibold leading-tight">
                              {t.title}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {t.desc}
                            </p>
                          </div>
                        </div>

                        <Button asChild className="mt-6" variant="secondary">
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
