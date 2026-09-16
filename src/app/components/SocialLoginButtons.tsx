"use client";

import { redirectToKeycloak, SocialProvider } from "@/app/lib/keycloakAuth";

interface SocialLoginButtonsProps {
  redirectTo?: string | null;
  isLight?: boolean;
}

export default function SocialLoginButtons({
  redirectTo,
  isLight = true,
}: SocialLoginButtonsProps) {
  const buttonClass = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    : "border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800/60";

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      await redirectToKeycloak(provider, redirectTo);
    } catch (error) {
      console.error("Social login failed:", error);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* GOOGLE */}
      <button
        type="button"
        onClick={() => handleSocialLogin("google")}
        aria-label="Continue with Google"
        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${buttonClass}`}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.15.8 3.9 1.5l2.65-2.55C16.9 3.05 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 8.9-4.85 8.9-7.35 0-.5-.05-.85-.12-1.2H12z"
          />
        </svg>

        <span className="hidden sm:inline">Google</span>
      </button>

      {/* GITHUB */}
      <button
        type="button"
        onClick={() => handleSocialLogin("github")}
        aria-label="Continue with GitHub"
        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${buttonClass}`}
      >
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.42.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>

        <span className="hidden sm:inline">GitHub</span>
      </button>

      {/* FACEBOOK */}
      <button
        type="button"
        onClick={() => handleSocialLogin("facebook")}
        aria-label="Continue with Facebook"
        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${buttonClass}`}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#1877F2"
            d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"
          />
        </svg>

        <span className="hidden sm:inline">Facebook</span>
      </button>
    </div>
  );
}
