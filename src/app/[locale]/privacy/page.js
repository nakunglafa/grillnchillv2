import Link from "next/link";
import { Header } from "@/components/Header";
import {
  buildHrefLangAlternates,
  DEFAULT_LOCALE,
  isLocale,
  localizedPath,
} from "@/lib/i18n";

const RESTAURANT_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX ||
  "Grill N Chill";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const PLATFORM_PRIVACY_URL = "https://restaurant.digitallisbon.pt/privacy";
const PLATFORM_CONTROLLER = "Krishna Bahadur Thapa";
const PLATFORM_CONTACT = "[email protected]";

export async function generateMetadata({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const path = localizedPath(locale, "/privacy");
  return {
    title: "Privacy notice",
    description:
      "How we collect, use, and protect your personal data when you book a table, place an order, or create an account.",
    alternates: {
      canonical: path,
      languages: buildHrefLangAlternates(SITE_URL, "/privacy"),
    },
  };
}

export default async function PrivacyPage({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return (
    <div className="relative min-h-screen bg-[#0a0908] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
        aria-hidden
      />
      <Header variant="marketing" />
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:py-14 lg:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          Legal
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Privacy &amp; data protection
        </h1>
        <p className="mt-3 text-xs text-white/55 sm:text-sm">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          This notice describes how personal data is processed when you use the
          booking, ordering and account features on this website. Where
          applicable, you have rights under the EU General Data Protection
          Regulation (GDPR) and Portuguese data-protection law.
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80 sm:text-[15px]">
          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              1. Who is responsible for your data
            </h2>
            <p className="mt-2">
              <strong className="text-white">{RESTAURANT_NAME}</strong> is the{" "}
              <strong className="text-white">data controller</strong> for guest
              data collected through reservations and orders made on this
              website. We decide what data is collected and what it is used for.
            </p>
            <p className="mt-2">
              The booking and ordering platform that hosts this website (the
              database and API at{" "}
              <span className="notranslate" translate="no">
                restaurant.digitallisbon.pt
              </span>
              ) is operated by{" "}
              <strong className="text-white">{PLATFORM_CONTROLLER}</strong> as a{" "}
              <strong className="text-white">processor</strong> on our behalf.
              You can read the platform-level privacy notice here:{" "}
              <a
                href={PLATFORM_PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-accent"
              >
                {PLATFORM_PRIVACY_URL}
              </a>
              .
            </p>
            <p className="mt-2">
              To exercise any of your rights or to ask a question about how we
              handle your data, contact us using the phone or email shown in the
              footer of this website, or write to the platform operator at{" "}
              <a
                href={`mailto:${PLATFORM_CONTACT}`}
                className="underline underline-offset-2 hover:text-accent"
              >
                {PLATFORM_CONTACT}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              2. What personal data we process
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-accent/70">
              <li>
                <span className="font-medium text-white">Reservations:</span>{" "}
                name, email, phone, party size, date and time, table assignment
                where applicable, notes or special requests, status updates, and
                linked account data if you book while logged in.
              </li>
              <li>
                <span className="font-medium text-white">Orders:</span> name,
                contact details, collection / delivery information, ordered
                items, and payment references. Card payments are processed
                directly by our payment provider (Stripe); we do not store full
                card numbers.
              </li>
              <li>
                <span className="font-medium text-white">Accounts:</span> name,
                email, hashed authentication credentials, and activity needed to
                operate the account.
              </li>
              <li>
                <span className="font-medium text-white">Consent records:</span>{" "}
                a timestamped record of your consent to this notice, plus
                technical context recorded at the moment you submit a form
                (browser user-agent, browser language, time zone, screen size,
                page URL, and your IP address). These records exist only as
                evidence that you actively gave consent and are not used for any
                other purpose.
              </li>
              <li>
                <span className="font-medium text-white">Technical logs:</span>{" "}
                IP address, timestamps and similar metadata are kept in server
                or security logs for a limited time to operate and protect the
                service.
              </li>
              <li>
                <span className="font-medium text-white">Analytics:</span> if
                you accept analytics cookies, anonymous usage events
                (e.g.&nbsp;pages viewed, menu searches) help us improve the
                site. Please avoid entering personal data in free-text search
                fields.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              3. Purposes and legal bases
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-accent/70">
              <li>
                <span className="font-medium text-white">
                  Contract / pre-contract steps
                </span>{" "}
                &mdash; to take and manage the reservations and orders you
                request.
              </li>
              <li>
                <span className="font-medium text-white">
                  Legitimate interests
                </span>{" "}
                &mdash; to secure the platform, prevent abuse, and improve the
                service, in balance with your rights.
              </li>
              <li>
                <span className="font-medium text-white">Consent</span> &mdash;
                given by ticking the consent box on our forms (booking,
                checkout, registration) and by accepting cookies. You may
                withdraw consent at any time.
              </li>
              <li>
                <span className="font-medium text-white">Legal obligation</span>{" "}
                &mdash; where we must keep or disclose information to comply
                with the law (e.g.&nbsp;Portuguese accounting and tax rules).
              </li>
            </ul>
            <p className="mt-2">
              We use your data{" "}
              <strong className="text-white">
                only for the purposes above
              </strong>
              . We do not sell your data, do not share it with third parties for
              advertising, and do not use it for profiling.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              4. How long we keep it
            </h2>
            <p className="mt-2">
              We keep personal data only for as long as needed for the purposes
              above, including any period required by law. Reservation and
              order records linked to invoices may be kept for up to{" "}
              <strong className="text-white">10 years</strong> to meet
              Portuguese accounting / tax obligations. Account and contact data
              is kept while your account is active, or until you ask us to
              delete it. After the retention period, data is deleted or
              anonymised.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              5. Recipients and international transfers
            </h2>
            <p className="mt-2">
              We use service providers who process data on our instructions:
              hosting and database (the digitallisbon platform), email delivery,
              payment processing (Stripe), and optionally web analytics (Google
              Analytics, only if you accept analytics cookies). Where a provider
              is outside the European Economic Area, the appropriate safeguards
              required by GDPR (typically the European Commission&rsquo;s
              Standard Contractual Clauses) apply.
            </p>
            <p className="mt-2">
              Restaurant staff and owners may access guest data relating only to
              their own venue, strictly in order to fulfil bookings and orders.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              6. Your rights
            </h2>
            <p className="mt-2">
              Under GDPR you have the right to{" "}
              <strong className="text-white">access</strong>,{" "}
              <strong className="text-white">rectification</strong>,{" "}
              <strong className="text-white">erasure</strong>,{" "}
              <strong className="text-white">restriction</strong>,{" "}
              <strong className="text-white">objection</strong>, and{" "}
              <strong className="text-white">data portability</strong>, and to{" "}
              <strong className="text-white">withdraw consent</strong> at any
              time. To exercise any of these rights contact us using the details
              in section 1.
            </p>
            <p className="mt-2">
              You also have the right to lodge a complaint with the
              supervisory authority. In Portugal this is the{" "}
              <em>Comissão Nacional de Proteção de Dados</em> (CNPD).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              7. Cookies and similar technologies
            </h2>
            <p className="mt-2">
              When you first open this site you are asked to choose between{" "}
              <strong className="text-white">&ldquo;Accept all&rdquo;</strong>{" "}
              and <strong className="text-white">&ldquo;Essential only&rdquo;</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-accent/70">
              <li>
                <span className="font-medium text-white">
                  Strictly necessary cookies
                </span>{" "}
                &mdash; needed for the site to work (e.g. authentication
                session, language preference, shopping cart, and the
                cookie-choice cookie itself). These cannot be disabled.
              </li>
              <li>
                <span className="font-medium text-white">Analytics cookies</span>{" "}
                &mdash; Google Analytics with IP anonymisation, loaded only if
                you choose &ldquo;Accept all&rdquo;. Used to count visits and
                measure traffic patterns. We do not use advertising or
                cross-site tracking cookies.
              </li>
            </ul>
            <p className="mt-2">
              You can change your choice at any time using the{" "}
              <strong className="text-white">Cookie preferences</strong> link in
              the footer.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              8. Automated decisions
            </h2>
            <p className="mt-2">
              We do not use solely automated decision-making, including
              profiling, that produces legal or similarly significant effects
              concerning you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">
              9. Updates to this notice
            </h2>
            <p className="mt-2">
              We may update this notice from time to time. The current version
              is always the one published on this page; the &ldquo;Last
              updated&rdquo; date at the top reflects the most recent change.
            </p>
          </section>
        </div>

        <Link
          href={localizedPath(locale, "/")}
          className="mt-10 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:text-accent-hover"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </Link>
      </main>
    </div>
  );
}
