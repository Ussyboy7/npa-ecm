import MainLayout from "@/components/MainLayout";

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
