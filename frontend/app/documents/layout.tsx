import MainLayout from "@/components/MainLayout";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
