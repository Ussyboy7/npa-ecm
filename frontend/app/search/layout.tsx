import MainLayout from "@/components/MainLayout";

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
