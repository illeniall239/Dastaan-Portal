'use client';

import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Save, Trash2, Loader2 } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

// Memoized row component
const EngagementRow = memo(function EngagementRow({
  engagement,
  isSaving,
  onSave,
  onDelete,
}: {
  engagement: WriterEngagement;
  isSaving: boolean;
  onSave: (engagement: WriterEngagement) => void;
  onDelete: (engagement: WriterEngagement) => void;
}) {
  const isNewRow = engagement.id.startsWith('new-');
  const [timeSlot, setTimeSlot] = useState(engagement.time_slot || '');
  const [notes, setNotes] = useState(engagement.notes || '');

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center border rounded-lg p-3">
      <div>
        <Input
          value={isNewRow ? timeSlot : engagement.time_slot || ''}
          onChange={isNewRow ? e => setTimeSlot(e.target.value) : undefined}
          placeholder="e.g., 10:00 AM - 11:00 AM"
          maxLength={100}
          disabled={!isNewRow}
          readOnly={!isNewRow}
        />
      </div>
      <div>
        <Input
          value={isNewRow ? notes : engagement.notes || ''}
          onChange={isNewRow ? e => setNotes(e.target.value) : undefined}
          placeholder="Purpose of engagement..."
          disabled={!isNewRow}
          readOnly={!isNewRow}
        />
      </div>
      <div className="flex items-center gap-2">
        {isNewRow ? (
          <Button
            size="sm"
            onClick={() =>
              onSave({ ...engagement, time_slot: timeSlot, notes })
            }
            disabled={!timeSlot.trim() || !notes.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {engagement.creator?.name ? `by ${engagement.creator.name}` : ''}
          </span>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(engagement)}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
});

export function WriterEngagementTracker() {
  const queryClient = useQueryClient();
  const [selectedWriter, setSelectedWriter] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Local state for new (unsaved) rows
  const [newEngagements, setNewEngagements] = useState<WriterEngagement[]>([]);

  // 1. Fetch Writers
  const { data: writers = [], isLoading: writersLoading } = useQuery({
    queryKey: ['writers'],
    queryFn: async () => {
      const response = await fetch('/api/writers/list');
      if (!response.ok) throw new Error('Failed to fetch writers');
      return response.json() as Promise<Writer[]>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // 2. Fetch Engagements
  const { data: serverEngagements = [], isLoading: engagementsLoading, isError } = useQuery({
    queryKey: ['writer-engagements', selectedWriter, format(currentDate, 'yyyy-MM')],
    enabled: !!selectedWriter,
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const dateFrom = format(monthStart, 'yyyy-MM-dd');
      const dateTo = format(monthEnd, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/writers?writerId=${selectedWriter}&dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (!response.ok) throw new Error('Failed to fetch engagements');
      return response.json() as Promise<WriterEngagement[]>;
    },
  });

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (engagement: WriterEngagement) => {
      const response = await fetch('/api/writers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writer_id: engagement.writer_id,
          date_engaged: engagement.date_engaged,
          time_slot: engagement.time_slot || null,
          notes: engagement.notes || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to save engagement');
      return response.json();
    },
    onSuccess: (savedEngagement, variables) => {
      // Remove the "new" row from local state
      setNewEngagements(prev => prev.filter(e => e.id !== variables.id));

      // Invalidate the query to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ['writer-engagements'] });

      toast.success('Engagement saved');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to save engagement');
    }
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      const response = await fetch(`/api/writers/${engagementId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete engagement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writer-engagements'] });
      toast.success('Engagement deleted');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to delete engagement');
    }
  });

  const handleAddRow = useCallback(() => {
    const newEngagement: WriterEngagement = {
      id: `new-${Date.now()}`,
      writer_id: selectedWriter,
      date_engaged: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      time_slot: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setNewEngagements(prev => [...prev, newEngagement]);
  }, [selectedWriter, currentDate]);

  const handleDelete = useCallback((engagement: WriterEngagement) => {
    if (engagement.id.startsWith('new-')) {
      setNewEngagements(prev => prev.filter(e => e.id !== engagement.id));
    } else {
      deleteMutation.mutate(engagement.id);
    }
  }, [deleteMutation]);

  // Combine server and new engagements for display
  const allEngagements = [...serverEngagements, ...newEngagements];

  if (writersLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading writers...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Writer Engagement Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              Failed to load engagements. Please try again.
            </div>
          )}

          {/* Top controls: writer select + month nav */}
          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="writer-select">Select Writer</Label>
              <Select value={selectedWriter} onValueChange={setSelectedWriter}>
                <SelectTrigger id="writer-select">
                  <SelectValue placeholder="Choose a writer" />
                </SelectTrigger>
                <SelectContent>
                  {writers.map((writer: Writer) => (
                    <SelectItem key={writer.id} value={writer.id}>
                      {writer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
              >
                Prev
              </Button>
              <div className="text-lg font-medium px-4 min-w-[160px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Engagement rows */}
          {!selectedWriter ? (
            <div className="text-center py-12 text-muted-foreground">
              Select a writer to view and manage engagements.
            </div>
          ) : engagementsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              {allEngagements.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Time Slot
                  </Label>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Purpose
                  </Label>
                  <div className="w-[88px]" />
                </div>
              )}

              {allEngagements.map(engagement => (
                <EngagementRow
                  key={engagement.id}
                  engagement={engagement}
                  isSaving={saveMutation.isPending && saveMutation.variables?.id === engagement.id} // Not ideal matching for optimistic UI but simpler
                  onSave={(e) => saveMutation.mutate(e)}
                  onDelete={handleDelete}
                />
              ))}

              {allEngagements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No engagements for {format(currentDate, 'MMMM yyyy')}.
                </div>
              )}

              {/* Add More button */}
              <Button
                variant="outline"
                onClick={handleAddRow}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
