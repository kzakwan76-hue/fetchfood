"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

export async function unreadCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("my_unread_notifications");
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read");
  revalidatePath("/notifications");
}