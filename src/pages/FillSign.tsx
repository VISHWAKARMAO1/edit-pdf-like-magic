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
import { downloadBlob, u8ToArrayBuffer } from "@/lib/blob";
import { FileDown, Upload } from "lucide-react";

type FormFieldUI =
  | { kind: "text"; name: string; value: string }
  | { kind: "checkbox"; name: string; checked: boolean };

export default function FillSign() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [fields, setFields] = useState<FormFieldUI[]>([]);

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureBytes, setSignatureBytes] = useState<Uint8Array | null>(null);
  const [signatureScalePct, setSignatureScalePct] = useState(18);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const outputName = useMemo(() => {
    const base = file?.name?.replace(/\.pdf$/i, "") || "document";
    return `${base}-filled-signed.pdf`;
  }, [file]);

  const onUploadPdf = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    setFile(f);
    setPdfBytes(bytes);
    setPreviewOpen(false);
    setPreviewBytes(null);
    setPreviewBlob(null);

    try {
      const doc = await PDFDocument.load(bytes.slice());
      const form = doc.getForm();
      const all = form.getFields();

      const next: FormFieldUI[] = [];
      for (const field of all) {
        const name = field.getName();
        const ctor = (field as any)?.constructor?.name as string | undefined;

        if (ctor === "PDFTextField") {
          const tf = field as any;
          const current = (tf.getText?.() as string | undefined) ?? "";
          next.push({ kind: "text", name, value: current });
        } else if (ctor === "PDFCheckBox") {
          const cb = field as any;
          const checked = Boolean(cb.isChecked?.());
          next.push({ kind: "checkbox", name, checked });
        }
      }

      setFields(next);
    } catch (e) {
      console.error(e);
      toast({ title: "Invalid PDF", description: "Please upload a valid PDF.", variant: "destructive" });
    }
  };

  const onUploadSignature = async (f: File) => {
    const ok = /image\/(png|jpeg)/i.test(f.type);
    if (!ok) {
      toast({
        title: "Unsupported signature format",
        description: "Please upload a PNG or JPG image.",
        variant: "destructive",
      });
      return;
    }
    setSignatureFile(f);
    setSignatureBytes(new Uint8Array(await f.arrayBuffer()));
  };

  const buildFilledAndSigned = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error("No PDF loaded");

    const doc = await PDFDocument.load(pdfBytes.slice());
    const form = doc.getForm();

    for (const f of fields) {
      if (f.kind === "text") {
        const tf = form.getTextField(f.name);
        tf.setText(f.value);
      }
      if (f.kind === "checkbox") {
        const cb = form.getCheckBox(f.name);
        if (f.checked) cb.check();
        else cb.uncheck();
      }
    }

    // Optional signature stamp: placed on page 1, bottom-right.
    if (signatureBytes && signatureFile) {
      const page = doc.getPages()[0];
      if (!page) throw new Error("PDF has no pages");

      const isPng = /png$/i.test(signatureFile.type);
      const img = isPng ? await doc.embedPng(signatureBytes) : await doc.embedJpg(signatureBytes);

      const { width: pw, height: ph } = page.getSize();
      const margin = 36; // 0.5 inch
      const targetW = (pw * Math.max(5, Math.min(35, signatureScalePct))) / 100;
      const scaled = img.scale(targetW / img.width);

      page.drawImage(img, {
        x: Math.max(margin, pw - margin - scaled.width),
        y: Math.max(margin, margin),
        width: scaled.width,
        height: scaled.height,
      });
    }

    const saved = await doc.save();
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  };

  const preview = async () => {
    if (!pdfBytes) return;
    try {
      setIsWorking(true);
      const bytes = await buildFilledAndSigned();
      const blob = new Blob([u8ToArrayBuffer(bytes)], { type: "application/pdf" });
      setPreviewBytes(bytes);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fill &amp; Sign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill existing form fields and optionally stamp a signature image.
          </p>
        </div>

        <Card className="p-5">
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUploadPdf(f);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={sigInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUploadSignature(f);
              e.currentTarget.value = "";
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2" onClick={() => pdfInputRef.current?.click()} disabled={isWorking}>
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => sigInputRef.current?.click()}
                disabled={!pdfBytes || isWorking}
              >
                Upload signature (PNG/JPG)
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPdfBytes(null);
                  setFields([]);
                  setSignatureFile(null);
                  setSignatureBytes(null);
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
              Upload a PDF with form fields to start.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Form fields</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Text fields and checkboxes are supported in this version.
                  </div>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No supported form fields found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="rounded-md border border-border bg-background p-3">
                        <div className="truncate text-xs font-medium text-muted-foreground">{f.name}</div>
                        {f.kind === "text" ? (
                          <Input
                            className="mt-2"
                            value={f.value}
                            onChange={(e) =>
                              setFields((prev) => {
                                const next = [...prev];
                                const cur = next[idx];
                                if (cur?.kind !== "text") return prev;
                                next[idx] = { ...cur, value: e.target.value };
                                return next;
                              })
                            }
                          />
                        ) : (
                          <label className="mt-2 flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={f.checked}
                              onChange={(e) =>
                                setFields((prev) => {
                                  const next = [...prev];
                                  const cur = next[idx];
                                  if (cur?.kind !== "checkbox") return prev;
                                  next[idx] = { ...cur, checked: e.target.checked };
                                  return next;
                                })
                              }
                            />
                            Checked
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Signature stamp</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Adds your signature image to page 1 bottom-right.
                  </div>
                </div>

                <div className="grid gap-2 sm:max-w-md">
                  <Label htmlFor="sigScale">Signature size (% of page width)</Label>
                  <Input
                    id="sigScale"
                    type="number"
                    min={5}
                    max={35}
                    value={signatureScalePct}
                    onChange={(e) => setSignatureScalePct(Number(e.target.value || 0))}
                  />
                  <div className="text-xs text-muted-foreground">Recommended: 12–22</div>
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Signature file: {signatureFile ? signatureFile.name : "(none)"}
                </div>
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
            <DialogTitle>Preview filled &amp; signed PDF</DialogTitle>
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
