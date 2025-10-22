'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Send, 
  Eye, 
  MessageSquare,
  Calendar,
  Building,
  AlertCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  role: string;
  person: string;
  department: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  timestamp?: string;
  comments?: string;
  action?: string;
}

interface MemoData {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  currentStep: number;
  workflow: WorkflowStep[];
}

const initialMemo: MemoData = {
  id: 'MEMO-2024-001',
  title: 'Request for Software Development Tools Upgrade',
  content: `Dear Management,

I am writing to request approval for upgrading our software development tools and infrastructure to improve productivity and security.

Current Issues:
- Outdated IDE versions affecting development efficiency
- Security vulnerabilities in current toolchain
- Limited collaboration features in existing tools

Proposed Solution:
- Upgrade to latest Visual Studio Code with enterprise extensions
- Implement GitLab for better version control and CI/CD
- Add security scanning tools and code quality checkers

Budget Estimate: ₦2,500,000
Timeline: 3 months implementation

This upgrade will significantly improve our development capabilities and align with modern software development practices.

Best regards,
John Adebayo
Software Development Officer`,
  author: 'John Adebayo',
  authorRole: 'Officer',
  department: 'Software Applications & Database Management',
  priority: 'high',
  createdAt: '2024-12-16 09:00:00',
  currentStep: 0,
  workflow: [
    {
      id: 'step-1',
      role: 'Officer',
      person: 'John Adebayo',
      department: 'Software Applications & Database Management',
      status: 'completed',
      timestamp: '2024-12-16 09:00:00',
      action: 'Created and submitted memo'
    },
    {
      id: 'step-2',
      role: 'AGM',
      person: 'Dr. Sarah Okafor',
      department: 'Software Applications & Database Management',
      status: 'in-progress',
      action: 'Reviewing technical requirements and budget'
    },
    {
      id: 'step-3',
      role: 'GM',
      person: 'Engr. Michael Johnson',
      department: 'Information & Communication Technology',
      status: 'pending',
      action: 'Awaiting AGM approval'
    },
    {
      id: 'step-4',
      role: 'MD',
      person: 'Alhaji Mohammed Bello',
      department: 'Headquarters',
      status: 'pending',
      action: 'Final approval required'
    }
  ]
};

export default function MemoWorkflowSimulation() {
  const [memo, setMemo] = useState<MemoData>(initialMemo);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const simulateWorkflow = async () => {
    setIsSimulating(true);
    
    // Step 1: AGM Review and Approval
    await new Promise(resolve => setTimeout(resolve, 2000));
    setMemo(prev => ({
      ...prev,
      workflow: prev.workflow.map((step, index) => 
        index === 1 
          ? { 
              ...step, 
              status: 'completed' as const,
              timestamp: new Date().toLocaleString(),
              comments: 'Approved. The proposed tools upgrade aligns with our digital transformation goals. Budget is reasonable and timeline is achievable.',
              action: 'Approved with minor budget adjustments'
            }
          : index === 2 
          ? { ...step, status: 'in-progress' as const, action: 'Reviewing AGM recommendation' }
          : step
      ),
      currentStep: 2
    }));

    // Step 2: GM ICT Review and Forward to MD
    await new Promise(resolve => setTimeout(resolve, 3000));
    setMemo(prev => ({
      ...prev,
      workflow: prev.workflow.map((step, index) => 
        index === 2 
          ? { 
              ...step, 
              status: 'completed' as const,
              timestamp: new Date().toLocaleString(),
              comments: 'Strongly recommend approval. This upgrade is critical for our software development capabilities and will enhance security posture. Forwarding to MD for final approval.',
              action: 'Approved and forwarded to MD'
            }
          : index === 3 
          ? { ...step, status: 'in-progress' as const, action: 'Reviewing GM recommendation' }
          : step
      ),
      currentStep: 3
    }));

    // Step 3: MD Final Approval
    await new Promise(resolve => setTimeout(resolve, 2500));
    setMemo(prev => ({
      ...prev,
      workflow: prev.workflow.map((step, index) => 
        index === 3 
          ? { 
              ...step, 
              status: 'completed' as const,
              timestamp: new Date().toLocaleString(),
              comments: 'Approved. This investment in our software development infrastructure is essential for maintaining our competitive edge. Proceed with implementation.',
              action: 'Final approval granted'
            }
          : step
      ),
      currentStep: 4
    }));

    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setMemo(initialMemo);
    setCurrentStepIndex(0);
    setShowComments({});
  };

  const toggleComments = (stepId: string) => {
    setShowComments(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Memo Workflow Simulation</h1>
          <p className="text-gray-600">Interactive demonstration of approval chain: Officer → AGM → GM ICT → MD</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={simulateWorkflow}
            disabled={isSimulating}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isSimulating ? 'Simulating...' : 'Start Simulation'}
          </button>
          <button
            onClick={resetSimulation}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>
      </div>

      {/* Memo Details */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{memo.title}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">ID: {memo.id}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(memo.priority)}`}>
                  {memo.priority.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Created</div>
            <div className="text-sm font-medium">{memo.createdAt}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900">{memo.author}</div>
              <div className="text-sm text-gray-500">{memo.authorRole}</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900">{memo.department}</div>
              <div className="text-sm text-gray-500">Department</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900">3-5 days</div>
              <div className="text-sm text-gray-500">Expected Timeline</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Memo Content</h3>
          <div className="text-sm text-gray-700 whitespace-pre-line">{memo.content}</div>
        </div>
      </div>

      {/* Workflow Visualization */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Workflow</h3>
        
        <div className="space-y-4">
          {memo.workflow.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connection Line */}
              {index < memo.workflow.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
              )}
              
              <div className="flex items-start space-x-4">
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${getStatusColor(step.status)}`}>
                  {getStatusIcon(step.status)}
                </div>
                
                {/* Step Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{step.role}</h4>
                      <p className="text-sm text-gray-600">{step.person}</p>
                      <p className="text-xs text-gray-500">{step.department}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(step.status)}`}>
                        {step.status.replace('-', ' ').toUpperCase()}
                      </span>
                      {step.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">{step.timestamp}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">{step.action}</p>
                  </div>
                  
                  {/* Comments */}
                  {step.comments && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleComments(step.id)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {showComments[step.id] ? 'Hide Comments' : 'View Comments'}
                      </button>
                      {showComments[step.id] && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-700">{step.comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{memo.workflow.length}</div>
            <div className="text-sm text-gray-500">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {memo.workflow.filter(step => step.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {memo.workflow.filter(step => step.status === 'in-progress').length}
            </div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {memo.workflow.filter(step => step.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Simulation Status */}
      {isSimulating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800 font-medium">Simulation in progress...</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Processing approval workflow. Each step will be completed with realistic timing.
          </p>
        </div>
      )}
    </div>
  );
}
