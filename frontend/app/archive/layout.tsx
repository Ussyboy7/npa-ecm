import MainLayout from "@/components/MainLayout";

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
