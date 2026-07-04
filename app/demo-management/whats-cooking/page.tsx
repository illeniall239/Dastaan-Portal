import { WhatsCookingDashboard } from "@/components/management/whats-cooking-dashboard";
import { calculateEpisodeMetrics } from "@/lib/management/active-ideas-details";
import { FileVideo, CheckCircle2, FolderOpen, TrendingUp } from "lucide-react";
import { TopPicks } from "@/components/management/whats-cooking/top-picks";
import { StageSummary } from "@/components/management/whats-cooking/stage-summary";
import { ThemeGroups } from "@/components/management/whats-cooking/theme-groups";
import { RatingTiers } from "@/components/management/whats-cooking/rating-tiers";
import { GenreDonut } from "@/components/management/whats-cooking/charts/genre-donut";
import { SlotBars } from "@/components/management/whats-cooking/charts/slot-bars";
import { RatingBars } from "@/components/management/whats-cooking/charts/rating-bars";
import { EpisodeProgress } from "@/components/management/whats-cooking/charts/episode-progress";
import { TimelineChart } from "@/components/management/whats-cooking/charts/timeline-chart";

// Add Next.js caching
export const revalidate = 300; // 5 minutes

// Function to generate dummy data that matches the real schema
function generateDummyActiveIdeas() {
  // Sample genres
  const genres = [
    'Romance', 'Action', 'Comedy', 'Drama', 'Thriller',
    'Horror', 'Sci-Fi', 'Fantasy', 'Mystery', 'Historical'
  ];

  // Sample themes
  const themes = [
    'Family', 'Love', 'Betrayal', 'Revenge', 'Justice',
    'Power', 'Tradition', 'Change', 'Hope', 'Courage'
  ];

  // Sample slots
  const slots = ['7 PM', '8 PM', '9 PM'];

  // Sample statuses
  const statuses = [
    'Script completed', 'Script Final', 'Pre-Production', 'In Pre-Production',
    'Production Planning', 'In Writing', 'Pre-Production - In Writing',
    'Story Under Discussion/Development', 'Contract done - Story Under Discussion/Development',
    'Production Planning - In Writing', 'Pre Production - In Editing',
    'In Pre-Production - Outsource', 'In Writing & Editing',
    'Story Discussed & Approved', 'Need to be Re-Edit', 'Revised script is awaited',
    'Script is in Editing Process', 'Script Received/Not Final',
    'Production Planning - In Editing', 'Production Planning - In Writing - Feedback need to discuss',
    'Pre Production', 'On-air Drama', 'Project on Shoot', 'Script completed not on shoot'
  ];

  // Pakistani drama names in Roman Urdu
  const dramaNames = [
    'Humsafar', 'Mere Paas Tum Ho', 'Diyar-e-Dil', 'Zindagi Gulzar Hai', 'Ishq Zahe Naseeb',
    'Aik Thi Raniya', 'Ishq Khuda Ke Naam', 'Tumhari Natasha', 'Bunty I Love You', 'Lahore Se Aagey',
    'Ishq Zahe Naseeb', 'Jaan Nisaar', 'Pyarey Afzal', 'Ishq Bazaar', 'Aik Thi Meree Qismat',
    'Ishq Hai', 'Sinf-e-Aahan', 'Aik Thi Rania', 'Diyar-e-Dil', 'Alif Allah Aur Insaan',
    'Zindagi Kitni Haseen Hay', 'Mah-e-Tamaam', 'Sanam', 'Ishq Zahe Naseeb', 'Mere Paas Tum Na Aa',
    'Ishq Gumshuda', 'Ishq Zahe Naseeb', 'Diyar-e-Dil', 'Ishq Zahe Naseeb', 'Zindagi Gulzar Hai',
    'Mere Paas Tum Ho', 'Humsafar', 'Diyar-e-Dil', 'Zindagi Gulzar Hai', 'Ishq Zahe Naseeb',
    'Pyarey Afzal', 'Ishq Bazaar', 'Aik Thi Meree Qismat', 'Ishq Hai', 'Sinf-e-Aahan',
    'Aik Thi Rania', 'Diyar-e-Dil', 'Alif Allah Aur Insaan', 'Zindagi Kitni Haseen Hay',
    'Mah-e-Tamaam', 'Sanam', 'Ishq Zahe Naseeb', 'Mere Paas Tum Na Aa', 'Ishq Gumshuda'
  ];

  // Pakistani writer names in Roman Urdu
  const writerNamesList = [
    'Umera Ahmad', 'Hassan Imam', 'Ali Moeen', 'Irfan Khan', 'Saima Akram',
    'Hina Altaf', 'Mehmood Shah', 'Rida Bilgrami', 'Farhat Ishtiaq', 'Bushra Ansari',
    'Saife Hassan', 'Hira Shahab', 'Khalil Ullah', 'Rabia Azfar', 'Ahmed Ali',
    'Fatima Suria', 'Asad Bashir', 'Nida Mumtaz', 'Taimoor Ahmed', 'Nigar Sultana',
    'Faisal Malik', 'Ayesha Iqbal', 'Imran Ashraf', 'Hina Qadir', 'Bilal Ahmad',
    'Zara Javed', 'Sohaib Khan', 'Hareem Shah', 'Arsalan Memon', 'Alishba Shabbir',
    'Talha Shehzad', 'Zainab Ali', 'Waqar Ali', 'Areeba Abbas', 'Osama Tariq',
    'Hafsa Zia', 'Hamza Ali Abbasi', 'Saba Hameed', 'Ali Madeeh', 'Rida Hasan',
    'Noman Javaid', 'Ayesha Khan', 'Arsalan Ahmed', 'Sehar Khan', 'Fahad Mustafa',
    'Zara Babar', 'Fahim Anwar', 'Sonia Bashir', 'Rashid Ali', 'Uroosa Siddiqui'
  ];

  // Create 20 dummy active ideas following the schema
  const ideas = Array.from({ length: 20 }, (_, i) => {
    const numGenres = Math.floor(Math.random() * 3) + 1; // 1-3 genres
    const ideaGenres = Array.from({ length: numGenres }, () =>
      genres[Math.floor(Math.random() * genres.length)]
    );

    const writerCount = Math.floor(Math.random() * 3) + 1; // 1-3 writers
    const selectedWriterNames = Array.from({ length: writerCount }, () =>
      writerNamesList[Math.floor(Math.random() * writerNamesList.length)]
    );

    return {
      id: `idea_${i + 1}`,
      call_report_id: `cr_${i + 1}`,
      working_title: dramaNames[Math.floor(Math.random() * dramaNames.length)],
      writer_name: writerNamesList[Math.floor(Math.random() * writerNamesList.length)],
      writer_names: selectedWriterNames,
      director: Math.random() > 0.3 ? writerNamesList[Math.floor(Math.random() * writerNamesList.length)] : null,
      genre: ideaGenres,
      category: ['Drama', 'Series', 'Movie', 'Web Series'][Math.floor(Math.random() * 4)],
      theme: themes[Math.floor(Math.random() * themes.length)],
      slot: Math.random() > 0.2 ? slots[Math.floor(Math.random() * slots.length)] : null,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      meeting_date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      days_active: Math.floor(Math.random() * 90) + 1,
      logline: `A compelling story about ${themes[Math.floor(Math.random() * themes.length)].toLowerCase()}`,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
      overall_rating: Math.random() > 0.2 ? parseFloat((Math.random() * 10).toFixed(1)) : null,
      content_type: ['Original', 'Adaptation', 'Format'][Math.floor(Math.random() * 3)],
      average_score: Math.random() > 0.2 ? parseFloat((Math.random() * 10).toFixed(2)) : null,
      evaluation_deadline: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      received_episodes: Math.floor(Math.random() * 20),
      total_episodes: Math.floor(Math.random() * 20) + 5,
      completion_percentage: Math.random() * 100,
      evaluator_scores: {
        nadeem: Math.random() > 0.3 ? parseFloat((Math.random() * 10).toFixed(1)) : null,
        salman: Math.random() > 0.3 ? parseFloat((Math.random() * 10).toFixed(1)) : null,
        imran: Math.random() > 0.3 ? parseFloat((Math.random() * 10).toFixed(1)) : null,
      },
      management_member_name: writerNamesList[Math.floor(Math.random() * writerNamesList.length)],
      idea_by: writerNamesList[Math.floor(Math.random() * writerNamesList.length)],
      developed_by: writerNamesList[Math.floor(Math.random() * writerNamesList.length)],
      person_in_charge: writerNamesList[Math.floor(Math.random() * writerNamesList.length)],
      one_liner_approved: ['approved', 'pending', 'rejected', 'needs_improvement', null][Math.floor(Math.random() * 5)] as string | null,
      one_liner_summary: Math.random() > 0.5 ? 'Sample one-liner summary' : null,
      approval_count: Math.floor(Math.random() * 5),
      rejection_count: Math.floor(Math.random() * 3),
      needs_improvement_count: Math.floor(Math.random() * 2),
      total_evaluators: Math.floor(Math.random() * 5) + 3,
      remarks: Math.random() > 0.5 ? 'Sample remarks' : null,
      actual_received_episodes: Math.floor(Math.random() * 20),
      first_episode_received_at: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString() : null,
      last_episode_received_at: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() : null,
      revised_episode_count: Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0,
      monthly_episode_receipts: Math.random() > 0.3 ? { '2026-01': Math.floor(Math.random() * 5) + 1, '2026-02': Math.floor(Math.random() * 3) + 1 } : null,
      days_since_first_episode: Math.random() > 0.3 ? Math.floor(Math.random() * 90) : null,
      days_since_last_episode: Math.random() > 0.3 ? Math.floor(Math.random() * 60) : null
    };
  });

  return {
    details: ideas,
    total: ideas.length
  };
}

export default function WhatsCookingPage() {
  // Generate dummy active ideas details
  const activeIdeasDetails = generateDummyActiveIdeas();

  // Calculate episode metrics
  const episodeMetrics = calculateEpisodeMetrics(activeIdeasDetails.details);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Active Projects
          </h1>
          <p className="text-gray-500 mt-1">
            Active ideas, preliminary scripts, and projects under consideration
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {activeIdeasDetails.total} active projects
        </div>
      </div>

      {/* Summary Stats - Clean minimal design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FolderOpen className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileVideo className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Episodes Planned</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalEpisodesPlanned}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Episodes Received</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalEpisodesReceived}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#224794] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{episodeMetrics.overallCompletionPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GenreDonut ideas={activeIdeasDetails.details} />
        <SlotBars ideas={activeIdeasDetails.details} />
        <RatingBars ideas={activeIdeasDetails.details} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EpisodeProgress ideas={activeIdeasDetails.details} />
        <TimelineChart ideas={activeIdeasDetails.details} />
      </div>

      {/* Top Picks - What's Hot */}
      <TopPicks ideas={activeIdeasDetails.details} />

      {/* Pipeline by Stage */}
      <StageSummary ideas={activeIdeasDetails.details} />

      {/* Two column layout for Theme and Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Theme */}
        <ThemeGroups ideas={activeIdeasDetails.details} />

        {/* By Rating */}
        <RatingTiers ideas={activeIdeasDetails.details} />
      </div>

      {/* Detailed Project Table */}
      <WhatsCookingDashboard ideas={activeIdeasDetails.details} />
    </div>
  );
}
