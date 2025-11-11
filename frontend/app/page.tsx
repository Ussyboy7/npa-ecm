import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileStack, ShieldCheck, Workflow, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";

const features = [
  {
    title: "Unified Correspondence",
    description:
      "Digitize incoming and outgoing memos with routing intelligence, distribution controls, and digital signatures.",
    icon: FileStack,
  },
  {
    title: "Predictable Workflows",
    description:
      "Configurable approval paths, escalations, and audit trails ensure accountability across directorates.",
    icon: Workflow,
  },
  {
    title: "Enterprise Security",
    description:
      "Granular permissions, DRM policies, and tamper-evident signatures keep sensitive records protected.",
    icon: ShieldCheck,
  },
  {
    title: "Executive Insights",
    description:
      "Real-time dashboards surface bottlenecks, turnaround times, and performance metrics for leadership.",
    icon: BarChart3,
  },
];

const stats = [
  { value: "14+", label: "Directorates and divisions represented" },
  { value: "200+", label: "Documents & correspondence managed" },
  { value: "24/7", label: "Access to routing, approvals, and archives" },
];

const modules = [
  {
    title: "Document Management",
    description:
      "Create, upload, version, and classify official documents with revision history, comments, and workspace collaboration.",
  },
  {
    title: "Digital Signatures",
    description:
      "Apply secure signatures with organization templates, user preferences, and automatic verification trails.",
  },
  {
    title: "Analytics & Reports",
    description:
      "Heatmaps, turnaround trends, and sensitivity dashboards give MD, EDs, and GMs direct visibility into performance.",
  },
  {
    title: "Governance & Compliance",
    description:
      "Hierarchical archives, DRM enforcement, and structured templates keep every directorate aligned with policy.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <header className="border-b border-border/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl shadow-soft ring-1 ring-primary/20 bg-white">
              <Image
                src={NPA_LOGO_URL}
                alt={`${NPA_BRAND_NAME} crest`}
                fill
                className="object-contain"
                sizes="48px"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold uppercase tracking-wide text-primary">
                {NPA_BRAND_NAME}
              </span>
              <span className="text-sm text-muted-foreground">Enterprise Content Management Platform</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              View Modules
            </Link>
            <Button asChild variant="default" className="gap-2">
              <Link href="/login">
                Launch ECM
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto mt-16 flex w-full max-w-6xl flex-col items-center gap-10 px-6 text-center sm:mt-24">
        <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Digital Transformation
        </span>
        <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Streamline NPA correspondence, decisions, and records on a single modern platform.
        </h1>
        <p className="max-w-3xl text-balance text-base text-muted-foreground sm:text-lg">
          NPA ECM unifies routing, approvals, document management, and analytics to give every directorate clarity,
          accountability, and immediate access to institutional memory.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Sign In to ECM
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#features">Explore Capabilities</Link>
          </Button>
        </div>
        <div className="relative w-full rounded-3xl border border-border/60 bg-background/80 p-1 shadow-lg backdrop-blur">
          <div className="rounded-[22px] bg-gradient-to-br from-white via-white to-slate-50 p-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
            <div className="grid gap-6 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/60 bg-background/60 p-6 text-left shadow-sm">
                  <p className="text-3xl font-semibold text-primary">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-left shadow-sm">
                <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">Phase 3+</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Collaboration, OCR, AI summarization, and backend services ready for implementation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto mt-24 w-full max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for enterprise governance</h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Every capability is mapped to NPA&apos;s organizational structure, grade levels, and compliance needs.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-background/60 shadow-sm backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-6">
                <feature.icon className="h-9 w-9 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto mt-24 w-full max-w-6xl px-6">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ECM Modules</h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Modular architecture spans correspondence, digital signatures, archives, analytics, and collaboration,
              ensuring every directorate can work in lockstep.
            </p>
          </div>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/dashboard">
              View Dashboard Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <Card key={module.title} className="group border-border/60 bg-background/70 shadow-sm transition hover:border-primary/40 hover:shadow-lg">
              <CardContent className="flex flex-col gap-3 p-6">
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary">
                  {module.title}
                </h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 w-full max-w-5xl px-6">
        <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 text-center shadow-lg backdrop-blur">
          <h2 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            Ready to experience the NPA ECM workspace?
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Sign in to explore the digital signature module, hierarchical archives, and live analytics dashboards built
            for MD, ED, GM, and AGM flows.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Proceed to Login
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="mailto:ecm-programme@nigerianports.gov.ng">Contact Programme Office</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mt-24 border-t border-border/50 bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 sm:justify-end">
            <Link href="/admin/templates" className="hover:text-foreground">
              Admin Templates
            </Link>
            <Link href="/analytics/executive" className="hover:text-foreground">
              Executive Analytics
            </Link>
            <Link href="/correspondence/inbox" className="hover:text-foreground">
              Correspondence Inbox
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

