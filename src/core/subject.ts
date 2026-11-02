// What the platform knows about a subject (ADR 0003). The progress contract
// (awardXP, recordReview, progressSummary) is designed in E2/E3; this is only identity.
export interface SubjectInfo {
  /** Stable id, used in URLs and storage keys. */
  id: string;
  /** The subject's place in the city, shown as a sign (always capitals). */
  place: string;
  /** What you learn there, in plain words. */
  tagline: string;
  /** CSS colour for the subject's guild hue. */
  guildColor: string;
}
