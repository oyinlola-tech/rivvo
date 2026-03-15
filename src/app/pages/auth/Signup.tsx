import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const normalizedPhone = phone.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy");
      return;
    }

    setLoading(true);

    const result = await signup(email, password, name, normalizedPhone || undefined);
    
    if (result.success) {
      navigate("/auth/verify-otp", { state: { email } });
    } else {
      setError(result.message || "Signup failed. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-6">
        <img
          src="/rivvo.png"
          alt="Rivvo logo"
          className="h-12 w-12 rounded-xl object-cover mb-3"
          loading="lazy"
        />
        <h2 className="text-2xl font-bold text-center">Create Account</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            placeholder="Enter your full name"
            required
          />
        </div>

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
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone Number (optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            placeholder="Enter your phone number"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a] pr-12"
              placeholder="Create a password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
            placeholder="Confirm your password"
            required
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1a8c7a] focus:ring-[#1a8c7a]"
          />
          <span>
            By signing up, you agree to the{" "}
            <Link to="/terms" className="text-[#1a8c7a] font-medium hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-[#1a8c7a] font-medium hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a8c7a] text-white py-3 rounded-xl font-medium hover:bg-[#1a8c7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-[#1a8c7a] font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}


