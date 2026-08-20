// Deterministic sanity checks run on every LLM-extracted student record
// before it's shown to the admin for review. These are cheap, rule-based
// checks (no second LLM call) - the goal is to catch the failure modes an
// LLM extraction realistically produces (missing field, malformed number,
// duplicate roll number, empty subject list) so the admin's attention goes
// straight to the rows that actually need it instead of re-checking every
// single student by hand.
//
// A record having zero flags does NOT mean it's guaranteed correct - it
// just means it passed the cheap checks. The admin is still the final gate.

const ROLL_NUMBER_PATTERN = /^[A-Za-z0-9]{4,15}$/;

/**
 * @param {object} r  one structured result from the LLM (rollNumber, studentName, subjects, sgpa, cgpa, status)
 * @param {string[]} seenRollNumbers  roll numbers already processed earlier in the same upload, for duplicate detection
 * @returns {string[]} flag codes (empty array = no issues found)
 */
export const computeResultFlags = (r, seenRollNumbers = []) => {
  const flags = [];

  if (!r.rollNumber || !String(r.rollNumber).trim()) {
    flags.push("missing_roll_number");
  } else if (!ROLL_NUMBER_PATTERN.test(String(r.rollNumber).trim())) {
    flags.push("invalid_roll_number_format");
  } else if (seenRollNumbers.includes(String(r.rollNumber).trim())) {
    flags.push("duplicate_roll_number_in_upload");
  }

  if (!r.studentName || !String(r.studentName).trim()) {
    flags.push("missing_student_name");
  }

  // We don't track/validate a full per-subject grade breakdown - the only
  // subject-level detail that matters operationally is whether the student
  // has a reappear/backlog, and in which subject(s). "pass" students should
  // have this marked "N/A"; a fail/withheld student should name the subject(s).
  const reappear = (r.reappearSubjects || "").trim();
  if (r.status && r.status !== "pass" && (!reappear || reappear.toLowerCase() === "n/a")) {
    flags.push("missing_reappear_subject");
  }

  const sgpaValid = typeof r.sgpa === "number" && !Number.isNaN(r.sgpa) && r.sgpa >= 0 && r.sgpa <= 10;
  const cgpaValid = typeof r.cgpa === "number" && !Number.isNaN(r.cgpa) && r.cgpa >= 0 && r.cgpa <= 10;
  if (!sgpaValid) flags.push("invalid_sgpa");
  if (!cgpaValid) flags.push("invalid_cgpa");

  // Heuristic only (not a hard rule): a large single-semester jump between
  // SGPA and CGPA is uncommon and worth a human glance, but legitimately
  // happens (e.g. first semester, or a genuinely rough/great semester).
  if (sgpaValid && cgpaValid && Math.abs(r.sgpa - r.cgpa) > 4) {
    flags.push("sgpa_cgpa_large_gap");
  }

  if (r.status && !["pass", "fail", "withheld"].includes(r.status)) {
    flags.push("unrecognized_status");
  }

  return flags;
};
