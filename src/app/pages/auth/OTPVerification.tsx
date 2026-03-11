import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

export default function OTPVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  useEffect(() => {
    if (!email) {
      navigate("/auth/signup");
    }
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);

    const result = await verifyOTP(email, otpString);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Invalid OTP. Please try again.");
    }
    
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage("");
    
    const response = await api.resendOTP(email);
    
    if (response.success) {
      setResendMessage("OTP sent successfully!");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } else {
      setResendMessage(response.error || "Failed to resend OTP");
    }
    
    setResendLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
      <p className="text-center text-gray-600 text-sm mb-6">
        We sent a 6-digit code to <strong>{email}</strong>
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className={`p-3 rounded-lg text-sm ${resendMessage.includes("success") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {resendMessage}
          </div>
        )}

        <div className="flex gap-2 justify-center">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-bold bg-[#F3F6F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20A090]"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#20A090] text-white py-3 rounded-xl font-medium hover:bg-[#1a8c7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{" "}
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="text-[#20A090] font-medium hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Sending..." : "Resend"}
          </button>
        </p>
      </div>
    </div>
  );
}
