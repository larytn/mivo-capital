"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const handleLogin = async () => {
  try {
    console.log("1. Sending login request...");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    console.log("2. Response status:", response.status);

    const data = await response.json();

    console.log("3. Response data:", data);

    if (!response.ok) {
      alert(data.error || "Login failed");
      return;
    }

    console.log("4. Login successful");

    localStorage.setItem("user", JSON.stringify(data.user));

    console.log("5. Before redirect");

    router.push("/dashboard");

    console.log("6. router.push called");
  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
};

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 p-10 rounded-2xl w-full max-w-md">

        <h1 className="text-4xl font-bold text-green-500 text-center">
          Mivo Capital
        </h1>

        <p className="text-gray-400 text-center mt-2">
          Login to your account
        </p>

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-8 p-4 rounded-lg bg-gray-800 text-white outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-4 p-4 rounded-lg bg-gray-800 text-white outline-none"
        />

        <button
          onClick={handleLogin}
          className="w-full mt-6 bg-green-500 text-black font-bold py-4 rounded-lg hover:bg-green-400"
        >
          Login
        </button>

      </div>
    </main>
  );
}