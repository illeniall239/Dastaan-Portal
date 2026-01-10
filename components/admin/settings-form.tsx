"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
}

interface SettingsFormProps {
  initialSettings: SystemSetting[];
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Find cross-team visibility setting
  const crossTeamSetting = initialSettings.find(
    (s) => s.setting_key === "cross_team_visibility"
  );
  const [crossTeamEnabled, setCrossTeamEnabled] = useState(
    crossTeamSetting?.setting_value?.enabled ?? false
  );

  const handleToggleCrossTeamVisibility = async (checked: boolean) => {
    // Show confirmation dialog when disabling
    if (!checked) {
      const confirmed = window.confirm(
        "Are you sure you want to disable cross-team visibility? " +
        "Teams will only be able to see their own content."
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting_key: "cross_team_visibility",
          setting_value: { enabled: checked },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setting");
      }

      setCrossTeamEnabled(checked);
      setSuccess(true);
      router.refresh(); // Refresh server data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Settings updated successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Cross-Team Visibility Setting */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Label htmlFor="cross-team-visibility" className="text-base font-semibold">
              Cross-Team Visibility
            </Label>
            <p className="text-sm text-muted-foreground">
              {crossTeamSetting?.description ||
                "When enabled, all teams can view and analyze content created by other teams. When disabled, teams can only see their own content (default behavior)."}
            </p>
          </div>
          <Switch
            id="cross-team-visibility"
            checked={crossTeamEnabled}
            onCheckedChange={handleToggleCrossTeamVisibility}
            disabled={loading}
            className="ml-4"
          />
        </div>

        {/* Info Alert */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Status:</strong>{" "}
            {crossTeamEnabled ? (
              <span className="text-green-600 font-medium">
                Enabled - All teams can see each other&apos;s content
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                Disabled - Teams can only see their own content (default)
              </span>
            )}
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Note: Admin, Management, and Programmer roles always have global access regardless of this setting.
            </span>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
