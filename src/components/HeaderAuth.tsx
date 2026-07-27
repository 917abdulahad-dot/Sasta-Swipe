"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderAuth() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    // Check if logged in
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.reload();
  };

  if (user) {
    return (
      <div className="header-auth">
        <span className="user-email">{user.email}</span>
        <button onClick={handleLogout} className="header-logout-btn">Sign Out</button>
      </div>
    );
  }

  return <a href="/login" className="header-login-btn">Sign In</a>;
}
