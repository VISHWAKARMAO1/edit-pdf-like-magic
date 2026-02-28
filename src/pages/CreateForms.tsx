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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { PdfExportPreview } from "@/components/pdf/PdfExportPreview";
import { downloadBlob, u8ToArrayBuffer } from "@/lib/blob";
import { FileDown, Trash2, Upload } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type NewField =
  | {
      id: string;
      kind: "text";
      name: string;
      pageIndex: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      id: string;
      kind: "checkbox";
      name: string;
      pageIndex: number;
      x: number;
      y: number;
      size: number;
    };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function CreateForms() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  const [tool, setTool] = useState<"text" | "checkbox">("text");
  const [fields, setFields] = useState<NewField[]>([]);

  // Render settings for page 1
  const [scale, setScale] = useState(1.15);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const outputName = useMemo(() => {
    const base = file?.name?.replace(/\.pdf$/i, "") || "document";
    return `${base}-fillable.pdf`;
  }, [file]);

  const onUpload = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    setFile(f);
    setPdfBytes(bytes);
    setFields([]);
    setPreviewOpen(false);
    setPreviewBytes(null);
    setPreviewBlob(null);
  };

  useEffect(() => {
    if (!pdfBytes) {
      setPdfProxy(null);
      setPageCount(0);
      setPageSize(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setIsWorking(true);
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfProxy(doc);
        setPageCount(doc.numPages);
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load PDF", description: "Please try another file.", variant: "destructive" });
      } finally {
        if (!cancelled) setIsWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  useEffect(() => {
    if (!pdfProxy) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfProxy.getPage(1);
        if (cancelled) return;
        const vp = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        setPageSize({ w: vp.width, h: vp.height });

        const renderTask = page.render({ canvasContext: ctx, viewport: vp } as any);
        await renderTask.promise;
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfProxy, scale]);

  const addFieldAtClick = (evt: React.MouseEvent) => {
    if (!pageSize) return;

    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    const xPx = evt.clientX - rect.left;
    const yPxFromTop = evt.clientY - rect.top;

    // pdf-lib uses bottom-left origin. Convert from top-left pixels.
    const xPt = xPx / scale;
    const yPt = (pageSize.h - yPxFromTop) / scale;

    if (tool === "text") {
      setFields((prev) => [
        ...prev,
        {
          id: uid(),
          kind: "text",
          name: `text_${prev.filter((p) => p.kind === "text").length + 1}`,
          pageIndex: 0,
          x: Math.max(0, xPt),
          y: Math.max(0, yPt),
          width: 220,
          height: 22,
        },
      ]);
    } else {
      setFields((prev) => [
        ...prev,
        {
          id: uid(),
          kind: "checkbox",
          name: `checkbox_${prev.filter((p) => p.kind === "checkbox").length + 1}`,
          pageIndex: 0,
          x: Math.max(0, xPt),
          y: Math.max(0, yPt),
          size: 16,
        },
      ]);
    }
  };

  const buildFillable = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");
    if (fields.length === 0) throw new Error("Add at least one field.");

    const doc = await PDFDocument.load(pdfBytes.slice());
    const form = doc.getForm();
    const pages = doc.getPages();
    const page = pages[0];
    if (!page) throw new Error("PDF has no pages");

    for (const f of fields) {
      if (f.kind === "text") {
        const tf = form.createTextField(f.name);
        tf.setText("");
        tf.addToPage(page, {
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        });
      } else {
        const cb = form.createCheckBox(f.name);
        cb.addToPage(page, {
          x: f.x,
          y: f.y,
          width: f.size,
          height: f.size,
        });
      }
    }

    const saved = await doc.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const preview = async () => {
    if (!pdfBytes) return;
    try {
      setIsWorking(true);
      const bytes = await buildFillable();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (e) {
      toast({ title: "Create forms failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click on page 1 to add a text field or checkbox, then export a fillable PDF.
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
            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2" onClick={() => inputRef.current?.click()} disabled={isWorking}>
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
              <Button
                variant={tool === "text" ? "default" : "secondary"}
                onClick={() => setTool("text")}
                disabled={!pdfBytes || isWorking}
              >
                Text field
              </Button>
              <Button
                variant={tool === "checkbox" ? "default" : "secondary"}
                onClick={() => setTool("checkbox")}
                disabled={!pdfBytes || isWorking}
              >
                Checkbox
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPdfBytes(null);
                  setFields([]);
                  setPreviewOpen(false);
                  setPreviewBytes(null);
                  setPreviewBlob(null);
                }}
                disabled={!pdfBytes || isWorking}
              >
                Clear
              </Button>
              <Button onClick={() => void preview()} disabled={!pdfBytes || isWorking} className="gap-2">
                <FileDown className="h-4 w-4" />
                {isWorking ? "Working…" : "Preview & Download"}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {!pdfBytes ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Upload a PDF to start creating form fields.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    Tool: <span className="font-medium text-foreground">{tool}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Preview scale:
                    <Input
                      className="ml-2 inline-flex h-8 w-24"
                      type="number"
                      min={0.6}
                      max={2}
                      step={0.05}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value || 1))}
                      disabled={isWorking}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{pageCount ? `${pageCount} pages` : ""}</div>
                </div>

                <div
                  className="relative overflow-hidden rounded-md border border-border bg-muted/30"
                  onClick={addFieldAtClick}
                  role="button"
                  tabIndex={0}
                >
                  <canvas ref={canvasRef} className="block h-auto w-full" />

                  {/* Simple overlays (approx) */}
                  {pageSize
                    ? fields.map((f) => {
                        const left = f.x * scale;
                        const topFromBottom = f.y * scale;
                        const top = pageSize.h - topFromBottom - (f.kind === "text" ? f.height * scale : f.size * scale);
                        const w = f.kind === "text" ? f.width * scale : f.size * scale;
                        const h = f.kind === "text" ? f.height * scale : f.size * scale;
                        return (
                          <div
                            key={f.id}
                            className="pointer-events-none absolute rounded-sm border border-ring bg-muted/30"
                            style={{ left, top, width: w, height: h }}
                          />
                        );
                      })
                    : null}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Fields ({fields.length})</div>
                  <div className="mt-1 text-xs text-muted-foreground">Page 1 only in this version.</div>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Click the page to add fields.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((f) => (
                      <div key={f.id} className="rounded-md border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{f.name}</div>
                            <div className="text-xs text-muted-foreground">{f.kind}</div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
                            aria-label="Remove field"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-xs">X</Label>
                            <Input
                              value={f.x}
                              type="number"
                              onChange={(e) =>
                                setFields((prev) =>
                                  prev.map((x) => (x.id === f.id ? ({ ...x, x: Number(e.target.value || 0) } as any) : x))
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Y</Label>
                            <Input
                              value={f.y}
                              type="number"
                              onChange={(e) =>
                                setFields((prev) =>
                                  prev.map((x) => (x.id === f.id ? ({ ...x, y: Number(e.target.value || 0) } as any) : x))
                                )
                              }
                            />
                          </div>
                          {f.kind === "text" ? (
                            <>
                              <div className="grid gap-1">
                                <Label className="text-xs">Width</Label>
                                <Input
                                  value={f.width}
                                  type="number"
                                  onChange={(e) =>
                                    setFields((prev) =>
                                      prev.map((x) =>
                                        x.id === f.id ? ({ ...x, width: Number(e.target.value || 0) } as any) : x
                                      )
                                    )
                                  }
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label className="text-xs">Height</Label>
                                <Input
                                  value={f.height}
                                  type="number"
                                  onChange={(e) =>
                                    setFields((prev) =>
                                      prev.map((x) =>
                                        x.id === f.id ? ({ ...x, height: Number(e.target.value || 0) } as any) : x
                                      )
                                    )
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <div className="grid gap-1">
                              <Label className="text-xs">Size</Label>
                              <Input
                                value={f.size}
                                type="number"
                                onChange={(e) =>
                                  setFields((prev) =>
                                    prev.map((x) =>
                                      x.id === f.id ? ({ ...x, size: Number(e.target.value || 0) } as any) : x
                                    )
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
            <DialogTitle>Preview fillable PDF</DialogTitle>
            <DialogDescription>Confirm the result, then download.</DialogDescription>
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
