import MainLayout from "@/components/MainLayout";

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
