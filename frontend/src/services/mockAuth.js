import mockData from "../data/land-registry-ui-mock-data.json" with { type: "json" };

export const SESSION_KEY = "tl_session_v1";
export const LEGACY_SESSION_KEY = "titlelock.demo.session";
export const CITIZENS_STORAGE_KEY = "titlelock.demo.citizens";

/**
 * Returns all users from the mock data directory
 */
export function getDirectoryUsers() {
  return mockData.users || [];
}

/**
 * Derive valid username formats for a user (case-insensitive):
 * 1. email prefix (e.g. rajesh@demo.local -> rajesh)
 * 2. name slug (e.g. "Rajesh Kumar" -> rajesh.kumar)
 * 3. full name lowercased (e.g. "Rajesh Kumar" -> rajesh kumar)
 */
export function getUsername(user) {
  if (!user) return [];
  const usernames = [];

  if (user.email) {
    const emailPrefix = user.email.split("@")[0].toLowerCase().trim();
    if (emailPrefix) usernames.push(emailPrefix);
  }

  if (user.name) {
    const nameLower = user.name.toLowerCase().trim();
    usernames.push(nameLower);
    const slug = nameLower.replace(/\s+/g, ".");
    if (slug !== nameLower) usernames.push(slug);
  }

  return Array.from(new Set(usernames));
}

/**
 * Deterministic demo password derivation:
 * "Demo@" + last 3 characters of user.id
 * Example: USR-OWN-001 -> Demo@001 | USR-BUY-001 -> Demo@001
 */
export function getDemoPassword(user) {
  if (!user || !user.id) return "Demo@001";
  const idStr = String(user.id).trim();
  const last3 = idStr.slice(-3);
  return `Demo@${last3}`;
}

/**
 * Hash password using Web Crypto API (SHA-256)
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Retrieve local registered demo citizens from localStorage
 */
function getLocalCitizens() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const stored = window.localStorage.getItem(CITIZENS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalCitizens(citizens) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CITIZENS_STORAGE_KEY, JSON.stringify(citizens));
    }
  } catch (err) {
    console.error("Failed to save local citizens:", err);
  }
}

/**
 * Sanitise user object for session storage
 * NEVER store passwords, Aadhaar numbers, private keys, or seed phrases.
 */
export function sanitizeUser(user, authMethod = "PASSWORD", activeRole = null) {
  const roles = Array.isArray(user.roles) ? [...user.roles] : [];
  const chosenRole = activeRole || (roles.includes("REGISTRAR") ? "REGISTRAR" : roles[0]) || "OWNER";

  return {
    id: user.id,
    user_id: user.id,
    name: user.name,
    display_name: user.name,
    email: user.email,
    roles,
    active_role: chosenRole,
    activeRole: chosenRole,
    badge: user.badge || null,
    organization: user.organization || (chosenRole === "REGISTRAR" ? "Office of the Sub-Registrar" : chosenRole === "AUDITOR" ? "State Land Audit Directorate" : chosenRole === "BANK" ? "State Bank Mortgage Division" : "Public Registry"),
    designation: user.designation || (chosenRole === "REGISTRAR" ? "Sub-Registrar" : chosenRole === "AUDITOR" ? "Senior Title Auditor" : chosenRole === "BANK" ? "Credit & Mortgage Officer" : chosenRole),
    identity_status: user.identity_status || "VERIFIED",
    account_status: user.account_status || "ACTIVE",
    role_constraints: user.role_constraints || null,
    wallet: user.wallet || null,
    permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
    authMethod,
    isDemo: true,
    issued_at: new Date().toISOString(),
  };
}

export function isCitizenRole(user) {
  const roles = user.roles || [];
  return roles.some((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r));
}

export function isDepartmentalOnly(user) {
  const roles = user.roles || [];
  const hasCitizenRole = roles.some((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r));
  const hasDeptRole = roles.some((r) => ["REGISTRAR", "AUDITOR", "BANK"].includes(r));
  return hasDeptRole && !hasCitizenRole;
}

/**
 * Find citizen in mock directory or local storage by email or derived usernames
 */
function findCitizenByIdentifier(identifier) {
  if (!identifier) return null;
  const q = String(identifier).trim().toLowerCase();

  const directoryUsers = getDirectoryUsers();

  // 1. Search directory
  for (const user of directoryUsers) {
    if (user.email && user.email.toLowerCase() === q) {
      return { user, isLocal: false };
    }
    const derived = getUsername(user);
    if (derived.includes(q)) {
      return { user, isLocal: false };
    }
  }

  // 2. Search local storage demo citizens
  const localCitizens = getLocalCitizens();
  for (const citizen of localCitizens) {
    if (citizen.email && citizen.email.toLowerCase() === q) {
      return { user: citizen, isLocal: true };
    }
    if (citizen.username && citizen.username.toLowerCase() === q) {
      return { user: citizen, isLocal: true };
    }
  }

  return null;
}

/**
 * Authenticate a citizen user
 */
export async function loginCitizen(identifier, password) {
  try {
    if (!identifier || !identifier.trim()) {
      return { ok: false, error: "Please enter your email or username." };
    }
    if (!password) {
      return { ok: false, error: "Please enter your password." };
    }

    const match = findCitizenByIdentifier(identifier);
    if (!match) {
      return {
        ok: false,
        error: "No citizen account found with this identifier. Check your credentials or sign up.",
      };
    }

    const { user, isLocal } = match;

    // Check departmental only
    if (isDepartmentalOnly(user)) {
      return {
        ok: false,
        error: "This account belongs to a departmental portal. Please use Registrar or Auditor login.",
      };
    }

    // Check eligibility: must include OWNER, BUYER, or NOMINEE
    if (!isCitizenRole(user) && !isLocal) {
      return {
        ok: false,
        error: "This account is not authorized as a Citizen.",
      };
    }

    // Verify Password
    if (isLocal) {
      const hashed = await hashPassword(password);
      if (user.passwordHash !== hashed) {
        return { ok: false, error: "Invalid password for this demo citizen account." };
      }
    } else {
      const expectedPassword = getDemoPassword(user);
      if (password !== expectedPassword) {
        return {
          ok: false,
          error: `Invalid password. Demo password format is: ${expectedPassword}`,
        };
      }
    }

    // Success -> Save and return sanitized session
    // Note: If account_status is DECEASED, the session reflects DECEASED status so citizen portal routes
    // Mohan Nair to succession / displays deceased restriction banner.
    const defaultCitizenRole = user.roles.find((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r)) || "OWNER";
    const sessionUser = sanitizeUser(user, "PASSWORD", defaultCitizenRole);
    saveSession(sessionUser, "PASSWORD", defaultCitizenRole);
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "Authentication failed. Please try again." };
  }
}

/**
 * Authenticate a registrar user
 */
export async function loginRegistrar(badge, email, password) {
  try {
    const trimmedBadge = (badge || "").trim();
    if (!trimmedBadge) {
      return { ok: false, error: "Government employee ID / badge is required." };
    }

    const hasEmail = Boolean(email && email.trim());
    const hasPassword = Boolean(password && password.trim());

    if ((hasEmail && !hasPassword) || (!hasEmail && hasPassword)) {
      return {
        ok: false,
        error: "Enter both official email and password, or leave both fields empty.",
      };
    }

    const directoryUsers = getDirectoryUsers();
    const user = directoryUsers.find(
      (u) => (u.badge && u.badge.trim().toLowerCase() === trimmedBadge.toLowerCase()) ||
             (u.email && u.email.trim().toLowerCase() === trimmedBadge.toLowerCase())
    );

    if (!user) {
      return {
        ok: false,
        error: "Government employee ID not found in the demo directory.",
      };
    }

    // Must have REGISTRAR role
    const roles = user.roles || [];
    if (!roles.includes("REGISTRAR")) {
      return {
        ok: false,
        error: "This employee ID is not authorized for the registrar portal.",
      };
    }

    // Check account status
    if (user.account_status === "DECEASED") {
      return {
        ok: false,
        error: "This account is inactive because the directory status is DECEASED.",
      };
    }

    // If optional email & password are provided, validate both
    if (hasEmail && hasPassword) {
      const emailMatches =
        user.email && user.email.trim().toLowerCase() === email.trim().toLowerCase();
      const expectedPassword = getDemoPassword(user);
      const passwordMatches = password === expectedPassword;

      if (!emailMatches || !passwordMatches) {
        return {
          ok: false,
          error: "The optional credentials do not match this registrar record.",
        };
      }
    }

    const authMethod = hasEmail ? "BADGE_AND_PASSWORD" : "BADGE_ONLY";
    const sessionUser = sanitizeUser(user, authMethod, "REGISTRAR");
    saveSession(sessionUser, authMethod, "REGISTRAR");
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "Registrar authentication failed. Please try again." };
  }
}

/**
 * Authenticate an auditor user
 */
export async function loginAuditor(badge, email, password) {
  try {
    const trimmedBadge = (badge || "").trim();
    if (!trimmedBadge) {
      return { ok: false, error: "Auditor ID or badge number is required." };
    }

    const hasEmail = Boolean(email && email.trim());
    const hasPassword = Boolean(password && password.trim());

    if ((hasEmail && !hasPassword) || (!hasEmail && hasPassword)) {
      return {
        ok: false,
        error: "Enter both official email and password, or leave both fields empty.",
      };
    }

    const directoryUsers = getDirectoryUsers();
    const user = directoryUsers.find(
      (u) => (u.badge && u.badge.trim().toLowerCase() === trimmedBadge.toLowerCase()) ||
             (u.email && u.email.trim().toLowerCase() === trimmedBadge.toLowerCase())
    );

    if (!user) {
      return {
        ok: false,
        error: "Auditor record not found in the demo directory.",
      };
    }

    const roles = user.roles || [];
    if (!roles.includes("AUDITOR")) {
      return {
        ok: false,
        error: "This user does not possess AUDITOR oversight authority.",
      };
    }

    if (user.account_status === "DECEASED") {
      return {
        ok: false,
        error: "This account is inactive because the directory status is DECEASED.",
      };
    }

    if (hasEmail && hasPassword) {
      const emailMatches =
        user.email && user.email.trim().toLowerCase() === email.trim().toLowerCase();
      const expectedPassword = getDemoPassword(user);
      const passwordMatches = password === expectedPassword;

      if (!emailMatches || !passwordMatches) {
        return {
          ok: false,
          error: "The credentials provided do not match this auditor record.",
        };
      }
    }

    const authMethod = hasEmail ? "BADGE_AND_PASSWORD" : "BADGE_ONLY";
    const sessionUser = sanitizeUser(user, authMethod, "AUDITOR");
    saveSession(sessionUser, authMethod, "AUDITOR");
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "Auditor authentication failed. Please try again." };
  }
}

/**
 * Authenticate a bank mortgage officer
 */
export async function loginBank(email, password) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: "Institutional email address is required." };
    }
    if (!password) {
      return { ok: false, error: "Password is required." };
    }

    const directoryUsers = getDirectoryUsers();
    const user = directoryUsers.find(
      (u) => (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
             (u.id && u.id.toLowerCase() === cleanEmail)
    );

    if (!user) {
      return {
        ok: false,
        error: "Bank officer record not found. Try rahul.bank@demo.local.",
      };
    }

    const roles = user.roles || [];
    if (!roles.includes("BANK")) {
      return {
        ok: false,
        error: "This user does not hold institutional BANK clearance.",
      };
    }

    const expectedPassword = getDemoPassword(user);
    if (password !== expectedPassword) {
      return {
        ok: false,
        error: `Invalid password. Demo password format is: ${expectedPassword}`,
      };
    }

    const sessionUser = sanitizeUser(user, "INSTITUTIONAL_PASSWORD", "BANK");
    saveSession(sessionUser, "INSTITUTIONAL_PASSWORD", "BANK");
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "Bank authentication failed. Please try again." };
  }
}

/**
 * Simulated DigiLocker / Aadhaar Consent Flow
 */
export async function simulateDigiLocker(identifier, aadhaarLast4) {
  try {
    if (!aadhaarLast4 || !/^\d{4}$/.test(aadhaarLast4.trim())) {
      return {
        ok: false,
        error: "Please enter exactly the last 4 digits of your Aadhaar number (e.g. 1234).",
      };
    }

    if (!identifier || !identifier.trim()) {
      return {
        ok: false,
        error: "Please enter your associated registered email or username.",
      };
    }

    const match = findCitizenByIdentifier(identifier);
    if (!match) {
      return {
        ok: false,
        error: "No citizen record found with this email or username to link consent.",
      };
    }

    const { user } = match;

    if (isDepartmentalOnly(user)) {
      return {
        ok: false,
        error: "This account belongs to a departmental portal. Use the Registrar login.",
      };
    }

    const defaultCitizenRole = user.roles?.find((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r)) || "OWNER";
    const sessionUser = sanitizeUser(user, "SIMULATED_DIGILOCKER", defaultCitizenRole);
    saveSession(sessionUser, "SIMULATED_DIGILOCKER", defaultCitizenRole);
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "DigiLocker simulation failed. Please try again." };
  }
}

/**
 * Register a new demo citizen locally
 */
export async function createDemoCitizen(formData) {
  try {
    const {
      name,
      email,
      username,
      password,
      confirmPassword,
      phone,
      digilockerVerified,
      consent,
    } = formData;

    if (!consent) {
      return { ok: false, error: "You must consent to the synthetic demo data agreement." };
    }
    if (!name || !name.trim()) {
      return { ok: false, error: "Full name is required." };
    }
    if (!email || !email.includes("@")) {
      return { ok: false, error: "A valid email address is required." };
    }
    if (!username || username.trim().length < 3) {
      return { ok: false, error: "Username must be at least 3 characters." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check if email matches an eligible record in directory users[]
    const directoryUsers = getDirectoryUsers();
    const existingDirUser = directoryUsers.find(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );

    if (existingDirUser) {
      if (isCitizenRole(existingDirUser)) {
        const sessionUser = sanitizeUser(existingDirUser, "LOCAL_SIGNUP_ATTACHED", "OWNER");
        saveSession(sessionUser, "LOCAL_SIGNUP_ATTACHED", "OWNER");
        return { ok: true, user: sessionUser };
      } else {
        return {
          ok: false,
          error: "This email belongs to an official departmental portal. Use Registrar login.",
        };
      }
    }

    // 2. Check if username or email already exists in local storage
    const localCitizens = getLocalCitizens();
    if (localCitizens.some((c) => c.email === cleanEmail)) {
      return { ok: false, error: "A demo citizen with this email already exists." };
    }
    if (localCitizens.some((c) => c.username === cleanUsername)) {
      return { ok: false, error: "This username is already taken. Please choose another." };
    }

    const passwordHash = await hashPassword(password);

    const newCitizen = {
      id: `USR-LOC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      phone: phone ? phone.trim() : null,
      roles: ["OWNER"],
      identity_status: digilockerVerified ? "VERIFIED" : "PENDING_VERIFICATION",
      account_status: "ACTIVE",
      wallet: null,
      permissions: [],
      organization: "Independent Citizen Landholder",
      designation: "Registered Citizen",
      created_at: new Date().toISOString(),
    };

    localCitizens.push(newCitizen);
    saveLocalCitizens(localCitizens);

    const sessionUser = sanitizeUser(newCitizen, "LOCAL_SIGNUP", "OWNER");
    saveSession(sessionUser, "LOCAL_SIGNUP", "OWNER");
    return { ok: true, user: sessionUser };
  } catch (err) {
    return { ok: false, error: "Sign up failed. Please try again." };
  }
}

/**
 * Switch active workspace role (e.g. for USR-REG-AUD-002 between REGISTRAR and AUDITOR)
 */
export function switchWorkspace(targetRole) {
  try {
    const current = getSession();
    if (!current || !Array.isArray(current.roles) || !current.roles.includes(targetRole)) {
      return { ok: false, error: "User is not authorized for this role." };
    }
    const updated = sanitizeUser(current, current.authMethod || "SESSION", targetRole);
    saveSession(updated, updated.authMethod, targetRole);
    return { ok: true, user: updated };
  } catch (err) {
    return { ok: false, error: "Failed to switch workspace." };
  }
}

/**
 * Get active session from localStorage (synchronous)
 */
export function getSession() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SESSION_KEY) || window.localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || (!session.id && !session.user_id) || !session.roles) return null;
    // Normalize properties
    if (!session.id) session.id = session.user_id;
    if (!session.user_id) session.user_id = session.id;
    if (!session.active_role) session.active_role = session.activeRole || session.roles[0];
    if (!session.activeRole) session.activeRole = session.active_role;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(user, authMethod = "PASSWORD", activeRole = null) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const cleanSession = sanitizeUser(user, authMethod, activeRole);
    const jsonStr = JSON.stringify(cleanSession);
    window.localStorage.setItem(SESSION_KEY, jsonStr);
    window.localStorage.setItem(LEGACY_SESSION_KEY, jsonStr);
    return cleanSession;
  } catch (err) {
    console.error("Failed to save session:", err);
    return null;
  }
}

export function clearSession() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(LEGACY_SESSION_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function logout() {
  clearSession();
  return { ok: true };
}
