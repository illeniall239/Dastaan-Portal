'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';

export default function DemoCalendarPage() {
  // Dummy calendar events
  const dummyEvents = [
    {
      id: 1,
      title: 'Writer Meeting - Mere Paas Tum Ho',
      date: '2025-02-20',
      time: '10:00 AM',
      duration: '2 hours',
      attendees: ['Khalil-ur-Rehman Qamar', 'Ahmad Ali', 'Nadeem Siddiqui'],
      location: 'Conference Room A',
      type: 'meeting',
    },
    {
      id: 2,
      title: 'Script Review - Suno Chanda',
      date: '2025-02-21',
      time: '2:00 PM',
      duration: '1.5 hours',
      attendees: ['Fatima Surayya Bajia', 'Sarah Khan', 'Imran Iqbal'],
      location: 'Meeting Room 3',
      type: 'review',
    },
    {
      id: 3,
      title: 'Production Planning - Yeh Dil Mera',
      date: '2025-02-22',
      time: '11:00 AM',
      duration: '3 hours',
      attendees: ['Sajal Ali', 'Imran Hussain', 'Haissam Hussain'],
      location: 'Production Studio',
      type: 'planning',
    },
    {
      id: 4,
      title: 'Contract Discussion - Khud Parast',
      date: '2025-02-23',
      time: '3:00 PM',
      duration: '1 hour',
      attendees: ['Umera Ahmad', 'Fatima Noor', 'Legal Team'],
      location: 'Virtual Meeting',
      type: 'contract',
    },
    {
      id: 5,
      title: 'Evaluation Committee Meeting',
      date: '2025-02-24',
      time: '9:00 AM',
      duration: '4 hours',
      attendees: ['All Evaluators', 'Management Team'],
      location: 'Main Conference Hall',
      type: 'committee',
    },
    {
      id: 6,
      title: 'Budget Review - Mohabbat Ki Rahein',
      date: '2025-02-25',
      time: '1:00 PM',
      duration: '2 hours',
      attendees: ['Shazia Rehan', 'Finance Team', 'Ali Hassan'],
      location: 'Finance Department',
      type: 'budget',
    },
  ];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-50 border-blue-200';
      case 'review':
        return 'bg-green-50 border-green-200';
      case 'planning':
        return 'bg-purple-50 border-purple-200';
      case 'contract':
        return 'bg-orange-50 border-orange-200';
      case 'committee':
        return 'bg-red-50 border-red-200';
      case 'budget':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-700';
      case 'review':
        return 'bg-green-100 text-green-700';
      case 'planning':
        return 'bg-purple-100 text-purple-700';
      case 'contract':
        return 'bg-orange-100 text-orange-700';
      case 'committee':
        return 'bg-red-100 text-red-700';
      case 'budget':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Upcoming meetings and scheduled events
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyEvents.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dummyEvents.filter((e) => e.type === 'meeting').length}
            </div>
            <p className="text-xs text-muted-foreground">Writer meetings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dummyEvents.filter((e) => e.type === 'review').length}
            </div>
            <p className="text-xs text-muted-foreground">Script reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Committee</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dummyEvents.filter((e) => e.type === 'committee').length}
            </div>
            <p className="text-xs text-muted-foreground">Committee meetings</p>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dummyEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 border-2 rounded-lg ${getEventColor(event.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {event.title}
                      </h3>
                      <Badge className={getEventBadgeColor(event.type)}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {event.time} • {event.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{event.location}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{event.attendees.length} attendees</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Attendees:</p>
                      <div className="flex flex-wrap gap-2">
                        {event.attendees.map((attendee, idx) => (
                          <Badge key={idx} variant="outline">
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
