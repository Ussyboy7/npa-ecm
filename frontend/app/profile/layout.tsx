import MainLayout from "@/components/MainLayout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
