import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ContentDeliveryStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Active Projects */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            <Skeleton className="h-4 w-24 bg-blue-200" />
          </CardTitle>
          <Skeleton className="h-5 w-5 rounded-full bg-blue-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 bg-blue-200" />
          <Skeleton className="h-3 w-32 mt-2 bg-blue-100" />
        </CardContent>
      </Card>

      {/* Total Episodes Expected */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-purple-900">
            <Skeleton className="h-4 w-28 bg-purple-200" />
          </CardTitle>
          <Skeleton className="h-5 w-5 rounded-full bg-purple-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 bg-purple-200" />
          <Skeleton className="h-3 w-32 mt-2 bg-purple-100" />
        </CardContent>
      </Card>

      {/* Total Episodes Received */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            <Skeleton className="h-4 w-28 bg-green-200" />
          </CardTitle>
          <Skeleton className="h-5 w-5 rounded-full bg-green-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 bg-green-200" />
          <Skeleton className="h-3 w-32 mt-2 bg-green-100" />
        </CardContent>
      </Card>

      {/* Average Completion */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-orange-900">
            <Skeleton className="h-4 w-24 bg-orange-200" />
          </CardTitle>
          <Skeleton className="h-5 w-5 rounded-full bg-orange-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 bg-orange-200" />
          <Skeleton className="h-3 w-32 mt-2 bg-orange-100" />
        </CardContent>
      </Card>

      {/* Total Agreed Value */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-900">
            <Skeleton className="h-4 w-32 bg-emerald-200" />
          </CardTitle>
          <Skeleton className="h-5 w-5 rounded-full bg-emerald-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-24 bg-emerald-200" />
          <Skeleton className="h-3 w-32 mt-2 bg-emerald-100" />
        </CardContent>
      </Card>
    </div>
  );
}