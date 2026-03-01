import { useEffect, useRef } from "react";
import { NavLink } from "@/components/NavLink";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gsap } from "gsap";

const Index = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const gradientRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (gradientRef.current) {
        gsap.to(gradientRef.current, {
          backgroundPosition: "200% 50%",
          duration: 16,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
      }

      gsap.from(".home-reveal", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power2.out",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav variant="home" />

      <main>
        <section ref={heroRef} className="relative overflow-hidden">
          <div
            ref={gradientRef}
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(120deg, hsla(259, 95%, 65%, 0.28), hsla(215, 90%, 60%, 0.24), hsla(190, 90%, 55%, 0.2), hsla(259, 95%, 65%, 0.28))",
              backgroundSize: "200% 200%",
              backgroundPosition: "0% 50%",
            }}
          />

          <div className="container relative mx-auto max-w-6xl px-4 py-32 md:py-44">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="home-reveal text-balance text-5xl font-extrabold tracking-tight md:text-7xl">
                Smart PDF workflows, simplified
              </h1>
              <p className="home-reveal mt-6 text-pretty text-lg text-muted-foreground md:text-xl">
                Dr PDF Pro helps you edit, organize, secure, and manage PDF files quickly without complex desktop software.
              </p>

              <div className="home-reveal mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="px-8 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
                  <NavLink to="/browse-tools" activeClassName="">
                    Get Started
                  </NavLink>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
                  alt: "Modern team planning workflow",
                },
                {
                  src: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80",
                  alt: "Document review and editing process",
                },
                {
                  src: "https://images.unsplash.com/photo-1551281044-8b5bd28f6a77?auto=format&fit=crop&w=1200&q=80",
                  alt: "Analytics and productivity dashboard",
                },
              ].map((image) => (
                <Card key={image.src} className="home-reveal overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-0">
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="h-52 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section ref={sectionRef} className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="home-reveal rounded-2xl border border-border/60 bg-card/85 p-6">
                <h2 className="text-lg font-semibold">What this website is about</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Dr PDF Pro is a focused web platform for essential PDF workflows: editing, form handling, organization, and export in a clean browser experience.
                </p>
              </Card>

              <Card className="home-reveal rounded-2xl border border-border/60 bg-card/85 p-6">
                <h2 className="text-lg font-semibold">What problem it solves</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  It removes the need for heavy desktop tools and fragmented utilities by centralizing practical PDF tasks in one consistent, fast, and easy interface.
                </p>
              </Card>

              <Card className="home-reveal rounded-2xl border border-border/60 bg-card/85 p-6">
                <h2 className="text-lg font-semibold">Who developed it</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Developed by ankit vishwakarma.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60 bg-background/80">
          <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold">Dr PDF Pro</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Professional PDF productivity workspace for fast, reliable, browser-based document tasks.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Navigation</h4>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <NavLink to="/" className="hover:text-foreground transition-colors" activeClassName="text-foreground">Home</NavLink>
                <NavLink to="/browse-tools" className="hover:text-foreground transition-colors" activeClassName="text-foreground">Tools</NavLink>
                <NavLink to="/about" className="hover:text-foreground transition-colors" activeClassName="text-foreground">About</NavLink>
                <NavLink to="/contact" className="hover:text-foreground transition-colors" activeClassName="text-foreground">Contact</NavLink>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Developer</h4>
              <p className="mt-3 text-sm text-muted-foreground">ankit vishwakarma</p>
            </div>
          </div>

          <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dr PDF Pro. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
