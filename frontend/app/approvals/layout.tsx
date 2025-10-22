import MainLayout from "@/components/MainLayout";

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
