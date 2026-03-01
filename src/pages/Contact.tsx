import React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/card";

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28">
      <TopNav />
      <main className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
        <div className="mx-auto text-center">
          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">Contact</h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Have questions, feedback, or partnership inquiries? Reach out anytime.
          </p>
        </div>

        <Card className="mt-12 glass rounded-2xl p-8 md:p-10">
          <div className="space-y-4 text-base md:text-lg">
            <p>
              <strong>Email:</strong> support@drpdfpro.com
            </p>
            <p>
              <strong>Website:</strong> drpdfpro.com
            </p>
            <p>
              <strong>Response time:</strong> Within 24-48 hours
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Contact;
