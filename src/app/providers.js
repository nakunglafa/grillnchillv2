"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { OrderingHoursProvider } from "@/context/OrderingHoursContext";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { RealTimeNotificationProvider } from "@/context/RealTimeNotificationContext";
import { LiveNotificationToast } from "@/components/LiveNotificationToast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { CartFloatingButton } from "@/components/CartFloatingButton";
import { PwaServiceWorkerRegister } from "@/components/PwaServiceWorkerRegister";
import { PwaOwnerLaunchResume } from "@/components/PwaOwnerLaunchResume";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "missing-client-id";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <RestaurantProvider>
            <PwaOwnerLaunchResume />
            <OrderingHoursProvider>
              <CartProvider>
                <RealTimeNotificationProvider>
                  <PwaServiceWorkerRegister />
                  {children}
                  <LiveNotificationToast />
                </RealTimeNotificationProvider>
                <CartFloatingButton />
              </CartProvider>
            </OrderingHoursProvider>
          </RestaurantProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </SessionProvider>
  );
}
