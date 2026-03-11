import { Check } from "lucide-react";

interface VerificationBadgeProps {
  type: "user" | "mod";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VerificationBadge({ type, size = "md", className = "" }: VerificationBadgeProps) {
  const bgColor = type === "user" ? "bg-[#1DA1F2]" : "bg-black";
  
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };
  
  const iconSize = {
    sm: 8,
    md: 10,
    lg: 12,
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${bgColor} ${sizeClasses[size]} ${className}`}
      title={type === "user" ? "Verified User" : "Moderator"}
    >
      <Check className="text-white" size={iconSize[size]} strokeWidth={3} />
    </div>
  );
}
