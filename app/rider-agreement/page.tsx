import { LegalPage, Section } from "../../components/legal-page";
import { SITE } from "../../lib/site";

export const metadata = { title: "Rider agreement" };

export default function RiderAgreementPage() {
  return (
    <LegalPage title="Rider agreement">
      <Section title="1. Your status" items={[
        SITE.operator,
        "You are an independent rider, not an employee of FetchFood. You use your own vehicle, phone and fuel, and you choose when to go on duty.",
        "You must be 18 to 70 years old, hold a real CNIC, and give true details. We may refuse or suspend any rider.",
      ]} />
      <Section title="2. Checks" items={[
        "We check your CNIC, selfie, address, emergency contact and guarantor before your first order. We may call you or your guarantor. You allow us to keep this data as described in our Privacy policy.",
      ]} />
      <Section title="3. Your earnings" items={[
        "You keep the whole delivery fee of every order you deliver, plus any bonus or incentive we add. FetchFood takes no commission from riders.",
        "You collect the full order total in cash from the customer and hand ALL of it to FetchFood. After you have handed in your cash, we pay you what we owe you. We cannot pay you while you still hold cash.",
      ]} />
      <Section title="4. Cash and deposit" items={[
        "A refundable security deposit of Rs. 500 is collected when you are approved. We keep it until you stop riding and have handed in all your cash. If cash is missing, we may deduct it from the deposit and from what we owe you.",
        "The default cash limit is Rs. 5,000: the cash you hold plus the orders you are carrying cannot go above it, and you cannot take new orders until you hand cash in. We may set a different limit for you.",
        "Hand your cash in every day. Holding cash for more than 24 hours will be followed up.",
      ]} />
      <Section title="5. How to deliver" items={[
        "Take an order only if you can collect it soon. If you do not collect it within 15 minutes, it goes back to other riders.",
        "At the restaurant, show the 4-digit pickup code in your app. Never take food without the restaurant confirming your code, and never give your code to anyone else.",
        "Call the customer to confirm the address before delivering, and record the call in the app. Mark an order delivered only after you have handed it over and collected the cash.",
        "Treat food, customers and restaurant staff with care and respect. Follow traffic laws.",
      ]} />
      <Section title="6. If something goes wrong" items={[
        "If you keep cash, steal an order, give false information or mark orders delivered that were not, we will suspend you, keep your deposit against the loss, contact your guarantor and emergency contact, and may report the matter to the police using your CNIC details.",
        "You can stop riding at any time after handing in your cash. We can end this agreement at any time.",
      ]} />
      <Section title="7. Contact" items={[`${SITE.email}, ${SITE.phone}.`]} />
    </LegalPage>
  );
}