import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileStack, ShieldCheck, Workflow, BarChart3, Building2, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NPA_LOGO_URL, NPA_BRAND_NAME, NPA_ECM_CONTACT_EMAIL } from "@/lib/branding";

const features = [
  {
    title: "Office-Based Routing",
    description:
      "Queues follow MD, ED, GM, and AGM offices—not individuals. Acting officers and successors automatically inherit the same backlog, ensuring seamless handovers.",
    icon: Building2,
  },
  {
    title: "Institutional Memory",
    description:
      "Complete audit trails, soft-delete archives, and Records & Intelligence make every decision searchable and accessible to successors within minutes.",
    icon: FileStack,
  },
  {
    title: "Completion Intelligence",
    description:
      "Completion packages, executive dashboards, and departmental files transform decisions into searchable institutional knowledge instantly.",
    icon: BarChart3,
  },
  {
    title: "Real-Time Collaboration",
    description:
      "WebSocket notifications, live updates, and instant routing ensure MD, ED, GM, and AGM offices stay synchronized across all actions.",
    icon: Workflow,
  },
  {
    title: "Enterprise-Grade Security",
    description:
      "File validation, virus scanning, granular permissions, DRM policies, and tamper-evident signatures protect sensitive records at every level.",
    icon: ShieldCheck,
  },
];

const stats = [
  { value: "8", label: "Directorates unified on a single platform" },
  { value: "23+", label: "Divisions with office-based routing enabled" },
  { value: "100%", label: "Institutional memory preserved through audit trails" },
];

const modules = [
  {
    title: "Correspondence Management",
    description:
      "Register, route, and track all inbound and outbound memos with office-based inboxes, distribution controls, and complete audit trails for MD, ED, GM, and AGM offices.",
  },
  {
    title: "Document Management",
    description:
      "Draft, upload, version, and classify official documents with instant linkage to correspondence, approvals, and hierarchical workspace organization.",
  },
  {
    title: "Workflow & Approvals",
    description:
      "Configurable approval paths, minutes, forwarding, and office reassignment ensure accountability and seamless handovers across directorates.",
  },
  {
    title: "Digital Signatures",
    description:
      "Apply secure signatures with organization templates, user preferences, and automatic verification trails for all approval actions.",
  },
  {
    title: "Analytics & Reports",
    description:
      "Real-time dashboards, turnaround trends, and performance metrics give MD, EDs, and GMs direct visibility into bottlenecks and efficiency.",
  },
  {
    title: "Audit & Compliance",
    description:
      "Complete activity logs, tamper-evident records, and hierarchical archives ensure every action is traceable and compliant with policy.",
  },
];

const deliveryPhases = [
  {
    phase: "Phase 1",
    title: "Digitize & Secure",
    date: "OCT 2025",
    description:
      "Centralized authentication, registry capture, and role-based access so the earliest adopters could register correspondence and search archives without paper files.",
    status: "completed",
  },
  {
    phase: "Phase 2",
    title: "Office-Based Routing",
    date: "OCT 2025",
    description:
      "Introduced office ownership, notifications, reassignment, and My/Office inboxes so MD, ED, GM, and AGM offices could hand over work without losing context.",
    status: "completed",
  },
  {
    phase: "Phase 3",
    title: "Completion & Intelligence",
    date: "NOV 2025",
    description:
      "Completion packages, Records & Intelligence, executive dashboards, and departmental files make every decision auditable and searchable within minutes.",
    status: "completed",
  },
  {
    phase: "Phase 4+",
    title: "Collaboration & AI",
    date: "DEC 2025",
    description:
      "Live co-authoring, OCR, AI summarization, and backend-integrated correspondence services extend the ECM into daily collaboration tools.",
    status: "in-flight",
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
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#phases" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Phases
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
          NPA ECM unifies routing, approvals, document management, and analytics to give every directorate, division and department clarity, accountability, and immediate access to institutional memory.
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/60 bg-background/60 p-6 text-left shadow-sm">
                  <p className="text-3xl font-semibold text-primary">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto mt-24 w-full max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for enterprise governance</h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Unique capabilities designed for NPA&apos;s office-based structure, ensuring seamless handovers, institutional memory, and real-time collaboration across all directorates.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-background/60 shadow-sm backdrop-blur transition hover:border-primary/40 hover:shadow-md">
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

      {/* Delivery Phases */}
      <section id="phases" className="mx-auto mt-24 w-full max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Delivery Phases</h2>
          <p className="mt-4 max-w-3xl mx-auto text-base text-muted-foreground sm:text-lg">
            From digitizing registry operations to completion intelligence, each phase builds on the last and prepares the platform for collaboration, OCR, AI, and backend service integrations.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {deliveryPhases.map((phase) => (
            <Card
              key={phase.phase}
              className={`group border-border/60 bg-background/70 shadow-sm transition hover:border-primary/40 hover:shadow-lg ${
                phase.status === "in-flight" ? "border-primary/30 bg-primary/5" : ""
              }`}
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-primary">{phase.phase}</span>
                      {phase.status === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {phase.status === "in-flight" && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          In Flight
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary mb-2">
                      {phase.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{phase.date}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto mt-24 w-full max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ECM Modules</h2>
          <p className="mt-4 max-w-3xl mx-auto text-base text-muted-foreground sm:text-lg">
            Six integrated modules span correspondence management, document workflows, approvals, digital signatures, analytics, and compliance,
            ensuring every directorate can work in lockstep.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            Sign in to experience office-based inboxes, linked DMS records, and analytics tailored for MD, ED, GM, and AGM
            leadership flows.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Proceed to Login
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`mailto:${NPA_ECM_CONTACT_EMAIL}`}>Contact Programme Office</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mt-24 border-t border-border/50 bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 sm:justify-end">
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="#modules" className="hover:text-foreground">
              Modules
            </Link>
            <Link href="#phases" className="hover:text-foreground">
              Delivery Phases
            </Link>
            <Link href={`mailto:${NPA_ECM_CONTACT_EMAIL}`} className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

