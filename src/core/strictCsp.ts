// Imported first by main.tsx. The site's Content-Security-Policy forbids eval (vercel.json,
// security review M3). zod probes for it once with `new Function`, which a strict CSP reports
// as a violation even though zod catches it; `jitless` skips the probe. Validation is the same.
import * as z from 'zod/mini';

z.config({ jitless: true });
