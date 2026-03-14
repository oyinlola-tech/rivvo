export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#000e08] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">RIVVO Privacy Policy</h1>
          <p className="mt-2 text-sm text-white/70">Last updated: March 12, 2026</p>
        </header>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">1. Our Promise</h2>
          <p>
            Rivvo is built for private communication. Message content is end-to-end encrypted,
            meaning only you and your recipients can read it. We do not store your plaintext
            messages on our servers.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">2. Data We Collect</h2>
          <p>
            To operate the service we collect: your email address, an optional phone number, your
            display name, device keys, and basic usage metadata such as timestamps and delivery
            status.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">3. What We Don’t See</h2>
          <p>
            We cannot read your message content. Encryption happens on your device, and only
            recipients with the correct keys can decrypt it.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">4. Reporting and Safety</h2>
          <p>
            If you report and block a user, we capture the last 10 messages in that conversation
            to help moderators review the report. These messages remain encrypted and are stored
            alongside limited metadata such as timestamps and sender identifiers.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">5. Why We Use Your Data</h2>
          <p>
            We use your email for account verification, and your phone number (if provided) to help others
            find you. We use metadata to deliver messages reliably, prevent abuse, and keep
            the service secure.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">6. Data Sharing</h2>
          <p>
            We do not sell your data. We only share information when required to provide the
            service (for example, routing messages) or when legally required.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">7. Security</h2>
          <p>
            We use modern cryptography, device keys, and secure transport. We also rate-limit
            and monitor for abuse to keep the platform safe.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">8. Your Choices</h2>
          <p>
            You can update your profile and remove the app at any time. If you need help
            deleting your account, contact support.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">9. Changes</h2>
          <p>
            We may update this policy. Continued use of Rivvo means you accept the updated
            policy.
          </p>
        </section>
      </div>
    </div>
  );
}
