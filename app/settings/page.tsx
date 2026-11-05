"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberAvatar } from "@/app/components/member-avatar";

type SettingsUser = {
  id: string;
  name: string;
  nickname: string;
  avatarUrl: string | null;
  email: string;
  authProvider: string;
  hasPassword: boolean;
  createdAt: string;
};

export default function SettingsPage() {
  const [user, setUser] =
    useState<SettingsUser | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [profileError, setProfileError] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  async function loadSettings() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/settings",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setProfileError(
          data.error ||
            "Failed to load account settings."
        );

        return;
      }

      setUser(data.user);
      setName(data.user.name);
      setNickname(data.user.nickname);
      setAvatarUrl(data.user.avatarUrl ?? null);
    } catch (error) {
      console.error(
        "SETTINGS LOAD ERROR:",
        error
      );

      setProfileError(
        "Failed to load account settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  async function updateProfile() {
    if (!name.trim()) {
      setProfileError("Please enter your full name.");
      return;
    }
    if (!/^[\p{L}\p{N}._-]{3,24}$/u.test(nickname.trim())) {
      setProfileError("Nickname must be 3–24 letters, numbers, dots, underscores or hyphens.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError("");
      setProfileMessage("");

      const response = await fetch(
        "/api/settings",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action: "UPDATE_PROFILE",
            name: name.trim(),
            nickname: nickname.trim(),
            avatarUrl,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setProfileError(
          data.error ||
            "Failed to update profile."
        );

        return;
      }

      setProfileMessage(
        data.message ||
          "Profile updated successfully."
      );

      setUser((current) =>
        current
          ? {
              ...current,
              name: data.user.name,
              nickname: data.user.nickname,
              avatarUrl: data.user.avatarUrl ?? null,
            }
          : current
      );
    } catch (error) {
      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      setProfileError(
        "Something went wrong."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Choose a JPG, PNG or WEBP profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Your profile photo must be 5 MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || typeof data.url !== "string") {
        setProfileError(data.error || "Unable to upload your profile photo.");
        return;
      }
      setAvatarUrl(data.url);
      setProfileMessage("Photo uploaded. Save changes to apply it to your public profile.");
    } catch {
      setProfileError("Unable to upload your profile photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function updatePassword() {
    setPasswordError("");
    setPasswordMessage("");

    if (
      user?.hasPassword &&
      !currentPassword
    ) {
      setPasswordError(
        "Enter your current password."
      );

      return;
    }

    if (!newPassword) {
      setPasswordError(
        "Enter your new password."
      );

      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setPasswordError(
        "New passwords do not match."
      );

      return;
    }

    try {
      setSavingPassword(true);

      const response = await fetch(
        "/api/settings",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action: "CHANGE_PASSWORD",

            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setPasswordError(
          data.error ||
            "Failed to update password."
        );

        return;
      }

      setPasswordMessage(
        data.message ||
          "Password updated successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setUser((current) =>
        current
          ? {
              ...current,
              hasPassword: true,
            }
          : current
      );
    } catch (error) {
      console.error(
        "PASSWORD UPDATE ERROR:",
        error
      );

      setPasswordError(
        "Something went wrong."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400">
            Loading settings...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HEADER */}

      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Settings
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-400 sm:text-base">
                Manage your account information
                and security.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:px-5"
            >
              ← Dashboard
            </Link>

          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">

        {/* ACCOUNT SUMMARY */}

        {user && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">

            <div className="flex items-center gap-4">

              <MemberAvatar name={user.nickname} imageUrl={user.avatarUrl} size={64} className="border-green-500/30 bg-green-500/10 text-lg text-green-400" />

              <div className="min-w-0">

                <h2 className="truncate text-xl font-black sm:text-2xl">
                  @{user.nickname}
                </h2>

                <p className="mt-1 truncate text-xs text-gray-400 sm:text-sm">
                  {user.name} · {user.email}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase text-green-400 sm:text-xs">
                    {user.authProvider ===
                    "GOOGLE"
                      ? "Google Account"
                      : "Email Account"}
                  </span>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-bold text-gray-400 sm:text-xs">
                    Member since{" "}
                    {new Date(
                      user.createdAt
                    ).toLocaleDateString()}
                  </span>

                </div>
              </div>

            </div>
          </section>
        )}

        {/* PROFILE SETTINGS */}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
              Profile
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Public Trader Identity
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
              Choose the nickname and profile photo other traders see in Trader Chat and Community.
            </p>
          </div>

          {profileError && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {profileError}
            </div>
          )}

          {profileMessage && (
            <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              {profileMessage}
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">

            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
              >
                Trader Nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                maxLength={24}
                onChange={(event) => setNickname(event.target.value.replace(/\s/g, ""))}
                aria-describedby="settings-nickname-help"
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition focus:border-green-500"
              />
              <p id="settings-nickname-help" className="mt-2 text-[10px] text-gray-600 sm:text-xs">
                3–24 letters, numbers, dots, underscores or hyphens.
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-4 sm:col-span-2">
              <MemberAvatar name={nickname || name} imageUrl={avatarUrl} size={60} className="text-base" />
              <div className="min-w-0">
                <label htmlFor="avatar-upload" className="inline-flex cursor-pointer rounded-lg border border-zinc-700 px-4 py-2.5 text-xs font-bold transition hover:border-green-500 hover:text-green-400">
                  {uploadingAvatar ? "Uploading photo…" : avatarUrl ? "Change profile photo" : "Add profile photo"}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingAvatar}
                  onChange={(event) => { void uploadAvatar(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}
                />
                <p className="mt-2 text-[10px] text-gray-600 sm:text-xs">JPG, PNG or WEBP · up to 5 MB</p>
              </div>
              {avatarUrl && <button type="button" onClick={() => setAvatarUrl(null)} disabled={uploadingAvatar} className="ml-auto text-xs text-gray-500 transition hover:text-white">Remove photo</button>}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-gray-500 opacity-70"
              />

              <p className="mt-2 text-[10px] text-gray-600 sm:text-xs">
                Email address cannot be changed
                from account settings.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={updateProfile}
            disabled={
              savingProfile ||
              uploadingAvatar ||
              !name.trim() ||
              !nickname.trim()
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {savingProfile
              ? "Saving..."
              : "Save Changes"}
          </button>

        </section>

        {/* SECURITY */}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
              Security
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              {user?.hasPassword
                ? "Change Password"
                : "Create Password"}
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
              {user?.hasPassword
                ? "Change the password used to access your Mivo Capital account."
                : "Your account currently uses Google sign-in. Create a password if you also want to sign in using your email address."}
            </p>
          </div>

          {passwordError && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              {passwordMessage}
            </div>
          )}

          <div className="mt-6 space-y-4">

            {user?.hasPassword && (
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
                >
                  Current Password
                </label>

                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
                >
                  New Password
                </label>

                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                />
              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={updatePassword}
            disabled={
              savingPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {savingPassword
              ? "Updating..."
              : user?.hasPassword
              ? "Change Password"
              : "Create Password"}
          </button>

        </section>

        {/* PASSWORD RESET */}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
            Account Recovery
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Forgot Your Password?
          </h2>

          <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
            You can request a password reset
            link using the email connected to
            your Mivo Capital account.
          </p>

          <Link
            href="/forgot-password"
            className="mt-5 inline-flex rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold transition hover:border-green-500 hover:text-green-400"
          >
            Reset Password
          </Link>

        </section>

      </div>
    </main>
  );
}
