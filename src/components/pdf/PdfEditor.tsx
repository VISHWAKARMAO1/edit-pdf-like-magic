import { useEffect, useMemo, useRef, useState } from "react";
// pdfjs-dist v4+ ships as ESM modules.
// We keep types loose here because pdf.js internal types are not fully re-exported.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import type { PdfTextEdit, PdfTextItemBox } from "./pdfTypes";
import { hexToRgb01 } from "./pdfColor";

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
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.35);
  const [isLoading, setIsLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, PdfTextEdit>>({});
  const [replaceFind, setReplaceFind] = useState<string>("");
  const [replaceWith, setReplaceWith] = useState<string>("");
  const [replaceAllInSelection, setReplaceAllInSelection] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pdfArrayBuffer) return;

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
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
  }, [pdfArrayBuffer]);

  const activeEdit = activeKey ? edits[activeKey] : null;

  const onUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    setEdits({});
    setActiveKey(null);
    setPdfArrayBuffer(buf);
  };

  const updateEdit = (key: string, partial: Partial<PdfTextEdit>) => {
    setEdits((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  };

  const upsertFromBox = (box: PdfTextItemBox, bgColorHex?: string) => {
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
        bgColorHex: bgColorHex ?? "#ffffff",
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

  const exportPdf = async () => {
    if (!pdfArrayBuffer || !pdfProxy) return;

    const editList = Object.values(edits).filter((e) => e.newText !== e.originalText);
    if (editList.length === 0) {
      toast({ title: "Nothing to export", description: "Edit some text first." });
      return;
    }

    try {
      setIsLoading(true);
      const doc = await PDFDocument.load(pdfArrayBuffer);
      const font = await doc.embedFont(StandardFonts.Helvetica);

      for (const edit of editList) {
        const page = doc.getPage(edit.pageNumber - 1);
        const pageHeight = page.getHeight();
        const pad = edit.padding ?? 2;
        const xPdf = Math.max(0, edit.x - pad);
        const yPdf = pageHeight - (edit.y + edit.height) - pad;
        const wPdf = edit.width + pad * 2;
        const hPdf = edit.height + pad * 2;
        const { r, g, b } = hexToRgb01(edit.colorHex);
        const bg = hexToRgb01(edit.bgColorHex || "#ffffff");

        // Heuristic: cover original text by painting a white rectangle.
        // Works best on standard PDFs with white page background.
        page.drawRectangle({
          x: xPdf,
          y: yPdf,
          width: wPdf,
          height: hPdf,
          color: rgb(bg.r, bg.g, bg.b),
        });

        page.drawText(edit.newText, {
          x: edit.x,
          y: yPdf + pad + Math.max(0, (edit.height - edit.fontSize) / 2),
          size: edit.fontSize,
          font,
          color: rgb(r, g, b),
        });
      }

      const bytes = await doc.save();
      // Ensure we hand Blob a Uint8Array backed by a real ArrayBuffer.
      const safeBytes = new Uint8Array(bytes);
      downloadBlob(
        new Blob([safeBytes], { type: "application/pdf" }),
        "edited.pdf"
      );
      toast({ title: "Exported", description: "Downloaded edited.pdf" });
    } catch (e) {
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
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <header className="mb-6">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">
          PDF Text Editor
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload a PDF, click existing text to edit it, then export a new PDF. (Best
          results with simple, text-based PDFs.)
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Label
                htmlFor="pdf-upload"
                className="inline-flex items-center gap-2"
              >
                <span className="text-sm font-medium">PDF</span>
              </Label>
              <Input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), 0.75, 2.2))}
                  disabled={!pdfProxy}
                >
                  -
                </Button>
                <div className="min-w-[64px] text-center text-sm text-muted-foreground">
                  {Math.round(scale * 100)}%
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.75, 2.2))}
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

          <div
            ref={containerRef}
            className="mt-4 space-y-6"
            aria-busy={isLoading}
          >
            {!pdfProxy ? (
              <Card className="p-10">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF to start editing.
                  </p>
                </div>
              </Card>
            ) : (
              Array.from({ length: numPages }).map((_, idx) => (
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
                />
              ))
            )}
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
                <p className="text-sm text-muted-foreground">
                  No text selected yet.
                </p>
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
    </div>
  );
}

function PdfPage(props: {
  pdf: any;
  pageNumber: number;
  scale: number;
  edits: Record<string, PdfTextEdit>;
  activeKey: string | null;
  onPickText: (box: PdfTextItemBox, bgColorHex?: string) => void;
  onMoveActive: (key: string, nextX: number, nextY: number) => void;
  onEditText: (key: string, nextText: string) => void;
  onDoneEditing: () => void;
}) {
  const { pdf, pageNumber, scale, edits, activeKey, onPickText, onMoveActive, onEditText, onDoneEditing } = props;
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
                  const bg = canvas ? sampleCanvasBg(canvas, b) : "#ffffff";
                  onPickText(b, bg);
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
