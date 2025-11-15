"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, FileText, HelpCircle, Layers, Mail, ShieldCheck, Users } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, hasTokens } from "@/lib/api-client";

const quickStartSteps = [
  {
    title: "Choose an office or persona",
    detail:
      "Use the Role Switcher (top right) to step into MD, ED, GM, AGM, divisional, or departmental perspectives and inherit their office queue.",
  },
  {
    title: "Confirm the owning office",
    detail:
      "In Correspondence Inbox, filter by office to see what Registry has assigned to MD/ED/GM/AGM seats, including acting officers.",
  },
  {
    title: "Process an approval or minute",
    detail:
      "Open an item, launch the Minute/Approve modal, apply digital signatures, and try upward/downward routing.",
  },
  {
    title: "Explore DMS links, analytics & archives",
    detail:
      "Open linked DMS documents, then review Reports/Analytics for SLAs by office before verifying archive access (department, division, directorate).",
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
    icon: Building2,
    title: "Office Queues",
    description:
      "See what is currently sitting with MD, ED, GM, and AGM offices—acting officers inherit the same queue automatically.",
    links: [
      { label: "Correspondence Inbox", href: "/correspondence/inbox" },
      { label: "Register Office Items", href: "/correspondence/register" },
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

type HelpGuide = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  audience?: string;
  tags?: string[];
  slug: string;
};

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
};

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
    question: "What happens when an office head changes?",
    answer:
      "Correspondence is owned by the office, not the individual. When a GM/ED/MD seat changes hands (or someone acts in the role), the successor inherits the same office queue, minutes, and history automatically.",
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
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<HelpGuide[]>([]);
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleLaunchDashboard = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/dashboard");
  };

  useEffect(() => {
    let ignore = false;

    const toArray = <T,>(payload: unknown): T[] => {
      if (Array.isArray(payload)) return payload as T[];
      if (payload && typeof payload === "object" && "results" in payload) {
        const results = (payload as { results?: unknown }).results;
        if (Array.isArray(results)) return results as T[];
      }
      return [];
    };

    const loadSupportContent = async () => {
      if (!hasTokens()) {
        setGuides([]);
        setFaqs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [guidePayload, faqPayload] = await Promise.all([
          apiFetch("/support/guides/?is_published=true&ordering=title"),
          apiFetch("/support/faqs/?is_active=true&ordering=order"),
        ]);

        if (ignore) return;

        setGuides(toArray<HelpGuide>(guidePayload));
        setFaqs(toArray<FaqEntry>(faqPayload));
      } catch (err) {
        if (ignore) return;
        const message = err instanceof Error ? err.message : "Unable to load help content.";
        setError(message);
        setGuides([]);
        setFaqs([]);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadSupportContent();

    return () => {
      ignore = true;
    };
  }, []);

  const faqsToRender = useMemo(() => (faqs.length > 0 ? faqs : faqItems), [faqs]);

  const categorizedGuides = useMemo(() => {
    if (guides.length === 0) return [] as Array<{ category: string; entries: HelpGuide[] }>;
    const entries = new Map<string, HelpGuide[]>();
    guides.forEach((guide) => {
      const key = guide.category || "general";
      const bucket = entries.get(key) ?? [];
      bucket.push(guide);
      entries.set(key, bucket);
    });
    return Array.from(entries.entries()).map(([category, entries]) => ({
      category,
      entries,
    }));
  }, [guides]);

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
            <h2 className="text-2xl font-semibold tracking-tight">Published Help Guides</h2>
            <p className="text-sm text-muted-foreground">
              Step-by-step walkthroughs and reference material maintained by the ECM support team.
            </p>
          </div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="border-border/60 bg-background/60 shadow-sm">
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : guides.length === 0 ? (
            <Card className="border-border/60 bg-background/60 shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {error ?? "No help guides have been published yet."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {categorizedGuides.map(({ category, entries }) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {category.replace(/-/g, " ")}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {entries.map((guide) => (
                      <Card key={guide.id} className="border-border/60 bg-background/60 shadow-sm">
                        <CardHeader className="space-y-2">
                          <CardTitle className="text-base font-semibold">{guide.title}</CardTitle>
                          {guide.summary && (
                            <CardDescription>{guide.summary}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                          <div dangerouslySetInnerHTML={{ __html: guide.content }} />
                          {guide.tags && guide.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {guide.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground">
              Quick answers to common workflows, permissions, and navigation questions.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqsToRender.map((item) => (
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

