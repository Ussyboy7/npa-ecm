import MainLayout from "@/components/MainLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
