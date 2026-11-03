import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPage, Line, OrderRows, card, type OrderRow } from "../../../../components/admin-ui";
import { RiderReviewForm } from "../../../../components/rider-review-form";
import { requireAdmin } from "../../../../lib/admin";
import { formatOrderTime } from "../../../../lib/order-status";
import { formatPKR } from "../../../../lib/pk";
import type { RiderRow } from "../page";

type Kyc = {
  k_id: string; k_status: string; k_legal_name: string; k_cnic: string; k_father: string; k_dob: string;
  k_address: string; k_emergency_name: string; k_emergency_phone: string; k_vehicle_type: string;
  k_vehicle_reg: string | null; k_guarantor_name: string; k_guarantor_phone: string; k_front: string;
  k_back: string; k_selfie: string; k_note: string | null; k_deposit: number; k_limit: number | null;
  k_submitted: string; k_reviewed: string | null; k_earned: number; k_zone_id: string | null;
  k_email: string; k_phone: string | null;
};

export default function AdminRiderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AdminPage title="Rider profile" back={{ href: "/admin/riders", label: "All riders" }}>
      <Detail params={params} />
    </AdminPage>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await requireAdmin();

  const { data: kycData } = await supabase.rpc("admin_rider_kyc", { p_id: id });
  const k = ((kycData ?? []) as Kyc[])[0] ?? null;
  const { data: riderData } = await supabase.rpc("admin_riders", { p_id: id });
  const r = ((riderData ?? []) as RiderRow[])[0] ?? null;
  if (!k && !r) notFound();

  const { data: orders } = await supabase.rpc("admin_orders", { p_rider: id, p_limit: 50 });
  const { data: zoneData } = await supabase.from("zones").select("id, name").eq("is_active", true).order("name");
  const zones = (zoneData ?? []) as { id: string; name: string }[];

  // Short-lived links (5 minutes): ID photos are private.
  const sign = async (path: string) =>
    (await supabase.storage.from("rider-documents").createSignedUrl(path, 300)).data?.signedUrl ?? null;
  const [front, back, selfie] = k ? await Promise.all([sign(k.k_front), sign(k.k_back), sign(k.k_selfie)]) : [null, null, null];
  const doc = "font-semibold text-brand-700 underline";

  return (
    <div className="mt-4 space-y-4">
      <div className={card}>
        <p className="text-lg font-bold text-charcoal-900">{k?.k_legal_name ?? r?.r_name ?? "No name"}</p>
        <dl className="mt-1">
          <Line label="Status" value={k ? k.k_status : "no application on file"} bold />
          <Line label="Email" value={k?.k_email ?? r?.r_email} />
          <Line label="Phone" value={k?.k_phone ?? r?.r_phone ?? "none"} />
          {r && <Line label="Zone" value={r.r_zone ?? "none"} />}
          {r && <Line label="Delivered" value={r.r_delivered} />}
          {r && <Line label="On the road now" value={r.r_active} />}
          {k && <Line label="Total earned (delivery fees)" value={formatPKR(k.k_earned)} />}
          {r && <Line label="Cash held (to deposit)" value={formatPKR(r.r_held)} bold />}
          {r && <Line label="We owe them (fees, bonuses, incentives)" value={formatPKR(r.r_owed)} />}
          {k && <Line label="Security deposit received" value={formatPKR(k.k_deposit)} />}
          {k && <Line label="Cash limit" value={k.k_limit === null ? "default" : formatPKR(k.k_limit)} />}
        </dl>
        {r && <p className="mt-2 text-xs text-neutral-600">Record a deposit on the Money page.</p>}
        {!k && <p className="mt-2 text-amber-800">This rider has no ID details on file. They were added before the application system. Ask them to apply at /rider/apply.</p>}
      </div>

      {k && (
        <div className={card}>
          <p className="font-bold text-charcoal-900">Identity</p>
          <dl className="mt-1">
            <Line label="CNIC" value={k.k_cnic.replace(/^(\d{5})(\d{7})(\d)$/, "$1-$2-$3")} />
            <Line label="Father's name" value={k.k_father} />
            <Line label="Date of birth" value={k.k_dob} />
            <Line label="Home address" value={k.k_address} />
            <Line label="Vehicle" value={`${k.k_vehicle_type}${k.k_vehicle_reg ? ` · ${k.k_vehicle_reg}` : ""}`} />
            <Line label="Emergency contact" value={`${k.k_emergency_name} · ${k.k_emergency_phone}`} />
            <Line label="Guarantor" value={`${k.k_guarantor_name} · ${k.k_guarantor_phone}`} />
            <Line label="Applied" value={formatOrderTime(k.k_submitted)} />
            {k.k_reviewed && <Line label="Last reviewed" value={formatOrderTime(k.k_reviewed)} />}
            {k.k_note && <Line label="Note" value={k.k_note} />}
          </dl>
          <p className="mt-3 font-semibold text-charcoal-900">Documents (links expire in 5 minutes)</p>
          <p className="mt-1 flex flex-wrap gap-4">
            {front ? <a href={front} target="_blank" rel="noopener noreferrer" className={doc}>CNIC front</a> : <span>front missing</span>}
            {back ? <a href={back} target="_blank" rel="noopener noreferrer" className={doc}>CNIC back</a> : <span>back missing</span>}
            {selfie ? <a href={selfie} target="_blank" rel="noopener noreferrer" className={doc}>Selfie</a> : <span>selfie missing</span>}
          </p>
          <p className="mt-2 text-xs text-neutral-600">Check that the CNIC photo matches the number, the name and the selfie before approving.</p>
        </div>
      )}

      {k && k.k_status !== "rejected" && (
        <div className={card}>
          <p className="font-bold text-charcoal-900">Decision</p>
          <RiderReviewForm riderId={k.k_id} status={k.k_status} zones={zones} zoneId={k.k_zone_id} deposit={k.k_deposit} limit={k.k_limit} />
        </div>
      )}

      <h2 className="text-lg font-bold text-charcoal-900">Their deliveries</h2>
      <OrderRows rows={(orders ?? []) as OrderRow[]} />
    </div>
  );
}