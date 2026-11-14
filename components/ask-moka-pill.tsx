import Link from "next/link";
import { MokaMascot } from "./moka-mascot";

// The Ask Moka button that sits inside the search bars.
// Below 340px wide the text is visually hidden (still read aloud) so the search box keeps room.
export function AskMokaPill() {
  return (
    <Link
      href="/assistant"
      aria-label="Ask Moka what to eat"
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 py-1 pl-1.5 pr-3.5 text-sm font-bold text-white hover:bg-brand-700 max-[340px]:pr-1.5"
    >
      <MokaMascot variant="head" size={26} />
      <span className="max-[340px]:sr-only">Ask Moka</span>
    </Link>
  );
}