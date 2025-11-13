"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateUserSchema, type AdminCreateUserFormData } from "@/lib/validations/auth";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User, Briefcase, Building2, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

export default function NewUserPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      position: "",
      department: undefined,
    },
  });

  const onSubmit = async (data: AdminCreateUserFormData) => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Validation error:", result.error);
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : "Failed to create user. Please check all fields.";
        toast.error("User creation failed", {
          description: errorMessage,
        });
        return;
      }

      toast.success("User created successfully!", {
        description: `${data.name} has been added to the system.`,
      });
      router.push("/admin/users");

    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <BackButton fallbackHref="/admin/users" variant="ghost" className="-ml-2 hover:bg-slate-200 w-fit" label="Back to Users" />

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-[#224794] flex items-center justify-center flex-shrink-0">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create New User</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Add a new user to the Dastaan portal
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#224794]" />
              User Information
            </CardTitle>
            <CardDescription>
              Enter the details for the new user. All fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Personal Information
                </h3>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Ahmed Khan"
                    className={`touch-target ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="user@geo.com"
                    className={`touch-target ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be a valid @geo.com email address
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Minimum 8 characters"
                    className={`touch-target ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password will be sent to the user via email
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t pt-6" />

              {/* Work Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Work Information
                </h3>

                {/* Position Field */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    Position/Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="position"
                    {...register("position")}
                    placeholder="e.g., Senior Content Manager"
                    className={`touch-target ${errors.position ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.position.message}
                    </p>
                  )}
                </div>

                {/* Department Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="department"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={`touch-target ${errors.department ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production_content_1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              Production Content 1
                            </div>
                          </SelectItem>
                          <SelectItem value="production_content_2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              Production Content 2
                            </div>
                          </SelectItem>
                          <SelectItem value="channel_content_1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500" />
                              Channel Content 1
                            </div>
                          </SelectItem>
                          <SelectItem value="channel_content_2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500" />
                              Channel Content 2
                            </div>
                          </SelectItem>
                          <SelectItem value="adaptation_content">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              Adaptation Content
                            </div>
                          </SelectItem>
                          <SelectItem value="management">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                              Management
                            </div>
                          </SelectItem>
                          <SelectItem value="evaluator">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-yellow-500" />
                              Evaluator
                            </div>
                          </SelectItem>
                          <SelectItem value="legal">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-500" />
                              Legal Department
                            </div>
                          </SelectItem>
                          <SelectItem value="finance">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              Finance Department
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-slate-500" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.department && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.department.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The department determines the user's role and access permissions
                  </p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Security Notice</p>
                    <p className="text-xs text-blue-700">
                      User accounts are created with the email and password you provide.
                      Make sure to securely share credentials with the new user. All admin actions are logged for audit purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/users")}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full sm:flex-1 bg-[#224794] hover:bg-[#1a3670]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
