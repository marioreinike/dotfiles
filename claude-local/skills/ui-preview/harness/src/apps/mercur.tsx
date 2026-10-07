// Provider tree for apps/mercur: the subset of pages/_app.tsx a component
// needs to render outside Next.js. Heavy, network-bound providers
// (Permission, WebSocket, Panda, CallProviders, ...) are left out; a scenario
// adds them through `wrapper` when a component really depends on them.
import "@/styles/globals.css";
import "@/styles/rgl-overrides.css";
import "@vambe/tailwind-config/globals.css";

import { ThemeProvider } from "@/components/theme/theme-context";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-storage";
import { numberInterpolation } from "@/lib/i18n/number-interpolation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api, initializeApi } from "@vambe/api/api";
import { AuthContext } from "@vambe/auth/src/context/auth-context";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { I18nextTranslationProvider } from "@vambe/translations";
import { MotionProvider } from "@vambe/ui";
import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { useState, type ComponentProps, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { PreviewOptions, Theme } from "../api";
import { addBusyProbe, BACKEND, fixtureAdapter, getParked } from "../network";
import { fakeCurrentUser } from "../shims/firebase-client";

export async function initApp({ theme, locale }: { theme: Theme; locale: string }) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage blocked: the class toggle below still applies the theme
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  document.documentElement.lang = locale;
  document.body.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

  initializeApi({
    baseURL: BACKEND,
    embedBaseURL: `${BACKEND}/frontend/api/embed`,
    authProvider: { currentUser: fakeCurrentUser },
  });
  api.defaults.adapter = fixtureAdapter;

  await i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: locale,
      fallbackLng: "es",
      ns: ["common"],
      defaultNS: "common",
      backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      react: { useSuspense: false },
      interpolation: numberInterpolation,
      returnNull: false,
    } as Parameters<typeof i18n.init>[0]);
}

type AuthValue = NonNullable<ComponentProps<typeof AuthContext.Provider>["value"]>;

function fakeAuth(options: PreviewOptions): AuthValue {
  const noop = async () => {};
  return {
    user: {
      uid: "ui-preview-user",
      email: "preview@vambe.ai",
      displayName: "Preview User",
      photoURL: null,
      phoneNumber: null,
      providerId: "password",
      emailVerified: true,
      customClaims: {},
      ...(options.user ?? {}),
    },
    accessToken: "ui-preview-token",
    profile: (options.profile ?? null) as AuthValue["profile"],
    profileIsLoading: false,
    refreshProfile: noop,
    login: noop,
    logout: noop,
    signInWithGoogle: async () => ({ user: null, token: null }),
    signInWithMicrosoft: async () => ({ user: null, token: null }),
    subscriptionLoading: false,
    phones: [],
    loading: false,
    isLoggingIn: false,
    mfaResolver: null,
    resolveMfaSignIn: () => Promise.reject(new Error("ui-preview")),
    clearMfaResolver: () => {},
    syncAttempted: true,
    refreshToken: noop,
    removeToken: noop,
    register: () => Promise.reject(new Error("ui-preview")),
    ...(options.auth ?? {}),
  } as AuthValue;
}

export function AppProviders({ options, children }: { options: PreviewOptions; children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        // Hooks that set their own `retry` still retry, but without backoff so
        // error states settle fast; the busy probe waits for them.
        queries: { retry: false, retryDelay: 0, refetchOnWindowFocus: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    addBusyProbe(() => client.isFetching() + client.isMutating() > getParked());
    return client;
  });
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(options.route?.query ?? {})) {
    (Array.isArray(v) ? v : [v]).forEach((item) => searchParams.append(k, item));
  }

  return (
    <ThemeProvider>
      <MotionProvider>
        <I18nextProvider i18n={i18n}>
          <I18nextTranslationProvider>
            <QueryClientProvider client={queryClient}>
              <NuqsTestingAdapter searchParams={searchParams}>
                <AuthContext.Provider value={fakeAuth(options)}>{children}</AuthContext.Provider>
              </NuqsTestingAdapter>
            </QueryClientProvider>
          </I18nextTranslationProvider>
        </I18nextProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
