// Stand-in for packages/auth/src/utils/firebase/client.ts: no Firebase SDK,
// a signed-in fake user whose token the real axios interceptor attaches.
export const fakeCurrentUser = {
  uid: "ui-preview-user",
  email: "preview@vambe.ai",
  displayName: "Preview User",
  emailVerified: true,
  getIdToken: async () => "ui-preview-token",
  getIdTokenResult: async () => ({ token: "ui-preview-token", claims: {} }),
};

export const firebaseConfig = {
  apiKey: "ui-preview",
  authDomain: "ui-preview.invalid",
  projectId: "ui-preview",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

export const auth = {
  currentUser: fakeCurrentUser,
  onAuthStateChanged: (cb: (u: unknown) => void) => {
    cb(fakeCurrentUser);
    return () => {};
  },
  onIdTokenChanged: (cb: (u: unknown) => void) => {
    cb(fakeCurrentUser);
    return () => {};
  },
  signOut: async () => {},
  useDeviceLanguage: () => {},
  settings: {},
} as never;

export const app = { name: "ui-preview", options: firebaseConfig } as never;
export const initFirebaseClient = () => ({ app, auth });
export const messaging = async () => null;
