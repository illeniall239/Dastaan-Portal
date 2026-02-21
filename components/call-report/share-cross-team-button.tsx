'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Share2, Loader2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  team_type: string;
}

interface Episode {
  id: string;
  episode_number: number;
  title?: string;
  call_report_id: string;
}

interface Revision {
  id: string;
  revision_number: number;
  attachment_name: string | null;
  comment: string | null;
}

interface ShareCrossTeamButtonProps {
  callReportId: string;
  currentTeamId?: string;
  /** For episode-only sharing: pass episodeId to pre-select just that episode */
  episodeId?: string;
  /** For episode-only sharing: show parent call report title for context */
  callReportTitle?: string;
}

export function ShareCrossTeamButton({ callReportId, currentTeamId, episodeId, callReportTitle }: ShareCrossTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEpisodeOnly = !!episodeId;

  // ── Call report base + revisions ──────────────────────────────────────────
  const [includeCallReportBase, setIncludeCallReportBase] = useState(true);
  const [callReportRevisions, setCallReportRevisions] = useState<Revision[]>([]);
  const [selectedCRRevisionIds, setSelectedCRRevisionIds] = useState<Set<string>>(new Set());
  const [loadingCRRevisions, setLoadingCRRevisions] = useState(false);

  // ── Episodes + their revisions ────────────────────────────────────────────
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  // Key = "episodeId" for base episode, "episodeId|revisionId" for episode revision
  const [selectedEpisodeShares, setSelectedEpisodeShares] = useState<Set<string>>(new Set());
  const [episodeRevisions, setEpisodeRevisions] = useState<Record<string, Revision[]>>({});
  const [loadingEpRevisions, setLoadingEpRevisions] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
      setError(null);
      setSuccess(false);
      setSelectedTeamId('');
      setNotes('');
      setIncludeCallReportBase(true);
      setSelectedCRRevisionIds(new Set());
      setSelectedEpisodeShares(new Set());
      setEpisodeRevisions({});

      if (!isEpisodeOnly) {
        fetchCallReportRevisions();
        fetchEpisodes();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams/list');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.filter((t: Team) => t.id !== currentTeamId));
    } catch {
      setError('Failed to load teams');
    }
  };

  const fetchCallReportRevisions = async () => {
    setLoadingCRRevisions(true);
    try {
      const response = await fetch(`/api/call-reports/${callReportId}/revisions`);
      if (!response.ok) return;
      const data = await response.json();
      setCallReportRevisions(data.revisions || []);
    } catch {
      // Non-critical
    } finally {
      setLoadingCRRevisions(false);
    }
  };

  const fetchEpisodes = async () => {
    setLoadingEpisodes(true);
    try {
      const response = await fetch(`/api/episodes?call_report_id=${callReportId}&_t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch episodes');
      const data = await response.json();
      const eps: Episode[] = data.data || data || [];
      setEpisodes(eps);
      // Default: all base episodes selected
      setSelectedEpisodeShares(new Set(eps.map((e) => e.id)));
      // Fetch revisions for each episode
      fetchEpisodeRevisions(eps);
    } catch {
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const fetchEpisodeRevisions = async (eps: Episode[]) => {
    if (eps.length === 0) return;
    setLoadingEpRevisions(true);
    try {
      const results = await Promise.all(
        eps.map(async (ep) => {
          try {
            const res = await fetch(`/api/episodes/${ep.id}/revisions`);
            if (!res.ok) return { id: ep.id, revisions: [] };
            const data = await res.json();
            return { id: ep.id, revisions: (data.revisions || []) as Revision[] };
          } catch {
            return { id: ep.id, revisions: [] };
          }
        })
      );
      const revMap: Record<string, Revision[]> = {};
      for (const r of results) revMap[r.id] = r.revisions;
      setEpisodeRevisions(revMap);
    } finally {
      setLoadingEpRevisions(false);
    }
  };

  const toggleCRRevision = (revId: string) => {
    setSelectedCRRevisionIds(prev => {
      const next = new Set(prev);
      if (next.has(revId)) next.delete(revId); else next.add(revId);
      return next;
    });
  };

  const toggleEpisodeShare = (key: string) => {
    setSelectedEpisodeShares(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleShare = async () => {
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }

    // Build the items to share
    const episodeSharesList = isEpisodeOnly
      ? [{ episode_id: episodeId!, revision_id: null }]
      : Array.from(selectedEpisodeShares).map(key => {
          const [epId, revId] = key.split('|');
          return { episode_id: epId, revision_id: revId || null };
        });

    const crRevisionIds = Array.from(selectedCRRevisionIds);
    const shareCallReportBase = !isEpisodeOnly && includeCallReportBase;

    // Validate: at least one item
    if (!isEpisodeOnly && !shareCallReportBase && crRevisionIds.length === 0 && episodeSharesList.length === 0) {
      setError('Please select at least one item to share');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, any> = {
        to_team_id: selectedTeamId,
        notes: notes || null,
        episode_shares: episodeSharesList.length > 0 ? episodeSharesList : undefined,
      };

      if (isEpisodeOnly) {
        // Episode-only: no call report
      } else {
        if (shareCallReportBase) body.call_report_id = callReportId;
        if (crRevisionIds.length > 0) body.call_report_revision_ids = crRevisionIds;
        // Always include call_report_id for context even when only sharing revisions
        if (!shareCallReportBase && crRevisionIds.length > 0) body.call_report_id = callReportId;
      }

      const response = await fetch('/api/cross-team-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // Count total selected items for summary
  const totalSelected = (isEpisodeOnly ? 1 : 0) +
    (!isEpisodeOnly && includeCallReportBase ? 1 : 0) +
    selectedCRRevisionIds.size +
    selectedEpisodeShares.size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Request Evaluation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Evaluation from Another Team</DialogTitle>
          <DialogDescription>
            {isEpisodeOnly
              ? `Share this episode for cross-team evaluation.${callReportTitle ? ` Project: ${callReportTitle}` : ''}`
              : 'Select which items to share with another team for evaluation.'
            }
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
            {/* Team selection */}
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

            {/* Call report + revisions (only for non-episode-only mode) */}
            {!isEpisodeOnly && (
              <div>
                <Label className="mb-2 block">One-Liner</Label>
                {loadingCRRevisions ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </div>
                ) : (
                  <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {/* Base call report */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cr-base"
                        checked={includeCallReportBase}
                        onCheckedChange={(v) => setIncludeCallReportBase(!!v)}
                      />
                      <label htmlFor="cr-base" className="text-sm cursor-pointer font-medium">
                        Base (original)
                      </label>
                    </div>
                    {/* Call report revisions */}
                    {callReportRevisions.map(rev => (
                      <div key={rev.id} className="flex items-center gap-2 pl-4">
                        <Checkbox
                          id={`cr-rev-${rev.id}`}
                          checked={selectedCRRevisionIds.has(rev.id)}
                          onCheckedChange={() => toggleCRRevision(rev.id)}
                        />
                        <label htmlFor={`cr-rev-${rev.id}`} className="text-sm cursor-pointer">
                          Revision {rev.revision_number}
                          {rev.attachment_name && (
                            <span className="text-muted-foreground"> — {rev.attachment_name}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Episodes + their revisions (only for non-episode-only mode) */}
            {!isEpisodeOnly && (loadingEpisodes ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading episodes...
              </div>
            ) : episodes.length > 0 ? (
              <div>
                <Label className="mb-2 block">Episodes</Label>
                <div className="border rounded-md p-3 space-y-3 max-h-52 overflow-y-auto">
                  {episodes.map(ep => (
                    <div key={ep.id} className="space-y-1.5">
                      {/* Base episode */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`ep-${ep.id}`}
                          checked={selectedEpisodeShares.has(ep.id)}
                          onCheckedChange={() => toggleEpisodeShare(ep.id)}
                        />
                        <label htmlFor={`ep-${ep.id}`} className="text-sm cursor-pointer font-medium">
                          Episode {ep.episode_number}{ep.title ? ` — ${ep.title}` : ''} (base)
                        </label>
                      </div>
                      {/* Episode revisions */}
                      {(episodeRevisions[ep.id] || []).map(rev => {
                        const key = `${ep.id}|${rev.id}`;
                        return (
                          <div key={rev.id} className="flex items-center gap-2 pl-4">
                            <Checkbox
                              id={`ep-rev-${rev.id}`}
                              checked={selectedEpisodeShares.has(key)}
                              onCheckedChange={() => toggleEpisodeShare(key)}
                            />
                            <label htmlFor={`ep-rev-${rev.id}`} className="text-sm cursor-pointer">
                              Revision {rev.revision_number}
                              {rev.attachment_name && (
                                <span className="text-muted-foreground"> — {rev.attachment_name}</span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                      {loadingEpRevisions && !episodeRevisions[ep.id] && (
                        <div className="pl-4 flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading revisions...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedEpisodeShares.size} episode item{selectedEpisodeShares.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            ) : null)}

            {/* Notes */}
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

            {!isEpisodeOnly && (
              <p className="text-xs text-muted-foreground">
                {totalSelected} item{totalSelected !== 1 ? 's' : ''} will be shared for evaluation
              </p>
            )}
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
