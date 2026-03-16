import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const incomingEmail = location.state?.email || "";
    if (incomingEmail) {
      setEmail(incomingEmail);
    }
  }, [location.state]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pasted)) {
      return;
    }
    const next = [...otp];
    for (let i = 0; i < pasted.length && i < 6; i += 1) {
      next[i] = pasted[i];
    }
    setOtp(next);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const response = await api.resetPassword(email.trim(), otpValue, password);
    if (response.success) {
      setMessage(response.data?.message || "Password updated successfully");
      navigate("/auth/login");
    } else {
      setError(response.error || "Failed to reset password");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
      <p className="text-center text-gray-600 text-sm mb-6">
        Enter the code sent to your email and choose a new password.
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

        <div>
          <label className="block text-sm font-medium mb-2">OTP Code</label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                className="w-12 h-14 text-center text-xl font-bold bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a] pr-12"
              placeholder="Create a new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            placeholder="Confirm new password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a8c7a] text-white py-3 rounded-xl font-medium hover:bg-[#1a8c7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Back to{" "}
          <Link to="/auth/login" className="text-[#1a8c7a] font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
