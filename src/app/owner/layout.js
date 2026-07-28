import OwnerLayoutClient from "@/components/owner/OwnerLayoutClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Owner",
};

export default function OwnerLayout({ children }) {
  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
