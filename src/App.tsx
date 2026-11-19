import { useEffect, useMemo, useState } from 'react';
import { Search, Leaf, Phone, Heart, Users, Building2, Plus, Settings, X, LogIn, LogOut, Download, Sprout, MapPin, Mail, Pencil, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';

type Contact = {
  id: string; name: string; english_name: string; department: string;
  title: string; extension: string; direct_phone: string; location: string; email: string;
};
const departments = ['行政部','人事部','財務部','市場部','資訊科技部','客戶服務部','營運部','其他'];
const emptyContact: Omit<Contact, 'id'> = { name:'', english_name:'', department:departments[0], title:'', extension:'', direct_phone:'', location:'', email:'' };

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('全部部門');
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('office-favorites') || '[]'));
  const [showFavorites, setShowFavorites] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyContact);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadContacts() {
    if (!supabase) return;
    const { data, error } = await supabase.from('contacts').select('*').order('department').order('name');
    if (error) setNotice('讀取資料失敗：' + error.message);
    else setContacts((data || []) as Contact[]);
  }
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    loadContacts();
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { localStorage.setItem('office-favorites', JSON.stringify(favorites)); }, [favorites]);

  const filtered = useMemo(() => contacts.filter(c => {
    const matchesDepartment = department === '全部部門' || c.department === department;
    const matchesFavorite = !showFavorites || favorites.includes(c.id);
    const q = query.trim().toLocaleLowerCase();
    const matchesQuery = !q || [c.name,c.english_name,c.department,c.title,c.extension,c.direct_phone,c.email,c.location].some(v => (v || '').toLocaleLowerCase().includes(q));
    return matchesDepartment && matchesFavorite && matchesQuery;
  }), [contacts, department, query, showFavorites, favorites]);

  function toggleFavorite(id: string) { setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]); }
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase) return;
    const data = new FormData(e.currentTarget); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(data.get('email')), password: String(data.get('password')) });
    setBusy(false); setNotice(error ? '登入失敗：' + error.message : '管理員登入成功');
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setAdminOpen(false); }
  function startEdit(c: Contact) { setEditing(c); const { id, ...rest } = c; setForm(rest); setAdminOpen(true); }
  async function saveContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !session) return; setBusy(true);
    const result = editing ? await supabase.from('contacts').update(form).eq('id', editing.id) : await supabase.from('contacts').insert(form);
    setBusy(false);
    if (result.error) setNotice('儲存失敗：' + result.error.message);
    else { setNotice('資料已儲存'); setAdminOpen(false); await loadContacts(); }
  }
  async function deleteContact(id: string) {
    if (!supabase || !session || !window.confirm('確定刪除此員工資料？')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) setNotice('刪除失敗：' + error.message); else { setNotice('資料已刪除'); await loadContacts(); }
  }
  function exportCsv() {
    const headers = ['姓名','英文姓名','部門','職位','內線','直線電話','位置','電郵'];
    const rows = contacts.map(c => [c.name,c.english_name,c.department,c.title,c.extension,c.direct_phone,c.location,c.email]);
    const csv = [headers, ...rows].map(row => row.map(v => '"' + String(v || '').replace(/"/g,'""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'office-directory.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Leaf size={20}/></span><span>Smart Office <b>Directory</b></span></a>
      <button className="icon-button" onClick={() => setAdminOpen(true)} aria-label="管理員登入"><Settings size={19}/></button>
    </header>
    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sprout size={15}/> A LITTLE MORE CONNECTED</div><h1>讓每一次聯繫，<br/><em>都輕鬆一點。</em></h1><p>在綠意與陽光之間，快速找到你要聯絡的同事。</p></div>
        <div className="hero-art" aria-label="森林與小屋插畫"><div className="sun"></div><div className="hill hill-back"></div><div className="hill hill-front"></div><div className="tree tree-one">♣</div><div className="tree tree-two">♣</div><div className="cottage"><div className="roof"></div><div className="house"><span></span><i></i></div></div><div className="flower flower-one">✿</div><div className="flower flower-two">✿</div></div>
      </section>
      <section className="directory-panel">
        <div className="section-heading"><div><span className="eyebrow">FIND YOUR PEOPLE</span><h2>同事通訊錄</h2></div><span className="count-pill"><Users size={14}/>{contacts.length} 位同事</span></div>
        <label className="search-box"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋姓名、部門、職位或內線號碼…"/>{query && <button onClick={()=>setQuery('')}><X size={17}/></button>}</label>
        <div className="toolbar"><div className="department-select"><Building2 size={16}/><select value={department} onChange={e=>setDepartment(e.target.value)}><option>全部部門</option>{departments.map(d=><option key={d}>{d}</option>)}</select></div><button className={showFavorites?'filter-chip active':'filter-chip'} onClick={()=>setShowFavorites(v=>!v)}><Heart size={15} fill={showFavorites?'currentColor':'none'}/> 我的最愛</button></div>
        <div className="results-label"><span>{showFavorites?'收藏的同事':'搜尋結果'}</span><span>{filtered.length} 個結果</span></div>
        {filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Leaf size={25}/></div><h3>{contacts.length===0?'電話簿正在等待第一位同事':'沒有找到符合的同事'}</h3><p>{contacts.length===0?'管理員登入後即可新增員工資料。':'試試其他關鍵字，或切換部門篩選。'}</p></div> :
          <div className="contact-grid">{filtered.map(c=><article className="contact-card" key={c.id}><div className="avatar">{c.name.slice(0,1)}</div><div className="contact-main"><div className="contact-name">{c.name}</div><div className="contact-en">{c.english_name}</div><div className="contact-role">{c.department} · {c.title}</div><div className="contact-meta">{c.location && <span><MapPin size={13}/>{c.location}</span>}{c.email && <span><Mail size={13}/>{c.email}</span>}</div></div><div className="contact-actions"><button className="favorite-button" onClick={()=>toggleFavorite(c.id)} aria-label="收藏"><Heart size={17} fill={favorites.includes(c.id)?'currentColor':'none'}/></button><div className="extension">{c.extension || '—'}</div><small>內線</small>{c.direct_phone && <a className="phone-link" href={'tel:' + c.direct_phone}><Phone size={13}/>撥打</a>}{session && <div className="admin-actions"><button onClick={()=>startEdit(c)}><Pencil size={14}/></button><button onClick={()=>deleteContact(c.id)}><Trash2 size={14}/></button></div>}</div></article>)}</div>}
        <div className="panel-footer"><span><Leaf size={14}/> Simple · Fresh · Connected</span><button onClick={exportCsv}><Download size={14}/> 匯出 CSV</button></div>
      </section>
      <footer>用一點自然的溫度，連繫每一個工作日。</footer>
    </main>
    {notice && <div className="toast" onClick={()=>setNotice('')}>{notice}<button><X size={14}/></button></div>}
    {adminOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAdminOpen(false)}}>
      <section className="modal"><div className="modal-head"><div><span className="eyebrow">ADMINISTRATION</span><h2>管理員中心</h2></div><button className="icon-button" onClick={()=>setAdminOpen(false)}><X/></button></div>
        {!isSupabaseConfigured ? <div className="setup-message"><Settings size={24}/><h3>尚未連接資料庫</h3><p>請先建立 Supabase 專案，並在部署環境設定 VITE_SUPABASE_URL 及 VITE_SUPABASE_ANON_KEY。完成後即可使用管理員登入及員工資料管理。</p></div> :
        !session ? <form className="admin-form" onSubmit={signIn}><p>請使用管理員帳戶登入。帳戶需先在 Supabase Authentication 建立。</p><label>管理員電郵<input name="email" type="email" required placeholder="admin@company.com"/></label><label>密碼<input name="password" type="password" required placeholder="輸入密碼"/></label><button className="primary-button" disabled={busy}><LogIn size={16}/>{busy?'登入中…':'管理員登入'}</button></form> :
        <><div className="signed-in"><span>已登入管理員</span><button onClick={signOut}><LogOut size={15}/> 登出</button></div><form className="admin-form" onSubmit={saveContact}><h3>{editing?'編輯員工資料':'新增員工'}</h3><div className="form-grid">
          <label>中文姓名<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>英文姓名<input value={form.english_name} onChange={e=>setForm({...form,english_name:e.target.value})}/></label><label>部門<select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{departments.map(d=><option key={d}>{d}</option>)}</select></label><label>職位<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>內線號碼<input value={form.extension} onChange={e=>setForm({...form,extension:e.target.value})}/></label><label>直線電話<input value={form.direct_phone} onChange={e=>setForm({...form,direct_phone:e.target.value})}/></label><label>辦公室位置<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>電郵<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        </div><button className="primary-button" disabled={busy}><Plus size={16}/>{busy?'儲存中…':'儲存員工資料'}</button></form></>}
      </section>
    </div>}
  </div>;
}
