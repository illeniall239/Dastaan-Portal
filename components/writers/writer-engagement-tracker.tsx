'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

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

export function WriterEngagementTracker() {
  const [mounted, setMounted] = useState(false);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<string>('');
  const [engagements, setEngagements] = useState<Record<string, WriterEngagement[]>>({});
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Load writers list
  useEffect(() => {
    const fetchWriters = async () => {
      try {
        const response = await fetch('/api/writers/list');
        if (!response.ok) {
          throw new Error('Failed to fetch writers');
        }
        const data = await response.json();
        setWriters(data);
      } catch (err) {
        setError('Failed to load writers list');
        console.error(err);
      }
    };

    fetchWriters();
  }, []);

  // Load engagements when writer is selected
  useEffect(() => {
    if (selectedWriter) {
      const fetchEngagements = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/writers?writerId=${selectedWriter}`);
          if (!response.ok) {
            throw new Error('Failed to fetch engagements');
          }
          const data = await response.json();

          // Group engagements by date
          const grouped: Record<string, WriterEngagement[]> = {};
          data.forEach((engagement: WriterEngagement) => {
            const dateKey = engagement.date_engaged;
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(engagement);
          });

          setEngagements(grouped);
        } catch (err) {
          setError('Failed to load engagements');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchEngagements();
    } else {
      setEngagements({});
      setLoading(false);
    }
  }, [selectedWriter]);

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingNotes = engagements[dateStr] || [];

    // Create a new engagement for this date
    const newEngagement: WriterEngagement = {
      id: `new-${dateStr}-${existingNotes.length}`,
      writer_id: selectedWriter,
      date_engaged: dateStr,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEngagements(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), newEngagement]
    }));
  };

  const handleNoteChange = (date: string, index: number, value: string) => {
    setEngagements(prev => {
      const updated = {...prev};
      if (updated[date]) {
        updated[date][index].notes = value;
      }
      return updated;
    });
  };

  const handleSaveEngagement = async (date: string, index: number) => {
    const engagement = engagements[date][index];

    try {
      const response = await fetch('/api/writers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          writer_id: engagement.writer_id,
          date_engaged: engagement.date_engaged,
          notes: engagement.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save engagement');
      }

      const savedEngagement = await response.json();

      // Update the engagement with the saved ID
      setEngagements(prev => {
        const updated = {...prev};
        if (updated[date]) {
          updated[date][index] = savedEngagement;
        }
        return updated;
      });
    } catch (err) {
      setError('Failed to save engagement');
      console.error(err);
    }
  };

  const handleDeleteEngagement = async (date: string, index: number) => {
    const engagement = engagements[date][index];

    if (!engagement.id.startsWith('new-')) { // Only delete if it's already saved
      try {
        const response = await fetch(`/api/writers/${engagement.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete engagement');
        }
      } catch (err) {
        setError('Failed to delete engagement');
        console.error(err);
        return;
      }
    }

    // Remove from local state
    setEngagements(prev => {
      const updated = {...prev};
      if (updated[date]) {
        updated[date] = updated[date].filter((_, i) => i !== index);
        if (updated[date].length === 0) {
          delete updated[date];
        }
      }
      return updated;
    });
  };

  // Get days for the current month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get days from previous and next months to fill out the grid
  const startDay = monthStart.getDay();
  const prevMonthDays = Array.from({ length: startDay }, (_, i) => {
    const day = new Date(currentDate);
    day.setDate(-startDay + i + 1);
    return day;
  });

  const totalCells = 42;
  const remainingDays = totalCells - daysInMonth.length - prevMonthDays.length;
  const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => {
    const day = new Date(currentDate);
    day.setDate(daysInMonth.length + i + 1);
    return day;
  });

  const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays];

  if (!mounted) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Writer Engagement Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-4 items-center">
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
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                Prev Month
              </Button>
              <div className="text-lg font-medium px-4">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                Next Month
              </Button>
            </div>
          </div>

          {loading ? (
            <div>Loading engagements...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Calendar header */}
              <div className="grid grid-cols-7 bg-gray-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-700 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {allDays.map((day, index) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const dayEngagements = engagements[dateStr] || [];

                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-1.5 border-r border-b last:border-r-0 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                      } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className={`text-xs font-medium ${
                          isToday ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''
                        }`}>
                          {format(day, 'd')}
                        </div>
                        {selectedWriter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateSelect(day)}
                            className="h-5 w-5 p-0 text-xs text-gray-400 hover:text-gray-700"
                          >
                            +
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {dayEngagements.map((engagement, idx) => (
                          <div key={`${engagement.id}-${idx}`} className="text-xs p-1.5 bg-blue-50 rounded border border-blue-200">
                            <Textarea
                              value={engagement.notes || ''}
                              onChange={(e) => handleNoteChange(dateStr, idx, e.target.value)}
                              placeholder="Add notes..."
                              className="text-[11px] min-h-[48px] p-1.5 resize-none border-gray-200"
                            />
                            {engagement.creator?.name && !engagement.id.startsWith('new-') && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                by {engagement.creator.name}
                              </div>
                            )}
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEngagement(dateStr, idx)}
                                disabled={!engagement.notes?.trim()}
                                className="h-6 px-2 text-[10px]"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteEngagement(dateStr, idx)}
                                className="h-6 px-2 text-[10px]"
                              >
                                Del
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
