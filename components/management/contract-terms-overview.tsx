import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, TrendingUp, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface ContractTermsOverviewProps {
  contractTerms: any[];
}

export function ContractTermsOverview({ contractTerms }: ContractTermsOverviewProps) {
  // Calculate statistics
  const stats = {
    total: contractTerms.length,
    in_progress: contractTerms.filter((n) => n.status === "in_progress").length,
    agreed: contractTerms.filter((n) => n.status === "agreed").length,
    failed: contractTerms.filter((n) => n.status === "failed").length,
    total_agreed_value: contractTerms
      .filter((n) => n.status === "agreed" && n.agreed_price)
      .reduce((sum, n) => sum + (n.agreed_price || 0), 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "agreed":
        return <Badge className="bg-green-600">Agreed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div id="contract-terms-overview" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold">Contract Terms Overview</h2>
        <Link
          href="/management/contract-terms"
          className="text-xs sm:text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          View All →
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 lg:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-900">
              Total Contract Terms
            </CardTitle>
            <Handshake className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900">{stats.total}</div>
            <p className="text-[10px] sm:text-xs text-purple-700 mt-1">Active term sheets</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900">{stats.in_progress}</div>
            <p className="text-[10px] sm:text-xs text-blue-700 mt-1">Under negotiation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-900">
              Agreed
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900">{stats.agreed}</div>
            <p className="text-[10px] sm:text-xs text-green-700 mt-1">Successfully closed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-900">
              Failed
            </CardTitle>
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-900">{stats.failed}</div>
            <p className="text-[10px] sm:text-xs text-red-700 mt-1">Did not proceed</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Agreed Value */}
      {stats.total_agreed_value > 0 && (
        <Card className="bg-gradient-to-r from-green-600 to-green-500 text-white">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white text-base sm:text-lg md:text-xl">Total Agreed Value</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{formatCurrency(stats.total_agreed_value)}</div>
            <p className="text-green-100 mt-2 text-xs sm:text-sm">
              From {stats.agreed} successfully negotiated project{stats.agreed !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Contract Terms */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Recent Contract Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {contractTerms.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Handshake className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm">No contract terms found</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {contractTerms.slice(0, 5).map((negotiation) => (
                <div
                  key={negotiation.id}
                  className="flex items-start justify-between border-b pb-3 sm:pb-4 last:border-0 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">
                      {negotiation.stories?.title || "Unknown Project"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                      <span className="truncate">{negotiation.negotiation_id}</span>
                      <span>•</span>
                      <span className="truncate">{negotiation.writer_producer_name}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{negotiation.estimated_episodes || 0} episodes</span>
                    </div>
                    {negotiation.status === "agreed" && negotiation.agreed_price && (
                      <p className="text-xs sm:text-sm font-semibold text-green-600 mt-1">
                        Agreed: {formatCurrency(negotiation.agreed_price)}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 sm:ml-4 flex-shrink-0">{getStatusBadge(negotiation.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
