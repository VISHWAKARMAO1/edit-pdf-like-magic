import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

import { TopNav } from "@/components/layout/TopNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { PdfExportPreview } from "@/components/pdf/PdfExportPreview";
import { ArrowDown, ArrowUp, FileDown, Upload, X } from "lucide-react";

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type MixItem = {
  id: string;
  file: File;
};

export default function AlternateMix() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<MixItem[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const canMix = items.length >= 2;
  const mixedName = useMemo(() => {
    if (!items.length) return "alternate-mix.pdf";
    const base = items[0].file.name.replace(/\.pdf$/i, "");
    return `${base}-alternate-mix.pdf`;
  }, [items]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: MixItem[] = Array.from(files)
      .filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf")
      .map((file) => ({ id: crypto.randomUUID(), file }));

    if (!next.length) {
      toast({ title: "Please upload PDFs", description: "Only PDF files are supported." });
      return;
    }
    setItems((prev) => [...prev, ...next]);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return next;
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const buildAlternateMix = async (): Promise<Uint8Array> => {
    // Load all docs first (keeps ordering stable)
    const docs = await Promise.all(
      items.map(async (it) => {
        const bytes = new Uint8Array(await it.file.arrayBuffer());
        // pdf-lib is safe with Uint8Array copies; bytes is fresh per file.
        const doc = await PDFDocument.load(bytes);
        return { doc, pageCount: doc.getPageCount() };
      })
    );

    const out = await PDFDocument.create();
    const cursors = docs.map(() => 0);
    const maxPages = Math.max(...docs.map((d) => d.pageCount));

    for (let round = 0; round < maxPages; round++) {
      for (let i = 0; i < docs.length; i++) {
        const idx = cursors[i];
        if (idx >= docs[i].pageCount) continue;
        const [p] = await out.copyPages(docs[i].doc, [idx]);
        out.addPage(p);
        cursors[i] = idx + 1;
      }
    }

    const saved = await out.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const previewMix = async () => {
    if (!canMix) {
      toast({ title: "Add at least 2 PDFs", description: "Select two or more PDF files to alternate & mix." });
      return;
    }
    try {
      setIsWorking(true);
      const bytes = await buildAlternateMix();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Alternate & Mix failed",
        description: "Please try different PDFs.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alternate & Mix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mix pages from 2 or more PDFs by alternating pages in the selected order.
          </p>
        </div>

        <Card className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button className="gap-2" onClick={() => inputRef.current?.click()} disabled={isWorking}>
              <Upload className="h-4 w-4" />
              Add PDFs
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setItems([])} disabled={!items.length || isWorking}>
                Clear
              </Button>
              <Button onClick={() => void previewMix()} disabled={!canMix || isWorking} className="gap-2">
                <FileDown className="h-4 w-4" />
                {isWorking ? "Working…" : "Preview & Download"}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {!items.length ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Add PDFs to alternate & mix.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{it.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Order: {idx + 1} · {(it.file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0 || isWorking}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === items.length - 1 || isWorking}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(it.id)}
                      disabled={isWorking}
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewBytes(null);
            setPreviewBlob(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview alternate mix</DialogTitle>
            <DialogDescription>Confirm the mixed document, then download.</DialogDescription>
          </DialogHeader>

          <div className="h-[70vh] w-full overflow-hidden rounded-md border border-border">
            {previewBytes ? <PdfExportPreview bytes={previewBytes} scale={1.1} /> : null}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!previewBlob) return;
                downloadBlob(previewBlob, mixedName);
                toast({ title: "Downloaded", description: mixedName });
                setPreviewOpen(false);
              }}
              disabled={!previewBlob}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
