import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header - Navbar */}
      <Header
        userName={user.name || "User"}
        userEmail={user.email}
        userPosition={user.position}
      />

      {/* Main Content - Full Width */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}