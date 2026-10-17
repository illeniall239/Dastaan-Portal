import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

export default async function ContentDepartmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated or not in content department
  if (!user) {
    redirect("/login");
  }

  // Only allow content department users (both managers and creators)
  // Evaluators are not allowed in the main content department area
  if (user.role !== "content_creator" && user.role !== "content_manager") {
    redirect("/dashboard");
  }

  // team_id from session cookie — skip the users query
  let teamName: string | null = null;
  if (user.team_id) {
    try {
      const supabase = await createClient();
      const { data: team } = await supabase
        .from("teams")
        .select("name, team_head:users!team_head_id(name)")
        .eq("id", user.team_id)
        .single();

      const headName = Array.isArray(team?.team_head)
        ? team.team_head[0]?.name
        : (team?.team_head as any)?.name;
      teamName = headName ? `${headName}'s Team` : team?.name || null;
    } catch {
      // Silent fail — badge is non-critical
    }
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/content-department",
      icon: "home",
    },
    {
      title: "One-Liners",
      href: "/content-department/one-liners",
      icon: "fileText",
      highlight: true,
    },
    {
      title: "Scripts & Episodes",
      href: "/content-department/episodes",
      icon: "film",
      highlight: true,
    },
    {
      title: "Calendar",
      href: "/content-department/calendar",
      icon: "calendar",
    },
  ];

  return (
    <SidebarWrapper
      userName={user.name || "User"}
      userEmail={user.email}
      userPosition={user.position}
      teamName={teamName}
      navItems={navItems}
      showAIButton
    >
      {children}
    </SidebarWrapper>
  );
}