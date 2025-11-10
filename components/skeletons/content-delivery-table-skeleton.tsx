import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ContentDeliveryTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Writer</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead>Agreed Price</TableHead>
            <TableHead>Episodes</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Time Slot</TableHead>
            <TableHead>Contract Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div>
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}