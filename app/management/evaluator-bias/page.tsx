import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BiasPageClient } from "@/components/management/evaluator-bias/bias-page-client";

export const dynamic = "force-dynamic";

export default async function EvaluatorBiasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "management", "executive"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Evaluations by Story</h1>
        <p className="text-muted-foreground mt-1">
          Per-story breakdown of evaluator scores across content, programming, and management teams.
        </p>
      </div>
      <BiasPageClient />
    </div>
  );
}
