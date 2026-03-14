import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface VerificationPayment {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    phone?: string | null;
    username?: string | null;
  };
  amount: number;
  currency: string;
  status: string;
  reviewStatus: string;
  rejectionReason?: string | null;
  txRef: string;
  flwStatus?: string | null;
  createdAt: string;
}

export default function VerificationPayments() {
  const [payments, setPayments] = useState<VerificationPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");

  const loadPayments = async () => {
    setError("");
    setLoading(true);
    const response = await api.getVerificationPayments(1, 50, {
      status: statusFilter === "all" ? undefined : statusFilter,
      reviewStatus: reviewFilter === "all" ? undefined : reviewFilter,
    });
    if (response.success && response.data?.payments) {
      setPayments(response.data.payments as VerificationPayment[]);
    } else if (!response.success) {
      setError(response.error || "Failed to load payments");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter, reviewFilter]);

  const handleReview = async (paymentId: string, action: "approve" | "reject") => {
    const confirmAction = window.confirm(
      action === "approve" ? "Approve this verification payment?" : "Reject this verification payment?"
    );
    if (!confirmAction) return;
    let reason: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Reason for rejection (required):");
      if (!input || !input.trim()) return;
      reason = input.trim();
    }
    const response = await api.reviewVerificationPayment(paymentId, action, reason);
    if (response.success) {
      await loadPayments();
    } else {
      setError(response.error || "Failed to update payment");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Verification Payments</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={loadPayments}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20A090]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Review</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tx Ref</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{payment.user.name}</div>
                      <div className="text-xs text-gray-500">{payment.user.email}</div>
                      {(payment.user.username || payment.user.phone) && (
                        <div className="text-xs text-gray-500">
                          {payment.user.username ? `@${payment.user.username}` : ""}
                          {payment.user.username && payment.user.phone ? " • " : ""}
                          {payment.user.phone || ""}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.status}
                      {payment.flwStatus ? ` (${payment.flwStatus})` : ""}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.reviewStatus}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {payment.reviewStatus === "rejected"
                        ? payment.rejectionReason || "No reason provided"
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 break-all">{payment.txRef}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleReview(payment.id, "approve")}
                        disabled={payment.reviewStatus !== "pending" || payment.status !== "successful"}
                        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed mr-3"
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button
                        onClick={() => handleReview(payment.id, "reject")}
                        disabled={payment.reviewStatus !== "pending" || payment.status !== "successful"}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
