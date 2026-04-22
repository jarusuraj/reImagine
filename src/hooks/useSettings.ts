// Settings hook retained for future extension-level preferences.
// API credentials are now build-time only (configured in .env).
// No user-editable API config is exposed in the UI.

export function useSettings() {
  // Reserved for non-sensitive user preferences (e.g. default language).
  return {};
}
