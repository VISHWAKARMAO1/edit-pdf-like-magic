import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Editor from "./pages/Editor";
import Merge from "./pages/Merge";
import AlternateMix from "./pages/AlternateMix";
import Organize from "./pages/Organize";
import Compress from "./pages/Compress";
import ExtractPages from "./pages/ExtractPages";
import DeletePages from "./pages/DeletePages";
import FillSign from "./pages/FillSign";
import CreateForms from "./pages/CreateForms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/alternate-mix" element={<AlternateMix />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/extract" element={<ExtractPages />} />
          <Route path="/delete-pages" element={<DeletePages />} />
          <Route path="/fill-sign" element={<FillSign />} />
          <Route path="/create-forms" element={<CreateForms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
