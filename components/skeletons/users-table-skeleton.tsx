import { Skeleton } from "@/components/ui/skeleton";

export function UsersTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i}>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-48" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <Skeleton className="h-8 w-24 inline-block" />
                <Skeleton className="h-8 w-16 inline-block" />
                <Skeleton className="h-8 w-24 inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
