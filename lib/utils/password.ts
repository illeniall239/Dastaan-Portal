/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Password requirement check result
 */
export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Calculate password strength score and level
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  strength: PasswordStrength;
} {
  if (!password) {
    return { score: 0, strength: "weak" };
  }

  let score = 0;

  // Length score (up to 40 points)
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety (up to 60 points)
  if (/[a-z]/.test(password)) score += 15; // lowercase
  if (/[A-Z]/.test(password)) score += 15; // uppercase
  if (/[0-9]/.test(password)) score += 15; // numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 15; // special chars

  // Determine strength level
  let strength: PasswordStrength = "weak";
  if (score >= 70) {
    strength = "strong";
  } else if (score >= 40) {
    strength = "medium";
  }

  return { score, strength };
}

/**
 * Get password requirements with their status
 */
export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "One number",
      met: /[0-9]/.test(password),
    },
    {
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

/**
 * Check if all password requirements are met
 */
export function areAllRequirementsMet(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.every((req) => req.met);
}

/**
 * Get strength color for UI
 */
export function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    case "strong":
      return "bg-green-500";
    default:
      return "bg-gray-300";
  }
}

/**
 * Get strength text color for UI
 */
export function getStrengthTextColor(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "text-red-600";
    case "medium":
      return "text-yellow-600";
    case "strong":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
}
