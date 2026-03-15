import { useState, useEffect } from "react";
import { Flag, CheckCircle, UserX, ClipboardList } from "lucide-react";
import { api } from "../../lib/api";

interface Report {
  id: string;
  reportedUser: {
    id: string;
    name: string;
    email: string;
  };
  reportedBy: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: "pending" | "resolved";
  type?: "user" | "message";
  assignedModerator?: { id: string; name: string; email: string } | null;
  reportedMessageId?: string | null;
  conversationId?: string | null;
  createdAt: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [moderators, setModerators] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportMessages, setReportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  useEffect(() => {
    loadReports();
    loadModerators();
  }, []);

  const loadReports = async () => {
    setError("");
    const response = await api.getReports();
    if (response.success && response.data) {
      setReports(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load reports");
    }
    setLoading(false);
  };

  const loadModerators = async () => {
    const response = await api.getModerators();
    if (response.success && response.data) {
      setModerators(response.data);
    }
  };

  const handleAssign = async (reportId: string, moderatorId: string) => {
    const response = await api.assignReport(reportId, moderatorId || null);
    if (response.success) {
      setReports(
        reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                assignedModerator: moderators.find((mod) => mod.id === moderatorId) || null,
              }
            : report
        )
      );
    } else if (!response.success) {
      setError(response.error || "Failed to assign report");
    }
  };

  const handleBan = async (email: string, userId: string) => {
    const confirmBan = window.confirm(`Ban ${email}?`);
    if (!confirmBan) return;
    const response = await api.updateUserStatus(userId, "suspended");
    if (!response.success) {
      setError(response.error || "Failed to ban user");
    }
  };

  const handleLoadReportMessages = async (reportId: string) => {
    const response = await api.getReportMessages(reportId);
    if (response.success && response.data) {
      setSelectedReportId(reportId);
      setReportMessages(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load report messages");
    }
  };

  const handleResolve = async (reportId: string) => {
    const response = await api.resolveReport(reportId);
    if (response.success) {
      setReports(
        reports.map((report) =>
          report.id === reportId ? { ...report, status: "resolved" } : report
        )
      );
    } else if (!response.success) {
      setError(response.error || "Failed to resolve report");
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    return report.status === filter;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          {(["all", "pending", "resolved"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? "bg-[#25D366] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={20} className="text-red-500" />
                      <h3 className="font-semibold text-lg">{report.reason}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {report.status}
                      </span>
                      {report.type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {report.type}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{report.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Reported User</p>
                        <p className="font-medium">{report.reportedUser.name}</p>
                        <p className="text-gray-600">{report.reportedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Reported By</p>
                        <p className="font-medium">{report.reportedBy.name}</p>
                        <p className="text-gray-600">{report.reportedBy.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 mr-2">Assign to</span>
                        <select
                          value={report.assignedModerator?.id || ""}
                          onChange={(e) => handleAssign(report.id, e.target.value)}
                          className="border rounded-md px-2 py-1 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {moderators.map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleLoadReportMessages(report.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        <ClipboardList size={16} /> View last 10 messages
                      </button>
                      <button
                        onClick={() => handleBan(report.reportedUser.email, report.reportedUser.id)}
                        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                      >
                        <UserX size={16} /> Ban user
                      </button>
                    </div>
                  </div>
                  {report.status === "pending" && (
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="ml-4 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={20} />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
                {selectedReportId === report.id && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="font-semibold mb-2">Last 10 messages (encrypted)</p>
                    {reportMessages.length === 0 ? (
                      <p className="text-gray-500">No messages captured.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportMessages.map((msg) => (
                          <div key={msg.id} className="border-b border-gray-200 pb-2">
                            <p className="text-xs text-gray-500">
                              {msg.senderName} â€¢ {new Date(msg.createdAt).toLocaleString()}
                            </p>
                            <p className="text-gray-700">
                              {msg.encrypted ? "Encrypted message" : msg.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

