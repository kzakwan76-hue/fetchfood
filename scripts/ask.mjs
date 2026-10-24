   const question = process.argv.slice(2).join(" ").trim();
   if (!question) {
     console.log('Usage: node --env-file=.env.local scripts\\ask.mjs "your craving"');
     process.exit(1);
   }

   const base = process.env.ASSISTANT_TEST_URL ?? "http://localhost:3000";
   const res = await fetch(`${base}/api/assistant`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ messages: [{ role: "user", text: question }] }),
   });
   const json = await res.json();

   console.log(`status=${res.status} source=${json.source}`);
   console.log(json.reply);
   for (const p of json.picks ?? []) {
     console.log(`- ${p.name} (${p.restaurantName}) Rs. ${p.pricePkr}: ${p.reason}`);
   }