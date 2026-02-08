'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  team_type: string;
}

interface ShareCrossTeamButtonProps {
  callReportId: string;
  currentTeamId?: string;
}

export function ShareCrossTeamButton({ callReportId, currentTeamId }: ShareCrossTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [notes, setNotes] = useState('');
  const [requiredEvaluations, setRequiredEvaluations] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
      setError(null);
      setSuccess(false);
      setSelectedTeamId('');
      setNotes('');
      setRequiredEvaluations('3');
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams/list');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      // Filter out current team
      setTeams(data.filter((t: Team) => t.id !== currentTeamId));
    } catch {
      setError('Failed to load teams');
    }
  };

  const handleShare = async () => {
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cross-team-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_report_id: callReportId,
          to_team_id: selectedTeamId,
          notes: notes || null,
          required_evaluations: parseInt(requiredEvaluations) || 3,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share');
      }

      setSuccess(true);
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Request Evaluation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Evaluation from Another Team</DialogTitle>
          <DialogDescription>
            Send this call report to another team and request their evaluation. They will be able to view and evaluate the content.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-3 text-sm bg-green-50 text-green-700 rounded-md border border-green-200">
            Request sent! The receiving team can now evaluate this content.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-select">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.team_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="required-evals">Required Evaluations</Label>
              <Input
                id="required-evals"
                type="number"
                min="1"
                max="20"
                value={requiredEvaluations}
                onChange={(e) => setRequiredEvaluations(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Number of evaluations required from the receiving team
              </p>
            </div>

            <div>
              <Label htmlFor="share-notes">Notes (optional)</Label>
              <Textarea
                id="share-notes"
                placeholder="Any message for the receiving team..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={loading || !selectedTeamId}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
