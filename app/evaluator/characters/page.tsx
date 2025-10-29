import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CharacterForm } from "./character-form";

export const metadata = {
  title: "Character Development | Evaluator Portal",
  description: "Create detailed character profiles for story development",
};

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Check if user is evaluator
  if (!userData || userData.role !== "evaluator") {
    redirect("/dashboard");
  }

  return <CharacterForm />;
}
