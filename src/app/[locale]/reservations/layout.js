export async function generateMetadata() {
  const title = "My Reservations";
  const description =
    "View and manage your Grill N Chill reservations, including upcoming and past bookings.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ReservationsLayout({ children }) {
  return children;
}
