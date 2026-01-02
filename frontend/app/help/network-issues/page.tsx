"use client";

import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NetworkIssuesHelpPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/help">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Help
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              Network Connection Issues
            </CardTitle>
            <CardDescription>
              Troubleshooting guide for network and connection errors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Common Causes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Internet connection is unstable or disconnected</li>
                <li>Firewall or network security blocking connections</li>
                <li>Server is temporarily unavailable</li>
                <li>VPN or proxy configuration issues</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Solutions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>Check your internet connection:</strong> Try opening other websites or applications to verify your connection is working.
                </li>
                <li>
                  <strong>Refresh the page:</strong> Click the refresh button or press F5 to reload the page.
                </li>
                <li>
                  <strong>Retry the operation:</strong> Network issues are often temporary. Wait a moment and try again.
                </li>
                <li>
                  <strong>Check firewall settings:</strong> Ensure your firewall isn't blocking connections to the server.
                </li>
                <li>
                  <strong>Contact your administrator:</strong> If the problem persists, contact your system administrator with details about the error.
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/help">Back to Help Center</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


