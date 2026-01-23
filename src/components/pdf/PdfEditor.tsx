import { useEffect, useMemo, useRef, useState } from "react";
// pdfjs-dist v4+ ships as ESM modules.
// We keep types loose here because pdf.js internal types are not fully re-exported.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import type { PdfTextEdit, PdfTextItemBox } from "./pdfTypes";
import { hexToRgb01 } from "./pdfColor";
import { PdfExportPreview } from "./PdfExportPreview";

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function sampleCanvasBg(canvas: HTMLCanvasElement, box: PdfTextItemBox): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#ffffff";
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const size = 10;
  const sx = clamp(cx - Math.floor(size / 2), 0, Math.max(0, canvas.width - 1));
  const sy = clamp(cy - Math.floor(size / 2), 0, Math.max(0, canvas.height - 1));
  const sw = clamp(size, 1, canvas.width - sx);
  const sh = clamp(size, 1, canvas.height - sy);

  try {
    const img = ctx.getImageData(sx, sy, sw, sh);
    const d = img.data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 16) continue;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
    if (n === 0) return "#ffffff";
    return rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  } catch {
    return "#ffffff";
  }
}

function sampleCanvasBgAroundBox(canvas: HTMLCanvasElement, box: PdfTextItemBox): string {
  // Sample a thin border *around* the box to avoid sampling the text pixels themselves.
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#ffffff";

  const pad = Math.max(2, Math.round(Math.min(box.width, box.height) * 0.12));
  const x0 = clamp(Math.floor(box.x - pad), 0, canvas.width - 1);
  const y0 = clamp(Math.floor(box.y - pad), 0, canvas.height - 1);
  const x1 = clamp(Math.ceil(box.x + box.width + pad), 0, canvas.width);
  const y1 = clamp(Math.ceil(box.y + box.height + pad), 0, canvas.height);

  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const ring = Math.max(1, Math.round(pad * 0.6));

  try {
    const img = ctx.getImageData(x0, y0, w, h);
    const d = img.data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const inInner = xx >= ring && xx < w - ring && yy >= ring && yy < h - ring;
        if (inInner) continue;
        const idx = (yy * w + xx) * 4;
        const a = d[idx + 3];
        if (a < 16) continue;
        r += d[idx];
        g += d[idx + 1];
        b += d[idx + 2];
        n++;
      }
    }
    if (n === 0) return "#ffffff";
    return rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  } catch {
    return "#ffffff";
  }
}

// NOTE: We intentionally don't use image patches to cover text.
// A patch captured from the rendered page *includes the old text*, so it can't hide it.

// Configure PDF.js worker for Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // pdf-lib types use ArrayBufferLike; in the browser this is backed by ArrayBuffer,
  // but TS can complain. Create a real ArrayBuffer slice for Blob construction.
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function fitFontSizeToWidth(params: {
  text: string;
  maxWidth: number;
  startingSize: number;
  minSize?: number;
  fontFamily?: string;
}): number {
  const { text, maxWidth, startingSize, minSize = 6, fontFamily = "Helvetica" } = params;
  const safeMax = Math.max(4, maxWidth);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return startingSize;

  let size = clamp(Math.round(startingSize), minSize, 96);
  for (let i = 0; i < 40; i++) {
    ctx.font = `${size}px ${fontFamily}`;
    const w = ctx.measureText(text || " ").width;
    if (w <= safeMax) break;
    size = Math.max(minSize, size - 1);
    if (size === minSize) break;
  }
  return size;
}

function splitIntoWordSpans(str: string): { word: string; start: number; end: number }[] {
  // Returns spans for non-whitespace “words” within the string.
  const spans: { word: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str))) {
    spans.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return spans;
}

function getItemBoxes(textContent: any, viewport: any, pageNumber: number): PdfTextItemBox[] {
  const items = textContent.items as any[];
  const boxes: PdfTextItemBox[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.str?.trim()) continue;

    // More reliable approach across PDFs:
    // Build a rectangle in *PDF page coordinates* then convert to viewport.
    // item.transform is [a,b,c,d,e,f] where (e,f) is text origin in PDF units.
    const tf: number[] | undefined = item.transform;
    const e = tf?.[4] ?? 0;
    const f = tf?.[5] ?? 0;
    const w = Math.abs(item.width ?? 0);
    const h = Math.abs(tf?.[3] ?? item.height ?? 0);

    if (!Number.isFinite(e) || !Number.isFinite(f) || w <= 0 || h <= 0) continue;

    const rect = viewport.convertToViewportRectangle([e, f, e + w, f + h]);
    const x0 = Math.min(rect[0], rect[2]);
    const y0 = Math.min(rect[1], rect[3]);
    const fullWidth = Math.max(6, Math.abs(rect[2] - rect[0]));
    const height = Math.max(6, Math.abs(rect[3] - rect[1]));

    // Word-level boxes: approximate by distributing the item's width by character positions.
    // This makes “replace only that word” possible for most text PDFs.
    const str: string = item.str;
    const spans = splitIntoWordSpans(str);

    if (spans.length <= 1) {
      boxes.push({
        key: `${pageNumber}:${i}:0`,
        pageNumber,
        itemIndex: i,
        text: str,
        x: x0,
        y: y0,
        width: fullWidth,
        height,
      });
      continue;
    }

    const len = Math.max(1, str.length);
    const pxPerChar = fullWidth / len;

    spans.forEach((s, wi) => {
      const x = x0 + s.start * pxPerChar;
      const width = Math.max(6, (s.end - s.start) * pxPerChar);
      boxes.push({
        key: `${pageNumber}:${i}:${wi}`,
        pageNumber,
        itemIndex: i,
        text: s.word,
        x,
        y: y0,
        width,
        height,
      });
    });
  }

  return boxes;
}

export default function PdfEditor() {
  // Keep PDF bytes as an immutable Uint8Array.
  // (pdf.js can transfer/detach ArrayBuffers when using the worker, which breaks pdf-lib.)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.35);
  const [isLoading, setIsLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, PdfTextEdit>>({});
  const [replaceFind, setReplaceFind] = useState<string>("");
  const [replaceWith, setReplaceWith] = useState<string>("");
  const [replaceAllInSelection, setReplaceAllInSelection] = useState<boolean>(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageViewportRef = useRef<Map<number, any>>(new Map());

  useEffect(() => {
    if (!pdfBytes) return;

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        // IMPORTANT: always pass a fresh copy to pdf.js so it can't detach our canonical buffer.
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfProxy(doc);
        setNumPages(doc.numPages);
      } catch (e) {
        console.error(e);
        toast({
          title: "Failed to load PDF",
          description: "Please try another file.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  useEffect(() => {
    // Cleanup preview object URL
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const activeEdit = activeKey ? edits[activeKey] : null;

  const onUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    setEdits({});
    setActiveKey(null);
    setPdfBytes(bytes);
    setPdfProxy(null);
    setNumPages(0);
    setPreviewOpen(false);
    setPreviewBlob(null);
    setPreviewBytes(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const updateEdit = (key: string, partial: Partial<PdfTextEdit>) => {
    setEdits((prev) => {
      const current = prev[key];
      if (!current) return prev;

      const next = { ...current, ...partial };

      // Make replacements feel “in-place” by shrinking text to fit the original box.
      if (partial.newText !== undefined) {
        const pad = next.padding ?? 2;
        const fitted = fitFontSizeToWidth({
          text: partial.newText,
          maxWidth: Math.max(10, next.width - pad * 2),
          startingSize: next.fontSize,
        });
        next.fontSize = fitted;
      }

      return { ...prev, [key]: next };
    });
  };

  const upsertFromBox = (box: PdfTextItemBox, opts?: { bgColorHex?: string }) => {
    setEdits((prev) => {
      const existing = prev[box.key];
      const next: PdfTextEdit = existing ?? {
        key: box.key,
        pageNumber: box.pageNumber,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        originalText: box.text,
        newText: box.text,
        fontSize: clamp(Math.round(box.height * 0.9), 8, 48),
        colorHex: "#111827", // roughly foreground in light mode
        bgColorHex: opts?.bgColorHex ?? "#ffffff",
        padding: 2,
      };
      return { ...prev, [box.key]: next };
    });
    setActiveKey(box.key);
    setReplaceFind("");
    setReplaceWith("");
  };

  const applyReplaceWithinSelection = () => {
    if (!activeEdit) return;
    const find = replaceFind;
    const withText = replaceWith;
    if (!find) return;

    const current = activeEdit.newText ?? "";
    const next = replaceAllInSelection
      ? current.split(find).join(withText)
      : current.replace(find, withText);

    updateEdit(activeEdit.key, { newText: next });
  };

  const buildEditedPdfBytes = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");

    const editList = Object.values(edits).filter((e) => e.newText !== e.originalText);
    if (editList.length === 0) {
      toast({ title: "Nothing to export", description: "Edit some text first." });
      throw new Error("Nothing to export");
    }

    // IMPORTANT: pass a copy to pdf-lib as well.
    const doc = await PDFDocument.load(pdfBytes.slice());
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (const edit of editList) {
      const page = doc.getPage(edit.pageNumber - 1);
      const vp = pageViewportRef.current.get(edit.pageNumber);
      if (!vp?.convertToPdfPoint) {
        // Fallback: skip if we don't have a viewport mapping yet.
        continue;
      }

      // Convert from viewport (screen px) -> PDF points.
      const p1 = vp.convertToPdfPoint(edit.x, edit.y);
      const p2 = vp.convertToPdfPoint(edit.x + edit.width, edit.y + edit.height);
      const x0 = Math.min(p1[0], p2[0]);
      const y0 = Math.min(p1[1], p2[1]);
      const w0 = Math.abs(p2[0] - p1[0]);
      const h0 = Math.abs(p2[1] - p1[1]);

      const scaleFactor: number = Number(vp.scale ?? 1) || 1;
      const padPx = edit.padding ?? 2;
      const padPdf = padPx / scaleFactor;
      const fontSizePdf = edit.fontSize / scaleFactor;

      const xPdf = Math.max(0, x0 - padPdf);
      const yPdf = Math.max(0, y0 - padPdf);
      const wPdf = w0 + padPdf * 2;
      const hPdf = h0 + padPdf * 2;
      const { r, g, b } = hexToRgb01(edit.colorHex);
      const bg = hexToRgb01(edit.bgColorHex || "#ffffff");

      // Cover original then draw the new text.
      page.drawRectangle({
        x: xPdf,
        y: yPdf,
        width: wPdf,
        height: hPdf,
        color: rgb(bg.r, bg.g, bg.b),
      });

      page.drawText(edit.newText, {
        x: x0,
        y: y0 + padPdf + Math.max(0, (h0 - fontSizePdf) / 2),
        size: fontSizePdf,
        font,
        color: rgb(r, g, b),
      });
    }

    const out = await doc.save();
    return out instanceof Uint8Array ? out : new Uint8Array(out);
  };

  const exportPdf = async () => {
    if (!pdfBytes || !pdfProxy) return;
    try {
      setIsLoading(true);
      const outBytes = await buildEditedPdfBytes();
      const blob = new Blob([u8ToArrayBuffer(outBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPreviewBytes(outBytes);
      setPreviewOpen(true);
    } catch (e) {
      // buildEditedPdfBytes already toasted for "Nothing to export"
      if ((e as Error)?.message === "Nothing to export") return;
      console.error(e);
      toast({
        title: "Export failed",
        description: "This PDF may not be supported for direct text edits. Try another file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file input (Sejda-style button triggers this) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUpload(f);
        }}
      />

      {!pdfProxy ? (
        <section className="relative overflow-hidden rounded-lg border border-border bg-background">
          <div
            aria-hidden
            className="absolute inset-x-0 top-24 h-[320px]"
            style={{
              background:
                "radial-gradient(1200px 220px at 50% 0%, hsl(var(--muted)) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-[1000px] px-4 py-16 md:py-20">
            <div className="text-center">
              <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                Online PDF editor
                <span className="ml-2 align-super text-xs font-semibold tracking-widest text-muted-foreground">
                  BETA
                </span>
              </h1>
              <p className="mt-3 text-pretty text-base text-muted-foreground md:text-lg">
                Edit PDF files for free. Replace words and export.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="px-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Upload PDF file
                </Button>

                <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Files stay private in your browser. Best results with text-based PDFs.
                </p>
              </div>
            </div>
          </div>

          <div aria-hidden className="relative h-[170px] bg-background">
            <svg
              viewBox="0 0 1440 160"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-full w-[1600px] max-w-none"
            >
              <path
                d="M0,64L120,69.3C240,75,480,85,720,80C960,75,1200,53,1320,42.7L1440,32L1440,160L1320,160C1200,160,960,160,720,160C480,160,240,160,120,160L0,160Z"
                className="fill-muted"
              />
              <path
                d="M0,96L120,90.7C240,85,480,75,720,74.7C960,75,1200,85,1320,90.7L1440,96L1440,160L1320,160C1200,160,960,160,720,160C480,160,240,160,120,160L0,160Z"
                className="fill-accent"
                opacity="0.6"
              />
            </svg>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="min-w-0">
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Change PDF
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setScale((s) =>
                        clamp(Number((s - 0.1).toFixed(2)), 0.75, 2.2)
                      )
                    }
                    disabled={!pdfProxy}
                  >
                    -
                  </Button>
                  <div className="min-w-[64px] text-center text-sm text-muted-foreground">
                    {Math.round(scale * 100)}%
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setScale((s) =>
                        clamp(Number((s + 0.1).toFixed(2)), 0.75, 2.2)
                      )
                    }
                    disabled={!pdfProxy}
                  >
                    +
                  </Button>
                  <Button onClick={() => void exportPdf()} disabled={!pdfProxy || isLoading}>
                    {isLoading ? "Working…" : "Export PDF"}
                  </Button>
                </div>
              </div>
            </Card>

          <Dialog
            open={previewOpen}
            onOpenChange={(open) => {
              setPreviewOpen(open);
              if (!open) {
                setPreviewBlob(null);
                setPreviewBytes(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
          >
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Preview export</DialogTitle>
                <DialogDescription>
                  Confirm the edited PDF, then download.
                </DialogDescription>
              </DialogHeader>

              <div className="h-[70vh] w-full overflow-hidden rounded-md border border-border">
                {previewBytes ? (
                  <PdfExportPreview
                    bytes={previewBytes}
                    scale={scale}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Generating preview…
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!previewUrl) return;
                    window.open(previewUrl, "_blank", "noopener,noreferrer");
                  }}
                  disabled={!previewUrl}
                >
                  Open in new tab
                </Button>
                <Button
                  onClick={() => {
                    if (!previewBlob) return;
                    downloadBlob(previewBlob, "edited.pdf");
                    setPreviewOpen(false);
                    toast({ title: "Exported", description: "Downloaded edited.pdf" });
                  }}
                  disabled={!previewBlob}
                >
                  Download PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div ref={containerRef} className="mt-4 space-y-6" aria-busy={isLoading}>
            {Array.from({ length: numPages }).map((_, idx) => (
              <PdfPage
                key={`page-${idx + 1}`}
                pdf={pdfProxy}
                pageNumber={idx + 1}
                scale={scale}
                edits={edits}
                activeKey={activeKey}
                onPickText={upsertFromBox}
                onMoveActive={(key, nextX, nextY) => updateEdit(key, { x: nextX, y: nextY })}
                onEditText={(key, nextText) => updateEdit(key, { newText: nextText })}
                onDoneEditing={() => setActiveKey(null)}
                onViewport={(pageNum, vp) => {
                  pageViewportRef.current.set(pageNum, vp);
                }}
              />
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Card className="h-full p-4">
            <h2 className="text-sm font-semibold">Inspector</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click text to edit. Drag the active edit to reposition.
            </p>

            <Separator className="my-4" />

            {!activeEdit ? (
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">No text selected yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Selected text</Label>
                  <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
                    {activeEdit.originalText}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-text">New text</Label>
                  <Input
                    id="edit-text"
                    value={activeEdit.newText}
                    onChange={(e) => updateEdit(activeEdit.key, { newText: e.target.value })}
                  />
                </div>

                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs font-medium">Replace within this selection</div>
                  <div className="mt-3 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="replace-find" className="text-xs text-muted-foreground">
                          Find
                        </Label>
                        <Input
                          id="replace-find"
                          value={replaceFind}
                          onChange={(e) => setReplaceFind(e.target.value)}
                          placeholder="word"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="replace-with" className="text-xs text-muted-foreground">
                          Replace with
                        </Label>
                        <Input
                          id="replace-with"
                          value={replaceWith}
                          onChange={(e) => setReplaceWith(e.target.value)}
                          placeholder="new word"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={replaceAllInSelection}
                        onChange={(e) => setReplaceAllInSelection(e.target.checked)}
                      />
                      Replace all matches in this selection
                    </label>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={applyReplaceWithinSelection}
                      disabled={!replaceFind}
                    >
                      Apply replace
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="font-size">Font size</Label>
                    <div className="px-1">
                      <Slider
                        id="font-size"
                        min={8}
                        max={48}
                        step={1}
                        value={[activeEdit.fontSize]}
                        onValueChange={(v) => updateEdit(activeEdit.key, { fontSize: v[0] })}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activeEdit.fontSize}px
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={activeEdit.colorHex}
                      onChange={(e) => updateEdit(activeEdit.key, { colorHex: e.target.value })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setEdits((prev) => {
                      const next = { ...prev };
                      delete next[activeEdit.key];
                      return next;
                    });
                    setActiveKey(null);
                    setReplaceFind("");
                    setReplaceWith("");
                  }}
                >
                  Discard change
                </Button>
              </div>
            )}
          </Card>
        </aside>
      </div>
      )}
    </div>
  );
}

function PdfPage(props: {
  pdf: any;
  pageNumber: number;
  scale: number;
  edits: Record<string, PdfTextEdit>;
  activeKey: string | null;
  onPickText: (box: PdfTextItemBox, opts?: { bgColorHex?: string }) => void;
  onMoveActive: (key: string, nextX: number, nextY: number) => void;
  onEditText: (key: string, nextText: string) => void;
  onDoneEditing: () => void;
  onViewport?: (pageNumber: number, viewport: any) => void;
}) {
  const { pdf, pageNumber, scale, edits, activeKey, onPickText, onMoveActive, onEditText, onDoneEditing, onViewport } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewport, setViewport] = useState<any>(null);
  const [boxes, setBoxes] = useState<PdfTextItemBox[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  const pageEdits = useMemo(
    () => Object.values(edits).filter((e) => e.pageNumber === pageNumber),
    [edits, pageNumber]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        const vp = page.getViewport({ scale });
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);

        // pdf.js v4 types expect extra fields; runtime only needs canvasContext + viewport.
        const renderTask = page.render({ canvasContext: ctx, viewport: vp } as any);
        await renderTask.promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        setViewport(vp);
        onViewport?.(pageNumber, vp);
        setBoxes(getItemBoxes(textContent, vp, pageNumber));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  const activeOnThisPage = activeKey?.startsWith(`${pageNumber}:`) ? activeKey : null;
  const activeEdit = activeOnThisPage ? edits[activeOnThisPage] : null;

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Page {pageNumber}
        </div>
        <div className="text-xs text-muted-foreground">
          {isRendering ? "Rendering…" : ""}
        </div>
      </div>

      <div
        className="relative mx-auto w-fit overflow-hidden rounded-md border border-border bg-card"
        style={{ width: viewport?.width ?? undefined }}
      >
        <canvas ref={canvasRef} className="block" />

        {/* Click targets for existing PDF text */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {boxes.map((b) => {
            const isActive = activeKey === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className={cn(
                  "pointer-events-auto absolute rounded-sm border transition",
                  "border-transparent hover:border-ring/50",
                  isActive && "border-ring"
                )}
                style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
                onClick={() => {
                  const canvas = canvasRef.current;
                  const bgColorHex = canvas
                    ? sampleCanvasBgAroundBox(canvas, b)
                    : "#ffffff";
                  onPickText(b, { bgColorHex });
                }}
                aria-label={`Edit text: ${b.text}`}
              />
            );
          })}
        </div>

        {/* Visual overlay of edited text + drag handle for active edit */}
        {/* pointer-events-none here is critical so it doesn't block clicks on the text buttons */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {pageEdits.map((e) => {
            const isActive = e.key === activeOnThisPage;
            return (
              <DraggableOverlay
                key={`overlay-${e.key}`}
                edit={e}
                active={isActive}
                onMove={(nx, ny) => onMoveActive(e.key, nx, ny)}
              />
            );
          })}
        </div>

        {/* Inline editor for the active selection (type directly on the PDF) */}
        {activeEdit ? (
          <InlineTextEditor
            key={`inline-${activeEdit.key}-${activeEdit.x}-${activeEdit.y}`}
            edit={activeEdit}
            onChange={(t) => onEditText(activeEdit.key, t)}
            onDone={onDoneEditing}
          />
        ) : null}
      </div>
    </Card>
  );
}

function InlineTextEditor(props: {
  edit: PdfTextEdit;
  onChange: (next: string) => void;
  onDone: () => void;
}) {
  const { edit, onChange, onDone } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [edit.key]);

  return (
    <div
      className="absolute z-30"
      style={{ left: edit.x, top: edit.y, width: edit.width }}
    >
      <input
        ref={inputRef}
        value={edit.newText}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
            onDone();
          }
          if (e.key === "Escape") {
            (e.currentTarget as HTMLInputElement).blur();
            onDone();
          }
        }}
        className="h-full w-full rounded-sm border border-ring px-1 outline-none"
        style={{
          height: edit.height,
          fontSize: edit.fontSize,
          lineHeight: 1.05,
          color: edit.colorHex,
          backgroundColor: edit.bgColorHex,
        }}
        aria-label="Edit selected PDF text"
      />
    </div>
  );
}

function DraggableOverlay(props: {
  edit: PdfTextEdit;
  active: boolean;
  onMove: (x: number, y: number) => void;
}) {
  const { edit, active, onMove } = props;
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  return (
    <div
      className={cn(
        "absolute select-none",
        // The parent wrapper is pointer-events-none; re-enable only for the active edit.
        active ? "pointer-events-auto cursor-move" : "pointer-events-none"
      )}
      style={{ left: edit.x, top: edit.y, width: edit.width, height: edit.height }}
      onPointerDown={(ev) => {
        if (!active) return;
        (ev.currentTarget as HTMLDivElement).setPointerCapture(ev.pointerId);
        dragRef.current = {
          startX: ev.clientX,
          startY: ev.clientY,
          originX: edit.x,
          originY: edit.y,
        };
      }}
      onPointerMove={(ev) => {
        if (!active || !dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        onMove(dragRef.current.originX + dx, dragRef.current.originY + dy);
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
    >
      <div
        className={cn(
          "h-full w-full rounded-sm border",
          active ? "border-ring" : "border-transparent"
        )}
        style={{ backgroundColor: edit.bgColorHex }}
      >
        <div
          className="h-full w-full whitespace-pre-wrap"
          style={{
            fontSize: edit.fontSize,
            lineHeight: 1.05,
            color: edit.colorHex,
            padding: edit.padding,
          }}
        >
          {edit.newText}
        </div>
      </div>
    </div>
  );
}
