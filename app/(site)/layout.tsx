import { InstallTip } from "@/components/InstallTip";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap">{children}</main>
      <SiteFooter />
      <InstallTip />
    </>
  );
}
