import { useEffect, useMemo, useState } from 'react';
import { Search, Leaf, Heart, Users, Building2, Plus, Settings, X, LogIn, LogOut, Download, MapPin, Mail, Pencil, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';

type Contact = {
  id: string; name: string; english_name: string; department: string;
  title: string; extension: string; location: string; email: string; remark: string; custom_fields?: Record<string, string>;
};
const LOCAL_KEY = 'office-local-contacts';
const ADMIN_EMAIL = 'japanfrog2215@gmail.com';
const departments = ['行政部','人事部','財務部','市場部','資訊科技部','客戶服務部','營運部','其他'];
const emptyContact: Omit<Contact, 'id'> = { name:'', english_name:'', department:'', title:'', extension:'', location:'', email:'', remark:'', custom_fields:{} };
const DEFAULT_FIELD_LABELS: Record<string,string> = { name:'標題', english_name:'姓名', department:'部門', title:'職位', extension:'重點事項', location:'辦公室位置', email:'電郵', remark:'Remark' };
type CustomField = { key: string; label: string };

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } });
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('全部部門');
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('office-favorites') || '[]'));
  const [showFavorites, setShowFavorites] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyContact);
  const [fieldLabels, setFieldLabels] = useState<Record<string,string>>(DEFAULT_FIELD_LABELS);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const [heroText, setHeroText] = useState(() => { try { return JSON.parse(localStorage.getItem('office-hero-text') || '{"eyebrow":"","title":"","description":"","fontSize":32,"position":"left"}'); } catch { return { eyebrow:'', title:'', description:'', fontSize:32, position:'left' }; } });
  async function saveHeroText() {
    if (!session) { setNotice('請先以管理員登入，才能儲存首頁設定'); return; }
    const savedAt = new Date().toISOString();
    localStorage.setItem('office-hero-text', JSON.stringify({ ...heroText, _savedAt: savedAt }));
    if (!supabase) {
      setHeroEditorOpen(false);
      setNotice('首頁文字已儲存至此裝置');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('app_settings').upsert(
      { key: 'homepage_hero', value: heroText, updated_at: savedAt },
      { onConflict: 'key' }
    );
    setBusy(false);
    setHeroEditorOpen(false);
    if (error) setNotice('本機已保存；雲端同步失敗：' + error.message);
    else setNotice('首頁文字已儲存至雲端');
  }

  async function loadContacts() {
    if (!supabase) return;
    const { data, error } = await supabase.from('contacts').select('*').order('department').order('name');
    if (error) setNotice('讀取資料失敗：' + error.message);
    else { const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as Contact[]; setContacts([...local, ...((data || []) as Contact[])]); }
  }
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    client.auth.getSession().then(async ({ data }) => {
      if (data.session?.user.email?.toLowerCase() === ADMIN_EMAIL) setSession(data.session);
      else if (data.session) await client.auth.signOut();
    });
    const { data: listener } = client.auth.onAuthStateChange(async (_event, next) => {
      if (!next || next.user.email?.toLowerCase() === ADMIN_EMAIL) setSession(next);
      else { setSession(null); await client.auth.signOut(); }
    });
    loadContacts();
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    async function loadHeroSettings() {
      if (!supabase) return;
      const { data, error } = await supabase.from('app_settings').select('value, updated_at').eq('key', 'homepage_hero').maybeSingle();
      if (!active) return;
      if (!error && data?.value) {
        const defaults = { eyebrow:'', title:'', description:'', fontSize:32, position:'left' };
        const remote = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        let local: any = null;
        try { local = JSON.parse(localStorage.getItem('office-hero-text') || 'null'); } catch { local = null; }
        const localTime = local?._savedAt ? new Date(local._savedAt).getTime() : 0;
        const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
        const chosen = local && localTime > remoteTime ? local : remote;
        const merged = { ...defaults, ...chosen };
        delete (merged as any)._savedAt;
        setHeroText(merged);
        localStorage.setItem('office-hero-text', JSON.stringify({ ...merged, _savedAt: chosen._savedAt || data.updated_at || new Date().toISOString() }));
      }
    }
    loadHeroSettings();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    async function loadFieldSettings() {
      if (!supabase) return;
      const { data, error } = await supabase.from('app_settings').select('value').eq('key','contact_field_settings').maybeSingle();
      if (!active || error || !data?.value) return;
      const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      setFieldLabels({ ...DEFAULT_FIELD_LABELS, ...(value.labels || {}) });
      setCustomFieldDefs(Array.isArray(value.customFields) ? value.customFields : []);
    }
    loadFieldSettings();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    async function loadSharedFavorites() {
      if (!supabase) {
        try { setFavorites(JSON.parse(localStorage.getItem('office-favorites') || '[]')); } catch { setFavorites([]); }
        return;
      }
      const { data, error } = await supabase.from('shared_favorites').select('contact_id');
      if (!active) return;
      if (error) {
        setNotice('讀取共用最愛失敗：' + error.message + '。請先建立 shared_favorites 資料表。');
        return;
      }
      setFavorites((data || []).map(row => String(row.contact_id)));
    }
    loadSharedFavorites();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => contacts.filter(c => {
    const matchesDepartment = department === '全部部門' || c.department === department;
    const matchesFavorite = !showFavorites || favorites.includes(c.id);
    const q = query.trim().toLocaleLowerCase();
    const matchesQuery = !q || [c.name,c.english_name,c.department,c.title,c.extension,c.email,c.location,c.remark,...Object.values(c.custom_fields || {})].some(v => (v || '').toLocaleLowerCase().includes(q));
    return matchesDepartment && matchesFavorite && matchesQuery;
  }).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))), [contacts, department, query, showFavorites, favorites]);

  function startAdd() { setEditing(null); setForm(emptyContact); setCustomValues({}); setAddOpen(true); }
  function startEdit(c: Contact) {
    setEditing(c);
    const { id, custom_fields, ...rest } = c;
    setForm({ ...emptyContact, ...rest });
    setCustomValues(custom_fields || {});
    setAddOpen(true);
  }
  async function saveFieldSettings() {
    if (!session || !supabase) { setNotice('只有管理員可以儲存欄位設定'); return; }
    setBusy(true);
    const { error } = await supabase.from('app_settings').upsert({ key:'contact_field_settings', value:{ labels:fieldLabels, customFields:customFieldDefs }, updated_at:new Date().toISOString() }, { onConflict:'key' });
    setBusy(false);
    if (error) setNotice('欄位設定儲存失敗：' + error.message);
    else setNotice('欄位設定已同步至所有使用者');
  }
  async function toggleFavorite(id: string) {
    const isFavorite = favorites.includes(id);
    if (!supabase) {
      const next = isFavorite ? favorites.filter(x => x !== id) : [...favorites, id];
      setFavorites(next);
      localStorage.setItem('office-favorites', JSON.stringify(next));
      return;
    }
    const result = isFavorite
      ? await supabase.from('shared_favorites').delete().eq('contact_id', id)
      : await supabase.from('shared_favorites').insert({ contact_id: id });
    if (result.error && !( !isFavorite && result.error.code === '23505')) {
      setNotice('更新共用最愛失敗：' + result.error.message);
      return;
    }
    setFavorites(old => isFavorite ? old.filter(x => x !== id) : old.includes(id) ? old : [...old, id]);
  }
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase) return;
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    if (email !== ADMIN_EMAIL) { setNotice('此電郵並非指定管理員帳戶'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: String(data.get('password')) });
    setBusy(false); setNotice(error ? '登入失敗：' + error.message : '管理員登入成功');
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setAdminOpen(false); }
  async function saveContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const payload = { ...form, custom_fields: customValues };
    if (editing?.id.startsWith('local-') || (!supabase && !editing)) { const current = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as Contact[]; const local = editing?.id.startsWith('local-') ? current.map(c => c.id === editing.id ? { ...payload, id: editing.id } : c) : [{ ...payload, id: 'local-' + Date.now().toString(36) }, ...current]; localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); setContacts(old => [...local.filter(c => !old.some(o => o.id === c.id)), ...old.filter(c => !c.id.startsWith('local-'))]); setBusy(false); setNotice('已儲存至此裝置（尚未連接共用資料庫）'); setAddOpen(false); setEditing(null); return; }
    if (!supabase) { setBusy(false); setNotice('資料庫尚未設定'); return; }
    const result = editing ? await supabase.from('contacts').update(payload).eq('id', editing.id) : await supabase.from('contacts').insert(payload);
    setBusy(false);
    if (result.error) setNotice('儲存失敗：' + result.error.message);
    else { setNotice('資料已儲存並同步'); setAddOpen(false); setAdminOpen(false); setEditing(null); await loadContacts(); }
  }
  async function importLocalContacts() {
    if (!supabase) { setNotice('共用資料庫尚未連接'); return; }
    let local: Contact[];
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (!Array.isArray(parsed)) throw new Error('資料格式不正確');
      local = parsed;
    } catch {
      setNotice('本機舊資料格式無法讀取，原始資料沒有被更改');
      return;
    }
    if (!local.length) { setNotice('這個瀏覽器沒有找到可匯入的舊資料'); return; }
    setBusy(true);
    const { data: remote, error: readError } = await supabase.from('contacts').select('name,department,extension,email');
    if (readError) { setBusy(false); setNotice('檢查共用資料庫失敗：' + readError.message); return; }
    const makeKey = (c: any) => [c.name,c.department,c.extension,c.email].map(v => String(v || '').trim().toLowerCase()).join('|');
    const existing = new Set((remote || []).map(makeKey));
    const pending = local.filter(c => c && String(c.name || '').trim() && !existing.has(makeKey(c)));
    if (!pending.length) { setBusy(false); setNotice('舊資料已存在共用資料庫，沒有重複匯入'); await loadContacts(); return; }
    const rows = pending.map(c => ({
      name: String(c.name || ''), english_name: String(c.english_name || ''),
      department: String(c.department || ''), title: String(c.title || ''),
      extension: String(c.extension || ''), location: String(c.location || ''),
      email: String(c.email || ''), remark: String(c.remark || '')
    }));
    const { error } = await supabase.from('contacts').insert(rows);
    setBusy(false);
    if (error) { setNotice('匯入失敗：' + error.message + '。本機舊資料仍完整保留。'); return; }
    await loadContacts();
    setNotice('成功匯入 ' + rows.length + ' 筆舊資料；本機備份仍然保留');
  }
  async function deleteContact(id: string) {
    if (!window.confirm('確定刪除此通訊資料？')) return;
    if (id.startsWith('local-')) { const local = (JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as Contact[]).filter(c => c.id !== id); localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); setContacts(old => old.filter(c => c.id !== id)); setNotice('資料已刪除'); return; }
    if (!supabase || !session) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) setNotice('刪除失敗：' + error.message); else { setNotice('資料已刪除'); await loadContacts(); }
  }
  function exportCsv() {
    const headers = ['姓名','英文姓名','部門','職位','內線','位置','電郵','Remark'];
    const rows = contacts.map(c => [c.name,c.english_name,c.department,c.title,c.extension,c.location,c.email,c.remark]);
    const csv = [headers, ...rows].map(row => row.map(v => '"' + String(v || '').replace(/"/g,'""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'office-directory.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Leaf size={20}/></span><span>Smart Office <b>Directory</b></span></a>
      <button className="add-button" onClick={startAdd}><Plus size={17}/>新增</button><button className="icon-button" onClick={() => setAdminOpen(true)} aria-label="管理員登入"><Settings size={19}/></button>
    </header>
    <main>
      <section className="hero">
        <div className="hero-copy" style={{textAlign:heroText.position as any}}>{heroText.eyebrow && <div className="eyebrow">{heroText.eyebrow}</div>}{heroText.title && <h1 style={{fontSize:heroText.fontSize+'px',whiteSpace:'pre-wrap'}}>{heroText.title}</h1>}{heroText.description && <p>{heroText.description}</p>}{session && <button className="hero-edit-button" onClick={()=>setHeroEditorOpen(v=>!v)}>{heroEditorOpen?'收起文字設定':'自訂首頁文字'}</button>}</div>
        <div className="hero-art" aria-label="森林與小屋插畫"><div className="sun"></div><div className="hill hill-back"></div><div className="hill hill-front"></div><div className="tree tree-one">♣</div><div className="tree tree-two">♣</div><div className="cottage"><div className="roof"></div><div className="house"><span></span><i></i></div></div><div className="flower flower-one">✿</div><div className="flower flower-two">✿</div></div>
      </section>
      <section className="directory-panel">
        <div className="section-heading"><div><span className="eyebrow">FIND YOUR PEOPLE</span><h2>同事通訊錄</h2></div><span className="count-pill"><Users size={14}/>{contacts.length} 位同事</span></div>
        <label className="search-box"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋姓名、部門、職位或內線號碼…"/>{query && <button onClick={()=>setQuery('')}><X size={17}/></button>}</label>
        <div className="toolbar"><div className="department-select"><Building2 size={16}/><select value={department} onChange={e=>setDepartment(e.target.value)}><option>全部部門</option>{departments.map(d=><option key={d}>{d}</option>)}</select></div><button className={showFavorites?'filter-chip active':'filter-chip'} onClick={()=>setShowFavorites(v=>!v)}><Heart size={15} fill={showFavorites?'currentColor':'none'}/> 我的最愛</button></div>
        <div className="results-label"><span>{showFavorites?'收藏的同事':'搜尋結果'}</span><span>{filtered.length} 個結果</span></div>
        {filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Leaf size={25}/></div><h3>{contacts.length===0?'電話簿正在等待第一位同事':'沒有找到符合的同事'}</h3><p>{contacts.length===0?'任何人都可以新增第一位同事。':'試試其他關鍵字，或切換部門篩選。'}</p></div> :
          <div className="contact-grid">{filtered.map(c=><article className="contact-card" key={c.id}><div className="avatar">{c.name.slice(0,1)}</div><div className="contact-main"><div className="contact-name">{c.name}</div><div className="contact-en">{c.english_name}</div><div className="contact-role">{c.department} · {c.title}</div><div className="contact-meta">{c.location && <span><MapPin size={13}/>{c.location}</span>}{c.email && <span className="contact-email"><Mail size={13}/>{c.email}</span>}{c.remark && <span className="contact-remark">{c.remark}</span>}{Object.entries(c.custom_fields || {}).filter(([,v])=>v).map(([key,value])=><span className="contact-remark" key={key}>{customFieldDefs.find(f=>f.key===key)?.label || key}：{value}</span>)}</div></div><div className="contact-actions"><button className="favorite-button" onClick={()=>toggleFavorite(c.id)} aria-label="收藏"><Heart size={17} fill={favorites.includes(c.id)?'currentColor':'none'}/></button><div className="extension">{c.extension || '—'}</div><div className="admin-actions"><button onClick={()=>startEdit(c)} aria-label="修改資料" title="修改資料"><Pencil size={14}/></button>{(session || c.id.startsWith('local-')) && <button onClick={()=>deleteContact(c.id)} aria-label="刪除資料" title="刪除資料"><Trash2 size={14}/></button>}</div></div></article>)}</div>}
        <div className="panel-footer"><span><Leaf size={14}/> Simple · Fresh · Connected</span><div><button onClick={importLocalContacts} disabled={busy}><Download size={14}/> {busy?'處理中…':'匯入本機舊資料'}</button><button onClick={exportCsv}><Download size={14}/> 匯出 CSV</button></div></div>
      </section>
      <footer>用一點自然的溫度，連繫每一個工作日。</footer>
    </main>
    {session && heroEditorOpen && <div className="hero-editor"><div className="hero-editor-title">首頁文字設定</div><label>上方小標題<input value={heroText.eyebrow} onChange={e=>setHeroText({...heroText,eyebrow:e.target.value})} placeholder="自行輸入文字（可留空）"/></label><label>主標題<textarea rows={2} value={heroText.title} onChange={e=>setHeroText({...heroText,title:e.target.value})} placeholder="輸入首頁主標題"/></label><label>補充文字<textarea rows={2} value={heroText.description} onChange={e=>setHeroText({...heroText,description:e.target.value})} placeholder="輸入補充說明"/></label><div className="hero-editor-options"><label>主標題字體大小（px）<input type="number" min="12" max="64" value={heroText.fontSize} onChange={e=>setHeroText({...heroText,fontSize:Math.max(12,Math.min(64,Number(e.target.value)||12))})}/></label><label>文字位置<select value={heroText.position} onChange={e=>setHeroText({...heroText,position:e.target.value})}><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select></label></div><div className="hero-editor-actions"><button type="button" onClick={()=>{setHeroText({eyebrow:'',title:'',description:'',fontSize:32,position:'left'});localStorage.removeItem('office-hero-text');setHeroEditorOpen(false);}}>清空</button><button type="button" onClick={saveHeroText} disabled={busy}>{busy?'儲存中…':'儲存設定'}</button></div></div>}
    {notice && <div className="toast" onClick={()=>setNotice('')}>{notice}<button><X size={14}/></button></div>}
    {addOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAddOpen(false)}}><section className="modal"><div className="modal-head"><div><span className="eyebrow">NEW CONTACT</span><h2>{editing ? '編輯通訊資料' : '新增通訊資料'}</h2></div><button className="icon-button" onClick={()=>setAddOpen(false)}><X/></button></div><form className="admin-form" onSubmit={saveContact}><div className="form-grid"><label>{fieldLabels.name}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>{fieldLabels.english_name}<textarea rows={1} value={form.english_name} onChange={e=>setForm({...form,english_name:e.target.value})}/></label><label>{fieldLabels.department}<textarea rows={1} value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="自行輸入部門"/></label><label>{fieldLabels.title}<textarea rows={1} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>{fieldLabels.extension}<textarea rows={1} value={form.extension} onChange={e=>setForm({...form,extension:e.target.value})}/></label><label>{fieldLabels.location}<textarea rows={1} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>{fieldLabels.email}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>{fieldLabels.remark}<textarea rows={1} value={form.remark} onChange={e=>setForm({...form,remark:e.target.value})} placeholder="備註"/></label>{customFieldDefs.map(field=><label key={field.key}>{field.label}<textarea rows={1} value={customValues[field.key] || ''} onChange={e=>setCustomValues(old=>({...old,[field.key]:e.target.value}))}/></label>)}</div><button className="primary-button" disabled={busy}><Plus size={16}/>{busy?'儲存中…':'儲存通訊資料'}</button></form></section></div>}
    {adminOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAdminOpen(false)}}>
      <section className="modal"><div className="modal-head"><div><span className="eyebrow">ADMINISTRATION</span><h2>管理員中心</h2></div><button className="icon-button" onClick={()=>setAdminOpen(false)}><X/></button></div>
        {!isSupabaseConfigured ? <div className="setup-message"><Settings size={24}/><h3>尚未連接資料庫</h3><p>請先建立 Supabase 專案，並在部署環境設定 VITE_SUPABASE_URL 及 VITE_SUPABASE_ANON_KEY。完成後即可使用管理員登入及員工資料管理。</p></div> :
        !session ? <form className="admin-form" onSubmit={signIn}><p>請使用管理員帳戶登入。帳戶需先在 Supabase Authentication 建立。</p><label>管理員電郵<input name="email" type="email" required placeholder="admin@company.com"/></label><label>密碼<input name="password" type="password" required placeholder="輸入密碼"/></label><button className="primary-button" disabled={busy}><LogIn size={16}/>{busy?'登入中…':'管理員登入'}</button></form> :
        <><div className="signed-in"><span>已登入管理員</span><button onClick={signOut}><LogOut size={15}/> 登出</button></div><section className="admin-form"><h3>新增通訊資料欄位設定</h3><p>修改欄位名稱後，所有使用者的新增表單會同步更新。</p><div className="form-grid">{Object.entries(fieldLabels).map(([key,label])=><label key={key}>{label}<input value={label} onChange={e=>setFieldLabels(old=>({...old,[key]:e.target.value}))}/></label>)}</div>{customFieldDefs.map((field,index)=><label key={field.key}>自訂欄位<input value={field.label} onChange={e=>setCustomFieldDefs(old=>old.map((f,i)=>i===index?{...f,label:e.target.value}:f))}/><button type="button" onClick={()=>setCustomFieldDefs(old=>old.filter(f=>f.key!==field.key))}>刪除此欄位</button></label>)}<button type="button" className="primary-button" onClick={()=>setCustomFieldDefs(old=>[...old,{key:'custom_'+Date.now().toString(36),label:'新欄位'}])}><Plus size={15}/> 增加欄位</button><button type="button" className="primary-button" onClick={saveFieldSettings} disabled={busy}>儲存欄位設定</button></section><form className="admin-form" onSubmit={saveContact}><h3>{editing?'編輯員工資料':'新增員工'}</h3><div className="form-grid">
          <label>{fieldLabels.name}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>{fieldLabels.english_name}<textarea rows={1} value={form.english_name} onChange={e=>setForm({...form,english_name:e.target.value})}/></label><label>{fieldLabels.department}<textarea rows={1} value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="自行輸入部門"/></label><label>{fieldLabels.title}<textarea rows={1} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>{fieldLabels.extension}<textarea rows={1} value={form.extension} onChange={e=>setForm({...form,extension:e.target.value})}/></label><label>{fieldLabels.location}<textarea rows={1} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>{fieldLabels.email}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>{fieldLabels.remark}<textarea rows={1} value={form.remark} onChange={e=>setForm({...form,remark:e.target.value})} placeholder="備註"/></label>{customFieldDefs.map(field=><label key={field.key}>{field.label}<textarea rows={1} value={customValues[field.key] || ''} onChange={e=>setCustomValues(old=>({...old,[field.key]:e.target.value}))}/></label>)}
        </div><button className="primary-button" disabled={busy}><Plus size={16}/>{busy?'儲存中…':'儲存員工資料'}</button></form></>}
      </section>
    </div>}
  </div>;
}
