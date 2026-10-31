   "use client";

   import Link from "next/link";
   import { useEffect, useRef, useState } from "react";
   import type { KeyboardEvent } from "react";
   import { addItem, itemCount } from "../lib/cart";
   import { getCart, setCart, useCart } from "../lib/cart-store";
   import { MokaMascot, MokaStyles } from "./moka-mascot";
   import { ZonePicker, type ZoneOption } from "./zone-picker";
   import { useZone } from "../lib/zone-store";

   type Pick = {
     itemId: string;
     restaurantId: string;
     restaurantSlug: string;
     restaurantName: string;
     name: string;
     category: string;
     pricePkr: number;
     reason: string;
     deliveryFeePkr: number;
     minOrderPkr: number;
   };

   type ChatMessage =
     | { role: "user"; text: string }
     | { role: "assistant"; text: string; picks: Pick[] };

   const MAX_INPUT = 300;
   const SUGGESTIONS = ["Something spicy", "Cheap and filling", "Surprise me, I can't decide"];
   const PHRASES = [
       "Moka is sniffing out the menu...",
       "Moka is chewing on your craving...",
       "Moka is sipping on an idea...",
       "Shades on, almost there...",
   ];

   // Never trust a response shape without checking it.
   function readAnswer(data: unknown): { reply: string; picks: Pick[] } | null {
     if (typeof data !== "object" || data === null) return null;
     const d = data as Record<string, unknown>;
     if (typeof d.reply !== "string" || !Array.isArray(d.picks)) return null;

     const picks: Pick[] = [];
     for (const raw of d.picks) {
       if (typeof raw !== "object" || raw === null) continue;
       const p = raw as Record<string, unknown>;
       if (
         typeof p.itemId === "string" &&
         typeof p.restaurantId === "string" &&
         typeof p.restaurantSlug === "string" &&
         typeof p.restaurantName === "string" &&
         typeof p.name === "string" &&
         typeof p.category === "string" &&
         typeof p.reason === "string" &&
         Number.isInteger(p.pricePkr) &&
         Number.isInteger(p.deliveryFeePkr) &&
         Number.isInteger(p.minOrderPkr)
       ) {
         picks.push({
           itemId: p.itemId,
           restaurantId: p.restaurantId,
           restaurantSlug: p.restaurantSlug,
           restaurantName: p.restaurantName,
           name: p.name,
           category: p.category,
           reason: p.reason,
           pricePkr: p.pricePkr as number,
           deliveryFeePkr: p.deliveryFeePkr as number,
           minOrderPkr: p.minOrderPkr as number,
         });
       }
     }
     return { reply: d.reply, picks };
   }

   export function AssistantChat({ zones }: { zones: ZoneOption[] }) {
     const cart = useCart();
     const chosen = useZone();
     const zone = zones.find((z) => z.id === chosen?.id) ?? null;
     const [messages, setMessages] = useState<ChatMessage[]>([]);
     const [input, setInput] = useState("");
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [phrase, setPhrase] = useState(0);
     const endRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
       if (messages.length > 0) {
         endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
       }
     }, [messages, loading]);

     useEffect(() => {
       if (!loading) return;
       const id = setInterval(() => setPhrase((i) => (i + 1) % PHRASES.length), 2250);
       return () => clearInterval(id);
     }, [loading]);

     async function send(raw: string) {
       const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT);
       if (!text || loading || !zone) return;

       const next: ChatMessage[] = [...messages, { role: "user", text }];
       setMessages(next);
       setInput("");
       setError(null);
       setPhrase(0);
       setLoading(true);

       try {
         const res = await fetch("/api/assistant", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             messages: next.slice(-8).map((m) => ({ role: m.role, text: m.text })),
             zoneId: zone.id,
           }),
           signal: AbortSignal.timeout(90_000),
         });
         const answer = res.ok ? readAnswer(await res.json()) : null;
         if (!answer) throw new Error("bad response");
         setMessages([...next, { role: "assistant", text: answer.reply, picks: answer.picks }]);
       } catch {
         setError("Moka is not answering right now. Please try again in a moment.");
       } finally {
         setLoading(false);
       }
     }

     function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
       if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
         e.preventDefault();
         void send(input);
       }
     }

     function addPick(p: Pick) {
       const current = getCart();
       if (current.lines.length > 0 && current.restaurantId !== p.restaurantId) {
         const ok = window.confirm(
           `Your cart has items from ${current.restaurantName ?? "another restaurant"}. Adding this will start a new cart. Continue?`,
         );
         if (!ok) return;
       }
       setCart(
         addItem(
           current,
           {
             id: p.restaurantId,
             slug: p.restaurantSlug,
             name: p.restaurantName,
             deliveryFeePkr: p.deliveryFeePkr,
             minOrderPkr: p.minOrderPkr,
           },
           { id: p.itemId, name: p.name, pricePkr: p.pricePkr },
         ),
       );
     }

     const count = itemCount(cart);
     const isEmpty = messages.length === 0;

     return (
       <div className="flex flex-1 flex-col">
         <MokaStyles />

         <div className="flex-1 py-6">
           {isEmpty ? (
             <div className="flex flex-col items-center pt-6 text-center">
               <MokaMascot variant="full" size={170} />
               <h1 className="mt-3 text-3xl font-extrabold">What are you craving?</h1>
               <p className="mt-2 max-w-md text-charcoal-700">
                 Hi, I&apos;m Moka. Tell me what you feel like eating and I&apos;ll dig through the
                 menus for you. Only restaurants that are open right now.
               </p>
               <div className="mt-5"><ZonePicker zones={zones} /></div>
               <div className="mt-6 flex flex-wrap justify-center gap-2">
                 {SUGGESTIONS.map((s) => (
                   <button
                     key={s}
                     type="button"
                     onClick={() => void send(s)}
                     disabled={loading || !zone}
                     className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium hover:bg-brand-100 disabled:opacity-50"
                   >
                     {s}
                   </button>
                 ))}
               </div>
             </div>
           ) : (
             <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-6">
               {messages.map((m, i) =>
                 m.role === "user" ? (
                   <div key={i} className="flex justify-end">
                     <p
                       dir="auto"
                       className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-charcoal-900/5 px-4 py-2.5"
                     >
                       {m.text}
                     </p>
                   </div>
                 ) : (
                   <div key={i} className="flex gap-3">
                     <MokaMascot variant="head" size={36} className="mt-0.5 shrink-0" />
                     <div className="min-w-0 flex-1 space-y-2">
                       <p className="text-xs font-semibold text-charcoal-700">Moka</p>
                       <p dir="auto" className="whitespace-pre-wrap leading-7">
                         {m.text}
                       </p>
                       {m.picks.length > 0 && (
                         <ul className="space-y-2 pt-1">
                           {m.picks.map((p) => {
                             const qty =
                               cart.lines.find((l) => l.menuItemId === p.itemId)?.quantity ?? 0;
                             return (
                               <li
                                 key={p.itemId}
                                 className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-sm"
                               >
                                 <div className="min-w-0">
                                   <p className="font-semibold">{p.name}</p>
                                   <p className="text-sm text-charcoal-700">
                                     {p.restaurantName} · {p.category}
                                   </p>
                                   <p className="mt-1 text-sm">{p.reason}</p>
                                 </div>
                                 <div className="shrink-0 text-right">
                                   <p className="font-bold">Rs. {p.pricePkr}</p>
                                   <button
                                     type="button"
                                     onClick={() => addPick(p)}
                                     className="mt-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                                   >
                                     {qty > 0 ? `Add one more (${qty} in cart)` : "Add to cart"}
                                   </button>
                                 </div>
                               </li>
                             );
                           })}
                         </ul>
                       )}
                     </div>
                   </div>
                 ),
               )}

               {loading && (
                 <div role="status" className="flex items-center gap-3">
                   <MokaMascot variant="full" eating size={104} />
                   <p className="text-sm text-charcoal-700">{PHRASES[phrase]}</p>
                 </div>
               )}

               {error && (
                 <p role="alert" className="rounded-xl bg-brand-100 px-3 py-2 text-sm text-brand-700">
                   {error}
                 </p>
               )}
               <div ref={endRef} className="scroll-mb-32" />
             </div>
           )}
         </div>

         <div className="sticky bottom-0 pb-4 pt-2 backdrop-blur-md">
           <form
             onSubmit={(e) => {
               e.preventDefault();
               void send(input);
             }}
             className="flex items-end gap-2 rounded-3xl border border-brand-200 bg-white p-2 shadow-md"
           >
             <label htmlFor="craving" className="sr-only">
               What are you craving?
             </label>
             <textarea
               id="craving"
               rows={1}
               dir="auto"
               maxLength={MAX_INPUT}
               value={input}
               readOnly={loading}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={onKeyDown}
               placeholder={zone ? "Ask Moka what to eat..." : "Choose your area first..."}
               className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 outline-none [field-sizing:content]"
             />
             <button
               type="submit"
               aria-label="Send"
               disabled={loading || !zone || !input.trim()}
               className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
             >
               <svg
                 viewBox="0 0 24 24"
                 width="20"
                 height="20"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="2.5"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 aria-hidden="true"
               >
                 <path d="M12 19V5" />
                 <path d="m5 12 7-7 7 7" />
               </svg>
             </button>
           </form>

           <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-700">
             <p>Moka can&apos;t confirm ingredients, allergies or halal status. Please ask the restaurant.</p>
             <div className="flex items-center gap-3">
               {messages.length > 0 && (
                 <button
                   type="button"
                   onClick={() => {
                     setMessages([]);
                     setError(null);
                   }}
                   className="font-semibold text-brand-700 underline"
                 >
                   Start over
                 </button>
               )}
               {count > 0 && (
                 <Link href="/cart" className="font-semibold text-brand-700 underline">
                   View cart ({count})
                 </Link>
               )}
             </div>
           </div>
         </div>
       </div>
     );
   }