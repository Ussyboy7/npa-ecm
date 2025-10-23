"use client";

import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface WorkflowStep {
  id: number;
  name: string;
  description?: string;
  status: "completed" | "current" | "pending" | "rejected";
  assignee?: string;
  completedAt?: string;
  dueDate?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep: number;
  className?: string;
}

export default function WorkflowStepper({ steps, currentStep, className = "" }: WorkflowStepperProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
        <div className="text-sm text-gray-600">
          Step {currentStep} of {steps.length}
        </div>
      </div>

      <div className="relative">
        {/* Connection lines */}
        {steps.length > 1 && (
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />
        )}

        <div className="space-y-8">
          {steps.map((step, index) => {
            let stepIcon, stepColor, stepBgColor;
            
            switch (step.status) {
              case "completed":
                stepIcon = CheckCircle;
                stepColor = "text-green-600";
                stepBgColor = "bg-green-600";
                break;
              case "current":
                stepIcon = Clock;
                stepColor = "text-blue-600";
                stepBgColor = "bg-blue-600";
                break;
              case "rejected":
                stepIcon = AlertCircle;
                stepColor = "text-red-600";
                stepBgColor = "bg-red-600";
                break;
              default:
                stepIcon = Clock;
                stepColor = "text-gray-400";
                stepBgColor = "bg-gray-300";
            }

            const IconComponent = stepIcon;

            return (
              <div key={step.id} className="relative flex items-start">
                {/* Step indicator */}
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 z-10">
                  {step.status === "completed" ? (
                    <IconComponent className="h-6 w-6 text-green-600" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full ${stepBgColor} flex items-center justify-center`}>
                      <IconComponent className={`h-4 w-4 ${step.status === "current" ? "text-white" : stepColor}`} />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="ml-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`text-base font-medium ${
                        step.status === "completed" ? "text-gray-900" :
                        step.status === "current" ? "text-blue-900" :
                        step.status === "rejected" ? "text-red-900" :
                        "text-gray-500"
                      }`}>
                        {step.name}
                      </h4>
                      
                      {step.description && (
                        <p className={`mt-1 text-sm ${
                          step.status === "completed" ? "text-gray-600" :
                          step.status === "current" ? "text-blue-700" :
                          "text-gray-400"
                        }`}>
                          {step.description}
                        </p>
                      )}

                      {/* Step details */}
                      <div className="mt-2 space-y-1">
                        {step.assignee && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Assigned to:</span> {step.assignee}
                          </p>
                        )}
                        
                        {step.completedAt && step.status === "completed" && (
                          <p className="text-xs text-green-600">
                            Completed on {new Date(step.completedAt).toLocaleDateString()}
                          </p>
                        )}
                        
                        {step.dueDate && step.status !== "completed" && (
                          <p className={`text-xs ${
                            step.status === "rejected" ? "text-red-500" : "text-gray-500"
                          }`}>
                            Due: {new Date(step.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        step.status === "completed" 
                          ? "bg-green-100 text-green-800"
                          : step.status === "current"
                          ? "bg-blue-100 text-blue-800"
                          : step.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {step.status === "completed" && "Completed"}
                        {step.status === "current" && "In Progress"}
                        {step.status === "rejected" && "Rejected"}
                        {step.status === "pending" && "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {steps.filter(step => step.status === "completed").length} of {steps.length} steps completed
          </span>
          <span className="font-medium text-gray-900">
            {Math.round((steps.filter(step => step.status === "completed").length / steps.length) * 100)}%
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(steps.filter(step => step.status === "completed").length / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
