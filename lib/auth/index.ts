export {
  AUTH_STORAGE_KEY,
  CODE_LENGTH,
  RESEND_SECONDS,
  authClient,
  authErrorMessage,
  createAuthClient,
  isEmail,
  isOffline,
  normalizeCode,
  normalizeEmail,
  sendCode,
  signOut,
  storedAccount,
  verifyCode,
  type Account,
  type AuthClientOptions,
} from "./auth";
export { fakeAuthServer, memoryStorage, type FakeAuthServer } from "./fake";
