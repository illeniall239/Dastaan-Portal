import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";

// No caching for settings page to ensure fresh data
export const revalidate = 0;

export default async function SystemSettingsPage() {
  const user = await getCurrentUser();

  // Only admins can access settings
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch current settings
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key');

  if (error) {
    console.error('Error fetching settings:', error);
  }

  return (
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage system-wide configuration and feature flags
        </p>
      </div>

      {/* Settings Form */}
      <SettingsForm initialSettings={settings || []} />
    </div>
  );
}
