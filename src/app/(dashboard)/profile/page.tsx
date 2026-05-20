import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { getMyPendingDeptRequest } from "@/app/actions/users";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const pendingDeptRequest = await getMyPendingDeptRequest();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              MY_PROFILE
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50">
              EDIT_YOUR_DETAILS
            </p>
          </div>
          <span className="material-symbols-outlined text-[32px] md:text-[36px] text-primary">
            person
          </span>
        </div>
      </div>

      <ProfileEditForm user={user} pendingDeptRequest={pendingDeptRequest} />
    </div>
  );
}
