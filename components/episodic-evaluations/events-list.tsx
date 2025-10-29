"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface EventItem {
  title: string;
  description: string;
  impact?: ImpactLevel;
}

export type ImpactLevel = "High Impact" | "Medium Impact" | "Low Impact";

interface EventsListProps {
  events: string[] | EventItem[];
  onChange: (events: string[] | EventItem[]) => void;
  disabled?: boolean;
}

export function EventsList({ events, onChange, disabled = false }: EventsListProps) {
  const [eventErrors, setEventErrors] = useState<Record<number, string>>({});

  // Convert old string format to new object format
  const normalizedEvents: EventItem[] = events.map(event => {
    if (typeof event === 'string') {
      return { title: '', description: event };
    }
    return event;
  });

  const addEvent = () => {
    if (normalizedEvents.length >= 20) {
      return;
    }
    onChange([...normalizedEvents, { title: '', description: '' }]);
  };

  const removeEvent = (index: number) => {
    const newEvents = normalizedEvents.filter((_, i) => i !== index);
    onChange(newEvents);

    // Remove error for this index if exists
    const newErrors = { ...eventErrors };
    delete newErrors[index];
    setEventErrors(newErrors);
  };

  const updateEventTitle = (index: number, title: string) => {
    const newEvents = [...normalizedEvents];
    newEvents[index] = { ...newEvents[index], title };
    onChange(newEvents);
  };

  const updateEventDescription = (index: number, description: string) => {
    const newEvents = [...normalizedEvents];
    newEvents[index] = { ...newEvents[index], description };
    onChange(newEvents);

    // Validate event length
    const newErrors = { ...eventErrors };
    if (description.length > 500) {
      newErrors[index] = "Event description must not exceed 500 characters";
    } else {
      delete newErrors[index];
    }
    setEventErrors(newErrors);
  };

  const updateEventImpact = (index: number, impact: ImpactLevel | undefined) => {
    const newEvents = [...normalizedEvents];
    newEvents[index] = { ...newEvents[index], impact };
    onChange(newEvents);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Events <span className="text-red-500">*</span>
        </Label>
        {!disabled && events.length < 20 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEvent}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Add events that occur in this episode (required). Give each event a title, description, and impact level. Maximum 20 events, 500 characters per description.
      </p>

      {normalizedEvents.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            <span className="text-red-600 font-medium">Required:</span> At least one event must be added
          </p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEvent}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Event
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {normalizedEvents.map((event, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-base">
                    Event {index + 1}
                  </Label>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEvent(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor={`event-title-${index}`} className="text-sm font-medium">
                    Event Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`event-title-${index}`}
                    value={event.title}
                    onChange={(e) => updateEventTitle(index, e.target.value)}
                    disabled={disabled}
                    placeholder="e.g., Hero confronts villain"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {event.title.length}/100 characters
                  </p>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor={`event-desc-${index}`} className="text-sm font-medium">
                    Event Description
                  </Label>
                  <Textarea
                    id={`event-desc-${index}`}
                    value={event.description}
                    onChange={(e) => updateEventDescription(index, e.target.value)}
                    disabled={disabled}
                    placeholder="Describe what happens in this event..."
                    className="min-h-[80px]"
                    maxLength={500}
                  />

                  <div className="flex justify-between items-center text-xs">
                    <span className={eventErrors[index] ? "text-red-600" : "text-muted-foreground"}>
                      {eventErrors[index] || `${event.description.length}/500 characters`}
                    </span>
                    {event.description.length > 450 && event.description.length <= 500 && (
                      <span className="text-amber-600">
                        {500 - event.description.length} characters remaining
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Impact */}
                <div className="space-y-2">
                  <Label htmlFor={`event-impact-${index}`} className="text-sm font-medium">
                    Impact Level
                  </Label>
                  <Select
                    value={event.impact || ""}
                    onValueChange={(value: ImpactLevel | "") => updateEventImpact(index, value || undefined)}
                    disabled={disabled}
                  >
                    <SelectTrigger id={`event-impact-${index}`}>
                      <SelectValue placeholder="Select impact level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High Impact">High Impact</SelectItem>
                      <SelectItem value="Medium Impact">Medium Impact</SelectItem>
                      <SelectItem value="Low Impact">Low Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Event button at bottom of each card */}
                {!disabled && normalizedEvents.length < 20 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEvent}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Event
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {normalizedEvents.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {normalizedEvents.length} of 20 events added
        </p>
      )}
    </div>
  );
}
