/**
 * Vercel / Netlify function entry point.
 *
 * The browser posts the uploaded timetable here (see
 * `src/services/timetable-ai/extractTimetable.ts`). The AI credential lives only
 * in this runtime — it is never a `VITE_*` variable and never reaches the
 * bundle.
 */
import handler from '../server/extractTimetable';

export const config = { runtime: 'edge' };

export default handler;

export const POST = handler;
