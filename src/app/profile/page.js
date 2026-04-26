"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { getProfile, updateProfile } from "@/lib/api";
import { Toast } from "@/components/Toast";
import { isOwner } from "@/lib/owner-utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Autofill from auth user as soon as available (before profile API loads)
  useEffect(() => {
    if (user) {
      setName((prev) => (prev === "" ? (user?.name ?? "") : prev));
      setEmail((prev) => (prev === "" ? (user?.email ?? "") : prev));
      setPhone((prev) => (prev === "" ? (user?.phone ?? "") : prev));
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push("/login");
      return;
    }
    if (!token) return;
    getProfile(token)
      .then((res) => {
        const data = res?.data ?? res;
        setProfile(data);
        setName(data?.name ?? user?.name ?? "");
        setEmail(data?.email ?? user?.email ?? "");
        setPhone(data?.phone ?? user?.phone ?? "");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, authLoading, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage(null);
    setSaving(true);
    try {
      await updateProfile(token, { name, email, ...(phone !== undefined && { phone }) });
      setSuccessMessage("Profile updated successfully!");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (!isAuthenticated && !profile)) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen bg-[#0a0908] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
        aria-hidden
      />
      <Header variant="marketing" />
      <main className="relative z-10 mx-auto max-w-md px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-semibold text-white">Profile</h1>
        {error && (
          <p className="mb-4 border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/20">
            {error}
          </p>
        )}
        {loading && !user ? (
          <p className="text-white/60">Loading...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-white/70">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-white/70">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-white/70">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-sm bg-accent py-3 text-sm font-semibold uppercase tracking-[0.16em] text-wood-950 transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        )}

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.3)] ring-1 ring-white/10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Account links</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-accent hover:text-white">
              My Orders
            </Link>
            <Link href="/reservations" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-accent hover:text-white">
              My Reservations
            </Link>
            {isOwner(user) && (
              <Link href="/owner/dashboard" className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20">
                Owner Dashboard
              </Link>
            )}
            <Link href="/" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-accent hover:text-white">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Toast
        message={successMessage}
        type="success"
        onClose={() => setSuccessMessage(null)}
        duration={4000}
      />
    </div>
  );
}
