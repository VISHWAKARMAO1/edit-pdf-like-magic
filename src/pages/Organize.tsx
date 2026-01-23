import { useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
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
import { ArrowDown, ArrowUp, FileDown, Trash2, Upload } from "lucide-react";

// Ensure worker is configured (safe to run multiple times)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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

export default function Organize() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const canExport = !!pdfBytes && order.length > 0;

  const outputName = useMemo(() => {
    return "organized.pdf";
  }, []);

  const onUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    setPdfBytes(bytes);
    setPdfProxy(null);
    setNumPages(0);
    setOrder([]);
    setPreviewOpen(false);
    setPreviewBytes(null);
    setPreviewBlob(null);
  };

  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;
    (async () => {
      try {
        setIsWorking(true);
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfProxy(doc);
        setNumPages(doc.numPages);
        setOrder(Array.from({ length: doc.numPages }, (_, i) => i + 1));
      } catch (e) {
        console.error(e);
        toast({
          title: "Failed to load PDF",
          description: "Please try another file.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  useEffect(() => {
    if (!pdfProxy || order.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        // Render thumbnails in the current order
        for (let i = 0; i < order.length; i++) {
          if (cancelled) return;
          const pageNum = order[i];
          const page = await pdfProxy.getPage(pageNum);
          if (cancelled) return;
          const vp = page.getViewport({ scale: 0.22 });

          const canvas = thumbRefs.current[i];
          if (!canvas) continue;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const renderTask = page.render({ canvasContext: ctx, viewport: vp } as any);
          await renderTask.promise;
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfProxy, order]);

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return next;
    });
  };

  const removeAt = (idx: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildOrganized = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");
    if (!order.length) throw new Error("No pages selected");

    const src = await PDFDocument.load(pdfBytes.slice());
    const out = await PDFDocument.create();
    const indices = order
      .map((p) => p - 1)
      .filter((i) => i >= 0 && i < src.getPageCount());

    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    const saved = await out.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const previewExport = async () => {
    if (!canExport) return;
    try {
      setIsWorking(true);
      const bytes = await buildOrganized();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organize</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reorder or delete pages, preview, then download the updated PDF.
          </p>
        </div>

        <Card className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.currentTarget.value = "";
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button className="gap-2" onClick={() => inputRef.current?.click()} disabled={isWorking}>
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>

            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">{numPages ? `${order.length} pages` : ""}</div>
              <Button variant="secondary" onClick={() => setOrder([])} disabled={!order.length || isWorking}>
                Clear
              </Button>
              <Button onClick={() => void previewExport()} disabled={!canExport || isWorking} className="gap-2">
                <FileDown className="h-4 w-4" />
                {isWorking ? "Working…" : "Preview & Download"}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {!pdfProxy ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Upload a PDF to organize pages.
            </div>
          ) : order.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No pages selected.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {order.map((pageNum, idx) => (
                <div key={`${pageNum}-${idx}`} className="rounded-md border border-border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Page {pageNum}</div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0 || isWorking}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(idx, 1)}
                        disabled={idx === order.length - 1 || isWorking}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAt(idx)}
                        disabled={isWorking}
                        aria-label="Delete page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                    <canvas
                      ref={(el) => {
                        thumbRefs.current[idx] = el;
                      }}
                      className="block h-auto w-full"
                    />
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
            <DialogTitle>Preview organized PDF</DialogTitle>
            <DialogDescription>Confirm the pages order, then download.</DialogDescription>
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
                downloadBlob(previewBlob, outputName);
                toast({ title: "Downloaded", description: outputName });
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
