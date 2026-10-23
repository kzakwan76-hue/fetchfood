   import assert from "node:assert/strict";
   import {
     checkAiAllowance,
     getClientIp,
     limitsFromEnv,
     resetRateLimits,
   } from "../lib/assistant/ratelimit.ts";

   const T0 = 1_000_000_000_000;
   const MIN = 60 * 1000;
   const HOUR = 60 * MIN;

   // 1. per-IP limit, other IPs unaffected
   resetRateLimits();
   let lim = { perIpPerHour: 3, perDay: 100 };
   for (let i = 0; i < 3; i++) {
     assert.equal(checkAiAllowance("a", T0 + i, lim).allowed, true);
   }
   let r = checkAiAllowance("a", T0 + 10, lim);
   assert.equal(r.allowed, false);
   assert.equal(r.reason, "ip_limit");
   assert.equal(checkAiAllowance("b", T0 + 10, lim).allowed, true);

   // 2. window slides: allowed again after an hour
   assert.equal(checkAiAllowance("a", T0 + HOUR + MIN, lim).allowed, true);

   // 3. global daily cap, then resets next day
   resetRateLimits();
   lim = { perIpPerHour: 100, perDay: 2 };
   assert.equal(checkAiAllowance("a", T0, lim).allowed, true);
   assert.equal(checkAiAllowance("b", T0, lim).allowed, true);
   r = checkAiAllowance("c", T0, lim);
   assert.equal(r.allowed, false);
   assert.equal(r.reason, "daily_cap");
   assert.equal(checkAiAllowance("c", T0 + 25 * HOUR, lim).allowed, true);

   // 4. env parsing falls back on junk
   assert.deepEqual(limitsFromEnv({}), { perIpPerHour: 10, perDay: 300 });
   assert.deepEqual(
     limitsFromEnv({ ASSISTANT_AI_PER_IP_PER_HOUR: "abc", ASSISTANT_AI_PER_DAY: "-5" }),
     { perIpPerHour: 10, perDay: 300 },
   );
   assert.deepEqual(
     limitsFromEnv({ ASSISTANT_AI_PER_IP_PER_HOUR: "5", ASSISTANT_AI_PER_DAY: "50" }),
     { perIpPerHour: 5, perDay: 50 },
   );

   // 5. client IP
   assert.equal(
     getClientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })),
     "1.2.3.4",
   );
   assert.equal(getClientIp(new Headers()), "unknown");

   console.log("ratelimit: all checks passed");