import MainLayout from "@/components/MainLayout";

export default function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
