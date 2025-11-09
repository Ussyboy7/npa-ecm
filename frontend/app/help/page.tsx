"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, FileText, HelpCircle, Layers, Mail, ShieldCheck, Users } from "lucide-react";

const quickStartSteps = [
  {
    title: "Choose a demo persona",
    detail:
      "Use the Role Switcher (top right) to step into MD, ED, GM, AGM, divisional, or departmental perspectives.",
  },
  {
    title: "Review inbound correspondence",
    detail:
      "Visit Correspondence Inbox to see routing chains, signatures, distribution (CC), and linked DMS documents.",
  },
  {
    title: "Process an approval or minute",
    detail:
      "Open an item, launch the Minute/Approve modal, apply digital signatures, and try upward/downward routing.",
  },
  {
    title: "Explore analytics & archives",
    detail:
      "Check Reports and Performance Analytics for turnaround metrics, then validate archive access (department, division, directorate).",
  },
];

const workspaceHighlights = [
  {
    icon: FileText,
    title: "Correspondence",
    description:
      "Register, route, minute, approve, distribute (CC), print, download, and archive memos with end-to-end visibility.",
    links: [
      { label: "Inbox", href: "/correspondence/inbox" },
      { label: "Register New", href: "/correspondence/register" },
      { label: "Archived", href: "/correspondence/archived" },
    ],
  },
  {
    icon: Layers,
    title: "Document Management",
    description:
      "Create, upload, version, tag metadata, collaborate, compare drafts, and link documents directly back to correspondence.",
    links: [
      { label: "Document Library", href: "/dms" },
      { label: "My Documents", href: "/documents" },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Digital Signatures & Templates",
    description:
      "Manage signatures, template formats, organization defaults, personal overrides, and auto-apply rules for approvals.",
    links: [
      { label: "Signature Settings", href: "/settings" },
      { label: "Admin Templates", href: "/admin/templates" },
    ],
  },
  {
    icon: Users,
    title: "Administration",
    description:
      "Maintain directorates, divisions, departments, assistants, and user assignments aligned with the real NPA structure.",
    links: [
      { label: "Directorates", href: "/admin/directorates" },
      { label: "Divisions", href: "/admin/divisions" },
      { label: "Departments", href: "/admin/departments" },
      { label: "Assistants", href: "/admin/assistants" },
      { label: "User Management", href: "/admin/users" },
    ],
  },
  {
    icon: HelpCircle,
    title: "Analytics & Executive Dashboards",
    description:
      "Surface heatmaps, turnaround SLAs, delayed approvals, sensitivity breakdowns, and drill-down exports for leadership.",
    links: [
      { label: "Performance Analytics", href: "/analytics" },
      { label: "Executive Dashboard", href: "/analytics/executive" },
      { label: "Reports", href: "/reports" },
    ],
  },
];

const faqItems = [
  {
    question: "How do I know which navigation items I should see?",
    answer:
      "Navigation adapts automatically to your grade level. MD/ED/GM see Executive Analytics and Administration. MSS2-MSS4 see Approvals. Officers and below see Correspondence, DMS, My Inbox, and My Documents relevant to their division/department.",
  },
  {
    question: "What’s the difference between Correspondence Inbox, My Inbox, and My Documents?",
    answer:
      "Correspondence Inbox shows items routed to your current persona with full minute threads and CC distribution. My Inbox filters direct tasks/actions awaiting you. My Documents surfaces DMS items you authored, are collaborating on, or have permissions to view.",
  },
  {
    question: "How do archives respect hierarchy?",
    answer:
      "When completing a correspondence you choose Departmental, Divisional, or Directorate archive. Access is automatically limited: department members, division heads, or directorate heads respectively.",
  },
  {
    question: "Where can I update signature templates or organization branding?",
    answer:
      "Go to Settings → Signature for personal signature uploads, template defaults, and auto-apply rules. Organization-wide templates and document branding live under Administration → Templates.",
  },
  {
    question: "Can I link DMS documents to correspondence?",
    answer:
      "Yes. Inside a correspondence detail view, use the Linked Documents panel to attach DMS records, auto-suggested by subject keywords or division/department alignment.",
  },
  {
    question: "Who can I contact for support or onboarding?",
    answer:
      "Reach out to the ECM Programme Office on the contact options below. They coordinate onboarding, permissions, and roadmap discussions.",
  },
];

const supportResources = [
  {
    title: "Programme Office",
    description: "For access requests, onboarding, and workflow configuration support.",
    action: (
      <Button variant="outline" size="sm" asChild>
        <Link href="mailto:ecm-programme@nigerianports.gov.ng">
          <Mail className="mr-2 h-4 w-4" />
          ecm-programme@nigerianports.gov.ng
        </Link>
      </Button>
    ),
  },
  {
    title: "Report an Issue",
    description: "Capture the persona, page, and error message. Screenshots help us reproduce quickly.",
    action: (
      <Button variant="outline" size="sm" asChild>
        <Link href="mailto:ecm-support@nigerianports.gov.ng">
          <Mail className="mr-2 h-4 w-4" />
          ecm-support@nigerianports.gov.ng
        </Link>
      </Button>
    ),
  },
  {
    title: "Suggest an Enhancement",
    description: "We welcome feedback on workflows, analytics, DMS collaboration, and automation ideas.",
    action: (
      <Button variant="outline" size="sm" asChild>
        <Link href="mailto:ecm-feedback@nigerianports.gov.ng">
          <Mail className="mr-2 h-4 w-4" />
          ecm-feedback@nigerianports.gov.ng
        </Link>
      </Button>
    ),
  },
];

export default function HelpAndGuidePage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleLaunchDashboard = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/dashboard");
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="uppercase tracking-[0.35em] text-xs">
              Help & Guide
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">NPA ECM Knowledge Hub</h1>
            <p className="text-muted-foreground max-w-3xl">
              Everything you need to explore the Electronic Content Management workspace—from onboarding
              checklists and feature breakdowns to FAQs and support contacts.
            </p>
          </div>
          <Button variant="default" size="lg" onClick={handleLaunchDashboard} disabled={isNavigating}>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isNavigating ? "Launching..." : "Launch Dashboard"}
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {quickStartSteps.map((step, index) => (
            <Card key={step.title} className="border-border/60 bg-background/60">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Step {index + 1}. {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Workspace Highlights</h2>
            <p className="text-sm text-muted-foreground">
              Jump directly into key ECM modules and understand what each area delivers.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaceHighlights.map((highlight) => (
              <Card key={highlight.title} className="border-border/60 bg-background/70 shadow-sm backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <highlight.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-semibold">{highlight.title}</CardTitle>
                  <CardDescription>{highlight.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {highlight.links.map((link) => (
                    <Button key={link.href} variant="secondary" size="sm" asChild>
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground">
              Quick answers to common workflows, permissions, and navigation questions.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem value={item.question} key={item.question}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Support & Contact</h2>
            <p className="text-sm text-muted-foreground">
              Need more help? Reach out to the programme team—we’re here to guide onboarding, issue resolution, and roadmap requests.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {supportResources.map((resource) => (
              <Card key={resource.title} className="border-border/60 bg-background/70">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base font-semibold">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>{resource.action}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

