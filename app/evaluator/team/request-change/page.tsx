import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEvaluatorTeam, getTeamMembers } from '@/lib/evaluations/team';
import RequestChangeForm from './request-change-form';

export default async function RequestTeamChangePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const team = await getEvaluatorTeam();
    const currentMembers = await getTeamMembers(team.id);

    // Get all users NOT on this team (potential additions)
    const { data: availableUsers } = await supabase
      .from('users')
      .select('id, name, email, role')
      .or(`team_id.is.null,team_id.neq.${team.id}`)
      .order('name');

    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Request Team Change</h1>
        <RequestChangeForm
          teamId={team.id}
          teamName={team.name}
          currentMembers={currentMembers}
          availableUsers={availableUsers || []}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading team data:', error);
    redirect('/evaluator/team');
  }
}
