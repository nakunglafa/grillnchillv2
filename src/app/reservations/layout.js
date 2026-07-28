export async function generateMetadata() {
  const title = "My Reservations | Grill N Chill";
  const description =
    "View and manage your Grill N Chill reservations, including upcoming and past bookings.";

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
