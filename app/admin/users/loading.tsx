import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UsersTableSkeleton } from "@/components/skeletons/users-table-skeleton";

export default function UsersLoading() {
  return (
    <div>
      {/* Header - Static, shows immediately */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <Button asChild>
          <Link href="/admin/users/new">Create User</Link>
        </Button>
      </div>

      {/* Users Table - Skeleton while fetching */}
      <UsersTableSkeleton />
    </div>
  );
}
