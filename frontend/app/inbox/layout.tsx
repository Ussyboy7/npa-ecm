import MainLayout from "@/components/MainLayout";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}