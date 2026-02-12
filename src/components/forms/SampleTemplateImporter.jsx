// src/components/forms/SampleTemplateImporter.jsx
import React, { useState } from 'react';
import { useFormTemplates } from '../../hooks/data';
import { allSampleTemplates } from '../../constants/sampleTemplates';
import { TEMPLATE_TYPE_METADATA } from '../../constants/formFieldTypes';

/**
 * Sample Template Importer
 * Allow users to import pre-built industry templates
 */
export default function SampleTemplateImporter({ onClose, onImported }) {
  const { addTemplate, templates } = useFormTemplates();
  const [importing, setImporting] = useState(new Set());
  const [imported, setImported] = useState(new Set());

  // Check if template already exists
  const isTemplateImported = (sampleTemplate) => {
    return templates.some((t) => t.name === sampleTemplate.name);
  };

  // Import a template
  const handleImport = async (sampleTemplate) => {
    setImporting((prev) => new Set(prev).add(sampleTemplate.name));

    try {
      await addTemplate(sampleTemplate);
      setImported((prev) => new Set(prev).add(sampleTemplate.name));

      if (onImported) {
        onImported(sampleTemplate.name);
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      alert(`Failed to import ${sampleTemplate.name}: ${error.message}`);
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(sampleTemplate.name);
        return next;
      });
    }
  };

  // Import all templates
  const handleImportAll = async () => {
    for (const template of allSampleTemplates) {
      if (!isTemplateImported(template) && !imported.has(template.name)) {
        await handleImport(template);
      }
    }
  };

  const allImported = allSampleTemplates.every(
    (t) => isTemplateImported(t) || imported.has(t.name)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Sample Templates</h2>
              <p className="text-sm text-slate-400 mt-1">
                Import pre-built templates to get started quickly
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportAll}
                disabled={allImported}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allImported ? 'All Imported' : 'Import All'}
              </button>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4">
            {allSampleTemplates.map((template) => {
              const metadata = TEMPLATE_TYPE_METADATA[template.type];
              const alreadyImported = isTemplateImported(template);
              const justImported = imported.has(template.name);
              const isImporting = importing.has(template.name);
              const disabled = alreadyImported || justImported || isImporting;

              return (
                <div
                  key={template.name}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    alreadyImported || justImported
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-700/30 bg-charcoal hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-midnight rounded-lg flex items-center justify-center text-2xl">
                      {metadata?.icon || '📋'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-100">{template.name}</h3>
                          <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                        </div>
                        <button
                          onClick={() => handleImport(template)}
                          disabled={disabled}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            alreadyImported || justImported
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : isImporting
                              ? 'bg-midnight text-slate-400 cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isImporting
                            ? 'Importing...'
                            : alreadyImported
                            ? '✓ Already Added'
                            : justImported
                            ? '✓ Imported'
                            : 'Import'}
                        </button>
                      </div>

                      {/* Field Count */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          {metadata?.label || template.type}
                        </span>
                        <span>•</span>
                        <span>{template.fields.length} fields</span>
                      </div>

                      {/* Field Preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.fields.slice(0, 5).map((field, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-midnight text-slate-400 rounded"
                          >
                            {field.label}
                          </span>
                        ))}
                        {template.fields.length > 5 && (
                          <span className="inline-block px-2 py-1 text-xs text-slate-500">
                            +{template.fields.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/30 bg-midnight/60">
          <p className="text-xs text-slate-400 text-center">
            Imported templates can be customized or used as-is
          </p>
        </div>
      </div>
    </div>
  );
}
