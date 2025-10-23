import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "@/components/notifications/NotificationContext";
import ToastContainer from "@/components/notifications/ToastContainer";

export const metadata: Metadata = {
  title: "NPA Electronic Content Management",
  description: "Enterprise electronic content management system (ECM) and workflow system for NPA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <NotificationProvider>
          {children}
          <ToastContainer />
        </NotificationProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}







