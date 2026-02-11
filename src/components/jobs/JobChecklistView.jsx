// src/components/jobs/JobChecklistView.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils';

/**
 * Job Checklist View Component
 * Display and complete checklists for a job
 */
export default function JobChecklistView({ job, onUpdateJob }) {
  const { userId } = useAuth();
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Calculate completion percentage
  const completionStats = useMemo(() => {
    const checklist = job.checklist || [];
    const total = checklist.length;
    const completed = checklist.filter((item) => item.completed).length;
    const required = checklist.filter((item) => item.required && !item.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      remaining: total - completed,
      required,
      percentage,
    };
  }, [job.checklist]);

  // Toggle item completion
  const handleToggleItem = async (itemId) => {
    const updatedChecklist = (job.checklist || []).map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completedBy: !item.completed ? userId : '',
          completedAt: !item.completed ? new Date().toISOString() : '',
        };
      }
      return item;
    });

    await onUpdateJob(job.id, { checklist: updatedChecklist });
  };

  // Update item notes
  const handleUpdateNotes = async (itemId, notes) => {
    const updatedChecklist = (job.checklist || []).map((item) =>
      item.id === itemId ? { ...item, notes } : item
    );

    await onUpdateJob(job.id, { checklist: updatedChecklist });
  };

  // Toggle item expansion
  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Mark all as complete
  const handleMarkAllComplete = async () => {
    const updatedChecklist = (job.checklist || []).map((item) => ({
      ...item,
      completed: true,
      completedBy: userId,
      completedAt: new Date().toISOString(),
    }));

    await onUpdateJob(job.id, { checklist: updatedChecklist });
  };

  const checklist = job.checklist || [];

  if (checklist.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 mb-2">No checklist for this job</p>
        <p className="text-sm text-gray-400">
          You can attach a checklist template or create checklist items manually
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Checklist Progress</h3>
            <p className="text-sm text-gray-600">
              {completionStats.completed} of {completionStats.total} items completed
            </p>
          </div>
          {completionStats.remaining > 0 && (
            <button
              onClick={handleMarkAllComplete}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
            >
              Mark All Complete
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${completionStats.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-gray-600">{completionStats.percentage}% complete</span>
          {completionStats.required > 0 && (
            <span className="text-red-600 font-medium">
              {completionStats.required} required {completionStats.required === 1 ? 'item' : 'items'} remaining
            </span>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.map((item, index) => {
          const isExpanded = expandedItems.has(item.id);
          const hasNotes = item.notes && item.notes.trim() !== '';
          const hasPhotos = item.photos && item.photos.length > 0;

          return (
            <div
              key={item.id || index}
              className={`bg-white rounded-lg border-2 transition-all ${
                item.completed
                  ? 'border-green-200 bg-green-50'
                  : item.required
                  ? 'border-red-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-green-500 border-green-500'
                        : item.required
                        ? 'border-red-400 hover:border-red-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {item.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {item.text}
                        {item.required && !item.completed && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">Required</span>
                        )}
                      </p>

                      {/* Expand/Collapse */}
                      {(hasNotes || hasPhotos || item.completedAt) && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </div>

                    {/* Completion Info */}
                    {item.completedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed {formatDateTime(item.completedAt)}
                      </p>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                            placeholder="Add notes about this item..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Photos (placeholder) */}
                        {hasPhotos && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Photos</p>
                            <div className="flex gap-2">
                              {item.photos.map((photo, photoIndex) => (
                                <div
                                  key={photoIndex}
                                  className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center"
                                >
                                  <span className="text-2xl">📷</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {completionStats.completed === completionStats.total && completionStats.total > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold">✓ Checklist Complete!</p>
          <p className="text-sm text-green-700 mt-1">All items have been checked off</p>
        </div>
      )}
    </div>
  );
}
