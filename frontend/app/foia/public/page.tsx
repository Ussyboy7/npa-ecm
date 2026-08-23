"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Info,
  Shield,
  Clock,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicPortalShell } from "@/components/shared/PublicPortalShell";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/datetime";

interface FormData {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requester_address: string;
  organization: string;
  description: string;
  format_preference: string;
}

interface FormErrors {
  requester_name?: string;
  description?: string;
  requester_email?: string;
}

interface SuccessResponse {
  id: string;
  request_number: string;
  requester_name: string;
  received_date: string;
}

export default function PublicFOIAPage() {
  const [form, setForm] = useState<FormData>({
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    requester_address: "",
    organization: "",
    description: "",
    format_preference: "electronic",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SuccessResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.requester_name.trim()) {
      newErrors.requester_name = "Requester name is required";
    }
    if (!form.description.trim()) {
      newErrors.description = "Description of documents is required";
    }
    if (form.requester_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requester_email)) {
      newErrors.requester_email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiFetch<SuccessResponse>(
        "/correspondence/foia-requests/",
        {
          method: "POST",
          body: JSON.stringify(form),
        }
      );
      setSubmitted(response);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <PublicPortalShell portalSubtitle="FOIA Request Portal">
        <main className="container mx-auto max-w-2xl px-4 py-12">
          <Card>
            <CardContent className="space-y-6 p-8 text-center">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600/10 ring-4 ring-emerald-600/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-500" />
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">
                  Request Submitted Successfully
                </h2>
                <p className="text-muted-foreground">
                  Your Freedom of Information request has been received.
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Request Number</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {submitted.request_number}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requester</span>
                  <span className="text-foreground">{submitted.requester_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date Submitted</span>
                  <span className="text-foreground">
                    {formatDate(submitted.received_date)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Please save your request number for future reference. You may be contacted
                if additional information is needed.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(null);
                  setForm({
                    requester_name: "",
                    requester_email: "",
                    requester_phone: "",
                    requester_address: "",
                    organization: "",
                    description: "",
                    format_preference: "electronic",
                  });
                }}
              >
                Submit Another Request
              </Button>
            </CardContent>
          </Card>
        </main>
      </PublicPortalShell>
    );
  }

  return (
    <PublicPortalShell portalSubtitle="FOIA Request Portal">
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="space-y-3 text-center">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/10">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Freedom of Information Request
                      </h2>
                      <p className="text-muted-foreground">
                        Submit a request for public records under the FOI Act
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label>
                        Requester Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.requester_name}
                        onChange={(e) => handleChange("requester_name", e.target.value)}
                        placeholder="John Doe"
                      />
                      {errors.requester_name && (
                        <p className="text-xs text-destructive">{errors.requester_name}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={form.requester_email}
                          onChange={(e) => handleChange("requester_email", e.target.value)}
                          placeholder="john@example.com"
                        />
                        {errors.requester_email && (
                          <p className="text-xs text-destructive">{errors.requester_email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={form.requester_phone}
                          onChange={(e) => handleChange("requester_phone", e.target.value)}
                          placeholder="+234 800 000 0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        value={form.requester_address}
                        onChange={(e) => handleChange("requester_address", e.target.value)}
                        placeholder="Your mailing address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Input
                        value={form.organization}
                        onChange={(e) => handleChange("organization", e.target.value)}
                        placeholder="Organization name (if applicable)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Description of Documents <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Please describe the documents or information you are requesting..."
                        rows={5}
                      />
                      {errors.description && (
                        <p className="text-xs text-destructive">{errors.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Format Preference</Label>
                      <Select
                        value={form.format_preference}
                        onValueChange={(v) => handleChange("format_preference", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronic">Electronic</SelectItem>
                          <SelectItem value="hardcopy">Hard Copy</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-5 w-5" />
                          Submit FOIA Request
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Info className="h-5 w-5 text-primary" />
                  About FOIA
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The Freedom of Information Act gives you the right to access
                    information held by public institutions.
                  </p>
                  <p>
                    Please provide as much detail as possible about the records
                    you are seeking to help us process your request efficiently.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  Processing Time
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <p>Request acknowledgment within 7 days</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <p>Substantive response within 30 days</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <p>Extension possible under certain circumstances</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  Need Help?
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  If you need assistance with your request, please contact our
                  FOIA officer.
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/verify">
                    <Search className="mr-2 h-4 w-4" />
                    Verify a Document
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </PublicPortalShell>
  );
}
