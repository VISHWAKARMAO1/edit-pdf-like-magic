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
import { FileDown, Upload } from "lucide-react";

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

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Compress() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Auto compression settings (flattened output)
  const AUTO_SCALE = 1.1; // rendering resolution
  const AUTO_JPEG_QUALITY = 0.72; // 0..1

  const outputName = useMemo(() => {
    const base = sourceFile?.name?.replace(/\.pdf$/i, "") || "document";
    return `${base}-compressed.pdf`;
  }, [sourceFile]);

  useEffect(() => {
    // cleanup preview blob url usage is not needed since we don't store objectURL
    return () => {
      // noop
    };
  }, []);

  const onUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    setSourceFile(file);
    setPdfBytes(bytes);
    setPreviewOpen(false);
    setPreviewBytes(null);
    setPreviewBlob(null);
  };

  const renderPageToJpeg = async (params: { page: any; scale: number; quality: number }) => {
    const { page, scale, quality } = params;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);

    const renderTask = page.render({ canvasContext: ctx, viewport: vp } as any);
    await renderTask.promise;

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, width: vp.width, height: vp.height };
  };

  const buildCompressedFlattened = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");

    // Load with PDF.js for rendering
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
    const doc = await loadingTask.promise;
    const out = await PDFDocument.create();

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const { blob, width, height } = await renderPageToJpeg({
        page,
        scale: AUTO_SCALE,
        quality: AUTO_JPEG_QUALITY,
      });

      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const jpg = await out.embedJpg(imgBytes);

      const outPage = out.addPage([width, height]);
      outPage.drawImage(jpg, { x: 0, y: 0, width, height });
    }

    const saved = await out.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const compressNow = async () => {
    if (!pdfBytes || !sourceFile) return;
    try {
      setIsWorking(true);
      const bytes = await buildCompressedFlattened();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);

      toast({
        title: "Compressed",
        description: `Before: ${formatMB(sourceFile.size)} → After: ${formatMB(blob.size)}`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Compression failed",
        description: "Please try a different PDF.",
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
          <h1 className="text-2xl font-semibold tracking-tight">Compress</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-compress by flattening pages into images (smaller file size, but text won’t be selectable).
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
              {sourceFile ? (
                <div className="text-xs text-muted-foreground">File: {formatMB(sourceFile.size)}</div>
              ) : null}
              <Button variant="secondary" onClick={() => {
                setSourceFile(null);
                setPdfBytes(null);
                setPreviewOpen(false);
                setPreviewBytes(null);
                setPreviewBlob(null);
              }} disabled={!pdfBytes || isWorking}>
                Clear
              </Button>
              <Button onClick={() => void compressNow()} disabled={!pdfBytes || isWorking} className="gap-2">
                <FileDown className="h-4 w-4" />
                {isWorking ? "Compressing…" : "Compress (Auto)"}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {!pdfBytes ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Upload a PDF to compress.
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Tip: Best compression happens on scanned/image-heavy PDFs.
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
            <DialogTitle>Preview compressed PDF</DialogTitle>
            <DialogDescription>Confirm the compressed document, then download.</DialogDescription>
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
