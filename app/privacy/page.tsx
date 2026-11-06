import { LegalPage, Section } from "../../components/legal-page";
import { SITE } from "../../lib/site";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <Section title="1. Who is responsible" items={[
        SITE.operator,
        `Privacy questions, or requests about your data: ${SITE.email}, ${SITE.phone}.`,
      ]} />
      <Section title="2. What we collect" items={[
        "Customers: name, phone, email, delivery addresses, optional map pins, orders, reviews, feedback messages and notifications.",
        "Riders, in addition: full name as on the CNIC, CNIC number, father's name, date of birth, home address, emergency contact, guarantor, vehicle details, and photos of the CNIC (front and back) and a selfie.",
        "Restaurants: owner account details, menu, photos and the money records between us and the restaurant.",
        "Technical data: login cookies, and settings stored in your browser (your cart, your chosen area).",
      ]} />
      <Section title="3. Why we use it" items={[
        "To take and deliver orders, handle cash and payments, prevent fraud and theft, resolve problems, and improve the service.",
        "Rider ID details are used only to check who a rider is, to protect restaurants and customers from cash loss, and to contact riders and their guarantors if cash goes missing. We may give them to the police if a crime happens.",
      ]} />
      <Section title="4. Who can see it" items={[
        "The restaurant sees your order, name-less contact details needed to prepare it, your address and phone. Your rider sees your address and pin only after the restaurant hands over your food, and your phone to call you.",
        "FetchFood administrators can see orders, accounts and rider documents. Rider ID photos are in private storage and only administrators can open them.",
        "We do not sell your data. We do not show your name on reviews.",
      ]} />
      <Section title="5. Services we use" items={[
        "Our database and file storage are hosted by Supabase, and the site is served by our hosting provider.",
        "Maps use OpenStreetMap map tiles and the Leaflet library. Rider navigation opens Google Maps. These services may see your device's address and the area you look at.",
      ]} />
      <Section title="6. How long we keep it" items={[
        "Account details are kept until you delete your account. When you delete it, your login and profile are removed, and your orders are kept for our records without your name, address, phone, note or pin. Reviews stay anonymous.",
        "Rider documents are kept while the person is a rider and for a reasonable period after, in case of a cash dispute.",
      ]} />
      <Section title="7. Your choices" items={[
        "You can edit your name and phone, and delete your account, in Account. Accounts with a restaurant or rider role must contact us to be deleted.",
        `You can ask us what we hold about you, or to correct or remove it, at ${SITE.email}.`,
      ]} />
      <Section title="8. Security and children" items={[
        "We protect data with access rules in the database and private storage for documents, but no system is perfectly safe.",
        "FetchFood is not for children who order on their own.",
      ]} />
    </LegalPage>
  );
}