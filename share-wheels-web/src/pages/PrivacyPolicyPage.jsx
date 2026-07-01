import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import LegalDocument, { LegalSection, LegalList } from "../components/LegalDocument";
import { CONTACT_EMAIL } from "../data/contact";

const APP_NAME = "Share Wheels";
const COMPANY_NAME = "Share Wheels";
const LAST_UPDATED = "June 30, 2026";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = `Privacy Policy — ${APP_NAME}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Share Wheels Privacy Policy — how we collect, use, and protect your data in our ride-sharing and courier mobile app."
      );
    }
  }, []);

  return (
    <main>
      <PageHero
        tall={false}
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="This policy explains how Share Wheels collects, uses, shares, and protects information when you use our mobile application and related services."
      />

      <PageSection className="pb-24">
        <LegalDocument updatedAt={LAST_UPDATED}>
          <LegalSection title="1. Introduction">
            <p>
              {COMPANY_NAME} (“we”, “us”, or “our”) operates the {APP_NAME} mobile application
              (the “App”) and related services that help users offer, find, book, and manage shared
              rides and courier deliveries.
            </p>
            <p>
              This Privacy Policy describes the personal information we collect, why we collect it,
              how we use it, who we share it with, and the choices you have. By creating an account
              or using the App, you agree to this policy.
            </p>
            <p>
              If you have questions, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-indigo-300 hover:text-white">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection title="2. Information we collect">
            <p>We collect information you provide and information generated when you use the App.</p>
            <p className="font-semibold text-slate-300">Account and profile information</p>
            <LegalList
              items={[
                "Name, mobile phone number, and email address",
                "Profile photo and optional bio or display information",
                "Vehicle details if you publish rides as a driver (type, registration, photos)",
                "Identity or verification documents when required for safety or compliance",
              ]}
            />
            <p className="font-semibold text-slate-300">Ride, booking, and courier data</p>
            <LegalList
              items={[
                "Pickup and drop-off locations, routes, stopovers, dates, and times",
                "Ride requests, bookings, fares, seat counts, and trip status",
                "Courier parcel details, photos, and delivery instructions you submit",
                "Ratings, reviews, chat messages, and support conversations related to trips",
              ]}
            />
            <p className="font-semibold text-slate-300">Location information</p>
            <LegalList
              items={[
                "Precise GPS location when you grant permission, including during active rides for live tracking",
                "Background location during active trips so passengers, couriers, and authorized parties can see live progress",
                "Approximate location derived from network or device sensors when needed for maps and search",
              ]}
            />
            <p className="font-semibold text-slate-300">Device and technical information</p>
            <LegalList
              items={[
                "Device model, operating system, app version, and language settings",
                "Push notification tokens (FCM) to send ride alerts and account messages",
                "IP address, log data, and crash or diagnostic reports to keep the App stable and secure",
                "Authentication tokens stored on your device to keep you signed in",
              ]}
            />
            <p className="font-semibold text-slate-300">Payment information</p>
            <p>
              Payments are processed by third-party payment providers such as Razorpay. We receive
              payment status, transaction references, and subscription details, but we do not store
              full card numbers or UPI PINs on our servers.
            </p>
            <p className="font-semibold text-slate-300">Photos and camera</p>
            <p>
              With your permission, the App accesses the camera or photo library so you can upload
              profile pictures, vehicle images, identity documents, and parcel photos.
            </p>
          </LegalSection>

          <LegalSection title="3. How we use your information">
            <LegalList
              items={[
                "Create and manage your account and verify your identity",
                "Match passengers, drivers, and couriers; publish and search rides",
                "Calculate fares, process bookings, payments, and driver subscriptions",
                "Show live maps, navigation, and trip tracking during active rides",
                "Send push notifications, SMS, or in-app alerts about rides, payments, and safety",
                "Provide customer support and respond to reports or disputes",
                "Improve App performance, fix bugs, prevent fraud, and enforce our terms",
                "Comply with applicable law, court orders, or lawful government requests",
              ]}
            />
          </LegalSection>

          <LegalSection title="4. How we share information">
            <p>We do not sell your personal information. We may share information in these cases:</p>
            <LegalList
              items={[
                "With other users when needed for a trip (for example, name, photo, route, and live location during an active ride)",
                "With service providers that help us operate the App (cloud hosting, maps, messaging, analytics, crash reporting, and payment processing)",
                "With Google/Firebase for push notifications and crash reporting",
                "With payment partners such as Razorpay to complete transactions you initiate",
                "With law enforcement, regulators, or others when required by law or to protect safety, rights, or property",
                "In connection with a merger, acquisition, or sale of assets, subject to continued protection of your data",
              ]}
            />
            <p>
              Third-party services have their own privacy policies. We encourage you to review the
              policies of payment and platform providers you interact with through the App.
            </p>
          </LegalSection>

          <LegalSection title="5. Data retention">
            <p>
              We keep personal information only as long as needed for the purposes described in this
              policy, including providing the service, resolving disputes, meeting legal obligations,
              and enforcing agreements. When data is no longer required, we delete or anonymize it
              within a reasonable period.
            </p>
          </LegalSection>

          <LegalSection title="6. Your choices and rights">
            <LegalList
              items={[
                "Access or update profile information in the App settings",
                "Control location and notification permissions in your device settings",
                "Withdraw camera or photo access through device permissions",
                "Request account deletion or data correction by emailing us",
                "Opt out of non-essential marketing messages where applicable",
              ]}
            />
            <p>
              If you are in a region that provides additional privacy rights (such as access,
              correction, deletion, or portability), you may contact us to exercise those rights.
              We may need to verify your identity before fulfilling a request.
            </p>
          </LegalSection>

          <LegalSection title="7. Children's privacy">
            <p>
              The App is not intended for children under 18. We do not knowingly collect personal
              information from anyone under 18. If you believe a child has provided us data, contact
              us and we will take steps to delete it.
            </p>
          </LegalSection>

          <LegalSection title="8. Security">
            <p>
              We use reasonable technical and organizational measures to protect your information,
              including encrypted connections (HTTPS), access controls, and secure authentication.
              No method of transmission or storage is completely secure; please use a strong password
              and keep your device protected.
            </p>
          </LegalSection>

          <LegalSection title="9. International transfers">
            <p>
              Your information may be processed on servers located in India or other countries where
              our service providers operate. By using the App, you consent to transfer of your
              information to those locations, which may have different data protection laws than your
              country of residence.
            </p>
          </LegalSection>

          <LegalSection title="10. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We will post the revised version
              on this page and update the “Last updated” date. Material changes may also be notified
              in the App. Continued use after changes means you accept the updated policy.
            </p>
          </LegalSection>

          <LegalSection title="11. Contact us">
            <p>
              For privacy questions, requests, or complaints, contact:
            </p>
            <p>
              <span className="font-semibold text-white">{COMPANY_NAME}</span>
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-indigo-300 hover:text-white">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-sm text-slate-500">
              App package name: <span className="text-slate-400">com.sharewheels.app</span>
            </p>
          </LegalSection>
        </LegalDocument>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link to="/download" className="font-semibold text-indigo-300 hover:text-white">
            ← Back to Download
          </Link>
        </p>
      </PageSection>
    </main>
  );
}
