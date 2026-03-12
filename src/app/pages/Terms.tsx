export default function Terms() {
  return (
    <div className="min-h-screen bg-[#000e08] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">RIVVO Terms of Service</h1>
          <p className="mt-2 text-sm text-white/70">Last updated: March 12, 2026</p>
        </header>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">1. Acceptance</h2>
          <p>
            By creating an account or using Rivvo, you agree to these Terms and our Privacy
            Policy. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
          <p>
            You must have the legal capacity to enter into this agreement. You are responsible
            for providing accurate information, including a unique email and phone number.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">3. Accounts</h2>
          <p>
            Your account is personal to you. You are responsible for maintaining the security
            of your credentials and all activity performed under your account.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">4. Acceptable Use</h2>
          <p>
            Do not use Rivvo for unlawful, harmful, or abusive activity. We may suspend or
            terminate accounts that violate these terms or harm other users or the service.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">5. Content</h2>
          <p>
            You retain ownership of the content you send. You grant us the limited right to
            process and transmit data as required to operate the service.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">6. Reporting and Blocking</h2>
          <p>
            You can report messages or users and block users at any time. When you report and
            block, we capture the last 10 messages in the relevant conversation to help with
            review. These messages are stored in encrypted form and are not readable without
            the encryption keys.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">7. Encryption and Privacy</h2>
          <p>
            Rivvo is designed with end-to-end encryption for message content. Messages are
            encrypted on your device and can only be decrypted by the intended recipient.
            Rivvo does not store your plaintext message content.
          </p>
          <p>
            Some metadata (such as account identifiers and timestamps) is required to run the
            service. See the Privacy Policy for details on what we collect and why.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">8. Availability</h2>
          <p>
            We may modify, suspend, or discontinue parts of the service at any time. We do not
            guarantee uninterrupted availability.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">9. Termination</h2>
          <p>
            You may stop using Rivvo at any time. We may suspend or terminate accounts for
            violations or security risks.
          </p>
        </section>

        <section className="space-y-4 text-white/90">
          <h2 className="text-xl font-semibold text-white">10. Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the service means you
            accept the updated Terms.
          </p>
        </section>
      </div>
    </div>
  );
}
