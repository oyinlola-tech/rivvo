import { useState, useEffect } from "react";
import { Flag, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";

interface Report {
  id: string;
  reportedUser: {
    name: string;
    email: string;
  };
  reportedBy: {
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: "pending" | "resolved";
  createdAt: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const response = await api.getReports();
    if (response.success && response.data) {
      setReports(response.data);
    }
    setLoading(false);
  };

  const handleResolve = async (reportId: string) => {
    const response = await api.resolveReport(reportId);
    if (response.success) {
      setReports(
        reports.map((report) =>
          report.id === reportId ? { ...report, status: "resolved" } : report
        )
      );
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
                  ? "bg-[#20A090] text-white"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20A090]"></div>
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
