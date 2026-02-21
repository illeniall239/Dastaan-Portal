'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CrossTeamShare } from '@/types';
import { formatDistanceToNow, format, differenceInHours, differenceInDays } from 'date-fns';

interface CrossTeamSharesTableProps {
  readOnly?: boolean;
}

export function CrossTeamSharesTable({ readOnly = false }: CrossTeamSharesTableProps) {
  const [shares, setShares] = useState<CrossTeamShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cross-team-shares');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setShares(data);
    } catch {
      setError('Failed to load evaluation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (shareId: string) => {
    if (!confirm('Are you sure you want to cancel this evaluation request?')) return;
    try {
      const response = await fetch(`/api/cross-team-shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!response.ok) throw new Error('Failed to cancel');
      fetchShares();
    } catch {
      setError('Failed to cancel request');
    }
  };

  const filteredShares = useMemo(() => {
    return shares.filter(share => {
      if (statusFilter !== 'all' && share.status !== statusFilter) return false;
      return true;
    });
  }, [shares, statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      in_progress: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Progress' },
      completed: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      cancelled: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    };
    const v = variants[status] || variants.pending;
    return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
  };

  const getTimeTaken = (share: CrossTeamShare) => {
    if (share.status === 'cancelled') return '-';
    if (share.completed_at) {
      const hours = differenceInHours(new Date(share.completed_at), new Date(share.shared_at));
      if (hours < 24) return `${hours}h`;
      const days = differenceInDays(new Date(share.completed_at), new Date(share.shared_at));
      return `${days}d`;
    }
    // Still in progress — show elapsed
    return formatDistanceToNow(new Date(share.shared_at), { addSuffix: false });
  };

  const isOverdue = (share: CrossTeamShare) => {
    if (share.status === 'completed' || share.status === 'cancelled' || !share.evaluation_deadline) return false;
    return new Date() > new Date(share.evaluation_deadline);
  };

  // Stats
  const stats = useMemo(() => ({
    total: shares.length,
    pending: shares.filter(s => s.status === 'pending').length,
    inProgress: shares.filter(s => s.status === 'in_progress').length,
    completed: shares.filter(s => s.status === 'completed').length,
  }), [shares]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Cross-Team Shares Tracking ({filteredShares.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left p-3 font-medium text-gray-600">Project</th>
                  <th className="text-left p-3 font-medium text-gray-600">From Team</th>
                  <th className="text-left p-3 font-medium text-gray-600">To Team</th>
                  <th className="text-left p-3 font-medium text-gray-600">Requested By</th>
                  <th className="text-left p-3 font-medium text-gray-600">Requested At</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Evaluations</th>
                  <th className="text-left p-3 font-medium text-gray-600">Time Taken</th>
                  {!readOnly && <th className="text-left p-3 font-medium text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredShares.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 8 : 9} className="p-6 text-center text-gray-500">
                      No cross-team shares found
                    </td>
                  </tr>
                ) : (
                  filteredShares.map(share => (
                    <tr key={share.id} className="border-b hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {(share as any).call_report?.working_title || 'Untitled'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(share as any).call_report?.call_report_id || ''}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-700">{(share as any).from_team?.name || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-700">{(share as any).to_team?.name || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-700">{(share as any).shared_by_user?.name || '-'}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-700">{format(new Date(share.shared_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(share.shared_at), 'h:mm a')}</div>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(share.status)}
                        {isOverdue(share) && (
                          <Badge variant="outline" className="ml-1 bg-red-100 text-red-800 border-red-200 text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${share.completed_evaluations >= share.required_evaluations ? 'text-green-600' : 'text-gray-700'}`}>
                          {share.completed_evaluations} / {share.required_evaluations}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-gray-700 ${isOverdue(share) ? 'text-red-600 font-medium' : ''}`}>
                          {getTimeTaken(share)}
                        </span>
                      </td>
                      {!readOnly && (
                        <td className="p-3">
                          {(share.status === 'pending' || share.status === 'in_progress') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleCancel(share.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
