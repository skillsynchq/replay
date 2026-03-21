"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  // If CLI params are present, store them in a cookie before OAuth redirect
  useEffect(() => {
    if (redirectUri && state) {
      document.cookie = `cli_auth_context=${encodeURIComponent(
        JSON.stringify({ redirect_uri: redirectUri, state })
      )}; path=/; max-age=300; samesite=lax`;
    }
  }, [redirectUri, state]);

  const callbackURL = "/login/callback";

  function signInWithGitHub() {
    authClient.signIn.social({
      provider: "github",
      callbackURL,
    });
  }

  function signInWithGoogle() {
    authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h1 className="font-mono text-[13px] text-fg">replay.md</h1>
        <p className="mt-2 text-[16px] font-medium text-fg">
          {redirectUri ? "Authorize the CLI" : "Sign in"}
        </p>
        <p className="mt-1 text-[13px] text-fg-muted">
          {redirectUri
            ? "Sign in to connect your Replay CLI."
            : "Sign in to manage your threads."}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={signInWithGitHub}
          className="flex w-full items-center justify-center gap-2 border border-border bg-surface-raised px-4 py-2.5 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-border-hover rounded-[4px]"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Continue with GitHub
        </button>

        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 border border-border bg-surface-raised px-4 py-2.5 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-border-hover rounded-[4px]"
        >
          <svg viewBox="0 0 24 24" className="size-4">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <Suspense
        fallback={
          <div className="text-[13px] text-fg-muted">Loading...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
