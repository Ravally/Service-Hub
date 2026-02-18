import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatDate, hasPermission } from '../../utils';
import { EXPENSE_CATEGORIES } from '../../constants';

export default function JobActivityCards({ job, userRole, onUpdate, onUploadAttachment, onRemoveAttachment }) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({ title: '', amount: '', note: '', date: '', category: 'other' });
  const [showChemicalForm, setShowChemicalForm] = useState(false);
  const [chemicalDraft, setChemicalDraft] = useState({ date: '', name: '', notes: '' });
  const [notes, setNotes] = useState(job.notes || '');
  const [checklistItem, setChecklistItem] = useState('');

  useEffect(() => {
    setNotes(job.notes || '');
    setShowExpenseForm(false);
    setShowChemicalForm(false);
    setExpenseDraft({ title: '', amount: '', note: '', date: '', category: 'other' });
    setChemicalDraft({ date: '', name: '', notes: '' });
  }, [job]);

  const expenseEntries = useMemo(() => job?.expenses || [], [job]);
  const chemicalTreatments = useMemo(() => job?.chemicalTreatments || [], [job]);

  const handleAddExpense = () => {
    if (!expenseDraft.title && !expenseDraft.amount) return;
    const next = [...(job?.expenses || []), {
      id: `expense_${Date.now()}`,
      title: expenseDraft.title || 'Expense',
      amount: Number(expenseDraft.amount || 0),
      category: expenseDraft.category || 'other',
      note: expenseDraft.note || '',
      date: expenseDraft.date || '',
    }];
    onUpdate(job.id, { expenses: next });
    setExpenseDraft({ title: '', amount: '', note: '', date: '', category: 'other' });
    setShowExpenseForm(false);
  };

  const handleAddChemical = () => {
    if (!chemicalDraft.name) return;
    const next = [...(job?.chemicalTreatments || []), {
      id: `chem_${Date.now()}`,
      date: chemicalDraft.date || '',
      name: chemicalDraft.name,
      notes: chemicalDraft.notes || '',
    }];
    onUpdate(job.id, { chemicalTreatments: next });
    setChemicalDraft({ date: '', name: '', notes: '' });
    setShowChemicalForm(false);
  };

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (!checklistItem.trim()) return;
    onUpdate(job.id, { checklist: [...(job.checklist || []), { text: checklistItem, completed: false }] });
    setChecklistItem('');
  };

  const handleToggleChecklistItem = (index) => {
    const newChecklist = [...(job.checklist || [])];
    newChecklist[index].completed = !newChecklist[index].completed;
    onUpdate(job.id, { checklist: newChecklist });
  };

  return (
    <>
      {/* Expenses */}
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-100">Expenses</h3>
          <button onClick={() => setShowExpenseForm((v) => !v)} className="min-h-[44px] px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-midnight">
            {showExpenseForm ? 'Cancel' : 'New Expense'}
          </button>
        </div>
        {showExpenseForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
            <input value={expenseDraft.title} onChange={(e) => setExpenseDraft({ ...expenseDraft, title: e.target.value })} placeholder="Expense title" className="md:col-span-2 px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
            <input type="number" min="0" value={expenseDraft.amount} onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: e.target.value })} placeholder="Amount" className="px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
            <select value={expenseDraft.category} onChange={(e) => setExpenseDraft({ ...expenseDraft, category: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100">
              {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input type="date" value={expenseDraft.date} onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
            <input value={expenseDraft.note} onChange={(e) => setExpenseDraft({ ...expenseDraft, note: e.target.value })} placeholder="Notes" className="md:col-span-4 px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
            <div className="md:col-span-2 flex justify-end">
              <button onClick={handleAddExpense} className="px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add Expense</button>
            </div>
          </div>
        )}
        {expenseEntries.length === 0 ? (
          <div className="text-sm text-slate-400">Get an accurate picture of job costs by recording expenses.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {expenseEntries.map((expense, idx) => (
              <div key={`${expense.id || idx}`} className="flex items-center justify-between border-b border-slate-700/20 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{expense.title || 'Expense'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400">
                      {EXPENSE_CATEGORIES.find((c) => c.key === expense.category)?.label || 'Other'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{expense.note || ''}</div>
                </div>
                <div className="font-semibold text-slate-100">{formatCurrency(expense.amount || expense.cost || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chemical tracking */}
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-100">Chemical tracking</h3>
          <button onClick={() => setShowChemicalForm((v) => !v)} className="min-h-[44px] px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-midnight">
            {showChemicalForm ? 'Cancel' : 'Record Treatment'}
          </button>
        </div>
        {showChemicalForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <input type="date" value={chemicalDraft.date} onChange={(e) => setChemicalDraft({ ...chemicalDraft, date: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md" />
            <input value={chemicalDraft.name} onChange={(e) => setChemicalDraft({ ...chemicalDraft, name: e.target.value })} placeholder="Chemical name" className="px-3 py-2 border border-slate-700 rounded-md" />
            <input value={chemicalDraft.notes} onChange={(e) => setChemicalDraft({ ...chemicalDraft, notes: e.target.value })} placeholder="Notes" className="md:col-span-2 px-3 py-2 border border-slate-700 rounded-md" />
            <div className="md:col-span-4 flex justify-end">
              <button onClick={handleAddChemical} className="px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add Treatment</button>
            </div>
          </div>
        )}
        {chemicalTreatments.length > 0 ? (
          <div className="space-y-2 text-sm">
            {chemicalTreatments.map((t, idx) => (
              <div key={`${t.date || idx}`} className="flex items-center justify-between border-b pb-2">
                <div className="text-slate-100">{formatDate(t.date)}</div>
                <div className="font-semibold text-slate-100">{t.name || 'Treatment'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No chemical treatments recorded yet.</div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-100 mb-4">Notes</h3>
        <div className="border-2 border-dashed border-slate-700/30 rounded-2xl p-6 text-center">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Leave an internal note for yourself or a team member" className="w-full h-40 bg-transparent text-sm text-slate-100 focus:outline-none" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => setNotes(job.notes || '')} className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-700 text-sm font-semibold text-slate-100 hover:bg-midnight">Cancel</button>
          <button onClick={() => onUpdate(job.id, { notes })} className="min-h-[44px] px-4 py-2 rounded-lg bg-scaffld-teal text-white text-sm font-semibold hover:bg-scaffld-teal/90">Save Job</button>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-100 mb-4">Attachments</h3>
        {hasPermission(userRole, 'job.uploadAttachment') && (
          <div className="flex items-center gap-2 mb-3">
            <label className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-midnight cursor-pointer inline-flex items-center gap-2">
              Upload File
              <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f && onUploadAttachment) onUploadAttachment(f); e.target.value = ''; }} className="hidden" />
            </label>
          </div>
        )}
        {(job.attachments && job.attachments.length > 0) ? (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {job.attachments.map((a, idx) => (
              <li key={idx} className="border rounded-lg overflow-hidden bg-midnight">
                {a.type?.startsWith('image/') ? (
                  <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-400">{a.name}</div>
                )}
                <div className="p-2 flex items-center justify-between">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-700 text-sm hover:underline truncate">{a.name}</a>
                  {hasPermission(userRole, 'job.removeAttachment') && (
                    <button onClick={() => onRemoveAttachment && onRemoveAttachment(a.url)} className="text-xs text-signal-coral hover:text-red-800">Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No attachments yet.</p>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-100 mb-4">Checklist</h3>
        <form onSubmit={handleAddChecklistItem} className="flex gap-2 mb-4">
          <input value={checklistItem} onChange={(e) => setChecklistItem(e.target.value)} placeholder="Add checklist item" className="flex-1 min-h-[44px] px-3 py-2 border border-slate-700 rounded-md text-sm bg-midnight text-slate-100" />
          <button type="submit" className="min-h-[44px] px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add</button>
        </form>
        {(job.checklist && job.checklist.length > 0) ? (
          <ul className="space-y-2">
            {job.checklist.map((item, index) => (
              <li key={index} className="flex items-center gap-3 min-h-[44px] text-sm">
                <input type="checkbox" className="h-5 w-5 shrink-0" checked={item.completed} onChange={() => handleToggleChecklistItem(index)} />
                <span className={item.completed ? 'line-through text-slate-500' : 'text-slate-100'}>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No checklist items yet.</p>
        )}
      </div>
    </>
  );
}
