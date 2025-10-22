import MainLayout from "@/components/MainLayout";

export default function RegistryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
