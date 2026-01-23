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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { PdfExportPreview } from "@/components/pdf/PdfExportPreview";
import { parsePageRange } from "@/lib/pageRange";
import { downloadBlob, u8ToArrayBuffer } from "@/lib/blob";
import { FileDown, Upload } from "lucide-react";

export default function DeletePages() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [deleteRange, setDeleteRange] = useState("2");
  const [isWorking, setIsWorking] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const outputName = useMemo(() => {
    const base = file?.name?.replace(/\.pdf$/i, "") || "document";
    return `${base}-deleted-pages.pdf`;
  }, [file]);

  const onUpload = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    setFile(f);
    setPdfBytes(bytes);
    setPreviewOpen(false);
    setPreviewBytes(null);
    setPreviewBlob(null);

    try {
      const doc = await PDFDocument.load(bytes.slice());
      const n = doc.getPageCount();
      setPageCount(n);
      setDeleteRange(n >= 2 ? "2" : "1");
    } catch (e) {
      console.error(e);
      toast({ title: "Invalid PDF", description: "Please upload a valid PDF.", variant: "destructive" });
    }
  };

  const buildDeleted = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");
    if (pageCount <= 0) throw new Error("Unknown page count");

    const parsed = parsePageRange(deleteRange, pageCount);
    if (parsed.ok === false) throw new Error(parsed.error);

    const toDelete = new Set(parsed.pages.map((p) => p - 1));
    const keepIndices = Array.from({ length: pageCount }, (_, i) => i).filter((i) => !toDelete.has(i));
    if (keepIndices.length === 0) throw new Error("You can't delete all pages.");

    const src = await PDFDocument.load(pdfBytes.slice());
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, keepIndices);
    pages.forEach((p) => out.addPage(p));
    const saved = await out.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const previewDeleted = async () => {
    if (!pdfBytes) return;
    try {
      setIsWorking(true);
      const bytes = await buildDeleted();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delete Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Delete specific pages and export a new PDF.</p>
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
              <div className="text-xs text-muted-foreground">{pageCount ? `${pageCount} pages` : ""}</div>
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPdfBytes(null);
                  setPageCount(0);
                  setPreviewOpen(false);
                  setPreviewBytes(null);
                  setPreviewBlob(null);
                }}
                disabled={!pdfBytes || isWorking}
              >
                Clear
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {!pdfBytes ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Upload a PDF to delete pages.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 sm:max-w-md">
                <Label htmlFor="deleteRange">Pages to delete</Label>
                <Input
                  id="deleteRange"
                  value={deleteRange}
                  onChange={(e) => setDeleteRange(e.target.value)}
                  placeholder="2,5-7"
                />
                <div className="text-xs text-muted-foreground">Example: 2,5-7</div>
              </div>

              <Button onClick={() => void previewDeleted()} disabled={isWorking} className="gap-2">
                <FileDown className="h-4 w-4" />
                {isWorking ? "Working…" : "Preview & Download"}
              </Button>
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
            <DialogTitle>Preview updated PDF</DialogTitle>
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
