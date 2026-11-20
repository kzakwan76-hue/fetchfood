import { LegalPage, Section } from "../../components/legal-page";
import { SITE } from "../../lib/site";

export const metadata = { title: "Rider agreement" };

export default function RiderAgreementPage() {
  return (
    <LegalPage title="Rider agreement">
      <Section title="1. Your role" items={[
        SITE.operator,
        "During the pilot you are part of the FetchFood delivery team and are paid a fixed salary. Your salary, hours and any other terms are set out in the written letter we give you. This page covers how you work in the app.",
        "You use your own bike and phone, and you go on duty in the app for the hours agreed with us.",
        "You must be 18 to 70 years old, hold a real CNIC, and give true details. We may refuse or suspend any rider.",
      ]} />
      <Section title="2. Checks" items={[
        "We check your CNIC, selfie, address, emergency contact and guarantor before your first order. We may call you or your guarantor. You allow us to keep this data as described in our Privacy policy.",
      ]} />
      <Section title="3. Your pay and the cash you collect" items={[
        "Your pay is the fixed salary agreed with you in writing. FetchFood keeps the delivery fee that customers pay, and you are not paid per delivery unless we agree otherwise in writing.",
        "Amounts shown on your earnings screen in the app are for records only during the pilot. They are not paid on top of your salary unless we tell you in writing.",
        "You collect the full order total in cash from the customer and hand ALL of it to FetchFood.",
      ]} />
      <Section title="4. Cash and deposit" items={[
        "A refundable security deposit of Rs. 500 is collected when you are approved. We keep it until you stop riding and have handed in all your cash. If cash is missing, we may deduct it from the deposit.",
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
        "You may stop riding after handing in your cash, giving the notice stated in your written letter. We may end this arrangement as set out in that letter.",
      ]} />
      <Section title="7. Contact" items={[`${SITE.email}, ${SITE.phone}.`]} />
    </LegalPage>
  );
}