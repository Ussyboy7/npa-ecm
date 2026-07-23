"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Printer,
  Link as LinkIcon,
  Edit,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CaseDetail } from "@/lib/npa-structure";
import { appType } from "@/lib/app-type";
import { cn } from "@/lib/utils";

interface CaseHeaderProps {
  caseData: CaseDetail;
  updatingStatus: boolean;
  onStatusUpdate: (status: CaseDetail["status"]) => void;
  onGenerateCompletionPackage: () => void;
  onEdit?: () => void;
  onImport: () => void;
}

export const CaseHeader = ({
  caseData,
  updatingStatus,
  onStatusUpdate,
  onGenerateCompletionPackage,
  onEdit,
  onImport,
}: CaseHeaderProps) => {
  const router = useRouter();

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2 opacity-70" />
            Edit case
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2 opacity-70" />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
            toast.success("Case URL copied to clipboard");
          }}
        >
          <LinkIcon className="h-4 w-4 mr-2 opacity-70" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Upload className="h-4 w-4 mr-2 opacity-70" />
          Import cases
        </DropdownMenuItem>
        {caseData.completionPackage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={caseData.completionPackage.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-2 opacity-70" />
                Download package
              </a>
            </DropdownMenuItem>
          </>
        )}
        {caseData.status === "closed" && !caseData.completionPackage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onGenerateCompletionPackage}>
              <Download className="h-4 w-4 mr-2 opacity-70" />
              Generate package
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="border-b border-border/60 bg-background px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 mt-0.5"
            onClick={() => router.back()}
            aria-label="Back to cases"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className={cn(appType.pageTitle, "truncate font-mono")}>
              {caseData.caseNumber}
            </h1>
            <p className={cn(appType.subject, "mt-1 truncate")}>{caseData.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          <ContextualHelp
            title="Case details"
            description="Manage this case and keep related records together."
            steps={[
              "Use the case file panel for overview and counts.",
              "Use the Links rail to attach correspondence, documents, or forms.",
              "Comments open in a modal; activity and details stay in the rail.",
              "Update status as work progresses and generate a completion package at closure.",
            ]}
          />
          <Select
            value={caseData.status}
            onValueChange={(value) => onStatusUpdate(value as CaseDetail["status"])}
            disabled={updatingStatus}
          >
            <SelectTrigger
              className="w-[132px] h-8 text-xs bg-muted/30 border-dashed"
              aria-label="Case status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {caseData.status === "closed" && !caseData.completionPackage ? (
            <Button size="sm" onClick={onGenerateCompletionPackage}>
              <Download className="h-4 w-4 mr-2" />
              Package
            </Button>
          ) : caseData.completionPackage ? (
            <Button size="sm" asChild>
              <a
                href={caseData.completionPackage.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                Package
              </a>
            </Button>
          ) : null}
          {moreMenu}
        </div>
      </div>
    </div>
  );
};
