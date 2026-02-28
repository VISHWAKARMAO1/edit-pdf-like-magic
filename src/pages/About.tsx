
import React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const teamMembers = [
  {
    name: "Jane Doe",
    role: "Lead Developer",
    avatar: "https://github.com/shadcn.png",
    bio: "Jane is a passionate developer with a love for creating intuitive and powerful user experiences.",
  },
  {
    name: "John Smith",
    role: "UX/UI Designer",
    avatar: "https://github.com/shadcn.png",
    bio: "John has a keen eye for design and is dedicated to making our tools beautiful and easy to use.",
  },
  {
    name: "Peter Jones",
    role: "Backend Engineer",
    avatar: "https://github.com/shadcn.png",
    bio: "Peter ensures that our application is fast, reliable, and secure.",
  },
];

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28">
      <TopNav />
      <main className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">
            About Dr. PDF Pro
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            We are a team of passionate developers dedicated to creating the best tools to help you with your PDF needs. Our mission is to provide easy-to-use, reliable, and powerful utilities to make your life easier.
          </p>
        </div>

        <section className="mt-24">
          <h2 className="text-center text-4xl font-bold tracking-tight">Our Team</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {teamMembers.map((member) => (
              <Card key={member.name} className="glass p-8 text-center rounded-2xl transform hover:-translate-y-2 transition-transform">
                <Avatar className="mx-auto h-32 w-32 border-4 border-primary/10">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mt-6 text-2xl font-semibold">{member.name}</h3>
                <p className="text-md text-primary font-semibold">{member.role}</p>
                <p className="mt-4 text-muted-foreground">{member.bio}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-24 text-center glass p-16 rounded-2xl">
           <h2 className="text-4xl font-bold tracking-tight">Our Mission</h2>
           <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
            To empower users with simple, effective, and accessible tools for managing their documents. We believe that working with PDFs should be a seamless and productive experience, not a frustrating one.
          </p>
        </section>

      </main>
    </div>
  );
};

export default About;
