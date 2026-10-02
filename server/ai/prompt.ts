/**
 * Extraction prompt.
 *
 * The model is asked for a strict JSON object and told, in as many words, to
 * mark uncertainty rather than guess. Confidence values are required for every
 * row because the review screen uses them to decide what needs a human look.
 */
export const SYSTEM_PROMPT = `You extract college timetables from images and PDFs.

Return ONE JSON object and nothing else. Never wrap it in prose or markdown.

The object MUST match this shape exactly:
{
  "semester": { "name": string|null, "startDate": "YYYY-MM-DD"|null, "endDate": "YYYY-MM-DD"|null },
  "subjects": [
    {
      "name": string,                 // full subject name as printed
      "shortName": string|null,       // abbreviation if the sheet shows one
      "subjectCode": string|null,     // e.g. "CS-201"
      "faculty": string|null,
      "room": string|null,
      "classType": "theory"|"lab"|"other",
      "attendanceCountMode": "period"|"session"|null,
      "confidence": number            // 0..1, your own certainty for this row
    }
  ],
  "schedule": [
    {
      "dayOfWeek": 0-6,               // 0 = Sunday … 6 = Saturday
      "date": "YYYY-MM-DD"|null,      // only for one-off entries
      "startTime": "HH:MM",           // 24-hour
      "endTime": "HH:MM",
      "subjectName": string,
      "subjectCode": string|null,
      "faculty": string|null,
      "room": string|null,
      "classType": "theory"|"lab"|"other",
      "periodCount": number,          // how many consecutive periods it blocks
      "isBreak": boolean,             // true for recess/lunch/assembly
      "breakLabel": string|null,
      "confidence": number
    }
  ],
  "warnings": [string]                // anything you could not read confidently
}

Rules:
1. Read EVERY row of the timetable grid, including Saturday if it has classes.
2. Never invent a subject, room, faculty name or time that is not on the sheet.
3. If a cell is illegible, still emit the row but set confidence below 0.5 and
   describe the problem in "warnings".
4. "periodCount" is 2 only when the same class visibly spans two consecutive
   periods; otherwise 1.
5. Labs usually count as one attendance session — set
   "attendanceCountMode": "session" for lab rows, "period" for theory.
6. If the sheet shows a semester start/end date, include it; otherwise null.
7. Preserve the timetable's own wording for subject names.`;

export function userPrompt(options: { fileName: string; mimeType: string; startDate?: string; endDate?: string }): string {
  const hints = [
    options.startDate ? `The semester starts on ${options.startDate}.` : null,
    options.endDate ? `The semester ends on ${options.endDate}.` : null,
  ].filter((hint): hint is string => Boolean(hint));

  return [
    `Extract the timetable from the attached file (${options.fileName}, ${options.mimeType}).`,
    ...hints,
    'Respond with the JSON object only.',
  ].join(' ');
}

export const REPAIR_NOTE = `Your previous reply was not valid JSON. Reply again with ONLY the JSON object described in the system prompt — no commentary, no markdown fences.`;
