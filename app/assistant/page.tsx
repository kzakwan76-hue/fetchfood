   import Link from "next/link";
   import { AssistantChat } from "../../components/assistant-chat";

   export const metadata = { title: "Moka, your food assistant" };

   export default function AssistantPage() {
     return (
       <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
         <header className="flex items-center justify-between py-4">
           <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand-600">
             Fetch<span className="text-charcoal-900">Food</span>
           </Link>
           <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
             Browse restaurants
           </Link>
         </header>

         <main className="flex flex-1 flex-col">
           <AssistantChat />
         </main>
       </div>
     );
   }