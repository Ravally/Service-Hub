import React, { useRef, useState, useEffect } from 'react';

export default function Street1Input({ idx, value, onChange, updateProperty, placesReady }) {
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

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const dom = el.textContent || '';
    if (text && !dom) el.textContent = text;
  }, [text]);

  useEffect(() => {
    if (!placesReady || !window.google?.maps?.places) return;
    if (!svcRef.current) svcRef.current = new window.google.maps.places.AutocompleteService();
    if (!detailsRef.current) detailsRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  }, [placesReady]);

  useEffect(() => {
    if (focused) return;
    if (typeof value !== 'string') return;
    if (value === '' && text !== '') return;
    if (value !== text) {
      setText(value);
      if (boxRef.current) boxRef.current.textContent = value || '';
    }
  }, [value, text, focused]);

  const countryEnv = (import.meta.env?.VITE_PLACES_COUNTRY || '').split(',').map(s => s.trim()).filter(Boolean);

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
    detailsRef.current.getDetails({ placeId: p.place_id, fields: ['address_components', 'formatted_address', 'geometry'], sessionToken: tokenRef.current }, (place) => {
      const comps = place?.address_components || [];
      const get = (type) => { const c = comps.find(x => (x.types || []).includes(type)); return c ? c.long_name : ''; };
      const streetNum = get('street_number');
      const route = get('route');
      const street1 = [streetNum, route].filter(Boolean).join(' ');
      const city = get('locality') || get('sublocality') || get('postal_town');
      const state = get('administrative_area_level_1');
      const zip = get('postal_code');
      const country = get('country') || 'United States';
      setText(street1);
      if (boxRef.current) boxRef.current.textContent = street1;
      commitBlockUntil.current = Date.now() + 800;
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
      setTimeout(() => { if (boxRef.current) { boxRef.current.textContent = street1; try { boxRef.current.focus(); } catch {} } }, 0);
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
        onInput={(e) => {
          const val = e.currentTarget.textContent || '';
          setText(val);
          if (debRef.current) clearTimeout(debRef.current);
          debRef.current = setTimeout(() => fetchPreds(val), 140);
        }}
        onFocus={() => { setFocused(true); if (text) fetchPreds(text); }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          if (selectingRef.current) { selectingRef.current = false; return; }
          if (Date.now() < commitBlockUntil.current) return;
          const latest = boxRef.current ? (boxRef.current.textContent || '') : text;
          setText(latest);
          onChange(latest);
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); const first = preds?.[0]; if (first) selectPred(first); }
          if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full px-3 py-2 border rounded outline-none whitespace-pre-wrap"
        style={{ minHeight: 40 }}
      />
      {(!text) && <div className="pointer-events-none absolute left-3 top-2.5 text-slate-500">Street 1</div>}
      {open && preds.length > 0 && (
        <div className="absolute z-[2147483647] left-0 right-0 mt-1 bg-charcoal border border-slate-700/30 rounded-md shadow-lg max-h-64 overflow-auto">
          {preds.map((p) => (
            <button key={p.place_id} type="button" onMouseDown={(e) => { selectingRef.current = true; e.preventDefault(); }} onClick={() => selectPred(p)} className="block w-full text-left px-3 py-2 hover:bg-midnight/60">
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
