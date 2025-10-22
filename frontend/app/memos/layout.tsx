import MainLayout from "@/components/MainLayout";

export default function MemosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
