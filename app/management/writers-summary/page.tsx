'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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
  created_at: string;
  updated_at: string;
  call_report_writers?: {
    id: string;
    name: string;
  };
}

export default function WritersSummaryPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [allEngagements, setAllEngagements] = useState<WriterEngagement[]>([]);
  const [filteredEngagements, setFilteredEngagements] = useState<WriterEngagement[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load writers and engagements
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all engagements
        const response = await fetch('/api/writers');
        if (!response.ok) {
          throw new Error('Failed to fetch engagements');
        }
        const engagementsData = await response.json();
        setAllEngagements(engagementsData);
        setFilteredEngagements(engagementsData);
        
        // Fetch all writers
        const writersResponse = await fetch('/api/writers/list');
        if (!writersResponse.ok) {
          throw new Error('Failed to fetch writers');
        }
        const writersData = await writersResponse.json();
        setWriters(writersData);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter engagements when writer selection changes
  useEffect(() => {
    if (selectedWriter === 'all') {
      setFilteredEngagements(allEngagements);
    } else {
      setFilteredEngagements(allEngagements.filter(eng => eng.writer_id === selectedWriter));
    }
  }, [selectedWriter, allEngagements]);

  // Group engagements by date for the calendar view
  const engagementsByDate = filteredEngagements.reduce((acc, engagement) => {
    const date = engagement.date_engaged;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(engagement);
    return acc;
  }, {} as Record<string, WriterEngagement[]>);

  // Get unique dates
  const uniqueDates = Array.from(new Set(filteredEngagements.map(e => e.date_engaged))).sort();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Writer Engagement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="writer-filter" className="block text-sm font-medium mb-1">Filter by Writer</label>
              <Select value={selectedWriter} onValueChange={setSelectedWriter}>
                <SelectTrigger id="writer-filter">
                  <SelectValue placeholder="All Writers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Writers</SelectItem>
                  {writers.map(writer => (
                    <SelectItem key={writer.id} value={writer.id}>
                      {writer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-4">
              <Badge variant="secondary">
                Total Engagements: {filteredEngagements.length}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div>Loading data...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Engagement Calendar</h3>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-100 rounded">
                      {day}
                    </div>
                  ))}
                  
                  {uniqueDates.map(date => {
                    const dateObj = new Date(date);
                    const dayOfWeek = dateObj.getDay();
                    
                    // Create empty cells for days before the first day of the week
                    if (uniqueDates.indexOf(date) === 0 && dayOfWeek > 0) {
                      return Array.from({ length: dayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-20 p-2 border rounded"></div>
                      ));
                    }
                    
                    const engagementsForDate = engagementsByDate[date] || [];
                    
                    return (
                      <div key={date} className="min-h-20 p-2 border rounded bg-blue-50">
                        <div className="font-medium text-sm">{format(new Date(date), 'MMM dd')}</div>
                        <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                          {engagementsForDate.slice(0, 3).map(engagement => (
                            <div key={engagement.id} className="text-xs p-1 bg-white rounded border truncate">
                              <div className="font-medium">{engagement.call_report_writers?.name || 'Unknown Writer'}</div>
                              <div>{engagement.notes?.substring(0, 30)}{engagement.notes && engagement.notes.length > 30 ? '...' : ''}</div>
                            </div>
                          ))}
                          {engagementsForDate.length > 3 && (
                            <div className="text-xs text-gray-500">+{engagementsForDate.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Detailed List</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Writer</th>
                        <th className="p-2 text-left">Time Slot</th>
                        <th className="p-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEngagements.map(engagement => (
                        <tr key={engagement.id} className="border-t">
                          <td className="p-2">{format(new Date(engagement.date_engaged), 'MMM dd, yyyy')}</td>
                          <td className="p-2">{engagement.call_report_writers?.name || 'Unknown Writer'}</td>
                          <td className="p-2">{engagement.time_slot || '-'}</td>
                          <td className="p-2 max-w-xs truncate">{engagement.notes || '-'}</td>
                        </tr>
                      ))}
                      {filteredEngagements.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-500">No engagements found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}