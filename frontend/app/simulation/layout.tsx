import MainLayout from "@/components/MainLayout";

export default function SimulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
