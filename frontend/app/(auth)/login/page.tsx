"use client";

import { logError } from '@/lib/client-logger';
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { login, clearTokens } from "@/lib/api-client";

type PersonaOption = {
  id: string;
  label: string;
  username: string;
  password: string;
  summary: string;
};

const DEMO_PERSONAS: PersonaOption[] = [
  {
    id: "superadmin",
    label: "Super Admin",
    username: "superadmin",
    password: "ChangeMe123!",
    summary: "Full tenancy access for system administration.",
  },
  {
    id: "user-md",
    label: "Managing Director",
    username: "md",
    password: "ChangeMe123!",
    summary: "Executive dashboard with approvals workload.",
  },
  {
    id: "user-ed-fa",
    label: "Executive Director · Finance & Administration",
    username: "edfa",
    password: "ChangeMe123!",
    summary: "Directorate-level routing and delegation flows.",
  },
  {
    id: "user-gm-ict",
    label: "General Manager · Information & Communication Technology",
    username: "gmict",
    password: "ChangeMe123!",
    summary: "Division leadership view with distribution lists.",
  },
  {
    id: "user-pa-md",
    label: "Personal Assistant · MD",
    username: "pamd",
    password: "ChangeMe123!",
    summary: "Assistant persona with delegated approvals.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personaMap = useMemo(() => new Map(DEMO_PERSONAS.map((persona) => [persona.id, persona])), []);

  useEffect(() => {
    if (!selectedUserId) return;
    const persona = personaMap.get(selectedUserId);
    if (!persona) return;
    setUsername(persona.username);
    setPassword(persona.password);
  }, [personaMap, selectedUserId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      if (!username || !password) {
        toast.error("Enter your username and password.");
        return;
      }

      await login(username, password);

      if (rememberMe) {
        localStorage.setItem("npa_ecm_remember_me", JSON.stringify({ username }));
      } else {
        localStorage.removeItem("npa_ecm_remember_me");
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
    } catch (error) {
      logError(error);
      clearTokens();
      toast.error(
        error instanceof Error ? error.message : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.2fr,1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-emerald-100/30 p-12 text-primary-foreground dark:from-primary/20 dark:via-slate-900 dark:to-slate-950 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/30 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-[0.08]" />
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14">
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              sizes="56px"
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground/90">
              {NPA_BRAND_NAME}
            </p>
            <h1 className="text-2xl font-semibold text-primary-foreground">
              Enterprise Content Management
            </h1>
          </div>
        </div>

        <div className="space-y-6 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
            <ShieldCheck className="h-4 w-4" />
            Secure Workflow Hub
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold leading-tight text-white">
              Digitize, route, and archive NPA correspondence with confidence.
            </h2>
            <p className="text-base text-white/80">
              Unlock enterprise-grade document governance, digital signatures, and leadership dashboards that mirror NPA&apos;s operational structure.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-white/85">
          <p>Contact Programme Office: <a className="underline" href="mailto:ecm-programme@nigerianports.gov.ng">ecm-programme@nigerianports.gov.ng</a></p>
          <p className="text-white/60">© {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to landing
            </Link>
            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-white">
              <Image
                src={NPA_LOGO_URL}
                alt={`${NPA_BRAND_NAME} crest`}
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Sign in to NPA ECM</CardTitle>
              <CardDescription>
                Use your official credentials. For this demo, you may select a persona to auto-fill seeded accounts (passwords are <code>ChangeMe123!</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="superadmin"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select a demo persona</Label>
                  <Select onValueChange={setSelectedUserId} value={selectedUserId ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose grade level / role" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {DEMO_PERSONAS.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{persona.label}</span>
                            <span className="text-xs text-muted-foreground">{persona.summary}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(value) => setRememberMe(Boolean(value))}
                    />
                    Remember me
                  </label>
                  <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Need an account? Contact the registry or programme office to request access.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}