import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "May 10, 2025";
const COMPANY = "Latter House Life";
const CONTACT_EMAIL = "customerservice@latterhouselife.com";

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 animate-in fade-in duration-400">
      <button
        onClick={() => setLocation("/welcome")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-semibold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {COMPANY} ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and related services (collectively, the "Service"). Please read this policy carefully. If you do not agree with its terms, please discontinue use of the Service.
        </p>

        <Section title="1. Information We Collect">
          <p><strong className="text-foreground">Account information.</strong> When you create an account, we collect your name, email address, and password (managed securely by Clerk, our authentication provider).</p>
          <p><strong className="text-foreground">Content you create.</strong> We store all planner entries, tasks, notes, health records (medications, appointments, conditions), financial records, goals, and any other content you choose to enter into the Service.</p>
          <p><strong className="text-foreground">Payment information.</strong> Billing is handled by Stripe. We store a reference to your Stripe customer and subscription identifiers but never have access to your full card number or sensitive payment details.</p>
          <p><strong className="text-foreground">Usage data.</strong> We may collect general usage data such as the pages you visit within the app and the time and date of your visits. We do not sell this data.</p>
          <p><strong className="text-foreground">Communications.</strong> If you contact us by email, we retain your message to respond and improve our support.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create and manage your account and subscription.</li>
            <li>Deliver, maintain, and improve the Service.</li>
            <li>Process payments and prevent fraudulent transactions.</li>
            <li>Respond to your questions, comments, and support requests.</li>
            <li>Send transactional emails (e.g., billing receipts, subscription reminders).</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p>We do not use your personal content (planner entries, health data, financial data) for advertising, marketing, analytics product improvement, or any purpose beyond providing the Service to you.</p>
        </Section>

        <Section title="3. AI Features and Third-Party Processing">
          <p>
            Features including Brain Dump, Truth Generator, Help Me Plan, Scripture, and Encouragement send content you submit to a third-party AI provider (OpenAI) to generate responses. Only the text you actively submit to those features is sent; we do not continuously send your stored data to AI providers.
          </p>
          <p>
            OpenAI's use of data submitted through their API is governed by their own privacy policy and data processing terms. We encourage you to avoid submitting sensitive personal information (such as full names, social security numbers, or specific medical diagnoses) in AI prompts.
          </p>
        </Section>

        <Section title="4. Data Storage and Security">
          <p>
            Your data is stored in a secured PostgreSQL database. All data is isolated by user account — you can only access your own data, and no other user can access yours.
          </p>
          <p>
            We implement industry-standard security measures including encrypted connections (TLS), secure credential storage, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your data for as long as your account is active. If you request account deletion, we will delete your personal data and all associated content within 30 days, except where retention is required by law (e.g., billing records).
          </p>
        </Section>

        <Section title="6. Sharing and Disclosure">
          <p>We do not sell your personal information. We share your information only in the following limited circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Service providers:</strong> Clerk (authentication), Stripe (payments), OpenAI (AI features), and our hosting provider — each acting under a data processing agreement and only as necessary to provide the Service.</li>
            <li><strong className="text-foreground">Legal requirements:</strong> If required by law, court order, or government authority, we may disclose your information.</li>
            <li><strong className="text-foreground">Business transfers:</strong> In the event of a merger, acquisition, or sale of substantially all assets, your data may be transferred. We will notify you in advance.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights and Choices">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Data portability (receive a copy of your data in a machine-readable format).</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="8. Cookies and Local Storage">
          <p>
            The Service uses browser local storage to maintain your session, cache your subscription status (for faster load times), and remember certain UI preferences. We do not use third-party tracking cookies or advertising cookies.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            The Service is not directed to anyone under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us at {CONTACT_EMAIL} and we will promptly delete it.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes by posting the updated policy within the app and, where possible, by email. Your continued use of the Service after the effective date of the updated policy constitutes acceptance of the changes.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy, please contact us at:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}
