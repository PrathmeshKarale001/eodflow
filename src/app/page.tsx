import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing-page";
import { Navbar } from "@/components/navbar";


export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/overview");
  }

  return (
    <div className="p-2 py-3 md:p-3 md:py-4 flex flex-col gap-3 h-screen relative z-0 overflow-auto px-2">
      <Navbar />
      <main className="flex-1 min-h-0 flex flex-col relative z-10 w-full">
        <LandingPage />
      </main>
    </div>
  );
}
