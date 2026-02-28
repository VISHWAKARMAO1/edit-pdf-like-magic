import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/card";

const tools = [
  {
    name: "Alternate & Mix",
    description: "Combine pages from multiple PDFs in an alternating sequence.",
    howTo: "1. Upload two or more PDF files. 2. Drag and drop pages to reorder them. 3. Choose the mixing sequence. 4. Click 'Mix' to get the final PDF.",
  },
  {
    name: "Compress",
    description: "Reduce the file size of a PDF.",
    howTo: "1. Upload a PDF file. 2. Choose a compression level (e.g., low, medium, high). 3. Click 'Compress' to reduce the file size. 4. Download the compressed PDF.",
  },
  {
    name: "Create Forms",
    description: "Add interactive form fields to a PDF.",
    howTo: "1. Upload a PDF. 2. From the toolbar, select a form field type (text, checkbox, etc.). 3. Click and drag on the page to place the field. 4. Save the PDF to create the form.",
  },
  {
    name: "Delete Pages",
    description: "Remove specific pages from a PDF.",
    howTo: "1. Upload a PDF. 2. Hover over a page thumbnail and click the 'delete' icon. 3. Repeat for all pages you want to remove. 4. Click 'Save' to get the new PDF without the deleted pages.",
  },
  {
    name: "Extract Pages",
    description: "Select and export specific pages from a PDF into a new document.",
    howTo: "1. Upload a PDF. 2. Select the pages you want to extract by clicking on their thumbnails. 3. Click the 'Extract' button. 4. A new PDF containing only the selected pages will be created.",
  },
  {
    name: "Fill & Sign",
    description: "Fill out PDF forms and add a digital signature.",
    howTo: "1. Upload a PDF form. 2. Click on the form fields to fill them with text. 3. To sign, click the 'Sign' tool, create your signature, and place it on the document. 4. Download the filled and signed PDF.",
  },
  {
    name: "Merge",
    description: "Combine multiple PDFs into a single document.",
    howTo: "1. Upload multiple PDF files or images. 2. Drag and drop the files to set the desired order. 3. Click the 'Merge' button to combine them into a single PDF. 4. Download the merged file.",
  },
  {
    name: "OCR",
    description: "Extract text from scanned PDFs or images.",
    howTo: "1. Upload a scanned PDF or an image file. 2. Select the language of the text in the document. 3. Click 'Start OCR'. 4. The tool will process the file and make the text selectable and searchable.",
  },
  {
    name: "Organize",
    description: "Reorder, rotate, or delete pages in a PDF.",
    howTo: "1. Upload a PDF. 2. Drag and drop page thumbnails to reorder them. 3. Use the rotate buttons on each thumbnail to change page orientation. 4. Click 'Save' to apply the changes.",
  },
  {
    name: "Protect",
    description: "Add a password to protect a PDF.",
    howTo: "1. Upload a PDF file. 2. Enter a strong password in the provided field. 3. Re-enter the password to confirm. 4. Click 'Protect' to encrypt the PDF.",
  },
  {
    name: "Unlock",
    description: "Remove a password from a PDF.",
    howTo: "1. Upload a password-protected PDF. 2. Enter the correct password when prompted. 3. Click 'Unlock'. 4. The password will be removed, and you can download the unprotected PDF.",
  },
  {
    name: "Watermark",
    description: "Add a text or image watermark to a PDF.",
    howTo: "1. Upload a PDF. 2. Choose to add a text or image watermark. 3. Enter your text or upload your image. 4. Adjust the position, size, and opacity. 5. Click 'Add Watermark'.",
  },
];

export default function BrowseTools() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Browse Tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            An overview of the available tools and how to use them.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card key={tool.name} className="p-5">
              <h2 className="text-lg font-semibold">{tool.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
              <h3 className="mt-4 font-semibold text-sm">How to use:</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tool.howTo}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
