// src/components/settings/CustomFieldsTab.jsx
import React, { useState } from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';
import { useCustomFieldDefinitions } from '../../hooks/data';
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_ENTITIES } from '../../constants';
import ClampHelpCard from '../clamp/ClampHelpCard';

const emptyForm = { name: '', type: 'text', appliesTo: [], options: [], required: false };

export default function CustomFieldsTab({ userId }) {
  const { definitions, addDefinition, updateDefinition, deleteDefinition } = useCustomFieldDefinitions();
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dropdownInput, setDropdownInput] = useState('');

  const toggleEntity = (entity) => {
    setForm(prev => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(entity)
        ? prev.appliesTo.filter(e => e !== entity)
        : [...prev.appliesTo, entity],
    }));
  };

  const addDropdownOption = () => {
    const trimmed = dropdownInput.trim();
    if (!trimmed || form.options.includes(trimmed)) return;
    setForm(prev => ({ ...prev, options: [...prev.options, trimmed] }));
    setDropdownInput('');
  };

  const removeDropdownOption = (opt) => {
    setForm(prev => ({ ...prev, options: prev.options.filter(o => o !== opt) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (form.appliesTo.length === 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDefinition(editingId, { name: form.name.trim(), type: form.type, appliesTo: form.appliesTo, options: form.options, required: form.required });
      } else {
        await addDefinition(form);
      }
      setForm({ ...emptyForm });
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save custom field:', e);
    }
    setSaving(false);
  };

  const handleEdit = (def) => {
    setEditingId(def.id);
    setForm({ name: def.name, type: def.type, appliesTo: def.appliesTo || [], options: def.options || [], required: !!def.required });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom field definition? Existing data on records will be preserved.')) return;
    try { await deleteDefinition(id); } catch (e) { console.error('Failed to delete:', e); }
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-slate-100">Custom Fields</h2>
      <p className="text-sm text-slate-400 mb-6">Define typed fields that appear on client, property, quote, job, and invoice forms.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Create/Edit Form */}
        <div className={sectionCls}>
          <h3 className={sectionTitle}>{editingId ? 'Edit Field' : 'Create Field'}</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Field Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Pool Size" />
            </div>
            <div>
              <label className={labelCls}>Field Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value, options: e.target.value === 'dropdown' ? prev.options : [] }))}>
                {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Applies To</label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_FIELD_ENTITIES.map(ent => (
                  <button key={ent.value} type="button" onClick={() => toggleEntity(ent.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium min-h-[44px] border transition-colors ${form.appliesTo.includes(ent.value) ? 'bg-scaffld-teal/20 text-scaffld-teal border-scaffld-teal/40' : 'bg-midnight text-slate-400 border-slate-700/30 hover:border-slate-600'}`}>
                    {ent.label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle checked={form.required} onChange={(v) => setForm(prev => ({ ...prev, required: v }))} label="Required field" />

            {form.type === 'dropdown' && (
              <div>
                <label className={labelCls}>Dropdown Options</label>
                <div className="flex gap-2 mb-2">
                  <input className={inputCls + ' flex-1'} value={dropdownInput} onChange={(e) => setDropdownInput(e.target.value)} placeholder="Option name"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDropdownOption(); } }} />
                  <button type="button" onClick={addDropdownOption} className="px-3 py-2 bg-scaffld-teal/20 text-scaffld-teal rounded-md text-sm font-semibold min-h-[44px]">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.options.map(opt => (
                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-midnight rounded-md text-xs text-slate-300 border border-slate-700/30">
                      {opt}
                      <button type="button" onClick={() => removeDropdownOption(opt)} className="text-signal-coral hover:text-signal-coral/80">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || form.appliesTo.length === 0} className={saveBtnCls + ' min-h-[44px]'}>
                {saving ? 'Saving...' : editingId ? 'Update Field' : 'Create Field'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 min-h-[44px]">Cancel</button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Existing Fields List */}
        <div className={sectionCls}>
          <h3 className={sectionTitle}>Existing Fields ({definitions.length})</h3>
          {definitions.length === 0 ? (
            <p className="text-sm text-slate-500">No custom fields defined yet.</p>
          ) : (
            <div className="space-y-3">
              {definitions.map(def => (
                <div key={def.id} className="bg-charcoal rounded-lg border border-slate-700/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-slate-100 truncate">{def.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/20 uppercase">{def.type}</span>
                        {def.required && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-signal-coral/10 text-signal-coral border border-signal-coral/20">Required</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(def.appliesTo || []).map(ent => (
                          <span key={ent} className="px-1.5 py-0.5 rounded text-[10px] bg-midnight text-slate-400 border border-slate-700/30">{ent}</span>
                        ))}
                      </div>
                      {def.type === 'dropdown' && def.options?.length > 0 && (
                        <div className="mt-1.5 text-xs text-slate-500">Options: {def.options.join(', ')}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleEdit(def)} className="text-xs font-semibold text-scaffld-teal hover:text-scaffld-teal/80 min-h-[44px] px-2">Edit</button>
                      <button onClick={() => handleDelete(def.id)} className="text-xs font-semibold text-signal-coral hover:text-signal-coral/80 min-h-[44px] px-2">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClampHelpCard chips={[
        'What custom fields should I create?',
        'Suggest fields for a property maintenance business',
        'How do custom fields work on quotes and invoices?',
      ]} />
    </div>
  );
}
