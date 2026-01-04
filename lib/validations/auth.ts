import { z } from "zod";
import type { UserRole } from "@/types";

// Organization email domain (for testing, we'll allow any domain)
// const ALLOWED_EMAIL_DOMAIN = "geo.com";

// Helper function to map department to role
export const departmentToRole = (department: string): UserRole => {
  switch (department) {
    case "evaluator":
      return "evaluator";
    case "management":
      return "management";
    case "content_team":
      return "content_creator";
    case "programming_team":
      return "programmer";
    case "admin":
      return "admin";
    default:
      return "content_creator";
  }
};

/**
 * Signup Form Validation Schema
 */
export const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must not exceed 50 characters")
      .regex(
        /^[a-zA-Z\s\-']+$/,
        "Name can only contain letters, spaces, hyphens, and apostrophes"
      )
      .transform((val) => val.trim())
      .refine((val) => val.length > 0, {
        message: "Name cannot be only whitespace",
      }),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .toLowerCase()
      .transform((val) => val.trim()),
      // For testing, we're removing the domain restriction
      // .refine(
      //   (email) => {
      //     const domain = email.split("@")[1];
      //     return domain === ALLOWED_EMAIL_DOMAIN;
      //   },
      //   {
      //     message: `Only @${ALLOWED_EMAIL_DOMAIN} organization email addresses are allowed`,
      //   }
      // ),

    department: z.enum([
      "evaluator",
      "management",
      "content_team",
      "programming_team",
    ], {
      required_error: "Department is required",
      invalid_type_error: "Please select a valid department",
    }),

    position: z
      .string()
      .min(2, "Position must be at least 2 characters")
      .max(100, "Position must not exceed 100 characters")
      .optional()
      .transform((val) => (val ? val.trim() : val))
      .refine((val) => (val ? val.length > 0 : true), {
        message: "Position cannot be only whitespace",
      }),

    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must not exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .transform((data) => ({
    ...data,
    role: departmentToRole(data.department)
  }));

/**
 * Login Form Validation Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .transform((val) => val.trim()),
    // For testing, we're removing the domain restriction
    // .refine(
    //   (email) => {
    //     const domain = email.split("@")[1];
    //     return domain === ALLOWED_EMAIL_DOMAIN;
    //   },
    //   {
    //     message: `Please use your @${ALLOWED_EMAIL_DOMAIN} organization email`,
    //   }
    // ),

  password: z.string().min(1, "Password is required"),
});

/**
 * TypeScript types inferred from schemas
 */
export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Admin Create User Form Validation Schema
 */
export const adminCreateUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .regex(
      /^[a-zA-Z\s\-']+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters"),
  position: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  department: z.enum([
    "admin",
    "content_head",
    "evaluator",
    "management",
    "content_team",
    "programming_team",
  ], {
    required_error: "Department is required",
    invalid_type_error: "Please select a valid department",
  }),
  team_id: z
    .string()
    .uuid("Invalid team ID")
    .optional()
    .or(z.literal("")),
});

/**
 * TypeScript types inferred from schemas
 */
export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;

