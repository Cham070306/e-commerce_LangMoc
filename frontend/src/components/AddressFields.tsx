import { useEffect, useState } from 'react';
type Divisions = {code:string;name:string;wards:{code:string;name:string}[]}[];

export function AddressFields({ id, province, ward, onChange, errors = {}, disabled = false }: {
  id: string; province: string; ward: string;
  onChange: (province: string, ward: string) => void;
  errors?: Record<string, string>; disabled?: boolean;
}) {
  const [divisions,setDivisions] = useState<Divisions>([]);
  const [failed,setFailed] = useState(false);
  const load = () => {setFailed(false);import('../data/vietnam-addresses.json').then(m=>setDivisions(m.default)).catch(()=>setFailed(true));};
  useEffect(load,[]);
  if(failed)return <div role="alert">Chưa tải được danh sách địa chỉ. <button type="button" onClick={load}>Thử lại</button></div>;
  const wards = divisions.find(p => p.name === province)?.wards || [];
  return <div className="address-location-fields">
    <div className="c2-form-group"><label className="c2-label" htmlFor={id+'-province'}>Tỉnh / Thành phố *</label>
      <select id={id+'-province'} className="c2-input" value={province} disabled={disabled || !divisions.length} required onChange={e => onChange(e.target.value, '')}>
        <option value="">Chọn tỉnh / thành phố</option>{divisions.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
      </select>{errors.province && <small className="field-error">{errors.province}</small>}
    </div>
    <div className="c2-form-group"><label className="c2-label" htmlFor={id+'-ward'}>Phường / Xã *</label>
      <select id={id+'-ward'} className="c2-input" value={ward} disabled={disabled || !province || !divisions.length} required onChange={e => onChange(province, e.target.value)}>
        <option value="">Chọn phường / xã</option>{wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
      </select>{errors.ward && <small className="field-error">{errors.ward}</small>}
    </div>
  </div>;
}
