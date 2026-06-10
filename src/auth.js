const NAME_KEY = "dtr_name";
const ROLE_KEY = "dtr_role";
const MAX_KEY = "dtr_max_mentees";
const CONSENT_KEY = "dtr_consent";

export const getName = () => localStorage.getItem(NAME_KEY);
export const getRole = () => localStorage.getItem(ROLE_KEY);
export const getMaxMentees = () => parseInt(localStorage.getItem(MAX_KEY) || "2");
export const getConsent = () => localStorage.getItem(CONSENT_KEY) === "true";
export const setName = (n) => localStorage.setItem(NAME_KEY, n);
export const setRole = (r) => localStorage.setItem(ROLE_KEY, r);
export const setMaxMentees = (n) => localStorage.setItem(MAX_KEY, String(n));
export const setConsent = () => localStorage.setItem(CONSENT_KEY, "true");
export const clearSession = () => {
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(MAX_KEY);
  localStorage.removeItem(CONSENT_KEY);
};
