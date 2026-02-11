'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Save, Trash2 } from 'lucide-react';

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

// Memoized row component — local state for inputs prevents parent re-renders on every keystroke
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
          placeholder="Name of person engaging..."
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
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
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
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export function WriterEngagementTracker() {
  const [mounted, setMounted] = useState(false);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<string>('');
  const [engagements, setEngagements] = useState<WriterEngagement[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Load writers list
  useEffect(() => {
    const fetchWriters = async () => {
      try {
        const response = await fetch('/api/writers/list');
        if (!response.ok) throw new Error('Failed to fetch writers');
        const data = await response.json();
        setWriters(data);
      } catch (err) {
        setError('Failed to load writers list');
        console.error(err);
      }
    };
    fetchWriters();
  }, []);

  // Load engagements filtered by writer + month
  const fetchEngagements = useCallback(async () => {
    if (!selectedWriter) {
      setEngagements([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const dateFrom = format(monthStart, 'yyyy-MM-dd');
      const dateTo = format(monthEnd, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/writers?writerId=${selectedWriter}&dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (!response.ok) throw new Error('Failed to fetch engagements');
      const data = await response.json();
      setEngagements(data);
    } catch (err) {
      setError('Failed to load engagements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedWriter, currentDate]);

  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  const handleAddRow = () => {
    const newEngagement: WriterEngagement = {
      id: `new-${Date.now()}`,
      writer_id: selectedWriter,
      date_engaged: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      time_slot: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEngagements(prev => [...prev, newEngagement]);
  };

  const handleSave = async (engagement: WriterEngagement) => {
    setSaving(prev => ({ ...prev, [engagement.id]: true }));
    try {
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
      const saved = await response.json();

      setEngagements(prev =>
        prev.map(e => (e.id === engagement.id ? { ...saved, creator: saved.creator || null } : e))
      );
    } catch (err) {
      setError('Failed to save engagement');
      console.error(err);
    } finally {
      setSaving(prev => ({ ...prev, [engagement.id]: false }));
    }
  };

  const handleDelete = async (engagement: WriterEngagement) => {
    if (!engagement.id.startsWith('new-')) {
      try {
        const response = await fetch(`/api/writers/${engagement.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete engagement');
      } catch (err) {
        setError('Failed to delete engagement');
        console.error(err);
        return;
      }
    }
    setEngagements(prev => prev.filter(e => e.id !== engagement.id));
  };

  if (!mounted) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Writer Engagement Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Loading...</div>
          </CardContent>
        </Card>
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
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 underline text-red-800"
              >
                Dismiss
              </button>
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
                  {writers.map(writer => (
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
          ) : loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading engagements...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              {engagements.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Person Engaging
                  </Label>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Purpose
                  </Label>
                  <div className="w-[88px]" />
                </div>
              )}

              {engagements.map(engagement => (
                <EngagementRow
                  key={engagement.id}
                  engagement={engagement}
                  isSaving={!!saving[engagement.id]}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}

              {engagements.length === 0 && (
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
