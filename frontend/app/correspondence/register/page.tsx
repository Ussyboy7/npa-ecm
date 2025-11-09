"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  Calendar,
  Building2,
  User as UserIcon,
  Mail,
  AlertCircle,
  Send,
  Save
} from 'lucide-react';
import { DIVISIONS, MOCK_USERS, DIRECTORATES } from '@/lib/npa-structure';

const CorrespondenceRegister = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: '',
    senderName: '',
    senderOrganization: '',
    receivedDate: new Date().toISOString().split('T')[0],
    priority: 'normal',
    assignTo: '',
    divisionId: '',
    documentType: 'letter',
    tags: '',
  });

  const executives = MOCK_USERS.filter(u => ['MD', 'ED', 'GM', 'AGM'].includes(u.gradeLevel));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.senderName || !formData.assignTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate reference number
    const refNumber = `NPA/REG/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    toast.success('Correspondence registered successfully', {
      description: `Reference: ${refNumber}`,
    });

    // Navigate to correspondence inbox after short delay
    setTimeout(() => {
      router.push('/correspondence/inbox');
    }, 1500);
  };

  const handleSaveDraft = () => {
    toast.info('Draft saved', {
      description: 'You can continue editing later',
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Register New Correspondence
            </h1>
            <p className="text-muted-foreground mt-1">
              Capture and initiate new inbound or outbound correspondence
            </p>
          </div>
          <ContextualHelp
            title="Registering correspondence"
            description="Fill every required field, attach the source document, and select the first approver. The system generates the reference number automatically."
            steps={[
              'Capture sender details and document type.',
              'Choose the initial executive to receive the memo.',
              'Attach supporting files and register to push into workflow.'
            ]}
          />
        </div>

        <HelpGuideCard
          title="Register New Correspondence"
          description="Capture the subject, sender, priority, and routing details before handing the memo off to the appropriate directorate or division. Upload supporting files and assign next action owners."
          links={[
            { label: "Correspondence Inbox", href: "/correspondence/inbox" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <form onSubmit={handleSubmit}>
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Correspondence Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Upload */}
              <div className="space-y-2">
                <Label htmlFor="document" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document *
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX up to 10MB
                  </p>
                  <input 
                    type="file" 
                    id="document" 
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Subject */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Enter correspondence subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                {/* Sender Name */}
                <div className="space-y-2">
                  <Label htmlFor="senderName" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Sender Name *
                  </Label>
                  <Input
                    id="senderName"
                    placeholder="Enter sender's name"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    required
                  />
                </div>

                {/* Sender Organization */}
                <div className="space-y-2">
                  <Label htmlFor="senderOrganization" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Sender Organization
                  </Label>
                  <Input
                    id="senderOrganization"
                    placeholder="Enter organization name"
                    value={formData.senderOrganization}
                    onChange={(e) => setFormData({ ...formData, senderOrganization: e.target.value })}
                  />
                </div>

                {/* Date Received */}
                <div className="space-y-2">
                  <Label htmlFor="receivedDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Received
                  </Label>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Urgent</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">High</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Normal</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Low</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assign To */}
                <div className="space-y-2">
                  <Label htmlFor="assignTo" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Assign To *
                  </Label>
                  <Select
                    value={formData.assignTo}
                    onValueChange={(value) => {
                      const user = executives.find(u => u.id === value);
                      setFormData({ 
                        ...formData, 
                        assignTo: value,
                        divisionId: user?.division || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select executive" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {DIRECTORATES.map(dir => {
                        const dirExecs = executives.filter(u => {
                          const userDiv = DIVISIONS.find(d => d.id === u.division);
                          return userDiv?.directorateId === dir.id;
                        });
                        
                        if (dirExecs.length === 0) return null;
                        
                        return (
                          <div key={dir.id}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {dir.name}
                            </div>
                            {dirExecs.map(user => {
                              const division = DIVISIONS.find(d => d.id === user.division);
                              return (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.systemRole} - {division?.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Type */}
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="request">Request</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="directive">Directive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., infrastructure, urgent, budget"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Preview Section */}
              {formData.assignTo && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Preview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-medium">Auto-generated on submit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant={
                        formData.priority === 'urgent' ? 'destructive' :
                        formData.priority === 'high' ? 'default' :
                        'secondary'
                      }>
                        {formData.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">
                        {executives.find(u => u.id === formData.assignTo)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Division:</span>
                      <span className="font-medium">
                        {DIVISIONS.find(d => d.id === formData.divisionId)?.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/correspondence/inbox')}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-secondary hover:opacity-90 transition-opacity gap-2"
              >
                <Send className="h-4 w-4" />
                Register & Send
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceRegister;
