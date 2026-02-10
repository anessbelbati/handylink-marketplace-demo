import { SignIn } from "@clerk/nextjs";

import { PublicNav } from "@/components/public-nav";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto grid w-full max-w-6xl place-items-center px-4 py-14 sm:px-6">
        <div className="glass w-full max-w-md rounded-3xl p-6 shadow-glow">
          <h1 className="text-2xl font-semibold text-slate-950">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to post requests, send messages, and manage your work.
          </p>
          <div className="mt-6">
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/register"
              afterSignInUrl="/dashboard"
              afterSignUpUrl="/onboarding"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

