import { connection } from "next/server";
import { createClient } from "../lib/supabase/server";
import { NotificationBell } from "./notification-bell";
import { SideMenu } from "./side-menu";

// Reads the logged-in user so the header can show the bell and the side menu the right links. Must sit inside <Suspense>.
export async function NavMenu() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return <SideMenu signedIn={false} name={null} role={null} />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .single();
  const { data: unread } = await supabase.rpc("my_unread_notifications");
  const firstName = profile?.full_name ? String(profile.full_name).split(" ")[0] : null;
  return (
    <>
      <NotificationBell initial={typeof unread === "number" ? unread : 0} />
      <SideMenu signedIn name={firstName} role={profile?.role ?? null} />
    </>
  );
}