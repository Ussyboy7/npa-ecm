'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, MapPin, User, Calendar } from 'lucide-react';

interface PhysicalDocument {
  id: string;
  tracking_number: string;
  status: string;
  location?: { display_name: string };
  checked_out_to?: { name: string };
  created_at: string;
}

interface PhysicalCopySectionProps {
  documents: PhysicalDocument[];
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  filed: 'default',
  checked_out: 'secondary',
  archived: 'outline',
  destroyed: 'destructive',
  missing: 'destructive',
};

export function PhysicalCopySection({ documents }: PhysicalCopySectionProps) {
  if (!documents || documents.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Physical Copies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-col gap-1 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium">{doc.tracking_number}</span>
              <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>
                {doc.status.replace('_', ' ')}
              </Badge>
            </div>
            {doc.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {doc.location.display_name}
              </div>
            )}
            {doc.checked_out_to && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {doc.checked_out_to.name}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Registered {new Date(doc.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
