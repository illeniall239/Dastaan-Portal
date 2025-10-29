import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// Evaluator-specific navigation items
const evaluatorNavItems = [
  {
    title: "Dashboard",
    href: "/evaluator",
    icon: "home",
  },
  {
    title: "Calendar",
    href: "/evaluator/calendar",
    icon: "calendar",
  },
  // Temporarily hidden - will be enabled later
  // {
  //   title: "One-Liner",
  //   href: "/evaluator/one-liner",
  //   icon: "penLine",
  // },
  // {
  //   title: "Characters",
  //   href: "/evaluator/characters",
  //   icon: "users",
  // },
  {
    title: "Writer Engagement Reports",
    href: "/evaluator/call-reports",
    icon: "fileText",
  },
  {
    title: "One-Liner Evaluations",
    href: "/evaluator/evaluations-list",
    icon: "clipboardList",
  },
  {
    title: "Episodes",
    href: "/evaluator/episodes",
    icon: "film",
  },
  {
    title: "Negotiations",
    href: "/evaluator/negotiations",
    icon: "handshake",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "settings",
  },
];

export default async function EvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow evaluators
  if (user.role !== "evaluator") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header - Navbar */}
      <Header
        userName={user.name || "Evaluator"}
        userEmail={user.email}
        userPosition={user.position}
        navItems={evaluatorNavItems}
      />

      {/* Main Content - Full Width */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}