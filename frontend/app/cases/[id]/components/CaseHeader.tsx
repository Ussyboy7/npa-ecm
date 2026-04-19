"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  MoreVertical,
  Printer,
  Link as LinkIcon,
  ExternalLink,
  Edit,
  Upload,
  FileText,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { toast } from 'sonner';
import type { CaseDetail } from '@/lib/npa-structure';

interface CaseHeaderProps {
  caseData: CaseDetail;
  slaStatus?: {
    status: 'ok' | 'warning' | 'critical' | 'breach';
    target_date: string;
  } | null;
  slaError?: string | null;
  updatingStatus: boolean;
  exporting: boolean;
  onStatusUpdate: (status: CaseDetail["status"]) => void;
  onGenerateCompletionPackage: () => void;
  onExport: () => void;
  onEdit: () => void;
  onImport: () => void;
  owningOffice?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
}

const getStatusBadgeClass = (status: CaseDetail["status"]) => {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    case "archived":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    default:
      return "bg-muted text-foreground";
  }
};

const getStatusIcon = (status: CaseDetail["status"]) => {
  switch (status) {
    case "open":
      return <Clock className="h-3 w-3" />;
    case "in_progress":
      return <Clock className="h-3 w-3" />;
    case "resolved":
      return <FileText className="h-3 w-3" />;
    case "closed":
      return <FileText className="h-3 w-3" />;
    case "archived":
      return <FileText className="h-3 w-3" />;
    default:
      return null;
  }
};

export const CaseHeader = ({
  caseData,
  slaStatus,
  slaError,
  updatingStatus,
  exporting,
  onStatusUpdate,
  onGenerateCompletionPackage,
  onExport,
  onEdit,
  onImport,
  owningOffice,
  assignedTo,
  createdBy,
}: CaseHeaderProps) => {
  const router = useRouter();

  return (
    <div className="border-b border-border bg-background px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-xl font-bold text-foreground truncate font-mono">
                {caseData.caseNumber}
              </h1>
              {/* Priority badge */}
              <Badge
                variant={
                  caseData.priority === 'urgent'
                    ? 'destructive'
                    : caseData.priority === 'high'
                    ? 'default'
                    : 'secondary'
                }
                className="flex-shrink-0"
              >
                {caseData.priority.toUpperCase()}
              </Badge>
              {/* Status badge */}
              <Badge className={`${getStatusBadgeClass(caseData.status)} flex-shrink-0 gap-1`}>
                {getStatusIcon(caseData.status)}
                <span className="ml-1">
                  {caseData.status.replace("_", " ").toUpperCase()}
                </span>
              </Badge>
              {/* Case Type badge */}
              <Badge variant="outline" className="flex-shrink-0 hidden sm:flex">
                {caseData.caseType?.toUpperCase() ?? "GENERAL"}
              </Badge>
              {/* SLA Status badge */}
              {slaStatus && !slaError && (
                <Badge
                  variant={
                    slaStatus.status === 'breach' ? 'destructive' :
                    slaStatus.status === 'critical' ? 'destructive' :
                    slaStatus.status === 'warning' ? 'default' :
                    'secondary'
                  }
                  className={`flex-shrink-0 ${
                    slaStatus.status === 'breach' ? 'bg-red-600' :
                    slaStatus.status === 'critical' ? 'bg-orange-600' :
                    slaStatus.status === 'warning' ? 'bg-yellow-600' :
                    ''
                  }`}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {slaStatus.status.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
              {caseData.title}
            </p>
            {/* Key metadata */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>Opened: {formatDateShort(caseData.openedAt)}</span>
              </span>
              {owningOffice && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{owningOffice.name}</span>
                </span>
              )}
              {assignedTo && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">Assigned: {assignedTo.name}</span>
                </span>
              )}
              {slaStatus?.target_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Target: {formatDateShort(slaStatus.target_date)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <ContextualHelp
            title="Case details"
            description="View and manage this case. Link correspondence, documents, and forms. Update status and generate completion packages when closed."
            steps={[
              'Use the tabs to view linked correspondence, documents, forms, comments, and timeline.',
              'Click Link Correspondence, Link Document, or Link Form to add items to this case.',
              'Update status as the case progresses; generate a completion package when it is closed.',
            ]}
          />
          <Select
            value={caseData.status}
            onValueChange={(value) => onStatusUpdate(value as CaseDetail["status"])}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[180px]" aria-label="Case status">
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
          {caseData.status === "closed" && !caseData.completionPackage && (
            <Button
              variant="outline"
              onClick={onGenerateCompletionPackage}
              aria-label="Generate completion package"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Package
            </Button>
          )}
          {caseData.completionPackage && (
            <Button
              variant="outline"
              asChild
              aria-label="Download completion package"
            >
              <a
                href={caseData.completionPackage.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Package
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onExport}
            aria-label="Export case"
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success("Case URL copied to clipboard");
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.open(window.location.href, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import Cases
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {caseData.completionPackage && (
                <DropdownMenuItem asChild>
                  <a
                    href={caseData.completionPackage.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Completion Package
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Mobile action menu */}
        <div className="md:hidden flex items-center gap-1 flex-shrink-0">
          <ContextualHelp
            title="Case details"
            description="View and manage this case. Link correspondence, documents, and forms. Update status and generate completion packages when closed."
            steps={[
              'Use the tabs to view linked correspondence, documents, forms, comments, and timeline.',
              'Click Link Correspondence, Link Document, or Link Form to add items to this case.',
              'Update status as the case progresses; generate a completion package when it is closed.',
            ]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

