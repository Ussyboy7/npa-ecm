"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Home,
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
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={NPA_LOGO_URL}
                alt={NPA_BRAND_NAME}
                width={40}
                height={40}
                className="rounded"
              />
              <div>
                <h1 className="text-lg font-bold text-white">NPA ECM</h1>
                <p className="text-xs text-slate-400">FOIA Request Portal</p>
              </div>
            </div>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="text-slate-300 border-slate-600 hover:bg-slate-800"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-600/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Request Submitted Successfully</h2>
                <p className="text-slate-400">
                  Your Freedom of Information request has been received.
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Request Number</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {submitted.request_number}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Requester</span>
                  <span className="text-white">{submitted.requester_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Date Submitted</span>
                  <span className="text-white">
                    {formatDate(submitted.received_date)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Please save your request number for future reference. You may be contacted
                if additional information is needed.
              </p>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
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

        <footer className="border-t border-slate-800 mt-16 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Electronic Correspondence Management System
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={NPA_LOGO_URL}
              alt={NPA_BRAND_NAME}
              width={40}
              height={40}
              className="rounded"
            />
            <div>
              <h1 className="text-lg font-bold text-white">NPA ECM</h1>
              <p className="text-xs text-slate-400">FOIA Request Portal</p>
            </div>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="text-slate-300 border-slate-600 hover:bg-slate-800"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-blue-600/20 flex items-center justify-center ring-4 ring-blue-600/10">
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Freedom of Information Request
                      </h2>
                      <p className="text-slate-400">
                        Submit a request for public records under the FOI Act
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-slate-300">
                        Requester Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        value={form.requester_name}
                        onChange={(e) => handleChange("requester_name", e.target.value)}
                        placeholder="John Doe"
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      {errors.requester_name && (
                        <p className="text-xs text-red-400">{errors.requester_name}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Email</Label>
                        <Input
                          type="email"
                          value={form.requester_email}
                          onChange={(e) => handleChange("requester_email", e.target.value)}
                          placeholder="john@example.com"
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                        {errors.requester_email && (
                          <p className="text-xs text-red-400">{errors.requester_email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Phone</Label>
                        <Input
                          type="tel"
                          value={form.requester_phone}
                          onChange={(e) => handleChange("requester_phone", e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Address</Label>
                      <Input
                        value={form.requester_address}
                        onChange={(e) => handleChange("requester_address", e.target.value)}
                        placeholder="Your mailing address"
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Organization</Label>
                      <Input
                        value={form.organization}
                        onChange={(e) => handleChange("organization", e.target.value)}
                        placeholder="Organization name (if applicable)"
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">
                        Description of Documents <span className="text-red-400">*</span>
                      </Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Please describe the documents or information you are requesting..."
                        rows={5}
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      {errors.description && (
                        <p className="text-xs text-red-400">{errors.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Format Preference</Label>
                      <Select
                        value={form.format_preference}
                        onValueChange={(v) => handleChange("format_preference", v)}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronic">Electronic</SelectItem>
                          <SelectItem value="hardcopy">Hard Copy</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5 mr-2" />
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  About FOIA
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
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

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Processing Time
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-500 text-xs font-bold">1</span>
                    </div>
                    <p>Request acknowledgment within 7 days</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-500 text-xs font-bold">2</span>
                    </div>
                    <p>Substantive response within 30 days</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-500 text-xs font-bold">3</span>
                    </div>
                    <p>Extension possible under certain circumstances</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Need Help?
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  If you need assistance with your request, please contact our
                  FOIA officer.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                  asChild
                >
                  <Link href="/verify">
                    <Search className="h-4 w-4 mr-2" />
                    Verify a Document
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Electronic Correspondence Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
