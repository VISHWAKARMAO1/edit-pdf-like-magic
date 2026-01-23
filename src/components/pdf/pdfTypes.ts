export type PdfTextItemBox = {
  key: string;
  pageNumber: number;
  itemIndex: number;
  text: string;
  fontFamily?: string;
  fontName?: string;
  isBold?: boolean;
  isItalic?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfFontPreset = "auto" | "helvetica" | "times" | "courier";

export type PdfTextEdit = {
  key: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  originalText: string;
  newText: string;
  fontSize: number;
  fontPreset: PdfFontPreset;
  detectedFontFamily?: string;
  /** Best-effort detection from the original PDF font name (e.g. contains Bold/Italic). */
  detectedBold?: boolean;
  detectedItalic?: boolean;
  /** User-controlled styles (default to detected when available). */
  bold: boolean;
  italic: boolean;
  underline: boolean;
  colorHex: string;
  bgColorHex: string;
  /** Data URL (PNG) snapshot of the background under the original text. */
  bgPatchDataUrl?: string;
  padding: number;
};
