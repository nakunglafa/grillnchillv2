export async function generateMetadata() {
  const title =
    "My Reservations | Thai Maki";
  const description =
    "View and manage your Thai Maki reservations in Almancil, including upcoming and past bookings.";

  return {
    title,
    description,
    alternates: {
      canonical: "/reservations",
    },
      robots: {
        index: false,
        follow: true,
      },
  };
}

export default function ReservationsLayout({ children }) {
  return children;
}

