import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    const response = await api.requestPasswordReset(email.trim());
    if (response.success) {
      const info = response.data?.message || "If the account exists, an OTP has been sent.";
      setMessage(info);
      navigate("/auth/reset-password", { state: { email: email.trim() } });
    } else {
      setError(response.error || "Failed to request password reset");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
      <p className="text-center text-gray-600 text-sm mb-6">
        Enter your email to receive a one-time code.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            placeholder="Enter your email"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a8c7a] text-white py-3 rounded-xl font-medium hover:bg-[#1a8c7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send OTP"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Remembered your password?{" "}
          <Link to="/auth/login" className="text-[#1a8c7a] font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
