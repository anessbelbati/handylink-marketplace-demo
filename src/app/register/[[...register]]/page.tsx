import { SignUp } from "@clerk/nextjs";

import { PublicNav } from "@/components/public-nav";

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto grid w-full max-w-6xl place-items-center px-4 py-14 sm:px-6">
        <div className="glass w-full max-w-md rounded-3xl p-6 shadow-glow">
          <h1 className="text-2xl font-semibold text-slate-950">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose your role after signup to tailor your dashboard.
          </p>
          <div className="mt-6">
            <SignUp
              routing="path"
              path="/register"
              signInUrl="/login"
              afterSignUpUrl="/onboarding"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

