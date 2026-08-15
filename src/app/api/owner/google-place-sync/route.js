import { NextResponse } from "next/server";
import {
  fetchOwnerGooglePlace,
  getMyRestaurants,
  getOwnerWebsiteContent,
  getRestaurantById,
  updateOpeningSlots,
  updateOwnerRestaurant,
  updateOwnerWebsiteContent,
} from "@/lib/api";
import {
  extractWebsiteContentJson,
  formattedAddressFromPlace,
  periodsToOpeningSlots,
  resolvePlaceId,
} from "@/lib/google-places";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function restaurantsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.restaurants)) return payload.restaurants;
  return [];
}

async function assertOwnsRestaurant(token, restaurantId) {
  try {
    const mine = await getMyRestaurants(token);
    const list = restaurantsFromPayload(mine);
    if (list.some((r) => String(r?.id) === String(restaurantId))) return true;
    if (list.length > 0) return false;
  } catch {
    // Fall through to a direct restaurant fetch with the owner token.
  }
  const data = await getRestaurantById(restaurantId, token);
  const rest = data?.restaurant ?? data?.data ?? data;
  return Boolean(rest?.id || rest?.name);
}

export async function POST(request) {
  const token = bearerToken(request);
  if (!token) {
    return json({ error: "You must be logged in as the restaurant owner." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const restaurantId = String(body?.restaurantId ?? "").trim();
  if (!restaurantId) {
    return json({ error: "restaurantId is required." }, 400);
  }

  try {
    const owns = await assertOwnsRestaurant(token, restaurantId);
    if (!owns) {
      return json({ error: "You do not have access to this restaurant." }, 403);
    }
  } catch (err) {
    const status = err?.status === 401 ? 401 : 403;
    return json({ error: err?.message || "Could not verify owner access." }, status);
  }

  let contentJson = {};
  try {
    const contentRes = await getOwnerWebsiteContent(token, restaurantId);
    contentJson = extractWebsiteContentJson(contentRes);
  } catch {
    contentJson = {};
  }

  const placeId = resolvePlaceId(contentJson, body?.placeId);
  if (!placeId) {
    return json({ error: "Save a Google Place ID first." }, 400);
  }

  let laravelPayload;
  try {
    laravelPayload = await fetchOwnerGooglePlace(token, restaurantId, placeId, true);
  } catch (err) {
    const status = err?.status === 404 ? 502 : err?.status || 502;
    return json(
      {
        error:
          err?.data?.error ||
          err?.data?.message ||
          err?.message ||
          "Laravel Google Place endpoint is not available",
        googleMessage: err?.data?.googleMessage,
      },
      status >= 400 && status < 600 ? status : 502
    );
  }

  const place = laravelPayload?.place || laravelPayload;
  if (!place || typeof place !== "object") {
    return json({ error: "Laravel returned no Google Place data." }, 502);
  }

  const slots = periodsToOpeningSlots(place.regularOpeningHours);
  if (slots.length === 0) {
    return json(
      { error: "Google returned no opening hours for this Place ID." },
      422
    );
  }

  try {
    await updateOpeningSlots(token, restaurantId, { slots });
  } catch (err) {
    return json(
      { error: err?.data?.message || err?.message || "Failed to save opening hours." },
      err?.status || 502
    );
  }

  const address = formattedAddressFromPlace(place);
  if (address) {
    try {
      const restRes = await getRestaurantById(restaurantId, token, true);
      const rest = restRes?.data ?? restRes?.restaurant ?? restRes ?? {};
      await updateOwnerRestaurant(
        restaurantId,
        {
          name: rest.name || "",
          phone: rest.phone || "",
          google_business_url: rest.google_business_url || "",
          address,
        },
        token
      );
    } catch (err) {
      console.error("Google sync saved hours but failed to update address:", err);
    }
  }

  const syncedAt = new Date().toISOString();
  const nextContent = {
    ...contentJson,
    google_place_id: placeId,
    google_place_synced_at: syncedAt,
  };
  try {
    await updateOwnerWebsiteContent(token, restaurantId, nextContent);
  } catch (err) {
    console.error("Google sync saved hours but failed to store Place ID:", err);
  }

  return json({
    ok: true,
    placeId,
    slots,
    address: address || null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || [],
    syncedAt,
  });
}
