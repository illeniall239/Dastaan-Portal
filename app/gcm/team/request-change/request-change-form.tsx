'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function RequestChangeForm({
  teamId,
  teamName,
  currentMembers,
  availableUsers,
}: {
  teamId: string;
  teamName: string;
  currentMembers: User[];
  availableUsers: User[];
}) {
  const [requestType, setRequestType] = useState<'add' | 'remove'>('add');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/team-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          request_type: requestType,
          user_id: selectedUserId,
          reason,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit request');

      toast.success('Request Submitted', {
        description: 'Your team change request has been sent to administrators.',
      });

      router.push('/gcm/team');
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to submit request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userList = requestType === 'add' ? availableUsers : currentMembers;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Team Membership Change</CardTitle>
        <CardDescription>
          Submit a request to add or remove team members. An administrator will review your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Request Type</Label>
            <Select
              value={requestType}
              onValueChange={(v) => {
                setRequestType(v as 'add' | 'remove');
                setSelectedUserId(''); // Reset selection when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Member</SelectItem>
                <SelectItem value="remove">Remove Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {userList.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {requestType === 'add' ? 'No users available to add' : 'No members to remove'}
                  </SelectItem>
                ) : (
                  userList.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reason for Request</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this change is needed..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting || !selectedUserId || userList.length === 0}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}