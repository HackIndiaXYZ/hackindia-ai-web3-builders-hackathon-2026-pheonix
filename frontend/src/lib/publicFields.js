/**
 * Data Minimisation Allowlist for Public Mode (No Login)
 * Strictly conforms to statutory privacy & purpose limitation principles.
 * Exposes ONLY non-sensitive cadastral attributes.
 */

export const ALLOWED_PUBLIC_PARCEL_FIELDS = [
  "ulpin",
  "survey_number",
  "title_number",
  "locality",
  "district",
  "state",
  "registration_office",
  "area_sqm",
  "land_use",
  "title_status",
  "ownership_type",
  "owners", // sanitized to name + share_percent only
  "centroid",
  "boundary",
];

/**
 * Filter and sanitize a parcel record for public unauthenticated presentation.
 * Explicitly strips all risk ratings, health scores, financial encumbrances,
 * succession delegations, wallet addresses, and personal contact info.
 */
export function sanitizePublicParcel(parcel) {
  if (!parcel) return null;

  const sanitizedOwners = Array.isArray(parcel.owners)
    ? parcel.owners.map((owner) => ({
        name: owner.name || "Registered Owner",
        share_percent: typeof owner.share_percent === "number" ? owner.share_percent : 100,
      }))
    : [];

  return {
    ulpin: parcel.ulpin || "—",
    survey_number: parcel.survey_number || "—",
    title_number: parcel.title_number || "—",
    locality: parcel.locality || "—",
    district: parcel.district || "—",
    state: parcel.state || "Uttar Pradesh",
    registration_office: parcel.registration_office || "—",
    area_sqm: parcel.area_sqm || 0,
    land_use: parcel.land_use || "Standard",
    title_status: parcel.title_status || "VERIFIED",
    ownership_type: parcel.ownership_type || "FREEHOLD",
    owners: sanitizedOwners,
    centroid: parcel.centroid || null,
    boundary: parcel.boundary || null,
  };
}

/**
 * Privacy & Purpose Limitation Disclosure Text
 */
export const PUBLIC_DISCLOSURE_TEXT =
  "Public view shows limited record information. Data is synthetic and for demonstration only. Signed-in owners and officials see the full record.";

export const PRIVACY_LEGAL_NOTE =
  "Data Minimisation Notice: In accordance with statutory purpose-limitation regulations, public lookups expose only base cadastral attributes. Personal identifiers, title risk health scores, succession delegations, and financial encumbrance ledgers are accessible exclusively to authenticated titleholders and authorised registrars.";
