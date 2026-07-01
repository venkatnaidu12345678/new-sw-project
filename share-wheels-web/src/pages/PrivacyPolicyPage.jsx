import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import LegalDocument, { LegalSection, LegalList } from "../components/LegalDocument";
import { CONTACT_EMAIL } from "../data/contact";

const APP_NAME = "Share Wheels";
const COMPANY_NAME = "Share Wheels";
const APP_PACKAGE = "com.sharewheels.app";
const LAST_UPDATED = "July 1, 2026";

function DisclosureCard({ title, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 sm:px-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

function DataCollectionSummary() {
  return (
    <aside
      id="data-summary"
      className="mb-10 rounded-2xl border-2 border-blue-500/40 bg-blue-950/30 p-6 sm:p-8"
      aria-label="Data collection summary"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
        Data collection summary
      </p>
      <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
        What user data {APP_NAME} collects
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-300">
        This summary describes the main types of personal and device data collected by the{" "}
        <strong className="font-semibold text-white">{APP_NAME}</strong> mobile app (
        <span className="text-slate-400">{APP_PACKAGE}</span>). We{" "}
        <strong className="font-semibold text-white">do not sell</strong> your personal information.
        Full details are in the sections below.
      </p>

      <div className="mt-6 space-y-4">
        <DisclosureCard title="Personal information — Yes, we collect this">
          <p>
            <strong className="text-slate-300">What:</strong> Name, email address, mobile phone
            number, gender, profile photo, account password (stored in hashed form), and a permanent
            rider ID number.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Create and secure your account, verify
            your identity with OTP, display your profile to other trip participants, and provide
            customer support.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Other users on your trips (for
            example name and photo); our servers and service providers.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Location data — Yes, we collect this">
          <p>
            <strong className="text-slate-300">What:</strong> Precise location (GPS coordinates),
            approximate location, pickup/drop-off addresses, routes, and background location during
            active rides or courier deliveries.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Maps, search, ride matching, navigation,
            live trip tracking, fares, and safety.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Other users on your active trip;
            Google Maps; our hosting providers.{" "}
            <a href="#location-data" className="font-semibold text-blue-300 hover:text-blue-200">
              See Section 3
            </a>
            .
          </p>
        </DisclosureCard>

        <DisclosureCard title="Ride, booking, and courier data — Yes, we collect this">
          <p>
            <strong className="text-slate-300">What:</strong> Rides you publish or book, seat counts,
            fares, trip status, vehicle details (make, model, registration, license and RC images),
            courier parcel details, receiver name and phone, delivery instructions, ratings, and trip
            history.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Operate ride-sharing and courier
            services, match users, calculate payments, and resolve disputes.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Drivers, passengers, couriers,
            and receivers involved in the same trip or delivery.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Photos and camera — Yes, with your permission">
          <p>
            <strong className="text-slate-300">What:</strong> Photos you take or select for your
            profile, vehicle documents (license, registration), identity verification, and courier
            parcel images.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Profile display, driver verification,
            vehicle identification, and courier proof of parcel.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Other users when needed for a
            trip; stored on our servers. You can deny camera or photo access in device settings.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Messages and communications — Yes, we collect this">
          <p>
            <strong className="text-slate-300">What:</strong> In-app ride chat messages, support
            requests, feedback you submit, and notifications we send about your account or trips.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Coordinate trips, provide support, and
            send ride alerts and account updates.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Recipients of your messages on
            the same trip; Firebase Cloud Messaging for push delivery.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Payment and subscription data — Yes, when you pay">
          <p>
            <strong className="text-slate-300">What:</strong> Payment status, transaction references,
            Razorpay order and payment IDs, subscription plan details, and driver subscription records.
            We do <strong className="text-white">not</strong> store full card numbers or UPI PINs.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Process ride-related payments and driver
            subscriptions.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Razorpay and other payment
            processors you choose at checkout.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Device and diagnostic data — Yes, we collect this">
          <p>
            <strong className="text-slate-300">What:</strong> Device model, operating system, app
            version, language, IP address, push notification token (FCM), authentication session
            tokens, server logs, and crash or error reports.
          </p>
          <p>
            <strong className="text-slate-300">Why:</strong> Keep you signed in, deliver
            notifications, maintain security, fix bugs, and improve stability.
          </p>
          <p>
            <strong className="text-slate-300">Shared with:</strong> Google Firebase (push
            notifications and Crashlytics crash reporting); our cloud hosting provider.
          </p>
        </DisclosureCard>

        <DisclosureCard title="Data we do not collect for advertising">
          <p>
            We do not use your data for third-party advertising. We do not sell personal
            information. We do not collect contacts from your address book, SMS content, or
            microphone audio.
          </p>
        </DisclosureCard>
      </div>
    </aside>
  );
}

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = `Privacy Policy — ${APP_NAME}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Share Wheels Privacy Policy — personal info, location (GPS), rides, payments, photos, messages, and device data collected by our ride-sharing app."
      );
    }
  }, []);

  return (
    <main>
      <PageHero
        tall={false}
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="Clear explanation of all user data Share Wheels collects — personal information, location, trips, photos, payments, messages, and device data — and your choices."
      />

      <PageSection className="pb-24">
        <LegalDocument updatedAt={LAST_UPDATED}>
          <DataCollectionSummary />

          <LegalSection title="1. Introduction">
            <p>
              {COMPANY_NAME} (“we”, “us”, or “our”) operates the {APP_NAME} mobile application
              (the “App”, package name <span className="text-slate-300">{APP_PACKAGE}</span>) and
              related services for shared rides and courier deliveries.
            </p>
            <p>
              This Privacy Policy explains{" "}
              <strong className="font-semibold text-white">all categories of user data</strong> we
              collect, why we collect them, who we share them with, how long we keep them, and the
              choices you have. This includes personal information, location data, trip and courier
              data, photos, messages, payment records, and device or diagnostic information.
            </p>
            <p>
              <strong className="font-semibold text-white">We do not sell your personal data.</strong>{" "}
              By creating an account or using the App, you agree to this policy. Questions:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-300 hover:text-blue-200">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection title="2. Information we collect">
            <p>
              The summary at the top of this page lists every major data type. Below is a detailed
              breakdown of what we collect when you register, publish or book rides, send courier
              requests, chat, pay, or use maps and live tracking.
            </p>

            <p className="font-semibold text-slate-300">Personal and account information</p>
            <LegalList
              items={[
                "Full name, email address, and mobile phone number",
                "Gender (collected at registration)",
                "Profile photo and optional display information",
                "Account password (stored securely; not shown in plain text to other users)",
                "Permanent rider ID number (userNo) used for OTP and account identification",
                "OTP codes sent to your phone or email for login and password reset (temporary)",
                "Terms of service acceptance status",
              ]}
            />

            <p className="font-semibold text-slate-300">Driver and vehicle information</p>
            <LegalList
              items={[
                "Vehicle company, model, type, and registration number",
                "Driving license number and images, vehicle registration (RC) images, and vehicle photos",
                "License issue and expiry dates and registered owner name where provided",
                "Driver subscription plan status and payment history",
              ]}
            />

            <p className="font-semibold text-slate-300">Ride, booking, and courier information</p>
            <LegalList
              items={[
                "Pickup and drop-off locations, routes, stopovers, dates, and times",
                "Ride requests, bookings, seat counts, fares, and trip status (pending, started, completed)",
                "Passenger and driver assignments, boarding verification, and trip history",
                "Courier parcel type, weight or size details, parcel photos, and delivery instructions",
                "Courier receiver name, phone number, and delivery status",
                "Ratings, reviews, and feedback you submit about trips or the App",
              ]}
            />

            <p className="font-semibold text-slate-300">Location information</p>
            <p>
              We collect location data from your device, including precise GPS and background
              location during active trips. See{" "}
              <a href="#location-data" className="font-semibold text-blue-300 hover:text-blue-200">
                Section 3 — Location data
              </a>{" "}
              for full details.
            </p>

            <p className="font-semibold text-slate-300">Photos, camera, and files</p>
            <LegalList
              items={[
                "Profile pictures you upload or capture with the camera",
                "Vehicle, license, and registration document images for drivers",
                "Courier parcel photos and proof-of-delivery images",
                "Images are stored on our servers and shown to relevant trip participants",
              ]}
            />

            <p className="font-semibold text-slate-300">Messages and notifications</p>
            <LegalList
              items={[
                "In-app chat messages between drivers, passengers, and couriers on the same ride",
                "Support emails or feedback messages you send us",
                "In-app notification history (ride requests, payments, trip updates)",
                "Push notification delivery tokens (FCM) linked to your account",
              ]}
            />

            <p className="font-semibold text-slate-300">Payment and subscription information</p>
            <LegalList
              items={[
                "Payment status, amounts, and transaction references for rides and subscriptions",
                "Razorpay order ID, payment ID, and signature verification data",
                "Subscription plan name, start and end dates, and renewal status",
                "We do not store full credit/debit card numbers, bank account numbers, or UPI PINs",
              ]}
            />

            <p className="font-semibold text-slate-300">Device, log, and diagnostic information</p>
            <LegalList
              items={[
                "Device model, operating system version, app version, and language",
                "IP address and server access logs for security and troubleshooting",
                "Authentication tokens stored on your device to keep you signed in",
                "Crash reports, error logs, and diagnostic data via Firebase Crashlytics",
                "App interaction logs needed to fix bugs and prevent fraud",
              ]}
            />
          </LegalSection>

          <LegalSection title="3. Location data" id="location-data">
            <p>
              <strong className="font-semibold text-white">
                LOCATION DATA: Share Wheels collects location information from your device.
              </strong>{" "}
              This includes precise GPS coordinates and, in some cases, approximate location.
              During active rides or deliveries, the App may also collect location in the background
              so live tracking continues when you use other apps.
            </p>
            <p>
              Location data is used for maps, pickup and drop-off search, ride matching, live trip
              tracking, fares, and safety. Location data is{" "}
              <strong className="font-semibold text-white">not sold</strong>. It may be shared with
              other users on your trip and with service providers such as Google Maps.
            </p>
            <p className="font-semibold text-slate-300">What location data we collect</p>
            <LegalList
              items={[
                "Precise location (GPS coordinates) from your device’s GPS, Wi‑Fi, and cellular sensors",
                "Approximate location when only coarse location permission is granted",
                "Background location during an active ride or delivery for live trip tracking",
                "Pickup, drop-off, route, and stopover addresses linked to geographic coordinates",
              ]}
            />
            <p className="font-semibold text-slate-300">When we collect location data</p>
            <LegalList
              items={[
                "When you grant location permission (for example after sign-in or when using maps)",
                "When you search for or select pickup and drop-off points, publish a ride, or book a trip",
                "During an active ride or courier delivery, including in the background on Android",
                "When you view or share live tracking for a trip in progress",
              ]}
            />
            <p className="font-semibold text-slate-300">How we use location data</p>
            <LegalList
              items={[
                "Display maps, routes, navigation, and estimated arrival times",
                "Match passengers with drivers and couriers near a route or destination",
                "Share your live position with other users on the same active trip",
                "Calculate fares, verify trip progress, and support safety and dispute resolution",
              ]}
            />
            <p className="font-semibold text-slate-300">Device permissions</p>
            <p>
              On Android, the App may request fine location, coarse location, and—during active
              trips—background location and a foreground location service. On iOS, the App may
              request “While Using the App” or “Always” location access during active trips. You can
              revoke these permissions in your device Settings at any time.
            </p>
            <p className="font-semibold text-slate-300">Your choices for location</p>
            <p>
              You can deny or revoke location permission. Without it, maps, pickup suggestions, and
              live tracking may not work. Background location collection stops when your active trip
              ends or you turn off location access for the App.
            </p>
          </LegalSection>

          <LegalSection title="4. How we use your information">
            <LegalList
              items={[
                "Create, authenticate, and manage your account (including OTP verification)",
                "Display your profile and vehicle information to other users on shared trips",
                "Publish, search, match, book, and manage rides and courier deliveries",
                "Process and display location data for maps, routes, and live trip tracking",
                "Enable in-app chat and notifications about rides, payments, and safety",
                "Process payments and driver subscriptions through payment partners",
                "Store photos and documents you upload for profiles, vehicles, and parcels",
                "Provide customer support, handle disputes, and respond to feedback",
                "Monitor App stability with crash and error reporting",
                "Prevent fraud, enforce our terms, and comply with legal obligations",
              ]}
            />
          </LegalSection>

          <LegalSection title="5. How we share information">
            <p>
              <strong className="font-semibold text-white">We do not sell your personal information.</strong>{" "}
              We share data only as needed to provide the service or as required by law:
            </p>
            <LegalList
              items={[
                "With other users on your trip — name, photo, vehicle details, route, chat messages, and live location during active rides",
                "With courier receivers — delivery details and status you or the sender provide",
                "With cloud hosting providers that store App data on our behalf",
                "With Google — Google Maps (maps and routes), Firebase Cloud Messaging (push notifications), Firebase Crashlytics (crash reports)",
                "With Razorpay — to process payments and subscriptions you initiate",
                "With law enforcement, regulators, or courts when required by law or to protect safety",
                "In connection with a merger or acquisition, subject to continued protection of your data",
              ]}
            />
            <p>
              Third-party services have their own privacy policies. We encourage you to review
              policies for Google, Razorpay, and any payment app you use at checkout.
            </p>
          </LegalSection>

          <LegalSection title="6. Data retention">
            <p>
              We keep personal information only as long as needed for the purposes in this policy:
            </p>
            <LegalList
              items={[
                "Account and profile data — while your account is active and for a reasonable period after deletion requests are processed",
                "Trip and booking records — for trip history, fares, disputes, and legal compliance",
                "Live location data — during active trips; retained only as needed for trip records and safety, then deleted or anonymized",
                "Chat messages — for the duration of the ride and support needs, then deleted or archived per our retention schedule",
                "Payment records — as required for accounting, tax, and fraud prevention",
                "Crash and log data — for a limited period needed to diagnose and fix issues",
              ]}
            />
            <p>
              When data is no longer required, we delete or anonymize it within a reasonable period.
              You may request account deletion by emailing us (Section 12).
            </p>
          </LegalSection>

          <LegalSection title="7. Your choices and rights">
            <LegalList
              items={[
                "Access and update your name, email, phone, gender, profile photo, and vehicle details in App settings",
                "Control location, camera, and notification permissions in your device Settings",
                "Opt out of push notifications through device or App notification settings",
                "Request a copy of your data, correction of inaccurate data, or account deletion by emailing us",
                "Withdraw consent for optional features by changing device permissions (some features may stop working)",
              ]}
            />
            <p>
              To delete your account or exercise privacy rights, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-300 hover:text-blue-200">
                {CONTACT_EMAIL}
              </a>{" "}
              from your registered email address. We may verify your identity before fulfilling a
              request. Deleting your account removes your profile and associated data as described in
              our deletion process, subject to legal retention requirements.
            </p>
          </LegalSection>

          <LegalSection title="8. Children's privacy">
            <p>
              The App is not intended for anyone under 18. We do not knowingly collect personal
              information from children. If you believe a child has provided us data, contact us and
              we will delete it.
            </p>
          </LegalSection>

          <LegalSection title="9. Security">
            <p>
              We use reasonable technical and organizational measures to protect your information,
              including HTTPS encryption, access controls, and secure password storage. No method of
              transmission or storage is completely secure; please use a strong password and keep
              your device protected.
            </p>
          </LegalSection>

          <LegalSection title="10. International transfers">
            <p>
              Your information may be processed on servers in India or other countries where our
              service providers operate. By using the App, you consent to transfer of your
              information to those locations, which may have different data protection laws than your
              country of residence.
            </p>
          </LegalSection>

          <LegalSection title="11. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We will post the revised version
              on this page and update the “Last updated” date. Material changes may also be notified
              in the App. Continued use after changes means you accept the updated policy.
            </p>
          </LegalSection>

          <LegalSection title="12. Contact us">
            <p>For privacy questions, data requests, or complaints, contact:</p>
            <p>
              <span className="font-semibold text-white">{COMPANY_NAME}</span>
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-300 hover:text-blue-200">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-sm text-slate-500">
              App package name: <span className="text-slate-400">{APP_PACKAGE}</span>
            </p>
          </LegalSection>
        </LegalDocument>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link to="/download" className="font-semibold text-blue-300 hover:text-blue-200">
            ← Back to Download
          </Link>
        </p>
      </PageSection>
    </main>
  );
}
