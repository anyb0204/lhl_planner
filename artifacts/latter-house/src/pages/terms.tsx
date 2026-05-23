import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "May 10, 2025";
const COMPANY = "Latter House Life";
const CONTACT_EMAIL = "customerservice@latterhouselife.com";
const DOMAIN = "latterhouselife.com";

export default function Terms() {
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
          <h1 className="text-3xl font-serif font-semibold text-foreground">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Please read these Terms and Conditions carefully before using {COMPANY} (the "Service") operated by {COMPANY} ("us", "we", or "our"). By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
        </p>

        <Section title="1. Use of the Service">
          <p>
            {COMPANY} is a subscription-based digital life-planning application. By creating an account you represent that you are at least 18 years of age and capable of entering into a legally binding agreement. You agree to use the Service only for lawful purposes and in accordance with these Terms.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorized use.
          </p>
        </Section>

        <Section title="2. Subscriptions and Billing">
          <p>
            Access to the full Service requires an active paid subscription. We offer monthly and annual billing plans. Subscription fees are charged at the beginning of each billing period through our payment processor, Stripe.
          </p>
          <p>
            Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You can manage or cancel your subscription at any time through the Manage Billing portal accessible within the app.
          </p>
          <p>
            All fees are non-refundable except as required by applicable law or at our sole discretion. We reserve the right to change subscription pricing with at least 30 days' notice.
          </p>
        </Section>

        <Section title="3. User Content">
          <p>
            You retain full ownership of all content you enter into the Service, including planner entries, health data, financial records, goals, and notes ("User Content"). We do not claim any intellectual property rights over your User Content.
          </p>
          <p>
            By using the Service you grant us a limited, non-exclusive license to store and process your User Content solely for the purpose of providing the Service to you. We do not sell, share, or use your User Content for advertising.
          </p>
        </Section>

        <Section title="4. AI-Powered Features">
          <p>
            Certain features — including Brain Dump, Truth Generator, Help Me Plan, Scripture suggestions, and Encouragement — use artificial intelligence powered by third-party providers. These features are provided for inspiration and organizational assistance only. They do not constitute medical, legal, financial, spiritual, or professional advice.
          </p>
          <p>
            AI-generated content may occasionally be inaccurate or incomplete. Always exercise your own judgment when acting on any suggestions produced by these features.
          </p>
        </Section>

        <Section title="5. Health and Financial Information">
          <p>
            The health and financial trackers are organizational tools designed to help you keep personal records in one place. Nothing in the Service constitutes medical advice, diagnosis, treatment, financial planning, or professional consultation of any kind.
          </p>
          <p>
            Always consult qualified professionals for decisions relating to your health, medications, finances, or legal matters.
          </p>
        </Section>

        <Section title="6. Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Service to violate any applicable law or regulation.</li>
            <li>Attempt to gain unauthorized access to other users' accounts or data.</li>
            <li>Reverse-engineer, scrape, or otherwise extract data from the Service.</li>
            <li>Upload or transmit malicious code, viruses, or any software intended to damage the Service.</li>
            <li>Use the Service in any manner that could disable, overburden, or impair its performance.</li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The Service and its original content, design, features, and functionality are and will remain the exclusive property of {COMPANY}. The brand name, logo, and tagline are protected by applicable trademark and copyright laws.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            We may terminate or suspend your account immediately, without prior notice, for conduct that we determine in our sole discretion violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time by contacting us at {CONTACT_EMAIL}.
          </p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free from harmful components.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages. Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount you paid us in the three months preceding the claim.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict-of-law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in the United States.
          </p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>
            We reserve the right to modify or replace these Terms at any time. We will provide at least 14 days' notice of material changes by posting the new Terms at {DOMAIN} and, where possible, notifying you by email. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            If you have any questions about these Terms, please contact us at:{" "}
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
