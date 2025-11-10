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
        <h2 className="text-2xl font-bold">Contract Terms Overview</h2>
        <Link
          href="/management/contract-terms"
          className="text-sm text-blue-600 hover:underline"
        >
          View All →
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              Total Contract Terms
            </CardTitle>
            <Handshake className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{stats.total}</div>
            <p className="text-xs text-purple-700 mt-1">Active term sheets</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              In Progress
            </CardTitle>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.in_progress}</div>
            <p className="text-xs text-blue-700 mt-1">Under negotiation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Agreed
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats.agreed}</div>
            <p className="text-xs text-green-700 mt-1">Successfully closed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-900">
              Failed
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{stats.failed}</div>
            <p className="text-xs text-red-700 mt-1">Did not proceed</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Agreed Value */}
      {stats.total_agreed_value > 0 && (
        <Card className="bg-gradient-to-r from-green-600 to-green-500 text-white">
          <CardHeader>
            <CardTitle className="text-white">Total Agreed Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(stats.total_agreed_value)}</div>
            <p className="text-green-100 mt-2">
              From {stats.agreed} successfully negotiated project{stats.agreed !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Contract Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contract Terms</CardTitle>
        </CardHeader>
        <CardContent>
          {contractTerms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contract terms found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contractTerms.slice(0, 5).map((negotiation) => (
                <div
                  key={negotiation.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {negotiation.stories?.title || "Unknown Project"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{negotiation.negotiation_id}</span>
                      <span>•</span>
                      <span>{negotiation.writer_producer_name}</span>
                      <span>•</span>
                      <span>{negotiation.estimated_episodes || 0} episodes</span>
                    </div>
                    {negotiation.status === "agreed" && negotiation.agreed_price && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        Agreed: {formatCurrency(negotiation.agreed_price)}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">{getStatusBadge(negotiation.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
