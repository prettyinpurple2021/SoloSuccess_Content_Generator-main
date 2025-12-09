import React, { useState, useCallback, useEffect } from 'react';
import {
  AlertTriangle,
  Send,
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Search,
  User,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  context?: Record<string, any>;
  tags?: string[];
  resolved: boolean;
  reportedBy?: string;
  notes?: string;
}

interface ErrorReportingSystemProps {
  onSubmitReport?: (report: Partial<ErrorReport>) => Promise<void>;
  onClearReports?: () => Promise<void>;
  maxReports?: number;
}

export const ErrorReportingSystem: React.FC<ErrorReportingSystemProps> = ({
  onSubmitReport,
  onClearReports,
  maxReports = 100,
}) => {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Load reports from localStorage on mount
  useEffect(() => {
    const savedReports = localStorage.getItem('app_error_reports');
    if (savedReports) {
      try {
        const parsed = JSON.parse(savedReports);
        setReports(
          parsed.map((report: any) => ({
            ...report,
            timestamp: new Date(report.timestamp),
          }))
        );
      } catch (loadError) {
        console.error('Failed to load error reports:', loadError);
      }
    }
  }, []);

  // Save reports to localStorage whenever reports change
  useEffect(() => {
    if (reports.length > 0) {
      localStorage.setItem('app_error_reports', JSON.stringify(reports));
    }
  }, [reports]);

  const addReport = useCallback(
    (error: Error, context?: Record<string, any>) => {
      const report: ErrorReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level: 'error',
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: getSessionId(),
        context,
        resolved: false,
      };

      setReports((prev) => {
        const newReports = [report, ...prev];
        // Keep only the most recent reports
        return newReports.slice(0, maxReports);
      });

      return report.id;
    },
    [maxReports]
  );

  const markAsResolved = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((report) => (report.id === reportId ? { ...report, resolved: true } : report))
    );
  }, []);

  const deleteReport = useCallback(
    (reportId: string) => {
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    },
    [selectedReport]
  );

  const clearAllReports = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all error reports?')) {
      setReports([]);
      setSelectedReport(null);
      localStorage.removeItem('app_error_reports');

      if (onClearReports) {
        await onClearReports();
      }
    }
  }, [onClearReports]);

  const exportReports = useCallback(() => {
    const dataStr = JSON.stringify(reports, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `error-reports-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [reports]);

  const copyReportToClipboard = useCallback((report: ErrorReport) => {
    const reportText = `
Error Report
============
ID: ${report.id}
Timestamp: ${report.timestamp.toISOString()}
Level: ${report.level}
Message: ${report.message}
URL: ${report.url}
User Agent: ${report.userAgent}

Stack Trace:
${report.stack || 'No stack trace available'}

Component Stack:
${report.componentStack || 'No component stack available'}

Context:
${JSON.stringify(report.context, null, 2)}
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      alert('Report copied to clipboard!');
    });
  }, []);

  const submitReport = useCallback(
    async (report: ErrorReport) => {
      if (onSubmitReport) {
        try {
          await onSubmitReport(report);
          markAsResolved(report.id);
          alert('Report submitted successfully!');
        } catch (_error) {
          alert('Failed to submit report. Please try again.');
        }
      }
    },
    [onSubmitReport, markAsResolved]
  );

  const filteredReports = reports.filter((report) => {
    if (filter !== 'all' && report.level !== filter) return false;
    if (!showResolved && report.resolved) return false;
    if (searchTerm && !report.message.toLowerCase().includes(searchTerm.toLowerCase()))
      return false;
    return true;
  });

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return <Smartphone className="w-4 h-4" />;
    if (userAgent.includes('Tablet')) return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Error Reports</h2>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                {filteredReports.length} reports
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportReports}
                disabled={reports.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={clearAllReports}
                disabled={reports.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show resolved
            </label>
          </div>
        </div>

        {/* Reports List */}
        <div className="divide-y divide-gray-200">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No error reports found</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedReport?.id === report.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(report.level)}`}
                      >
                        {report.level.toUpperCase()}
                      </span>

                      {report.resolved && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                          RESOLVED
                        </span>
                      )}

                      <span className="text-xs text-gray-500">
                        {report.timestamp.toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-1 truncate">{report.message}</h3>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-xs">{report.url}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {getDeviceIcon(report.userAgent)}
                        <span>
                          {report.userAgent.includes('Chrome')
                            ? 'Chrome'
                            : report.userAgent.includes('Firefox')
                              ? 'Firefox'
                              : report.userAgent.includes('Safari')
                                ? 'Safari'
                                : 'Other'}
                        </span>
                      </div>

                      {report.userId && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{report.userId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyReportToClipboard(report);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy report"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {onSubmitReport && !report.resolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          submitReport(report);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Submit report"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.id);
                      }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Error Report Details</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report ID
                      </label>
                      <p className="text-sm text-gray-900 font-mono">{selectedReport.id}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timestamp
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedReport.timestamp.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(selectedReport.level)}`}
                      >
                        {selectedReport.level.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedReport.resolved
                            ? 'text-green-600 bg-green-50'
                            : 'text-yellow-600 bg-yellow-50'
                        }`}
                      >
                        {selectedReport.resolved ? 'RESOLVED' : 'OPEN'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Error Message
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedReport.message}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <p className="text-sm text-gray-900 break-all">{selectedReport.url}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User Agent
                    </label>
                    <p className="text-sm text-gray-900 break-all">{selectedReport.userAgent}</p>
                  </div>

                  {selectedReport.stack && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Stack Trace
                        </label>
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showDetails ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          {showDetails ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showDetails && (
                        <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                          {selectedReport.stack}
                        </pre>
                      )}
                    </div>
                  )}

                  {selectedReport.context && Object.keys(selectedReport.context).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Context
                      </label>
                      <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedReport.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 flex justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => copyReportToClipboard(selectedReport)}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Report
                  </button>

                  {onSubmitReport && !selectedReport.resolved && (
                    <button
                      onClick={() => submitReport(selectedReport)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                      Submit Report
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {!selectedReport.resolved && (
                    <button
                      onClick={() => markAsResolved(selectedReport.id)}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark as Resolved
                    </button>
                  )}

                  <button
                    onClick={() => deleteReport(selectedReport.id)}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper: Generate cryptographically secure random string
function generateSecureRandomString(length: number = 12): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => dec.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

// Helper function to get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${generateSecureRandomString(12)}`;
    sessionStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Hook for automatic error reporting
 */
export const useErrorReporting = () => {
  const [reports, setReports] = useState<ErrorReport[]>([]);

  const reportError = useCallback((error: Error, context?: Record<string, any>) => {
    const report: ErrorReport = {
      id: `report_${Date.now()}_${generateSecureRandomString(12)}`,
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: getSessionId(),
      context,
      resolved: false,
    };

    setReports((prev) => [report, ...prev]);

    // Store in localStorage
    const existingReports = JSON.parse(localStorage.getItem('app_error_reports') || '[]');
    const updatedReports = [report, ...existingReports].slice(0, 100); // Keep last 100
    localStorage.setItem('app_error_reports', JSON.stringify(updatedReports));

    return report.id;
  }, []);

  const clearReports = useCallback(() => {
    setReports([]);
    localStorage.removeItem('app_error_reports');
  }, []);

  return {
    reports,
    reportError,
    clearReports,
  };
};

export default ErrorReportingSystem;
