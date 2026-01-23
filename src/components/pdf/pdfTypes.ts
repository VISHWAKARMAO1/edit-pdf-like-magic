export type PdfTextItemBox = {
  key: string;
  pageNumber: number;
  itemIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  colorHex: string;
  bgColorHex: string;
  /** Data URL (PNG) snapshot of the background under the original text. */
  bgPatchDataUrl?: string;
  padding: number;
};
