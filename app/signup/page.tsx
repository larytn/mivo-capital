"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const router = useRouter();
  const handleSignup = async () => {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      console.log("Response:", data);

      if (!response.ok) {
  alert(data.error || "Signup failed");
  return;
}

alert(data.message);

router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 p-10 rounded-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-green-500 text-center">
          Join Mivo Capital
        </h1>

        <p className="text-gray-400 text-center mt-2">
          Create your trading account
        </p>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-8 p-4 rounded-lg bg-gray-800 text-white outline-none"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-4 p-4 rounded-lg bg-gray-800 text-white outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-4 p-4 rounded-lg bg-gray-800 text-white outline-none"
        />

        <button
          onClick={handleSignup}
          className="w-full mt-6 bg-green-500 text-black font-bold py-4 rounded-lg"
        >
          Create Account
        </button>
      </div>
    </main>
  );
}