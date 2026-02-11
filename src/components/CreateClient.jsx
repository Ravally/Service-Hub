// src/components/CreateClient.jsx
import React, { useEffect, useRef, useState } from 'react';
import { UsersIcon, MapPinIcon } from './icons';

export default function CreateClient({ onBack, onSave, initialClient = null, autoAddProperty = false }) {
  // Primary client fields
  const [client, setClient] = useState({
    title: 'No title',
    firstName: '',
    lastName: '',
    company: '',
    useCompanyPrimary: false,
    leadSource: '',
  });
  // Communication
  const [phones, setPhones] = useState([{ label: 'Main', number: '' }]);
  const [receivesTexts, setReceivesTexts] = useState(false);
  const [emails, setEmails] = useState([{ label: 'Main', address: '' }]);
  // Tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  // Properties (support multiple; first defaults to primary+billing)
  const makeEmptyProperty = () => ({
    uid: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    label: '',
    street1: '', street2: '', city: '', state: '', zip: '', country: 'United States',
    taxRate: 'Default',
    lawnSizeWidth: '',
    lawnSizeLength: '',
    lawnSizeUnit: 'ft',
    accessCode: '',
    lockedGate: false,
    lat: '',
    lng: '',
    isPrimary: false,
    isBilling: false,
    contacts: [], // { role, firstName, lastName, phone, email }
    customFields: [], // { key, value }
  });
  const [properties, setProperties] = useState([{ ...makeEmptyProperty(), isPrimary: true, isBilling: true }]);
  // Additional contacts
  const [contacts, setContacts] = useState([]);
  // Client-level custom fields
  const [customFields, setCustomFields] = useState([]); // { key, value }
  // Communication settings (client)
  const [commOpen, setCommOpen] = useState(false);
  const [commPrefs, setCommPrefs] = useState({
    quoteFollowups: false,
    invoiceFollowups: false,
    visitReminders: false,
    jobFollowups: false,
    askForReview: false,
  });
  // Add-contact modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    role: '', firstName: '', lastName: '', isBilling: false, phone: '', email: '',
    commPrefs: { quoteFollowups: true, invoiceFollowups: true, visitReminders: false, jobFollowups: false }
  });
  // Property contact modal
  const [propContactModal, setPropContactModal] = useState({ open: false, index: -1 });
  const [propContactDraft, setPropContactDraft] = useState({ role:'', firstName:'', lastName:'', phone:'', email:'', isBilling: false });

  // DnD helpers for ordering (primary first)
  const dragTypeRef = useRef(null); // 'phone' | 'email'
  const dragIndexRef = useRef(null);
  const [errors, setErrors] = useState({ phones: '', emails: '' });
  const autoAddedRef = useRef(false);

  // Prefill from initialClient when editing
  useEffect(() => {
    if (!initialClient) return;
    try {
      let first = initialClient.firstName || '';
      let last = initialClient.lastName || '';
      if (!first && !last && initialClient.name) {
        const parts = String(initialClient.name).trim().split(/\s+/);
        first = parts[0] || '';
        last = parts.slice(1).join(' ');
      }
      setClient({
        title: initialClient.title || 'No title',
        firstName: first,
        lastName: last,
        company: initialClient.company || '',
        useCompanyPrimary: false,
        leadSource: initialClient.leadSource || '',
      });
      const phoneArr = Array.isArray(initialClient.phones) && initialClient.phones.length > 0
        ? initialClient.phones.map(p => ({ label: p.label || 'Main', number: p.number || '' }))
        : [{ label: 'Main', number: initialClient.phone || '' }];
      setPhones(phoneArr);
      setReceivesTexts(!!initialClient.receivesTexts);
      const emailArr = Array.isArray(initialClient.emails) && initialClient.emails.length > 0
        ? initialClient.emails.map(e => ({ label: e.label || 'Main', address: e.address || '' }))
        : [{ label: 'Main', address: initialClient.email || '' }];
      setEmails(emailArr);
      setTags(Array.isArray(initialClient.tags) ? initialClient.tags.filter(Boolean) : []);
      if (Array.isArray(initialClient.properties) && initialClient.properties.length > 0) {
        const mapped = initialClient.properties.map((p) => ({
          uid: p.uid || p.id || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          label: p.label || '',
          street1: p.street1 || '', street2: p.street2 || '', city: p.city || '', state: p.state || '', zip: p.zip || '', country: p.country || 'United States',
          taxRate: p.taxRate || 'Default',
          lawnSizeWidth: p.lawnSizeWidth || '',
          lawnSizeLength: p.lawnSizeLength || '',
          lawnSizeUnit: p.lawnSizeUnit || 'ft',
          accessCode: p.accessCode || '',
          lockedGate: !!p.lockedGate,
          lat: p.lat || '',
          lng: p.lng || '',
          isPrimary: !!p.isPrimary,
          isBilling: !!p.isBilling,
          contacts: Array.isArray(p.contacts) ? p.contacts : [],
          customFields: Array.isArray(p.customFields) ? p.customFields : [],
        }));
        setProperties(mapped);
      } else {
        setProperties([{ ...makeEmptyProperty(), isPrimary: true, isBilling: true, street1: initialClient.address || '' }]);
      }
      setContacts(Array.isArray(initialClient.contacts) ? initialClient.contacts : []);
      setCustomFields(Array.isArray(initialClient.customFields) ? initialClient.customFields : []);
      if (initialClient.commPrefs) {
        setCommPrefs({
          quoteFollowups: !!initialClient.commPrefs.quoteFollowups,
          invoiceFollowups: !!initialClient.commPrefs.invoiceFollowups,
          visitReminders: !!initialClient.commPrefs.visitReminders,
          jobFollowups: !!initialClient.commPrefs.jobFollowups,
          askForReview: !!initialClient.commPrefs.askForReview,
        });
      }
    } catch {}
  }, [initialClient]);

  useEffect(() => {
    if (!autoAddProperty || autoAddedRef.current) return;
    autoAddedRef.current = true;
    addProperty();
  }, [autoAddProperty]);

  const addTag = () => {
    const t = (tagInput || '').trim();
    if (!t) return;
    if (!tags.map(x => x.toLowerCase()).includes(t.toLowerCase())) setTags([...tags, t]);
    setTagInput('');
  };
  const removeTag = (i) => setTags(tags.filter((_, idx) => idx !== i));

  const ensureOneMain = (arrSetter, arrValue) => {
    if (!arrValue.some(x => (x.label || '') === 'Main') && arrValue.length > 0) {
      const next = [...arrValue];
      next[0] = { ...next[0], label: 'Main' };
      arrSetter(next);
    }
  };
  const onDragStart = (type, idx) => { dragTypeRef.current = type; dragIndexRef.current = idx; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (type, idx) => {
    const fromType = dragTypeRef.current; const fromIdx = dragIndexRef.current;
    dragTypeRef.current = null; dragIndexRef.current = null;
    if (fromType !== type || fromIdx === null || fromIdx === idx) return;
    if (type === 'phone') {
      const arr = [...phones]; const [moved] = arr.splice(fromIdx, 1); arr.splice(idx, 0, moved); setPhones(arr); ensureOneMain(setPhones, arr);
    } else if (type === 'email') {
      const arr = [...emails]; const [moved] = arr.splice(fromIdx, 1); arr.splice(idx, 0, moved); setEmails(arr); ensureOneMain(setEmails, arr);
    }
  };

  // Property helpers
  const addProperty = () => setProperties(p => [...p, makeEmptyProperty()]);
  const updateProperty = (idx, field, value) => setProperties(prev => prev.map((p,i)=> i===idx ? { ...p, [field]: value } : p));
  const removeProperty = (idx) => {
    if (!window.confirm('Deleting a property will remove linked quotes and jobs. Continue?')) return;
    setProperties(prev => prev.filter((_,i)=>i!==idx));
  };
  const makePrimary = (idx) => setProperties(prev => prev.map((p,i)=> ({ ...p, isPrimary: i===idx })));
  const setBilling = (idx, val) => setProperties(prev => prev.map((p,i)=> {
    if (i === idx) return { ...p, isBilling: val };
    return val ? { ...p, isBilling: false } : p;
  }));

  const addPropertyCustomField = (idx) => setProperties(prev => prev.map((p,i)=> i===idx ? { ...p, customFields: [...(p.customFields||[]), { key:'', value:'' }] } : p));
  const updatePropertyCustomField = (idx, cidx, field, value) => setProperties(prev => prev.map((p,i)=> {
    if (i!==idx) return p; const list = [...(p.customFields||[])]; list[cidx] = { ...list[cidx], [field]: value }; return { ...p, customFields: list };
  }));
  const removePropertyCustomField = (idx, cidx) => setProperties(prev => prev.map((p,i)=> {
    if (i!==idx) return p; const list = [...(p.customFields||[])]; list.splice(cidx,1); return { ...p, customFields: list };
  }));

  const addPropertyContact = (idx, contact) => setProperties(prev => prev.map((p,i)=> {
    if (i !== idx) return p;
    const baseContacts = contact?.isBilling ? (p.contacts || []).map((c) => ({ ...c, isBilling: false })) : (p.contacts || []);
    return { ...p, contacts: [ ...baseContacts, contact ] };
  }));
  const removePropertyContact = (idx, cidx) => setProperties(prev => prev.map((p,i)=> {
    if (i!==idx) return p; const list = [...(p.contacts||[])]; list.splice(cidx,1); return { ...p, contacts: list };
  }));

  // Optional Google Places loader
  const [placesReady, setPlacesReady] = useState(false);
  useEffect(() => {
    const key = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || typeof window === 'undefined' || window.google?.maps?.places) {
      if (window.google?.maps?.places) setPlacesReady(true);
      return;
    }
    const id = 'gmaps-places-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id; s.async = true; s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.onload = () => setPlacesReady(true);
    s.onerror = () => setPlacesReady(false);
    document.head.appendChild(s);
  }, []);

  const acRefs = useRef({});
  const Street1Input = ({ idx, pid, value, onChange }) => {
    const boxRef = useRef(null);
    const [text, setText] = useState(value || '');
    const [open, setOpen] = useState(false);
    const [preds, setPreds] = useState([]);
    const svcRef = useRef(null);
    const detailsRef = useRef(null);
    const tokenRef = useRef(null);
    const debRef = useRef(null);
    const selectingRef = useRef(false);
    const commitBlockUntil = useRef(0);
    const [focused, setFocused] = useState(false);
    // If a parent re-render empties the contentEditable, restore from state
    useEffect(() => {
      const el = boxRef.current;
      if (!el) return;
      const dom = el.textContent || '';
      if (text && !dom) {
        el.textContent = text;
      }
    }, [text]);

    useEffect(() => {
      if (!placesReady || !window.google?.maps?.places) return;
      if (!svcRef.current) svcRef.current = new window.google.maps.places.AutocompleteService();
      if (!detailsRef.current) detailsRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
      tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }, [placesReady]);

    useEffect(() => {
      if (focused) return; // do not override while user is typing
      if (typeof value !== 'string') return;
      // Ignore empty parent updates while local has content (prevents spurious clears)
      if (value === '' && text !== '') return;
      if (value !== text) {
        setText(value);
        if (boxRef.current) boxRef.current.textContent = value || '';
      }
    }, [value, text, focused]);
    const countryEnv = (import.meta.env?.VITE_PLACES_COUNTRY || '').split(',').map(s=>s.trim()).filter(Boolean);

    const fetchPreds = (q) => {
      if (!svcRef.current || !q) { setPreds([]); setOpen(false); return; }
      const req = { input: q, sessionToken: tokenRef.current, types: ['address'] };
      if (countryEnv.length) req.componentRestrictions = { country: countryEnv };
      svcRef.current.getPlacePredictions(req, (results) => {
        setPreds(results || []);
        setOpen(Boolean(results && results.length));
      });
    };

    const selectPred = (p) => {
      if (!detailsRef.current) return;
      detailsRef.current.getDetails({ placeId: p.place_id, fields: ['address_components','formatted_address','geometry'], sessionToken: tokenRef.current }, (place) => {
        const comps = place?.address_components || [];
        const get = (type) => {
          const c = comps.find(x => (x.types||[]).includes(type));
          return c ? c.long_name : '';
        };
        const streetNum = get('street_number');
        const route = get('route');
        const street1 = [streetNum, route].filter(Boolean).join(' ');
        const city = get('locality') || get('sublocality') || get('postal_town');
        const state = get('administrative_area_level_1');
        const zip = get('postal_code');
        const country = get('country') || 'United States';
        // Keep local/DOM in sync and block onBlur commit briefly to avoid overwrite
        setText(street1);
        if (boxRef.current) boxRef.current.textContent = street1;
        // Block any blur commits for a bit longer to avoid races
        commitBlockUntil.current = Date.now() + 800;
        // Update parent first
        onChange(street1);
        updateProperty(idx, 'city', city);
        updateProperty(idx, 'state', state);
        updateProperty(idx, 'zip', zip);
        updateProperty(idx, 'country', country);
        const lat = place?.geometry?.location?.lat?.();
        const lng = place?.geometry?.location?.lng?.();
        if (typeof lat === 'number' && typeof lng === 'number') {
          updateProperty(idx, 'lat', lat.toFixed(6));
          updateProperty(idx, 'lng', lng.toFixed(6));
        }
        setOpen(false); setPreds([]);
        tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        // After React flushes re-renders, ensure DOM reflects the chosen street
        setTimeout(() => {
          if (boxRef.current) {
            boxRef.current.textContent = street1;
            try { boxRef.current.focus(); } catch {}
          }
        }, 0);
      });
    };

    return (
      <div className="relative">
        <div
          ref={boxRef}
          contentEditable
          suppressContentEditableWarning
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          onInput={(e)=>{
            const val = e.currentTarget.textContent || '';
            setText(val);
            if (debRef.current) clearTimeout(debRef.current);
            debRef.current = setTimeout(()=>fetchPreds(val), 140);
          }}
          onFocus={()=>{ setFocused(true); if (text) fetchPreds(text); }}
          onBlur={()=>{
            // Close the list, and commit latest DOM value only if not clicking a suggestion
            setTimeout(()=>setOpen(false), 120);
            if (selectingRef.current) { selectingRef.current = false; return; }
            if (Date.now() < commitBlockUntil.current) { return; }
            const latest = boxRef.current ? (boxRef.current.textContent || '') : text;
            setText(latest);
            onChange(latest);
            setFocused(false);
          }}
          onKeyDown={(e)=>{
            if (e.key==='Enter') { e.preventDefault(); const first = preds?.[0]; if (first) selectPred(first); }
            if (e.key==='Escape') setOpen(false);
          }}
          className="w-full px-3 py-2 border rounded outline-none whitespace-pre-wrap"
          style={{ minHeight: 40 }}
        />
        {(!text) && <div className="pointer-events-none absolute left-3 top-2.5 text-gray-400">Street 1</div>}
        {open && preds.length>0 && (
          <div className="absolute z-[2147483647] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
            {preds.map((p) => (
              <button key={p.place_id} type="button" onMouseDown={(e)=>{ selectingRef.current = true; e.preventDefault(); }} onClick={()=>selectPred(p)} className="block w-full text-left px-3 py-2 hover:bg-gray-50">
                {p.description}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const validateLists = () => {
    let ok = true; const next = { phones: '', emails: '' };
    const cleanPhones = phones.map(p => ({ label: (p.label||'').trim(), number: (p.number||'').trim() })).filter(p => p.label || p.number);
    const cleanEmails = emails.map(e => ({ label: (e.label||'').trim(), address: (e.address||'').trim() })).filter(e => e.label || e.address);
    const phoneMains = cleanPhones.filter(p => p.label === 'Main').length;
    const emailMains = cleanEmails.filter(e => e.label === 'Main').length;
    if (phoneMains > 1) { ok = false; next.phones = 'Only one Main phone is allowed.'; }
    if (emailMains > 1) { ok = false; next.emails = 'Only one Main email is allowed.'; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmail = cleanEmails.find(e => e.address && !emailRe.test(e.address));
    if (invalidEmail) { ok = false; next.emails = next.emails || 'Please enter valid email addresses.'; }
    setErrors(next); return { ok, cleanPhones, cleanEmails };
  };

  const submit = async (e, opts = {}) => {
    e.preventDefault();
    const { ok, cleanPhones, cleanEmails } = validateLists();
    if (!ok) return;
    const displayName = client.useCompanyPrimary && client.company ? client.company : `${client.firstName} ${client.lastName}`.trim();
    const primaryEmail = (cleanEmails[0]?.address || '').trim();
    const primaryPhone = (cleanPhones[0]?.number || '').trim();
    const primaryProp = (properties && properties.find(p => p.isPrimary)) || properties[0] || { street1:'', street2:'', city:'', state:'', zip:'', country:'' };
    const billingProp = (properties && properties.find(p => p.isBilling)) || primaryProp;
    const address = [billingProp.street1, billingProp.street2, [billingProp.city, billingProp.state].filter(Boolean).join(', '), [billingProp.zip, billingProp.country].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const payload = {
      name: displayName,
      title: client.title,
      firstName: client.firstName,
      lastName: client.lastName,
      company: client.company,
      email: primaryEmail,
      phone: primaryPhone,
      receivesTexts,
      phones: cleanPhones,
      emails: cleanEmails,
      address,
      tags,
      contacts,
      leadSource: client.leadSource,
      customFields,
      commPrefs,
      properties,
    };
    if (onSave) {
      await onSave(payload, { createAnother: !!opts.createAnother });
    }
    if (opts.createAnother) {
      // Reset form for the next client
      setClient({ title: 'No title', firstName: '', lastName: '', company: '', useCompanyPrimary: false, leadSource: '' });
      setPhones([{ label: 'Main', number: '' }]);
      setReceivesTexts(false);
      setEmails([{ label: 'Main', address: '' }]);
      setTags([]);
      setTagInput('');
      setProperties([{ ...makeEmptyProperty(), isPrimary: true, isBilling: true }]);
      setContacts([]);
      setCustomFields([]);
      setCommPrefs({ quoteFollowups: false, invoiceFollowups: false, visitReminders: false, jobFollowups: false, askForReview: false });
    }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-blue-700 hover:underline">Back to Clients</button>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{initialClient ? 'Edit Client' : 'New Client'}</h1>

      <form onSubmit={(e)=>submit(e)} autoComplete="off" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client details */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-slate-900 text-white inline-flex items-center justify-center"><UsersIcon className="h-4 w-4" /></span>
            <h2 className="text-lg font-bold">Primary contact details</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <div>
                <label className="text-xs font-semibold text-gray-700">Title</label>
                <select value={client.title} onChange={(e)=>setClient({...client, title:e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option>No title</option>
                  <option>Mr.</option>
                  <option>Mrs.</option>
                  <option>Ms.</option>
                  <option>Miss</option>
                  <option>Dr.</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-gray-700">First name</label>
                <input value={client.firstName} onChange={(e)=>setClient({...client, firstName:e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-gray-700">Last name</label>
                <input value={client.lastName} onChange={(e)=>setClient({...client, lastName:e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-gray-700">Company name</label>
                <input value={client.company} onChange={(e)=>setClient({...client, company:e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Communication</div>
              {/* Phones */}
              {phones.map((p, idx) => (
                <div key={idx} draggable onDragStart={()=>onDragStart('phone', idx)} onDragOver={onDragOver} onDrop={()=>onDrop('phone', idx)} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <select value={p.label} onChange={(e)=>{ const next=[...phones]; next[idx]={...next[idx], label:e.target.value}; setPhones(next); }} className="col-span-3 px-2 py-2 border rounded">
                    <option>Main</option>
                    <option>Work</option>
                    <option>Personal</option>
                    <option>Other</option>
                  </select>
                  <input value={p.number} onChange={(e)=>{ const next=[...phones]; next[idx]={...next[idx], number:e.target.value}; setPhones(next); }} placeholder="Phone number" className="col-span-7 px-3 py-2 border rounded"/>
                  <div className="col-span-2 text-right">
                    {idx === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">Primary</span>
                    ) : (
                      <button type="button" onClick={()=> { const next = phones.filter((_,i)=>i!==idx); setPhones(next); ensureOneMain(setPhones, next); }} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button type="button" onClick={()=>{ const hasMain = phones.some(p=>p.label==='Main'); const next=[...phones,{ label: hasMain ? 'Work' : 'Main', number:'' }]; setPhones(next); }} className="text-xs text-emerald-700 font-semibold">ADD PHONE NUMBER</button>
                <label className="inline-flex items-center text-sm text-gray-700"><input type="checkbox" checked={receivesTexts} onChange={(e)=>setReceivesTexts(e.target.checked)} className="mr-2"/>Receives messages</label>
              </div>
              {errors.phones && <p className="text-xs text-red-600 mt-1">{errors.phones}</p>}

              {/* Emails */}
              <div className="mt-4"/>
              {emails.map((m, idx) => (
                <div key={idx} draggable onDragStart={()=>onDragStart('email', idx)} onDragOver={onDragOver} onDrop={()=>onDrop('email', idx)} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <select value={m.label} onChange={(e)=>{ const next=[...emails]; next[idx]={...next[idx], label:e.target.value}; setEmails(next); }} className="col-span-3 px-2 py-2 border rounded">
                    <option>Main</option>
                    <option>Work</option>
                    <option>Personal</option>
                    <option>Other</option>
                  </select>
                  <input value={m.address} onChange={(e)=>{ const next=[...emails]; next[idx]={...next[idx], address:e.target.value}; setEmails(next); }} placeholder="Email" className="col-span-7 px-3 py-2 border rounded"/>
                  <div className="col-span-2 text-right">
                    {idx === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">Primary</span>
                    ) : (
                      <button type="button" onClick={()=> { const next = emails.filter((_,i)=>i!==idx); setEmails(next); ensureOneMain(setEmails, next); }} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={()=> { const hasMain = emails.some(e => e.label === 'Main'); const next = [...emails, { label: hasMain ? 'Work' : 'Main', address:'' }]; setEmails(next); }} className="mt-2 text-xs text-emerald-700 font-semibold">ADD EMAIL ADDRESS</button>
              {errors.emails && <p className="text-xs text-red-600 mt-1">{errors.emails}</p>}

              <div className="mt-3">
                <button type="button" onClick={()=>setCommOpen(true)} className="text-sm text-emerald-700 font-semibold hover:underline">Communication settings</button>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Lead information</div>
              <select value={client.leadSource} onChange={(e)=>setClient({...client, leadSource:e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="">Lead source</option>
                <option>Google</option>
                <option>Facebook</option>
                <option>Referral</option>
                <option>Website</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Additional client details</div>
                <span className="text-gray-400">▼</span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-xs text-gray-600">Custom fields</div>
                {(customFields||[]).map((f, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input value={f.key} onChange={(e)=>{ const next=[...customFields]; next[idx]={...next[idx], key:e.target.value}; setCustomFields(next); }} placeholder="Field name" className="px-2 py-1 border rounded"/>
                    <input value={f.value} onChange={(e)=>{ const next=[...customFields]; next[idx]={...next[idx], value:e.target.value}; setCustomFields(next); }} placeholder="Value" className="px-2 py-1 border rounded"/>
                  </div>
                ))}
                <button type="button" onClick={()=>setCustomFields([...(customFields||[]), { key:'', value:'' }])} className="text-xs text-emerald-700 font-semibold">Add custom field</button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Additional contacts</div>
                <button type="button" onClick={()=>setContactModalOpen(true)} className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200">Add contact</button>
              </div>
              {(contacts||[]).length === 0 ? (
                <p className="text-xs text-gray-500 mt-1">No additional contacts.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {contacts.map((c, idx) => (
                    <li key={idx} className="border rounded-md p-2 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{c.firstName || c.lastName ? `${c.firstName} ${c.lastName}`.trim() : (c.email || 'Contact')}</div>
                        <div className="text-gray-500 text-xs">{c.role || '—'} {c.isBilling && <span className="ml-1 inline-block px-1 py-0.5 rounded bg-amber-100 text-amber-800">Billing</span>}</div>
                      </div>
                      <button type="button" onClick={()=>setContacts(contacts.filter((_,i)=>i!==idx))} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Tags</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{t}<button type="button" onClick={()=>removeTag(idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={(e)=>setTagInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addTag(); } }} placeholder="Add a tag (e.g., Lead, VIP)" className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                <button type="button" onClick={addTag} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="h-8 w-8 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center"><MapPinIcon className="h-4 w-4" /></span>
              <div>
                <h2 className="text-lg font-bold">Property address</h2>
                <p className="text-xs text-gray-500 max-w-md">Enter the primary service address, billing address, or any additional locations where services may take place.</p>
              </div>
            </div>
            <button type="button" onClick={addProperty} className="px-3 py-2 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200">Add Another Address</button>
          </div>
          <div className="p-4 space-y-6">
            {properties.map((prop, idx) => (
              <div key={prop.uid || idx} className="border rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={prop.label} onChange={(e)=>updateProperty(idx,'label',e.target.value)} placeholder={`Label (e.g., Property ${idx+1})`} className="px-2 py-1 border rounded text-sm"/>
                    {prop.isPrimary && <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700">Primary</span>}
                    {prop.isBilling && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">Billing</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {!prop.isPrimary && <button type="button" onClick={()=>makePrimary(idx)} className="text-blue-700">Make Primary</button>}
                    <button type="button" onClick={()=>removeProperty(idx)} className="text-red-600">Remove</button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Street1Input idx={idx} pid={prop.uid || String(idx)} value={prop.street1} onChange={(v)=>updateProperty(idx,'street1',v)} />
                  <input value={prop.street2} onChange={(e)=>updateProperty(idx,'street2',e.target.value)} placeholder="Street 2" className="w-full px-3 py-2 border rounded"/>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={prop.city} onChange={(e)=>updateProperty(idx,'city',e.target.value)} placeholder="City" className="px-3 py-2 border rounded"/>
                  <input value={prop.state} onChange={(e)=>updateProperty(idx,'state',e.target.value)} placeholder="State/Province" className="px-3 py-2 border rounded"/>
                  <input value={prop.zip} onChange={(e)=>updateProperty(idx,'zip',e.target.value)} placeholder="Postal code" className="px-3 py-2 border rounded"/>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={prop.country} onChange={(e)=>updateProperty(idx,'country',e.target.value)} className="px-3 py-2 border rounded">
                    <option>United States</option>
                    <option>Canada</option>
                    <option>New Zealand</option>
                    <option>Australia</option>
                  </select>
                  <select value={prop.taxRate || 'Default'} onChange={(e)=>updateProperty(idx,'taxRate',e.target.value)} className="px-3 py-2 border rounded">
                    <option value="Default">Sales Tax (Default)</option>
                    <option value="GST 15%">GST (15%)</option>
                    <option value="PST 7%">PST (7%)</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <label className="mt-3 inline-flex items-center text-sm text-gray-700">
                  <input type="checkbox" checked={!!prop.isBilling} onChange={(e)=>setBilling(idx, e.target.checked)} className="mr-2"/>
                  Billing address is the same as property address
                </label>

                <details className="mt-4 border rounded-xl">
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 flex items-center justify-between">
                    Property details
                    <span className="text-gray-400">Expand</span>
                  </summary>
                  <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-gray-600">Lawn Size</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input value={prop.lawnSizeWidth} onChange={(e)=>updateProperty(idx,'lawnSizeWidth',e.target.value)} placeholder="0" className="w-20 px-2 py-1 border rounded"/>
                          <span className="text-gray-400">x</span>
                          <input value={prop.lawnSizeLength} onChange={(e)=>updateProperty(idx,'lawnSizeLength',e.target.value)} placeholder="0" className="w-20 px-2 py-1 border rounded"/>
                          <span className="text-gray-500">{prop.lawnSizeUnit || 'ft'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Access Code</label>
                        <input value={prop.accessCode} onChange={(e)=>updateProperty(idx,'accessCode',e.target.value)} placeholder="Access Code" className="mt-1 w-full px-2 py-1 border rounded"/>
                      </div>
                    </div>
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input type="checkbox" checked={!!prop.lockedGate} onChange={(e)=>updateProperty(idx,'lockedGate',e.target.checked)} className="mr-2"/>
                      Locked gate
                    </label>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-700">Custom fields</div>
                        <button type="button" onClick={()=>addPropertyCustomField(idx)} className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200">Add custom field</button>
                      </div>
                      {(prop.customFields||[]).length === 0 ? (
                        <p className="text-xs text-gray-500 mt-1">No custom fields.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {(prop.customFields||[]).map((cf, cidx) => (
                            <div key={cidx} className="grid grid-cols-2 gap-2 items-center">
                              <input value={cf.key} onChange={(e)=>updatePropertyCustomField(idx,cidx,'key',e.target.value)} placeholder="Field name" className="px-2 py-1 border rounded"/>
                              <div className="flex items-center gap-2">
                                <input value={cf.value} onChange={(e)=>updatePropertyCustomField(idx,cidx,'value',e.target.value)} placeholder="Value" className="flex-1 px-2 py-1 border rounded"/>
                                <button type="button" onClick={()=>removePropertyCustomField(idx,cidx)} className="text-xs text-red-600">Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </details>

                <details className="mt-4 border rounded-xl">
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 flex items-center justify-between">
                    Property contacts
                    <span className="text-gray-400">Expand</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">For contacts with access limited to this property, e.g., tenants.</p>
                      <button type="button" onClick={()=>{ setPropContactDraft({ role:'', firstName:'', lastName:'', phone:'', email:'', isBilling: false }); setPropContactModal({ open:true, index: idx }); }} className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200">Add contact</button>
                    </div>
                    {(prop.contacts||[]).length === 0 ? (
                      <p className="text-xs text-gray-500 mt-3">No property contacts.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {(prop.contacts||[]).map((pc, pidx) => (
                          <li key={pidx} className="border rounded-md p-2 text-sm flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{pc.firstName || pc.lastName ? `${pc.firstName} ${pc.lastName}`.trim() : (pc.email || 'Contact')}</div>
                              <div className="text-gray-500 text-xs">
                                {pc.role || '-'}
                                {pc.isBilling && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">Billing</span>}
                              </div>
                            </div>
                            <button type="button" onClick={()=>removePropertyContact(idx,pidx)} className="text-xs text-red-600">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex items-center justify-between">
          <button type="button" onClick={onBack} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md">Cancel</button>
          <div className="space-x-2">
            {!initialClient && (
              <button type="button" onClick={(e)=>submit(e,{ createAnother:true })} className="px-6 py-2 bg-emerald-100 text-emerald-800 font-semibold rounded-lg shadow-sm hover:bg-emerald-200">Save and Create Another</button>
            )}
            <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">{initialClient ? 'Save changes' : 'Save client'}</button>
          </div>
        </div>
      </form>

      {/* Communication settings modal */}
      {commOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={()=>setCommOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg p-6" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Communication Settings</h3>
            <p className="text-sm text-gray-600 mb-4">Automated communications can be toggled per client.</p>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold">Quotes & Invoices</div>
                <label className="flex items-center justify-between text-sm py-2"><span>Outstanding quote follow-ups</span><input type="checkbox" checked={commPrefs.quoteFollowups} onChange={(e)=>setCommPrefs({...commPrefs, quoteFollowups:e.target.checked})} /></label>
                <label className="flex items-center justify-between text-sm py-2"><span>Overdue invoice follow-ups</span><input type="checkbox" checked={commPrefs.invoiceFollowups} onChange={(e)=>setCommPrefs({...commPrefs, invoiceFollowups:e.target.checked})} /></label>
              </div>
              <div>
                <div className="text-sm font-semibold">Jobs & Visits</div>
                <label className="flex items-center justify-between text-sm py-2"><span>Upcoming assessment or visit reminders</span><input type="checkbox" checked={commPrefs.visitReminders} onChange={(e)=>setCommPrefs({...commPrefs, visitReminders:e.target.checked})} /></label>
                <label className="flex items-center justify-between text-sm py-2"><span>Job closure follow-ups</span><input type="checkbox" checked={commPrefs.jobFollowups} onChange={(e)=>setCommPrefs({...commPrefs, jobFollowups:e.target.checked})} /></label>
              </div>
              <div>
                <div className="text-sm font-semibold">Reviews</div>
                <label className="flex items-center justify-between text-sm py-2"><span>Ask for a review</span><input type="checkbox" checked={commPrefs.askForReview} onChange={(e)=>setCommPrefs({...commPrefs, askForReview:e.target.checked})} /></label>
              </div>
            </div>
            <div className="mt-4 text-right space-x-2">
              <button onClick={()=>setCommOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
              <button onClick={()=>setCommOpen(false)} className="px-4 py-2 bg-green-600 text-white rounded-md">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add contact modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={()=>setContactModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg p-6" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Add contact</h3>
            <div className="space-y-3">
              <input value={contactDraft.role} onChange={(e)=>setContactDraft({...contactDraft, role:e.target.value})} placeholder="Role" className="w-full px-3 py-2 border rounded"/>
              <div className="grid grid-cols-2 gap-2">
                <input value={contactDraft.firstName} onChange={(e)=>setContactDraft({...contactDraft, firstName:e.target.value})} placeholder="First name" className="px-3 py-2 border rounded"/>
                <input value={contactDraft.lastName} onChange={(e)=>setContactDraft({...contactDraft, lastName:e.target.value})} placeholder="Last name" className="px-3 py-2 border rounded"/>
              </div>
              <label className="inline-flex items-center text-sm text-gray-700"><input type="checkbox" checked={contactDraft.isBilling} onChange={(e)=>setContactDraft({...contactDraft, isBilling:e.target.checked})} className="mr-2"/>Set as billing contact</label>
              <input value={contactDraft.phone} onChange={(e)=>setContactDraft({...contactDraft, phone:e.target.value})} placeholder="Phone number" className="w-full px-3 py-2 border rounded"/>
              <input value={contactDraft.email} onChange={(e)=>setContactDraft({...contactDraft, email:e.target.value})} placeholder="Email" className="w-full px-3 py-2 border rounded"/>

              <div className="mt-2">
                <div className="text-sm font-semibold mb-1">Communication settings</div>
                <label className="flex items-center justify-between text-sm py-2"><span>Outstanding quote follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.quoteFollowups} onChange={(e)=>setContactDraft({...contactDraft, commPrefs:{...contactDraft.commPrefs, quoteFollowups:e.target.checked}})} /></label>
                <label className="flex items-center justify-between text-sm py-2"><span>Overdue invoice follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.invoiceFollowups} onChange={(e)=>setContactDraft({...contactDraft, commPrefs:{...contactDraft.commPrefs, invoiceFollowups:e.target.checked}})} /></label>
                <label className="flex items-center justify-between text-sm py-2"><span>Upcoming assessment or visit reminders</span><input type="checkbox" checked={contactDraft.commPrefs.visitReminders} onChange={(e)=>setContactDraft({...contactDraft, commPrefs:{...contactDraft.commPrefs, visitReminders:e.target.checked}})} /></label>
                <label className="flex items-center justify-between text-sm py-2"><span>Job closure follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.jobFollowups} onChange={(e)=>setContactDraft({...contactDraft, commPrefs:{...contactDraft.commPrefs, jobFollowups:e.target.checked}})} /></label>
              </div>
            </div>
            <div className="mt-4 text-right space-x-2">
              <button onClick={()=>setContactModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
              <button onClick={()=>{ setContacts([...(contacts||[]), contactDraft]); setContactDraft({ role:'', firstName:'', lastName:'', isBilling:false, phone:'', email:'', commPrefs:{ quoteFollowups:true, invoiceFollowups:true, visitReminders:false, jobFollowups:false } }); setContactModalOpen(false); }} className="px-4 py-2 bg-green-600 text-white rounded-md">Add contact</button>
            </div>
          </div>
        </div>
      )}

      {/* Property contact modal */}
      {propContactModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={()=>setPropContactModal({ open:false, index:-1 })}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg p-6" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Add property contact</h3>
            <div className="space-y-3">
              <input value={propContactDraft.role} onChange={(e)=>setPropContactDraft({...propContactDraft, role:e.target.value})} placeholder="Role" className="w-full px-3 py-2 border rounded"/>
              <div className="grid grid-cols-2 gap-2">
                <input value={propContactDraft.firstName} onChange={(e)=>setPropContactDraft({...propContactDraft, firstName:e.target.value})} placeholder="First name" className="px-3 py-2 border rounded"/>
                <input value={propContactDraft.lastName} onChange={(e)=>setPropContactDraft({...propContactDraft, lastName:e.target.value})} placeholder="Last name" className="px-3 py-2 border rounded"/>
              </div>
              <label className="inline-flex items-center text-sm text-gray-700">
                <input type="checkbox" checked={!!propContactDraft.isBilling} onChange={(e)=>setPropContactDraft({...propContactDraft, isBilling:e.target.checked})} className="mr-2"/>
                Set as billing contact
              </label>
              <input value={propContactDraft.phone} onChange={(e)=>setPropContactDraft({...propContactDraft, phone:e.target.value})} placeholder="Phone number" className="w-full px-3 py-2 border rounded"/>
              <input value={propContactDraft.email} onChange={(e)=>setPropContactDraft({...propContactDraft, email:e.target.value})} placeholder="Email" className="w-full px-3 py-2 border rounded"/>
            </div>
            <div className="mt-4 text-right space-x-2">
              <button onClick={()=>setPropContactModal({ open:false, index:-1 })} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
              <button onClick={()=>{ if (propContactModal.index>-1) { addPropertyContact(propContactModal.index, propContactDraft); } setPropContactModal({ open:false, index:-1 }); }} className="px-4 py-2 bg-green-600 text-white rounded-md">Add contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
