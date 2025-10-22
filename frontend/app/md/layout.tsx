import MainLayout from "@/components/MainLayout";

export default function MDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
