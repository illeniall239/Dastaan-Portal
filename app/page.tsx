import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleBasedRedirect } from "@/lib/utils";

export default async function Home() {
  const user = await getCurrentUser();

  // If user is logged in, redirect to their role-specific portal
  // Otherwise redirect to login
  if (user) {
    redirect(getRoleBasedRedirect(user.role));
  } else {
    redirect("/login");
  }
}
