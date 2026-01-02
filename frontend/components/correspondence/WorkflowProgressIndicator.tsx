"use client";

import { useMemo } from "react";
import { Check, Clock, Circle, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Correspondence, Minute, User, Office, OfficeMembership } from "@/lib/npa-structure";

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
  { grade: 'GMCS', role: 'General Manager', shortName: 'GM' },
  { grade: 'MSS2', role: 'Asst. General Manager', shortName: 'AGM' },
  { grade: 'MSS3', role: 'Manager', shortName: 'MGR' },
  { grade: 'SSS1', role: 'Senior Officer', shortName: 'SO' },
  { grade: 'SSS2', role: 'Officer', shortName: 'OFF' },
];

// Determine workflow type based on correspondence flow
function detectWorkflowType(minutes: Minute[], users: User[]): 'upward' | 'downward' | 'lateral' | 'mixed' {
  if (minutes.length < 2) return 'mixed';
  
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
  isMdDirectorate: boolean
): { grade: string; role: string; shortName: string }[] {
  if (!currentApprover) return [];
  
  const currentGradeIdx = GRADE_HIERARCHY.findIndex(
    g => g.grade === currentApprover.gradeLevel
  );
  
  if (currentGradeIdx < 0) return [];
  
  // For MD directorate, skip ED level
  let relevantGrades = GRADE_HIERARCHY.filter(g => {
    if (isMdDirectorate && g.grade === 'EDCS') return false;
    return true;
  });
  
  if (flowType === 'upward') {
    // Show path from current to MD
    return relevantGrades.slice(0, currentGradeIdx + 1).reverse();
  } else if (flowType === 'downward') {
    // Show path from MD to current
    return relevantGrades.slice(currentGradeIdx);
  }
  
  // Mixed/lateral - show surrounding levels
  const start = Math.max(0, currentGradeIdx - 1);
  const end = Math.min(relevantGrades.length, currentGradeIdx + 3);
  return relevantGrades.slice(start, end);
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
    const flowType = detectWorkflowType(minutes, users);
    
    // Check if in MD directorate (no ED level)
    const isMdDirectorate = currentApprover?.directorate?.includes('Managing Director') || 
                           currentApprover?.directorate?.includes('MD') ||
                           false;
    
    const suggestedSteps = getSuggestedWorkflow(currentApprover, flowType, isMdDirectorate);
    
    // Build workflow steps with status
    const steps: WorkflowStep[] = suggestedSteps.map((step, index) => {
      // Find users who actioned at this grade level
      const usersAtGrade = minutes
        .map(m => {
          const user = users.find(u => u.id === m.userId);
          return { minute: m, user };
        })
        .filter(({ user }) => user?.gradeLevel === step.grade || 
                             (step.grade === 'MSS1' && user?.gradeLevel === 'GMCS') ||
                             (step.grade === 'GMCS' && user?.gradeLevel === 'MSS1'));
      
      const isCurrentLevel = currentApprover?.gradeLevel === step.grade ||
                            (step.grade === 'MSS1' && currentApprover?.gradeLevel === 'GMCS') ||
                            (step.grade === 'GMCS' && currentApprover?.gradeLevel === 'MSS1');
      
      const hasActioned = usersAtGrade.length > 0;
      const lastAction = usersAtGrade[usersAtGrade.length - 1];
      
      let status: WorkflowStep['status'] = 'pending';
      if (isCurrentLevel && !hasActioned) {
        status = 'current';
      } else if (hasActioned) {
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
          // Get office name from user's primary office membership (most accurate)
          officeName: getUserOfficeName(currentApprover.id, officeMemberships, offices) ||
                      // Fallback to correspondence office if user office not found
                      correspondence.currentOfficeName ||
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
        workflowName = 'MD Directorate Approval (AGM → GM → MD)';
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
  }, [correspondence, minutes, currentApprover, users]);

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
                          {new Date(step.completedAt).toLocaleDateString()}
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
                        {new Date(step.completedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
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
      </CardContent>
    </Card>
  );
}

