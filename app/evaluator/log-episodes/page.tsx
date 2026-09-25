"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EpisodeUploadForm, type EpisodeFormEntry } from "@/components/episodes/episode-upload-form";
import { EpisodeFileUpload } from "@/components/episodes/episode-file-upload";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { createClient } from "@/lib/supabase/client";
import { uploadAndVerify } from "@/lib/storage/verify-upload";
import { uploadEpisodeFile } from "@/lib/episodes/upload-client";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";
import type { EpisodeWithDetails } from "@/types";

interface CallReportWriter {
  id: string;
  writer_id: string;
  writer_name: string;
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
}

interface CallReport {
  id: string;
  working_title: string;
  writer_name: string;
  writers?: CallReportWriter[];
  meeting_type: string;
  story_id?: string;
}

type ExistingEpisodeEdit = EpisodeWithDetails & {
  _newFile?: File | null;
  _isSaving?: boolean;
  _error?: string | null;
  _originalEpisodeNumber?: number | null;
  _originalAttachmentName?: string | null;
  _originalAttachmentUrl?: string | null;
  _originalAttachmentType?: string | null;
  _originalAdditionalInfo?: string | null;
  _originalInitialAssessment?: number | null;
};

export default function LogEpisodesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [selectedSource, setSelectedSource] = useState<string>(searchParams.get("source") || "");
  const [callReports, setCallReports] = useState<CallReport[]>([]);

  const [existingEpisodesForSource, setExistingEpisodesForSource] = useState<ExistingEpisodeEdit[]>([]);
  const [existingEpisodesLoading, setExistingEpisodesLoading] = useState(false);
  const [existingEpisodeNumbers, setExistingEpisodeNumbers] = useState<number[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [newEpisodes, setNewEpisodes] = useState<EpisodeFormEntry[]>([
    { episode_number: 1, file: null, additional_info: "", initial_assessment: 5 },
  ]);

  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const newEpisodesSectionRef = useRef<HTMLDivElement | null>(null);

  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "log_episodes",
    entityId: selectedSource || "_new",
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  useEffect(() => {
    saveDraft({
      selectedSource,
      episodes: newEpisodes.map(({ file, ...rest }) => rest),
    });
  }, [selectedSource, newEpisodes, saveDraft]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      if (d.selectedSource) setSelectedSource(d.selectedSource);
      if (d.episodes) {
        setNewEpisodes(d.episodes.map((ep: any) => ({ ...ep, file: null })));
      }
      setDraftDismissed(true);
      toast.success("Draft restored (files must be re-selected)");
    }
  }, [loadDraft]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

  useEffect(() => {
    async function fetchData() {
      setFetchingData(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error("Not authenticated"); setFetchingData(false); return; }

        const { data: currentUser } = await supabase
          .from("users").select("team_id, role").eq("id", user.id).single();

        if (currentUser?.role) setCurrentUserRole(currentUser.role);

        let callReportsQuery = supabase
          .from("call_reports")
          .select(`id, working_title, writer_name, meeting_type, story_id,
            call_report_writers:call_report_writers (id, writer_id, writer_email, writer_phone, display_order, writer:writers(name))`)
          .eq("meeting_type", "call_report")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!currentUser?.team_id) { setCallReports([]); setFetchingData(false); return; }
        callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);

        const { data: callReportsData, error: crError } = await callReportsQuery;
        if (crError) { console.error("Error fetching call reports:", crError); }
        else if (callReportsData) {
          const reportsWithWriters = callReportsData.map((report: any) => {
            const transformedWriters: CallReportWriter[] =
              report.call_report_writers?.map((w: any) => ({
                id: w.id, writer_id: w.writer_id, writer_name: w.writer?.name || "",
                writer_email: w.writer_email, writer_phone: w.writer_phone, display_order: w.display_order,
              })) || [];
            return { ...report, writers: transformedWriters.sort((a, b) => a.display_order - b.display_order) };
          });
          setCallReports(reportsWithWriters);
        }
      } catch (error) { console.error("Error fetching data:", error); toast.error("Failed to load data"); }
      finally { setFetchingData(false); }
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    const numbers = existingEpisodesForSource
      .map((ep) => ep.episode_number)
      .filter((num): num is number => typeof num === "number");
    setExistingEpisodeNumbers((prev) => {
      if (prev.length !== numbers.length) return numbers;
      if (prev.every((num, idx) => num === numbers[idx])) return prev;
      return numbers;
    });
    const nextEpisodeNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    setNewEpisodes([{ episode_number: nextEpisodeNumber, file: null, additional_info: "", initial_assessment: 5 }]);
  }, [existingEpisodesForSource]);

  const loadExistingEpisodes = useCallback(async () => {
    if (!selectedSource) {
      setExistingEpisodesForSource([]);
      setExistingEpisodeNumbers([]);
      setNewEpisodes([{ episode_number: 1, file: null, additional_info: "", initial_assessment: 5 }]);
      return;
    }
    setExistingEpisodesLoading(true);
    try {
      const response = await fetch(`/api/episodes?call_report_id=${selectedSource}&limit=100`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch episodes");
      const episodesList: ExistingEpisodeEdit[] = (data.data || [])
        .sort((a: EpisodeWithDetails, b: EpisodeWithDetails) => (a.episode_number ?? 0) - (b.episode_number ?? 0))
        .map((episode: EpisodeWithDetails) => ({
          ...episode, _newFile: null, _isSaving: false, _error: null,
          _originalEpisodeNumber: episode.episode_number ?? null,
          _originalAttachmentName: episode.attachment_name ?? null,
          _originalAttachmentUrl: episode.attachment_url ?? null,
          _originalAttachmentType: episode.attachment_type ?? null,
          _originalAdditionalInfo: episode.additional_info ?? null,
          _originalInitialAssessment: episode.initial_assessment ?? null,
        }));
      setExistingEpisodesForSource(episodesList);
    } catch (error) {
      console.error("Error fetching existing episodes:", error);
      toast.error("Failed to fetch existing episodes");
      setExistingEpisodesForSource([]); setExistingEpisodeNumbers([]);
      setNewEpisodes([{ episode_number: 1, file: null, additional_info: "", initial_assessment: 5 }]);
    } finally { setExistingEpisodesLoading(false); }
  }, [selectedSource]);

  useEffect(() => { loadExistingEpisodes(); }, [loadExistingEpisodes]);

  useEffect(() => {
    if (searchParams.get("source") && existingEpisodesForSource.length > 0 && !existingEpisodesLoading) {
      setTimeout(() => { newEpisodesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
    }
  }, [existingEpisodesForSource, existingEpisodesLoading]);

  const updateExistingEpisode = (episodeId: string, updates: Partial<ExistingEpisodeEdit>) => {
    setExistingEpisodesForSource((prev) =>
      prev.map((episode) => (episode.id === episodeId ? { ...episode, ...updates } : episode))
    );
  };

  const hasEpisodeChanges = (episode: ExistingEpisodeEdit) => {
    return (
      episode._newFile ||
      (episode.episode_number ?? null) !== (episode._originalEpisodeNumber ?? null) ||
      (episode.additional_info ?? "") !== (episode._originalAdditionalInfo ?? "") ||
      (episode.attachment_url ?? null) !== (episode._originalAttachmentUrl ?? null) ||
      (episode.attachment_name ?? null) !== (episode._originalAttachmentName ?? null) ||
      (episode.initial_assessment ?? null) !== (episode._originalInitialAssessment ?? null)
    );
  };

  const handleDownload = async (episode: EpisodeWithDetails) => {
    if (!episode.attachment_url) { toast.error("No file attached to this episode"); return; }
    try { window.open(`/api/episodes/download/${episode.id}`, "_blank"); toast.success("Opening file..."); }
    catch (error) { console.error("Download error:", error); toast.error("Failed to download file"); }
  };

  const handleSaveExistingEpisode = async (episodeId: string) => {
    const episode = existingEpisodesForSource.find((ep) => ep.id === episodeId);
    if (!episode) return;
    if (!hasEpisodeChanges(episode)) { toast.info("No changes to save for this episode."); return; }
    updateExistingEpisode(episodeId, { _isSaving: true, _error: null });
    try {
      const payload: Record<string, any> = {};
      let attachmentUpdated = false;
      if ((episode.episode_number ?? null) !== (episode._originalEpisodeNumber ?? null)) payload.episode_number = episode.episode_number ?? 1;
      if ((episode.additional_info ?? "") !== (episode._originalAdditionalInfo ?? "")) payload.additional_info = episode.additional_info ?? null;
      if ((episode.initial_assessment ?? null) !== (episode._originalInitialAssessment ?? null)) payload.initial_assessment = episode.initial_assessment ?? null;
      if (episode._newFile) {
        const fileExt = episode._newFile.name.split(".").pop();
        const safeExt = fileExt ? `.${fileExt}` : "";
        const storagePath = `${episode.call_report_id || episode.story_id || "episode"}/${episode.id}-${Date.now()}${safeExt}`;
        payload.attachment_url = await uploadAndVerify(supabase, "episodes", storagePath, episode._newFile, { upsert: true });
        payload.attachment_name = episode._newFile.name;
        payload.attachment_type = episode._newFile.type || safeExt || "application/octet-stream";
        attachmentUpdated = true;
      } else if ((episode.attachment_url ?? null) !== (episode._originalAttachmentUrl ?? null)) {
        payload.attachment_url = episode.attachment_url ?? null;
        payload.attachment_name = episode.attachment_name ?? null;
        payload.attachment_type = episode.attachment_type ?? null;
        attachmentUpdated = true;
      }
      if (Object.keys(payload).length === 0 && !attachmentUpdated) { updateExistingEpisode(episodeId, { _isSaving: false }); toast.info("No changes to save for this episode."); return; }
      const response = await fetch(`/api/episodes/${episodeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.details || "Failed to update episode");
      const updatedEpisode: EpisodeWithDetails = result.episode;
      updateExistingEpisode(episodeId, {
        ...updatedEpisode, _newFile: null, _isSaving: false, _error: null,
        _originalEpisodeNumber: updatedEpisode.episode_number ?? null,
        _originalAttachmentName: updatedEpisode.attachment_name ?? null,
        _originalAttachmentUrl: updatedEpisode.attachment_url ?? null,
        _originalAttachmentType: updatedEpisode.attachment_type ?? null,
        _originalAdditionalInfo: updatedEpisode.additional_info ?? null,
        _originalInitialAssessment: updatedEpisode.initial_assessment ?? null,
      });
      toast.success(`Episode ${updatedEpisode.episode_number ?? ""} updated.`);
    } catch (error: any) {
      console.error("Error updating episode:", error);
      updateExistingEpisode(episodeId, { _isSaving: false, _error: error.message || "Failed to save episode changes" });
      toast.error(error.message || "Failed to save episode changes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) { toast.error("Please select a story"); return; }
    if (newEpisodes.length === 0) { toast.error("Please add at least one episode"); return; }
    const duplicates = newEpisodes.filter(ep => existingEpisodeNumbers.includes(ep.episode_number));
    if (duplicates.length > 0) {
      const duplicateNumbers = duplicates.map(d => d.episode_number).sort((a, b) => a - b);
      toast.error(`Episode ${duplicateNumbers.join(', ')} already exist${duplicateNumbers.length > 1 ? '' : 's'} for this project`);
      return;
    }
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const episodesData = await Promise.all(
        newEpisodes.map(async (episode) => {
          let attachment_url = null; let attachment_name = null; let attachment_type = null;
          if (episode.file) {
            const fileExt = episode.file.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${selectedSource}/${fileName}`;
            try {
              const result = await uploadEpisodeFile(episode.file, "episodes", filePath, supabaseUrl, supabaseAnonKey,
                (progress) => { setUploadProgress(prev => ({ ...prev, [episode.episode_number]: progress })); }, accessToken);
              attachment_url = result.publicUrl; attachment_name = episode.file.name; attachment_type = episode.file.type;
              setUploadProgress(prev => { const n = { ...prev }; delete n[episode.episode_number]; return n; });
            } catch (uploadError) {
              console.error("File upload error:", uploadError);
              setUploadProgress(prev => { const n = { ...prev }; delete n[episode.episode_number]; return n; });
              throw new Error(`Failed to upload ${episode.file.name}`);
            }
          }
          return { episode_number: episode.episode_number, attachment_url, attachment_name, attachment_type,
            additional_info: episode.additional_info || null, initial_assessment: episode.initial_assessment || null,
            original_submission_date: episode.original_submission_date || null };
        })
      );
      const payload = { call_report_id: selectedSource, episodes: episodesData };
      const response = await fetch("/api/episodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error || "Failed to create episodes");
      await clearDraft();
      toast.success(`Successfully logged ${newEpisodes.length} episode(s)`);
      setSelectedSource("");
      setNewEpisodes([{ episode_number: 1, file: null, additional_info: "", initial_assessment: 5 }]);
      router.push("/evaluator/episodes");
      router.refresh();
    } catch (error: any) { console.error("Error creating episodes:", error); toast.error(error.message || "Failed to log episodes"); }
    finally { setLoading(false); }
  };

  if (fetchingData) {
    return (<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>);
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator/episodes" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Log Episodes</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Log new episodes for approved dramas</p>
        </div>
      </div>

      {!draftDismissed && (
        <DraftRestoreBanner hasDraft={hasDraft} draftLoaded={draftLoaded} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} lastUpdated={draftUpdatedAt} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="space-y-3 sm:space-y-4 md:space-y-6 bg-white p-3 sm:p-4 md:p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="source-select" className="text-sm sm:text-base">Select a story <span className="text-red-500">*</span></Label>
            <Select value={selectedSource} onValueChange={setSelectedSource} disabled={loading}>
              <SelectTrigger id="source-select"><SelectValue placeholder="Select a story" /></SelectTrigger>
              <SelectContent>
                {callReports.map((cr) => {
                  const writerNames = cr.writers && cr.writers.length > 0 ? cr.writers.map(w => w.writer_name).join(", ") : cr.writer_name;
                  return (<SelectItem key={cr.id} value={cr.id}>{cr.working_title} - {writerNames}</SelectItem>);
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Existing Episodes */}
        {selectedSource && (
          <Card>
            <CardHeader><CardTitle className="text-base">Existing Episodes ({existingEpisodesForSource.length})</CardTitle></CardHeader>
            <CardContent>
              {existingEpisodesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading existing episodes...</div>
              ) : existingEpisodesForSource.length === 0 ? (
                <p className="text-sm text-muted-foreground">No episodes logged yet for this story.</p>
              ) : (
                <div className="space-y-4">
                  <Card className="bg-slate-50 border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <div>
                        <CardTitle className="text-sm font-semibold">Info & edit existing episodes</CardTitle>
                        <p className="text-xs text-muted-foreground">Update numbers or re-upload files below. Add-ons appear at the bottom.</p>
                      </div>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                  </Card>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {existingEpisodesForSource.map((episode, idx) => (
                      <Card key={episode.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-base font-semibold">Episode {episode.episode_number ?? "—"}</CardTitle>
                            <Badge variant="secondary">Logged by {episode.logged_by_user?.name || "Unknown"}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`existing-episode-${episode.id}-number`}>Episode Number</Label>
                            <Input id={`existing-episode-${episode.id}-number`} type="number" value={episode.episode_number ?? idx + 1}
                              onChange={(e) => { const v = e.target.value; const n = parseInt(v); updateExistingEpisode(episode.id, { episode_number: v === "" ? undefined : (isNaN(n) ? undefined : n) }); }}
                              onBlur={(e) => { const v = parseInt(e.target.value); if (!v || v < 1) updateExistingEpisode(episode.id, { episode_number: episode._originalEpisodeNumber ?? 1 }); }}
                              data-episode-number={episode.episode_number ?? idx + 1} />
                          </div>
                          <div className="space-y-2">
                            <Label>Attachment</Label>
                            <EpisodeFileUpload file={episode._newFile || null} existingFileName={episode.attachment_name || undefined} existingFileUrl={episode.attachment_url || undefined}
                              onExistingFileDownload={() => handleDownload(episode)} onFileSelect={(file) => updateExistingEpisode(episode.id, { _newFile: file })}
                              onFileRemove={() => updateExistingEpisode(episode.id, { _newFile: null, attachment_url: null, attachment_name: null, attachment_type: null })} disabled={episode._isSaving} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`existing-episode-${episode.id}-info`}>Additional Information</Label>
                            <Textarea id={`existing-episode-${episode.id}-info`} rows={3} value={episode.additional_info || ""}
                              onChange={(e) => updateExistingEpisode(episode.id, { additional_info: e.target.value })} />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">{episode.additional_info?.length || 0}/5000 characters</div>
                          </div>
                          <div className="space-y-2">
                            <Label>Initial Assessment</Label>
                            <ScoreCard label="Initial Assessment" description="Your initial rating of this episode (1-10)" score={episode.initial_assessment ?? 5}
                              onChange={(score) => updateExistingEpisode(episode.id, { initial_assessment: score })} disabled={episode._isSaving} />
                          </div>
                          <EpisodeRevisions episodeId={episode.id} sourceId={selectedSource} canEdit={true} userRole={currentUserRole || undefined} evaluateUrl="/evaluator/episodes" />
                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
                            {episode._error && <p className="text-xs text-destructive">{episode._error}</p>}
                            <div className="ml-auto">
                              <Button size="sm" variant="outline" type="button" disabled={!hasEpisodeChanges(episode) || episode._isSaving} onClick={() => handleSaveExistingEpisode(episode.id)}>
                                {episode._isSaving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>) : "Save Changes"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* New Episodes Form */}
        {selectedSource && (
          <div ref={newEpisodesSectionRef} className="space-y-3 sm:space-y-4 md:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold">New Episodes</h2>
            <EpisodeUploadForm episodes={newEpisodes} onEpisodesChange={setNewEpisodes} disabled={loading} existingEpisodeNumbers={existingEpisodeNumbers} uploadProgress={uploadProgress} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button type="submit" disabled={loading || !selectedSource || newEpisodes.length === 0} className="flex-1 touch-target">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Logging Episodes...</span><span className="sm:hidden">Logging...</span></>) :
              (<><span className="hidden sm:inline">{newEpisodes.length === 1 ? "Log Episode" : `Log ${newEpisodes.length} Episodes`}</span><span className="sm:hidden">{newEpisodes.length === 1 ? "Log" : `Log ${newEpisodes.length}`}</span></>)}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/evaluator/episodes")} disabled={loading} className="touch-target">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
