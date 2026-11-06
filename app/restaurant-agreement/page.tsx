import { LegalPage, Section } from "../../components/legal-page";
import { SITE } from "../../lib/site";

export const metadata = { title: "Restaurant agreement" };

export default function RestaurantAgreementPage() {
  return (
    <LegalPage title="Restaurant agreement">
      <Section title="1. The deal" items={[
        SITE.operator,
        "FetchFood lists your menu, takes orders from customers and delivers them with FetchFood riders. There is no joining fee. You can stop at any time after we have settled the money.",
      ]} />
      <Section title="2. Commission" items={[
        "FetchFood takes a commission on the food subtotal of each delivered order. Your rate is agreed with you and shown in your earnings page. It is recorded on each order when it is delivered, so a later change never alters past orders.",
        "Customers pay the delivery fee to the rider. FetchFood takes no part of it.",
      ]} />
      <Section title="3. Payment when FetchFood riders deliver" items={[
        "The rider collects the cash and hands it to FetchFood. We pay you the food subtotal minus our commission, on a fixed schedule (weekly unless we agree otherwise), by bank transfer or mobile wallet. Your earnings page shows what we owe you.",
      ]} />
      <Section title="4. Your own riders" items={[
        "You may choose to deliver with your own riders. Then the commission is 4 percentage points lower than your normal rate (for example 10% becomes 6%).",
        "Your rider collects the cash and you keep it, including the delivery fee. You owe FetchFood the lowered commission on those orders. We net this against what we owe you for orders our riders delivered. If the balance is in our favour, you pay us the difference, and we record the payment.",
        "You mark these orders out for delivery and delivered yourself, truthfully. Fake or untrue deliveries are a breach of this agreement.",
      ]} />
      <Section title="5. Orders, food and handover" items={[
        "Keep your menu, prices, photos and open or closed status accurate. Accept or decline orders quickly: an order you do not accept within 15 minutes is cancelled.",
        "You are responsible for the quality, safety and ingredients of your food. FetchFood does not verify allergens or halal status.",
        "When a FetchFood rider arrives, ask for the 4-digit code in their app and type it in before handing over the food. If it does not match, do not hand it over.",
      ]} />
      <Section title="6. Ending and contact" items={[
        "We may pause or remove a restaurant for repeated problems, fake orders, or unpaid balances. You or we can end the agreement after settling what is owed.",
        `${SITE.email}, ${SITE.phone}.`,
      ]} />
    </LegalPage>
  );
}