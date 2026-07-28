"use client";

import { useMemo } from "react";
import { Check, Clock, Circle, AlertTriangle, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Correspondence, Minute, User, Office, OfficeMembership } from "@/lib/npa-structure";
import { formatDateShort } from '@/lib/datetime';

interface WorkflowStep {
  id: string;
  title: string;
  role: string;
  gradeLevel: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  user?: {
    name: string;
    officeName?: string;
  };
  completedAt?: string;
  timeAtStep?: number; // days
}

interface WorkflowProgressIndicatorProps {
  correspondence: Correspondence;
  minutes: Minute[];
  currentApprover?: User | null;
  users: User[];
  offices?: Office[];
  officeMemberships?: OfficeMembership[];
  className?: string;
}

// Helper to get user's primary office name
function getUserOfficeName(
  userId: string | undefined,
  officeMemberships: OfficeMembership[] = [],
  offices: Office[] = []
): string | undefined {
  if (!userId) return undefined;
  
  // Find primary office membership for this user
  const primaryMembership = officeMemberships.find(
    (m) => m.userId === userId && m.isPrimary && m.isActive
  );
  
  if (!primaryMembership) return undefined;
  
  // Find the office
  const office = offices.find((o) => o.id === primaryMembership.officeId);
  return office?.name;
}

// Grade level hierarchy (highest to lowest)
const GRADE_HIERARCHY = [
  { grade: 'MDCS', role: 'Managing Director', shortName: 'MD' },
  { grade: 'EDCS', role: 'Executive Director', shortName: 'ED' },
  { grade: 'MSS1', role: 'General Manager', shortName: 'GM' },
  { grade: 'MSS2', role: 'Assistant General Manager', shortName: 'AGM' },
  { grade: 'MSS3', role: 'Principal Manager', shortName: 'PM' },
  { grade: 'MSS4', role: 'Senior Manager', shortName: 'SM' },
  { grade: 'MSS5', role: 'Manager', shortName: 'MGR' },
  { grade: 'SSS1', role: 'Assistant Manager', shortName: 'AM' },
  { grade: 'SSS2', role: 'Senior Officer', shortName: 'SO' },
  { grade: 'SSS3', role: 'Officer I', shortName: 'OFF1' },
  { grade: 'SSS4', role: 'Officer II', shortName: 'OFF2' },
  { grade: 'JSS1', role: 'Staff I', shortName: 'ST1' },
  { grade: 'JSS2', role: 'Staff II', shortName: 'ST2' },
  { grade: 'JSS3', role: 'Staff III', shortName: 'ST3' },
];

// Determine workflow type based on correspondence flow
function detectWorkflowType(minutes: Minute[], users: User[], correspondence: Correspondence): 'upward' | 'downward' | 'lateral' | 'mixed' {
  if (minutes.length < 2) {
    if (correspondence.direction === 'upward') return 'upward';
    if (correspondence.direction === 'downward') return 'downward';
    return 'mixed';
  }
  
  const gradeOrder = (grade: string) => {
    const idx = GRADE_HIERARCHY.findIndex(g => g.grade === grade);
    return idx >= 0 ? idx : 999;
  };
  
  let upwardCount = 0;
  let downwardCount = 0;
  
  for (let i = 1; i < minutes.length; i++) {
    const prevUser = users.find(u => u.id === minutes[i - 1].userId);
    const currUser = users.find(u => u.id === minutes[i].userId);
    
    if (prevUser && currUser) {
      const prevOrder = gradeOrder(prevUser.gradeLevel || '');
      const currOrder = gradeOrder(currUser.gradeLevel || '');
      
      if (currOrder < prevOrder) upwardCount++;
      else if (currOrder > prevOrder) downwardCount++;
    }
  }
  
  if (upwardCount > downwardCount) return 'upward';
  if (downwardCount > upwardCount) return 'downward';
  return 'mixed';
}

// Get suggested workflow steps based on current approver's position
function getSuggestedWorkflow(
  currentApprover: User | null | undefined,
  flowType: 'upward' | 'downward' | 'lateral' | 'mixed',
  isMdDirectorate: boolean,
  minutes: Minute[],
  users: User[],
  originGradeLevel: string | undefined,
): { grade: string; role: string; shortName: string }[] {
  if (!currentApprover) return [];

  // Filter out ED level for MD directorate
  const hierarchy = GRADE_HIERARCHY.filter(g => {
    if (isMdDirectorate && g.grade === 'EDCS') return false;
    return true;
  });

  const currentIdx = hierarchy.findIndex(g => g.grade === currentApprover.gradeLevel);
  if (currentIdx < 0) return [];

  if (flowType === 'upward') {
    // Include grades from the lowest minuted level up through current
    const minuteGradeIndices = minutes
      .map(m => {
        const user = users.find(u => u.id === m.userId);
        return user?.gradeLevel ? hierarchy.findIndex(g => g.grade === user.gradeLevel) : -1;
      })
      .filter(i => i >= 0);

    const originGradeIdx = originGradeLevel ? hierarchy.findIndex(g => g.grade === originGradeLevel) : -1;
    const lowestRelevantIdx = Math.max(currentIdx, ...minuteGradeIndices, originGradeIdx);
    return hierarchy.slice(0, lowestRelevantIdx + 1).reverse();
  }

  if (flowType === 'downward') {
    return hierarchy.slice(currentIdx);
  }

  // Mixed/lateral - show surrounding levels
  const start = Math.max(0, currentIdx - 1);
  const end = Math.min(hierarchy.length, currentIdx + 3);
  return hierarchy.slice(start, end);
}

export function WorkflowProgressIndicator({
  correspondence,
  minutes,
  currentApprover,
  users,
  offices = [],
  officeMemberships = [],
  className,
}: WorkflowProgressIndicatorProps) {
  // Determine workflow type and suggested flow
  const workflowAnalysis = useMemo(() => {
    const flowType = detectWorkflowType(minutes, users, correspondence);
    
    // Check if in MD directorate (no ED level in the same directorate)
    const isMdDirectorate = currentApprover?.gradeLevel === 'MDCS' ||
      (!!currentApprover?.directorate &&
        !users.some(u =>
          u.directorate === currentApprover.directorate &&
          u.gradeLevel === 'EDCS'
        ) && currentApprover?.gradeLevel !== 'EDCS');
    
    // Find the origin creator's grade level (the user who first created the correspondence)
    const originUser = correspondence.createdById
      ? users.find(u => u.id === correspondence.createdById)
      : undefined;
    const originGradeLevel = originUser?.gradeLevel;
    
    const suggestedSteps = getSuggestedWorkflow(currentApprover, flowType, isMdDirectorate, minutes, users, originGradeLevel);
    
    // Build workflow steps with status
    const steps: WorkflowStep[] = suggestedSteps.map((step, index) => {
      // Find users who actioned at this grade level
      const usersAtGrade = minutes
        .map(m => {
          const user = users.find(u => u.id === m.userId);
          return { minute: m, user };
        })
        .filter(({ user }) => user?.gradeLevel === step.grade);
      
      const isCurrentLevel = currentApprover?.gradeLevel === step.grade;
      
      const hasActioned = usersAtGrade.length > 0;
      const lastAction = usersAtGrade[usersAtGrade.length - 1];
      
      let status: WorkflowStep['status'] = 'pending';
      if (isCurrentLevel && !hasActioned) {
        status = 'current';
      } else if (hasActioned) {
        status = 'completed';
      } else if (originGradeLevel && step.grade === originGradeLevel) {
        status = 'completed';
      }
      
      // Calculate time at step if current
      let timeAtStep: number | undefined;
      if (status === 'current') {
        const lastMinute = minutes[minutes.length - 1];
        if (lastMinute?.timestamp) {
          const lastActionDate = new Date(lastMinute.timestamp);
          const now = new Date();
          timeAtStep = Math.floor((now.getTime() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        id: `step-${index}`,
        title: step.role,
        role: step.role,
        gradeLevel: step.grade,
        status,
        user: lastAction?.user ? {
          name: lastAction.user.name,
          officeName: lastAction.minute.fromOfficeName || lastAction.minute.toOfficeName,
        } : isCurrentLevel && currentApprover ? {
          name: currentApprover.name,
          officeName: getUserOfficeName(currentApprover.id, officeMemberships, offices) ||
                      correspondence.currentOfficeName ||
                      correspondence.owningOfficeName,
        } : originGradeLevel && step.grade === originGradeLevel && originUser ? {
          name: originUser.name,
          officeName: getUserOfficeName(originUser.id, officeMemberships, offices) ||
                      correspondence.owningOfficeName,
        } : undefined,
        completedAt: lastAction?.minute.timestamp,
        timeAtStep,
      };
    });
    
    // Determine workflow name
    let workflowName = 'Standard Flow';
    if (flowType === 'upward') {
      if (isMdDirectorate) {
        workflowName = 'MD Directorate Approval (Asst. GM → GM → MD)';
      } else {
        workflowName = 'Standard Upward Approval';
      }
    } else if (flowType === 'downward') {
      if (isMdDirectorate) {
        workflowName = 'MD Directorate Assignment';
      } else {
        workflowName = 'Downward Assignment';
      }
    }
    
    return {
      flowType,
      workflowName,
      steps,
      isMdDirectorate,
    };
  }, [correspondence, minutes, currentApprover, users, officeMemberships, offices]);

  const { steps, workflowName, flowType } = workflowAnalysis;
  
  // Don't show if no meaningful steps
  if (steps.length < 2) {
    return null;
  }

  const currentStepIndex = steps.findIndex(s => s.status === 'current');
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5 truncate">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">Workflow Progress</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {flowType === 'upward' ? '↑' : flowType === 'downward' ? '↓' : '↔'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{workflowName}</p>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{completedSteps} of {steps.length} steps</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-[15px] top-[20px] bottom-[20px] w-0.5 bg-muted" />
          
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3 relative">
                  {/* Step Icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                          step.status === 'completed' && "bg-green-500 border-green-500 text-white",
                          step.status === 'current' && "bg-primary border-primary text-primary-foreground animate-pulse",
                          step.status === 'pending' && "bg-background border-muted-foreground/30 text-muted-foreground",
                          step.status === 'skipped' && "bg-amber-100 border-amber-400 text-amber-600"
                        )}
                      >
                        {step.status === 'completed' ? (
                          <Check className="h-4 w-4" />
                        ) : step.status === 'current' ? (
                          <Clock className="h-4 w-4" />
                        ) : step.status === 'skipped' ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{step.title}</p>
                      {step.user && (
                        <>
                          <p className="text-xs">{step.user.name}</p>
                          {step.user.officeName && (
                            <p className="text-xs text-muted-foreground">{step.user.officeName}</p>
                          )}
                        </>
                      )}
                      {step.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(step.completedAt)}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm truncate",
                        step.status === 'current' && "text-primary",
                        step.status === 'completed' && "text-green-600 dark:text-green-400",
                        step.status === 'pending' && "text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                      {step.status === 'current' && (
                        <Badge variant="default" className="text-[10px] h-5 flex-shrink-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    {step.user && (
                      <p className="text-xs text-muted-foreground truncate" title={step.user.officeName}>
                        {step.user.name}
                      </p>
                    )}
                    
                    {step.status === 'current' && step.timeAtStep !== undefined && (
                      <p className={cn(
                        "text-xs mt-0.5",
                        step.timeAtStep > 2 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {step.timeAtStep === 0 ? 'Today' : 
                         step.timeAtStep === 1 ? '1 day' : 
                         `${step.timeAtStep} days`}
                        {step.timeAtStep > 2 && (
                          <span className="ml-1">⚠️</span>
                        )}
                      </p>
                    )}
                    
                    {step.status === 'completed' && step.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(step.completedAt)}
                      </p>
                    )}
                  </div>

                  {/* Arrow to next */}
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-2 hidden" />
                  )}
                </div>
              ))}
            </div>
        </div>

        {/* Status Summary - compact */}
        {currentStepIndex >= 0 && steps[currentStepIndex] && (
          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="truncate" title={steps[currentStepIndex].user?.officeName}>
              <span className="text-foreground font-medium">
                {steps[currentStepIndex].user?.name || steps[currentStepIndex].title}
              </span>
              {steps[currentStepIndex].timeAtStep !== undefined && steps[currentStepIndex].timeAtStep! > 0 && (
                <span className={cn("ml-2", steps[currentStepIndex].timeAtStep! > 2 && "text-amber-600")}>
                  • {steps[currentStepIndex].timeAtStep}d
                  {steps[currentStepIndex].timeAtStep! > 2 && " ⚠️"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dispatch Progress Summary */}
        {(() => {
          const nonRecalledMinutes = minutes.filter(m => !m.isRecalled);
          const dispatchedMinutes = nonRecalledMinutes.filter(m => m.dispatchedAt);
          const acknowledgedMinutes = nonRecalledMinutes.filter(m => m.acknowledgedAt);
          
          if (dispatchedMinutes.length === 0) return null;
          
          const allAcknowledged = dispatchedMinutes.length === acknowledgedMinutes.length;
          
          return (
            <div className="mt-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs">
                {allAcknowledged ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-success font-medium">
                      All {dispatchedMinutes.length} minute{dispatchedMinutes.length > 1 ? 's' : ''} acknowledged
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-info" />
                    <span className="text-muted-foreground">
                      {acknowledgedMinutes.length}/{dispatchedMinutes.length} minutes acknowledged
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

