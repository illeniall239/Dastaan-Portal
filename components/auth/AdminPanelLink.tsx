"use client";

import { RequireRole } from "./RequireRole";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AdminPanelLink() {
  return (
    <RequireRole allowedRoles={["admin"]}>
      <Button asChild variant="outline" className="h-auto py-4">
        <Link href="/admin/users">
          <div className="text-left">
            <div className="font-semibold">Admin Panel</div>
            <div className="text-sm text-muted-foreground">
              Manage users and settings
            </div>
          </div>
        </Link>
      </Button>
    </RequireRole>
  );
}
