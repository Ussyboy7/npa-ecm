import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  FileStack,
  ShieldCheck,
  Workflow,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Shield,
  Lock,
} from "lucide-react";
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
    title: "Real-Time Updates",
    description:
      "WebSocket notifications and live routing status keep MD, ED, GM, and AGM offices aligned. Document collaboration uses comments and presence—not live multi-user editing.",
    icon: Workflow,
  },
  {
    title: "Document Rights (DRM)",
    description:
      "ICT-managed policies for view-only access, download and print controls, expiry, and watermark text stamped on PDFs when served from ECM—enforced at the platform boundary.",
    icon: Lock,
  },
  {
    title: "Enterprise-Grade Security",
    description:
      "File validation, optional ClamAV scanning, role-based access, JWT authentication, executive seal TOTP, and tamper-evident audit exports.",
    icon: ShieldCheck,
  },
];

const stats = [
  { value: "One", label: "Platform for HQ and port registry operations" },
  { value: "Office", label: "Queues owned by MD, ED, GM, and AGM offices—not individuals" },
  { value: "Audit", label: "Trails, archives, and compliance exports built in" },
];

const moduleBands = [
  {
    title: "Work",
    description: "Day-to-day correspondence, documents, cases, and leadership visibility.",
    modules: [
      {
        title: "Correspondence",
        description:
          "Register and route inward and outward memos with office inboxes, My Sent / Office Sent, distribution controls, and full audit trails.",
      },
      {
        title: "Document Management",
        description:
          "Versioned DMS library with preview workspaces, linked records, sensitivity labels, and server-enforced DRM policies on download.",
      },
      {
        title: "Case Management",
        description:
          "Case file workspace linking correspondence, documents, and forms—with comments, activity, and a unified links rail.",
      },
      {
        title: "Workflow & Approvals",
        description:
          "Minutes, forwarding, parallel routing, office reassignment, and executive approval queues.",
      },
      {
        title: "Analytics & Reports",
        description:
          "Executive, division, performance, and case dashboards with turnaround and bottleneck visibility.",
      },
      {
        title: "Digital Signatures",
        description:
          "Organization templates, user preferences, executive seals, and public seal verification.",
      },
    ],
  },
  {
    title: "Registry & compliance",
    description: "Legal requests, physical tracking, governance, and discovery.",
    modules: [
      {
        title: "FOIA",
        description:
          "Freedom of Information request intake, legal timelines, acknowledge/respond workflows, and public submission portal.",
      },
      {
        title: "Physical Records",
        description:
          "Check-in and check-out tracking for registry desks—linked to correspondence where applicable.",
      },
      {
        title: "Audit & Compliance",
        description:
          "Activity logs, tamper-evident compliance exports, retention schedules, legal holds, and eDiscovery bundles.",
      },
      {
        title: "Search & Discovery",
        description:
          "Cross-module full-text search with permission-aware results. Optional semantic re-ranking—no separate AI server required.",
      },
    ],
  },
  {
    title: "Operations",
    description: "Capture, support, forms, and integration administration.",
    modules: [
      {
        title: "Content Capture",
        description:
          "Scan, batch upload, and OCR processing hub. Production scanner integration is part of the national rollout.",
      },
      {
        title: "Helpdesk & Support",
        description:
          "In-app support tickets for all staff and an ICT support queue—aligned with national rollout and hypercare.",
      },
      {
        title: "Forms & Templates",
        description:
          "Form documents, template hub, and signature workflows for structured registry processes.",
      },
      {
        title: "Integration Hub",
        description:
          "Webhooks and connector administration in ECM. Email and ERP sync connectors are rolling out in Phase 5+.",
      },
    ],
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
    phase: "Phase 4",
    title: "Governance & Quality",
    date: "JUN 2026",
    description:
      "Substantially delivered: audit compliance exports, document version diff, DRM policy admin with download enforcement and PDF watermark on serve, helpdesk, WCAG 2.1 AA high and medium remediations, and legacy import tooling. Retention enforcement hardening and formal accessibility sign-off continue.",
    status: "completed",
  },
  {
    phase: "Phase 5+",
    title: "Enterprise Hardening",
    date: "2026–2027",
    description:
      "Rolling out SSO/Active Directory, login MFA, integration connectors (email, ERP, HRMS), capture hub production scanners, E2E/load testing, and national port deployment.",
    status: "in-flight",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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
                unoptimized
                sizes="48px"
                className="object-contain"
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Modules
            </Link>
            <Link href="#phases" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Phases
            </Link>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/verify">
                <Shield className="h-4 w-4" />
                Verify Seal
              </Link>
            </Button>
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
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Secure Workflow Hub
        </span>
        <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Accountability for leadership. Clarity for officers. Institutional memory for the Authority.
        </h1>
        <p className="max-w-3xl text-balance text-base text-muted-foreground sm:text-lg">
          Office-owned correspondence, decisions, forms, and executive approvals, with immediate access to institutional memory across NPA&apos;s structure.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Sign In to ECM
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/verify">
              <Shield className="h-5 w-5" />
              Verify Seal
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
            Capabilities designed for NPA&apos;s office-based structure—seamless handovers, institutional memory, and live routing notifications across directorates.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            From digitizing registry operations through governance and quality—each phase builds on the last, with enterprise identity and national rollout next.
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
      <section id="modules" className="mx-auto mt-24 w-full max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ECM Modules</h2>
          <p className="mt-4 max-w-3xl mx-auto text-base text-muted-foreground sm:text-lg">
            Work, registry, and operations capabilities—organized the way staff navigate the platform after sign-in.
          </p>
        </div>
        <div className="space-y-14">
          {moduleBands.map((band) => (
            <div key={band.title}>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground">{band.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{band.description}</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {band.modules.map((module) => (
                  <Card key={module.title} className="group border-border/60 bg-background/70 shadow-sm transition hover:border-primary/40 hover:shadow-lg">
                    <CardContent className="flex flex-col gap-3 p-6">
                      <h4 className="text-lg font-semibold text-foreground group-hover:text-primary">
                        {module.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-6">
        <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 text-center shadow-lg backdrop-blur">
          <h2 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            Ready to transform your ECM workflow?
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Sign in for office-based inboxes, DMS and case workspaces, DRM-protected documents, and analytics tailored for MD, ED, GM, and AGM leadership flows.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Proceed to Login
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/foia/public">Public FOIA Portal</Link>
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
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="#modules" className="hover:text-foreground">
              Modules
            </Link>
            <Link href="#phases" className="hover:text-foreground">
              Delivery Phases
            </Link>
            <Link href="/foia/public" className="hover:text-foreground">
              FOIA Portal
            </Link>
            <Link href="/verify" className="hover:text-foreground flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Verify Seal
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
