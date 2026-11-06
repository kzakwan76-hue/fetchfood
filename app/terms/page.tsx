import { LegalPage, Section } from "../../components/legal-page";
import { SITE } from "../../lib/site";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <Section title="1. Who we are" items={[
        SITE.operator,
        "FetchFood connects customers with local restaurants and with independent riders. The restaurant makes the food. A rider delivers it.",
        `Contact: ${SITE.email} or ${SITE.phone}.`,
      ]} />
      <Section title="2. Your account" items={[
        "You must give true details and keep your password private. You are responsible for what happens under your account.",
        "You must be 18 or older, or use FetchFood with a parent or guardian.",
        "You can edit your details or delete your account in Account, then Edit profile.",
      ]} />
      <Section title="3. Ordering and payment" items={[
        "Payment is cash on delivery. You pay the rider the total shown, which is the food plus the delivery fee.",
        "Prices and the delivery fee are calculated by our server when you place the order. The delivery fee depends on the distance from the restaurant to your pin where the restaurant uses distance pricing.",
        "Delivery times are estimates, not promises. Orders may be delayed or cancelled, for example if a restaurant is busy or no rider is available. If we cancel, we will tell you why.",
        "Please be reachable by phone, give a correct address and pin, and be ready to pay in cash. Repeated fake or refused orders may lead to your account being closed.",
      ]} />
      <Section title="4. Cancelling" items={[
        "You can cancel an order yourself while it is still new (before the restaurant accepts it). After that, please contact us, because the food may already be prepared.",
      ]} />
      <Section title="5. Food, allergies and Moka" items={[
        "Restaurants are responsible for their food, its quality and what it contains. FetchFood does not check ingredients, allergens or halal status.",
        "Moka, our assistant, only suggests dishes from real menus. Moka cannot confirm ingredients, allergies or halal status. Always ask the restaurant about these.",
      ]} />
      <Section title="6. Reviews" items={[
        "You can review an order only after it is delivered, one review per order. Be honest and respectful. We may remove reviews that are abusive or untrue.",
      ]} />
      <Section title="7. Acceptable use" items={[
        "Do not misuse the service: no fake orders, no abuse of riders or restaurants, no attempts to break or probe the system, and no use of another person's account.",
      ]} />
      <Section title="8. Our responsibility" items={[
        "We work to keep FetchFood running, but we cannot promise it will always be available or free of errors. To the extent the law allows, we are not responsible for indirect losses, or for things done by restaurants, riders or other people.",
        "Nothing here limits any rights you have under the law of Pakistan.",
      ]} />
      <Section title="9. Changes and contact" items={[
        "We may change these terms as FetchFood grows. Using the service after a change means you accept it.",
        `Questions or complaints: ${SITE.email}, ${SITE.phone}.`,
      ]} />
    </LegalPage>
  );
}