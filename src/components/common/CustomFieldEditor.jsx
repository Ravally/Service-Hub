// src/components/common/CustomFieldEditor.jsx
import React, { useMemo } from 'react';
import { useCustomFieldDefinitions } from '../../hooks/data';

/**
 * Reusable typed custom field editor for any entity.
 * Renders defined fields from Settings + legacy { key, value } fields.
 */
export default function CustomFieldEditor({ entityType, customFields = [], onChange, disabled = false }) {
  const { getDefinitionsForEntity } = useCustomFieldDefinitions();
  const definitions = getDefinitionsForEntity(entityType);

  const definedEntries = useMemo(() => customFields.filter(cf => cf.fieldId), [customFields]);
  const legacyEntries = useMemo(() => customFields.filter(cf => !cf.fieldId && (cf.key !== undefined || cf.value !== undefined)), [customFields]);

  const updateDefinedField = (fieldId, fieldName, fieldType, newValue) => {
    const existing = definedEntries.find(e => e.fieldId === fieldId);
    let updatedDefined;
    if (existing) {
      updatedDefined = definedEntries.map(e => e.fieldId === fieldId ? { ...e, value: newValue } : e);
    } else {
      updatedDefined = [...definedEntries, { fieldId, fieldName, fieldType, value: newValue }];
    }
    onChange([...updatedDefined, ...legacyEntries]);
  };

  const updateLegacyField = (idx, field, value) => {
    const updated = legacyEntries.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onChange([...definedEntries, ...updated]);
  };

  const removeLegacyField = (idx) => {
    const updated = legacyEntries.filter((_, i) => i !== idx);
    onChange([...definedEntries, ...updated]);
  };

  const addLegacyField = () => {
    onChange([...definedEntries, ...legacyEntries, { key: '', value: '' }]);
  };

  return (
    <div className="space-y-3">
      {/* Defined fields from Settings */}
      {definitions.map(def => {
        const entry = definedEntries.find(e => e.fieldId === def.id);
        const val = entry?.value ?? '';
        return (
          <div key={def.id} className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {def.name}
              {def.required && <span className="text-signal-coral ml-1">*</span>}
            </label>
            {def.type === 'text' && (
              <input
                type="text"
                value={val}
                onChange={(e) => updateDefinedField(def.id, def.name, def.type, e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 focus:border-scaffld-teal focus:outline-none min-h-[44px]"
                placeholder={def.name}
              />
            )}
            {def.type === 'number' && (
              <input
                type="number"
                value={val}
                onChange={(e) => updateDefinedField(def.id, def.name, def.type, e.target.value ? Number(e.target.value) : '')}
                disabled={disabled}
                className="w-full px-3 py-2 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 focus:border-scaffld-teal focus:outline-none min-h-[44px]"
                placeholder={def.name}
              />
            )}
            {def.type === 'date' && (
              <input
                type="date"
                value={val}
                onChange={(e) => updateDefinedField(def.id, def.name, def.type, e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 focus:border-scaffld-teal focus:outline-none min-h-[44px]"
              />
            )}
            {def.type === 'dropdown' && (
              <select
                value={val}
                onChange={(e) => updateDefinedField(def.id, def.name, def.type, e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 focus:border-scaffld-teal focus:outline-none min-h-[44px]"
              >
                <option value="">Select {def.name}</option>
                {(def.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        );
      })}

      {/* Legacy key-value fields */}
      {legacyEntries.length > 0 && definitions.length > 0 && (
        <div className="text-xs text-slate-500 mt-2">Additional fields</div>
      )}
      {legacyEntries.map((field, idx) => (
        <div key={`legacy-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            value={field.key || ''}
            onChange={(e) => updateLegacyField(idx, 'key', e.target.value)}
            placeholder="Field name"
            disabled={disabled}
            className="px-2 py-1 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 min-h-[44px]"
          />
          <input
            value={field.value || ''}
            onChange={(e) => updateLegacyField(idx, 'value', e.target.value)}
            placeholder="Value"
            disabled={disabled}
            className="px-2 py-1 bg-midnight border border-slate-700/30 rounded-md text-sm text-slate-100 min-h-[44px]"
          />
          {!disabled && (
            <button onClick={() => removeLegacyField(idx)} className="text-xs font-semibold text-signal-coral min-h-[44px] px-2">
              Remove
            </button>
          )}
        </div>
      ))}

      {/* Add ad-hoc field button */}
      {!disabled && (
        <button
          type="button"
          onClick={addLegacyField}
          className="text-sm font-semibold text-scaffld-teal hover:text-scaffld-teal/80"
        >
          + Add custom field
        </button>
      )}
    </div>
  );
}
