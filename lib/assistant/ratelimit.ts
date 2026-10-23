   // In-memory sliding-window limiter for the AI assistant.
   // Cost guard, not security: resets on restart, per server instance.

   const HOUR_MS = 60 * 60 * 1000;
   const DAY_MS = 24 * HOUR_MS;
   const MAX_TRACKED_IPS = 5000;

   export type Limits = { perIpPerHour: number; perDay: number };

   export type Allowance =
     | { allowed: true }
     | { allowed: false; reason: "ip_limit" | "daily_cap" };

   function readLimit(raw: string | undefined, fallback: number): number {
     const n = Number(raw);
     return Number.isInteger(n) && n > 0 ? n : fallback;
   }

   export function limitsFromEnv(
     env: Record<string, string | undefined> = process.env,
   ): Limits {
     return {
       perIpPerHour: readLimit(env.ASSISTANT_AI_PER_IP_PER_HOUR, 10),
       perDay: readLimit(env.ASSISTANT_AI_PER_DAY, 300),
     };
   }

   export function getClientIp(headers: Headers): string {
     const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
     return first ? first.slice(0, 64) : "unknown";
   }

   const hits = new Map<string, number[]>();
   let dayKey = -1;
   let dayCount = 0;

   function prune(now: number) {
     for (const [ip, times] of hits) {
       const last = times[times.length - 1];
       if (last === undefined || now - last >= HOUR_MS) hits.delete(ip);
     }
   }

   export function checkAiAllowance(
     ip: string,
     now: number = Date.now(),
     limits: Limits = limitsFromEnv(),
   ): Allowance {
     const today = Math.floor(now / DAY_MS);
     if (today !== dayKey) {
       dayKey = today;
       dayCount = 0;
     }
     if (dayCount >= limits.perDay) return { allowed: false, reason: "daily_cap" };

     const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
     if (recent.length >= limits.perIpPerHour) {
       hits.set(ip, recent);
       return { allowed: false, reason: "ip_limit" };
     }

     recent.push(now);
     hits.set(ip, recent);
     dayCount += 1;
     if (hits.size > MAX_TRACKED_IPS) prune(now);
     return { allowed: true };
   }

   // For tests only.
   export function resetRateLimits() {
     hits.clear();
     dayKey = -1;
     dayCount = 0;
   }