'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Plus, Save, Trash2, Loader2, Pencil, X, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Writer {
  id: string;
  name: string;
}

interface WriterEngagement {
  id: string;
  writer_id: string;
  date_engaged: string;
  time_slot?: string;
  notes?: string;
  created_by?: string;
  creator?: { id: string; name: string } | null;
  writer?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

// Build month options from Jan 2026 to Dec 2028
function buildMonthOptions() {
  const options: { label: string; value: string }[] = [];
  const start = new Date(2026, 0, 1); // Jan 2026
  const end = new Date(2028, 11, 1);  // Dec 2028
  let d = start;
  while (d <= end) {
    options.push({
      label: format(d, 'MMMM yyyy'),
      value: format(d, 'yyyy-MM'),
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return options;
}

// --- Row for saved engagements (display + edit mode) ---
const SavedRow = memo(function SavedRow({
  engagement,
  isEditing,
  editNotes,
  isSaving,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNotesChange,
  onDelete,
  isDeleting,
}: {
  engagement: WriterEngagement;
  isEditing: boolean;
  editNotes: string;
  isSaving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditNotesChange: (value: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const writerName = engagement.writer?.name || 'Unknown Writer';
  const dateLabel = engagement.date_engaged
    ? format(parseISO(engagement.date_engaged), 'MMM d, yyyy')
    : '—';

  if (isEditing) {
    return (
      <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 items-center border rounded-lg p-3 bg-muted/30">
        <div className="text-sm font-medium">{writerName}</div>
        <div className="text-sm text-muted-foreground">{dateLabel}</div>
        <div>
          <Input
            value={editNotes}
            onChange={(e) => onEditNotesChange(e.target.value)}
            placeholder="Purpose of engagement..."
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onSaveEdit}
            disabled={!editNotes.trim() || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onCancelEdit}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 items-center border rounded-lg p-3">
      <div className="text-sm font-medium">{writerName}</div>
      <div className="text-sm text-muted-foreground">{dateLabel}</div>
      <div className="text-sm text-muted-foreground">{engagement.notes || '—'}</div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
});

// --- Row for new (unsaved) engagements ---
const NewRow = memo(function NewRow({
  writers,
  isSaving,
  onSave,
  onDelete,
}: {
  writers: Writer[];
  isSaving: boolean;
  onSave: (writerId: string, notes: string) => void;
  onDelete: () => void;
}) {
  const [writerId, setWriterId] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 items-center border rounded-lg p-3 border-dashed">
      <div>
        <Select value={writerId} onValueChange={setWriterId}>
          <SelectTrigger>
            <SelectValue placeholder="Select writer" />
          </SelectTrigger>
          <SelectContent>
            {writers.map((writer) => (
              <SelectItem key={writer.id} value={writer.id}>
                {writer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">
        {format(new Date(), 'MMM d, yyyy')}
      </div>
      <div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Purpose of engagement..."
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onSave(writerId, notes)}
          disabled={!writerId || !notes.trim() || isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isSaving}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

interface WriterEngagementTrackerProps {
  userId: string;
  initialWriters?: Writer[];
}

export function WriterEngagementTracker({
  userId,
  initialWriters = [],
}: WriterEngagementTrackerProps) {
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [newRowIds, setNewRowIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  // Fetch writers list
  const { data: writers = [], isLoading: writersLoading } = useQuery({
    queryKey: ['writers'],
    queryFn: async () => {
      const response = await fetch('/api/writers/list');
      if (!response.ok) throw new Error('Failed to fetch writers');
      return response.json() as Promise<Writer[]>;
    },
    initialData: initialWriters.length > 0 ? initialWriters : undefined,
    staleTime: 1000 * 60 * 60,
  });

  // Build query URL based on filter
  const queryUrl = useMemo(() => {
    if (!filterMonth) return '/api/writers';
    const d = new Date(`${filterMonth}-01`);
    const dateFrom = format(startOfMonth(d), 'yyyy-MM-dd');
    const dateTo = format(endOfMonth(d), 'yyyy-MM-dd');
    return `/api/writers?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  }, [filterMonth]);

  const { data: engagements = [], isLoading: engagementsLoading, isError } = useQuery({
    queryKey: ['writer-engagements', userId, filterMonth ?? 'all'],
    queryFn: async () => {
      const response = await fetch(queryUrl);
      if (!response.ok) throw new Error('Failed to fetch engagements');
      return response.json() as Promise<WriterEngagement[]>;
    },
  });

  // Save (create) mutation
  const saveMutation = useMutation({
    mutationFn: async ({ writerId, notes, rowId }: { writerId: string; notes: string; rowId: string }) => {
      const response = await fetch('/api/writers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writer_id: writerId,
          date_engaged: format(new Date(), 'yyyy-MM-dd'),
          notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to save engagement');
      return { data: await response.json(), rowId };
    },
    onSuccess: (result) => {
      setNewRowIds(prev => prev.filter(id => id !== result.rowId));
      queryClient.invalidateQueries({ queryKey: ['writer-engagements', userId] });
      toast.success('Engagement saved');
    },
    onError: () => {
      toast.error('Failed to save engagement');
    },
  });

  // Edit (update) mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(`/api/writers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to update engagement');
      return response.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditNotes('');
      queryClient.invalidateQueries({ queryKey: ['writer-engagements', userId] });
      toast.success('Engagement updated');
    },
    onError: () => {
      toast.error('Failed to update engagement');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      const response = await fetch(`/api/writers/${engagementId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete engagement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writer-engagements', userId] });
      toast.success('Engagement deleted');
    },
    onError: () => {
      toast.error('Failed to delete engagement');
    },
  });

  const handleAddRow = useCallback(() => {
    setNewRowIds(prev => [...prev, `new-${Date.now()}`]);
  }, []);

  const handleRemoveNewRow = useCallback((rowId: string) => {
    setNewRowIds(prev => prev.filter(id => id !== rowId));
  }, []);

  const handleStartEdit = useCallback((engagement: WriterEngagement) => {
    setEditingId(engagement.id);
    setEditNotes(engagement.notes || '');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNotes('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && editNotes.trim()) {
      editMutation.mutate({ id: editingId, notes: editNotes.trim() });
    }
  }, [editingId, editNotes, editMutation]);

  if (writersLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-3">
          <CardTitle>Writer Engagement Tracker</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filterMonth ?? 'all'}
              onValueChange={(val) => setFilterMonth(val === 'all' ? null : val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterMonth(null)}
                className="h-9 px-2 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              Failed to load engagements. Please try again.
            </div>
          )}

          {engagementsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              {(engagements.length > 0 || newRowIds.length > 0) && (
                <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 px-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Writer
                  </Label>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Date Logged
                  </Label>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Purpose
                  </Label>
                  <div className="w-[72px]" />
                </div>
              )}

              {/* Saved engagement rows */}
              {engagements.map(engagement => (
                <SavedRow
                  key={engagement.id}
                  engagement={engagement}
                  isEditing={editingId === engagement.id}
                  editNotes={editingId === engagement.id ? editNotes : ''}
                  isSaving={editMutation.isPending && editingId === engagement.id}
                  onEdit={() => handleStartEdit(engagement)}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditNotesChange={setEditNotes}
                  onDelete={() => deleteMutation.mutate(engagement.id)}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === engagement.id}
                />
              ))}

              {/* New (unsaved) rows */}
              {newRowIds.map(rowId => (
                <NewRow
                  key={rowId}
                  writers={writers}
                  isSaving={saveMutation.isPending && saveMutation.variables?.rowId === rowId}
                  onSave={(writerId, notes) =>
                    saveMutation.mutate({ writerId, notes, rowId })
                  }
                  onDelete={() => handleRemoveNewRow(rowId)}
                />
              ))}

              {engagements.length === 0 && newRowIds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {filterMonth
                    ? `No engagements found for ${monthOptions.find(o => o.value === filterMonth)?.label ?? filterMonth}.`
                    : 'No engagements found.'}
                </div>
              )}

              {/* Add More button */}
              <Button
                variant="outline"
                onClick={handleAddRow}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Engagement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
