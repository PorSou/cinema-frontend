"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthService } from "@/app/service/auth.service";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = AuthService.getAccessToken();
    const role = AuthService.getUserRole();

    const isAuthorized = !!token && (role === "ADMIN" || role === "STAFF");

    if (!isAuthorized) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, [pathname, router]);

  if (!checked || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0c10]">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return <>{children}</>;
}
