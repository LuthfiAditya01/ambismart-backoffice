"use client";

import { verifySession } from "@/api/authCollection";
import { useRouter } from "next/navigation"; // ✓ Import tempat yang bener
import { useState, useEffect } from "react";
import { __DEV__ } from "./envValue";

export default function AuthContext({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true); // ✓ Tambah loading state buat UX

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await verifySession();
        __DEV__ && console.log("Auth check response:", JSON.stringify(response));
        
        if (response.status === 200) {
          setIsAuthenticated(true);
          console.log("User is authenticated, allowing access.");
        } else {
          setIsAuthenticated(false);
          console.log("Session invalid, redirecting to login...");
          router.replace("/login"); // ✓ Pake replace biar ga bisa di-back user
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        router.replace("/login");
      } finally {
        setIsLoading(false); // ✓ Kelar nge-cek, matiin loading-nya
      }
    };

    checkAuth();
  }, [router]);

  // Pas lagi loading ngecek session, tampilin loading screen biar rapi
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
        <p className="text-sm font-mono animate-pulse">Verifying session...</p>
      </div>
    );
  }

  // Kalau terbukti authenticated, baru aman buat render isi apps-nya
  return <>{children}</>;
}