import { useState, useEffect, useRef } from "react";

const PRODUCTS = [
  { id: "bombeiro",   label: "Bombeiro Mirim",  emoji: "🔥", accent: "#ff4d4d", glow: "rgba(255,77,77,0.12)" },
  { id: "premilitar", label: "Pré Militar",      emoji: "⭐", accent: "#f5a623", glow: "rgba(245,166,35,0.12)" },
  { id: "guarda",     label: "Guarda Municipal", emoji: "🛡️", accent: "#4a9eff", glow: "rgba(74,158,255,0.12)" },
];

const TABS = [
  { id: "projects", label: "Projetos",     icon: "◈" },
  { id: "schedule", label: "Agendamentos", icon: "◷" },
  { id: "whatsapp", label: "WhatsApp",     icon: "◉" },
  { id: "config",   label: "Configuração", icon: "◎" },
];

const ST = {
  pending: { color: "#128C7E", bg: "#e8fdf2",   label: "Aguardando" },
  sending: { color: "#f5a623", bg: "rgba(245,166,35,0.08)",  label: "Enviando…"  },
  sent:    { color: "#1877F2", bg: "#e7f3ff",  label: "Enviado"    },
  failed:  { color: "#ff4d4d", bg: "rgba(255,77,77,0.08)",   label: "Falhou"     },
};

function Badge({ status }) {
  const s = ST[status] || ST.pending;
  return <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.8 }}>{s.label}</span>;
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "rgba(10,12,20,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "14px 28px", borderRadius: 14, fontFamily: "monospace", fontSize: 13, zIndex: 9999, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "toastIn .3s cubic-bezier(.21,1.02,.73,1) both", whiteSpace: "nowrap" }}>{msg}</div>;
}

function fileToB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
}

function SlotCard({ slot, index, onChange, onRemove, canRemove }) {
  const fileRef = useRef();
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e4e6eb", borderRadius: 16, padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: "#e7f3ff", border: "1px solid #1877F233", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#1877F2", fontFamily: "monospace" }}>{index + 1}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#65676b", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace" }}>Disparo {index + 1}</span>
        </div>
        {canRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 15, padding: 4, transition: "color .2s" }} className="rm-btn">✕</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div><SLabel>Data</SLabel><input type="date" value={slot.date || ""} onChange={e => onChange({ ...slot, date: e.target.value })} style={iSt} /></div>
        <div><SLabel>Hora</SLabel><input type="time" value={slot.time || ""} onChange={e => onChange({ ...slot, time: e.target.value })} style={iSt} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: slot.hasImage || slot.hasMessage ? 12 : 0 }}>
        <TogBtn active={slot.hasImage} onClick={() => onChange({ ...slot, hasImage: !slot.hasImage })} color="#4a9eff">🖼️ Foto</TogBtn>
        <TogBtn active={slot.hasMessage} onClick={() => onChange({ ...slot, hasMessage: !slot.hasMessage })} color="#00d97e">💬 Mensagem</TogBtn>
      </div>
      {slot.hasImage && (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (!f) return; const b64 = await fileToB64(f); onChange({ ...slot, imageB64: b64, imageName: f.name, imageType: f.type }); }} />
          <div onClick={() => fileRef.current.click()} style={{ border: `1.5px dashed ${slot.imageB64 ? "rgba(74,158,255,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, cursor: "pointer", minHeight: 68, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden", position: "relative", transition: "border-color .2s" }}>
            {slot.imageB64 ? <><img src={slot.imageB64} alt="" style={{ width: "100%", maxHeight: 80, objectFit: "cover", display: "block" }} /><div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", padding: "3px 10px", fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{slot.imageName}</div></> : <span style={{ fontSize: 11, color: "#65676b", fontFamily: "monospace" }}>Clique para selecionar imagem</span>}
          </div>
        </>
      )}
      {slot.hasMessage && <textarea value={slot.message || ""} rows={2} placeholder="Mensagem deste disparo..." onChange={e => onChange({ ...slot, message: e.target.value })} style={{ ...iSt, resize: "vertical" }} />}
    </div>
  );
}

function TogBtn({ active, onClick, color, children }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "8px", background: active ? `${color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? color + "40" : "rgba(255,255,255,0.06)"}`, color: active ? color : "rgba(255,255,255,0.25)", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700, transition: "all .2s" }}>{children}</button>;
}

function QRModal({ instanceId, apiUrl, apiKey, onClose, onConnected }) {
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState("loading");
  const pollRef = useRef();
  useEffect(() => { fetchQR(); pollRef.current = setInterval(checkStatus, 4000); return () => clearInterval(pollRef.current); }, []);
  async function fetchQR() {
    try { const res = await fetch(`${apiUrl}/instance/connect/${instanceId}`, { headers: { apikey: apiKey } }); const data = await res.json(); if (data.base64) { setQr(data.base64); setStatus("qr"); } else setStatus("error"); } catch { setStatus("error"); }
  }
  async function checkStatus() {
    try { const res = await fetch(`${apiUrl}/instance/fetchInstances`, { headers: { apikey: apiKey } }); const data = await res.json(); const inst = Array.isArray(data) ? data.find(i => i.instance?.instanceName === instanceId) : null; if (inst?.instance?.state === "open") { clearInterval(pollRef.current); setStatus("connected"); setTimeout(() => { onConnected(); onClose(); }, 1500); } } catch {}
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e4e6eb", borderRadius: 24, padding: 32, maxWidth: 360, width: "90%", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(0,217,126,0.08)", border: "1px solid rgba(0,217,126,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>📱</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1e21", marginBottom: 4 }}>Conectar WhatsApp</div>
        <div style={{ fontSize: 11, color: "#65676b", fontFamily: "monospace", marginBottom: 24 }}>{instanceId}</div>
        {status === "loading" && <div style={{ color: "#65676b", fontFamily: "monospace", fontSize: 12, padding: 40 }}>Carregando QR Code...</div>}
        {status === "qr" && qr && <><div style={{ background: "#fff", borderRadius: 14, padding: 10, display: "inline-block", marginBottom: 14 }}><img src={qr} alt="QR" style={{ width: 200, height: 200, display: "block" }} /></div><div style={{ fontSize: 11, color: "#65676b", fontFamily: "monospace" }}>WhatsApp → Aparelhos conectados</div></>}
        {status === "connected" && <div style={{ color: "#00d97e", fontSize: 40, padding: 24 }}>✓</div>}
        {status === "error" && <><div style={{ color: "#ff4d4d", fontSize: 12, fontFamily: "monospace", marginBottom: 12 }}>Erro ao carregar QR Code</div><button onClick={fetchQR} style={{ background: "rgba(74,158,255,0.12)", border: "1px solid rgba(74,158,255,0.2)", color: "#4a9eff", borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontFamily: "monospace", fontSize: 12, marginBottom: 8 }}>Tentar novamente</button></>}
        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: 12, background: "#f0f2f5", border: "1px solid #e4e6eb", color: "#65676b", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}>Fechar</button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("projects");
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_cfg3") || "{}"); } catch { return {}; } });
  const [instances, setInstances] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_inst3") || "[]"); } catch { return []; } });
  const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_proj3") || "[]"); } catch { return []; } });
  const [dispatches, setDispatches] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_disp3") || "[]"); } catch { return []; } });
  const [toast, setToast] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const timers = useRef({});
  const eSlot = () => ({ id: Date.now() + Math.random(), date: "", time: "", hasImage: false, hasMessage: false, imageB64: null, imageName: "", imageType: "", message: "" });
  const [form, setForm] = useState({ product: "bombeiro", phones: "", sender: "", slots: [eSlot()] });

  useEffect(() => { localStorage.setItem("wa_cfg3", JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem("wa_inst3", JSON.stringify(instances)); }, [instances]);
  useEffect(() => { localStorage.setItem("wa_proj3", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("wa_disp3", JSON.stringify(dispatches)); }, [dispatches]);

  useEffect(() => {
    dispatches.forEach(d => {
      if (d.status !== "pending" || timers.current[d.id]) return;
      const delay = d.sendAt - Date.now();
      if (delay <= 0) return;
      timers.current[d.id] = setTimeout(() => executeSend(d.id), delay);
    });
    return () => { Object.values(timers.current).forEach(clearTimeout); timers.current = {}; };
  }, [dispatches]);

  async function executeSend(id) {
    const d = dispatches.find(x => x.id === id);
    if (!d || d.status !== "pending") return;
    setDispatches(prev => prev.map(x => x.id === id ? { ...x, status: "sending" } : x));
    let sent = 0, failed = 0;
    for (const phone of d.phones) {
      try {
        const num = phone.replace(/\D/g, "");
        if (d.imageB64) {
          await fetch(`${config.url}/message/sendMedia/${d.sender}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: config.token }, body: JSON.stringify({ number: num, mediatype: "image", media: d.imageB64.split(",")[1], mimetype: d.imageType, caption: d.message || "" }) });
        } else if (d.message) {
          await fetch(`${config.url}/message/sendText/${d.sender}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: config.token }, body: JSON.stringify({ number: num, text: d.message }) });
        }
        sent++;
      } catch { failed++; }
    }
    setDispatches(prev => prev.map(x => x.id === id ? { ...x, status: failed === d.phones.length ? "failed" : "sent", sentAt: new Date().toISOString(), sent, failed } : x));
    showToast(`✓ ${sent} enviado(s)${failed ? `, ${failed} falha(s)` : ""}`);
  }

  function showToast(msg) { setToast(msg); }

  function handleCreate() {
    if (!form.phones.trim()) return showToast("⚠️ Cole pelo menos um telefone");
    if (!form.sender) return showToast("⚠️ Selecione o WhatsApp remetente");
    const valid = form.slots.filter(s => s.date && s.time && (s.hasImage || s.hasMessage));
    if (!valid.length) return showToast("⚠️ Configure ao menos 1 disparo com data, hora e conteúdo");
    if (!config.url || !config.token) return showToast("⚠️ Configure a API primeiro");
    const phones = form.phones.split("\n").map(p => p.trim()).filter(Boolean);
    const prod = PRODUCTS.find(p => p.id === form.product);
    const pid = Date.now().toString();
    const newD = valid.map(s => ({ id: `${pid}_${s.id}`, projectId: pid, productLabel: prod.label, sender: form.sender, phones, imageB64: s.hasImage ? s.imageB64 : null, imageType: s.imageType, message: s.hasMessage ? s.message : null, sendAt: new Date(`${s.date}T${s.time}`).getTime(), sendLabel: `${s.date} ${s.time}`, status: "pending" }));
    setProjects(prev => [{ id: pid, product: form.product, productLabel: prod.label, phones, sender: form.sender, slotCount: valid.length, createdAt: new Date().toISOString() }, ...prev]);
    setDispatches(prev => [...newD, ...prev]);
    setForm({ product: "bombeiro", phones: "", sender: "", slots: [eSlot()] });
    setTab("schedule");
    showToast(`✓ ${valid.length} disparo(s) · ${phones.length} contato(s)`);
  }

  function deleteProject(pid) {
    dispatches.filter(d => d.projectId === pid).forEach(d => { clearTimeout(timers.current[d.id]); delete timers.current[d.id]; });
    setProjects(prev => prev.filter(p => p.id !== pid));
    setDispatches(prev => prev.filter(d => d.projectId !== pid));
  }

  async function addInstance(name) {
    if (!config.url || !config.token) return showToast("⚠️ Configure a API primeiro");
    if (instances.length >= 5) return showToast("⚠️ Máximo de 5 instâncias");
    if (instances.find(i => i.id === name)) { setQrModal(name); return; }
    try {
      await fetch(`${config.url}/instance/create`, { method: "POST", headers: { "Content-Type": "application/json", apikey: config.token }, body: JSON.stringify({ instanceName: name, integration: "WHATSAPP-BAILEYS" }) });
    } catch {}
    setInstances(prev => [...prev, { id: name, label: name, status: "disconnected" }]);
    setQrModal(name);
  }

  async function refreshStatus() {
    if (!config.url || !config.token) return showToast("⚠️ Configure a API primeiro");
    try {
      const res = await fetch(`${config.url}/instance/fetchInstances`, { headers: { apikey: config.token } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInstances(prev => { const m = [...prev]; data.forEach(d => { const name = d.instance?.instanceName; const state = d.instance?.state === "open" ? "connected" : "disconnected"; const idx = m.findIndex(i => i.id === name); if (idx >= 0) m[idx] = { ...m[idx], status: state }; else if (name && m.length < 5) m.push({ id: name, label: name, status: state }); }); return m; });
        showToast("✓ Status sincronizado");
      }
    } catch { showToast("❌ Erro ao sincronizar"); }
  }

  const prod = PRODUCTS.find(p => p.id === form.product);
  const connected = instances.filter(i => i.status === "connected");
  const pending = dispatches.filter(d => d.status === "pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#f0f2f5;min-height:100vh;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px) scale(.95);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        .fade-up{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
        input,textarea,select{font-family:'DM Mono',monospace!important;}
        input:focus,textarea:focus,select:focus{outline:none!important;border-color:#1877F2!important;box-shadow:0 0 0 3px rgba(24,119,242,.12)!important;}
        textarea{resize:vertical;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.07);border-radius:4px;}
        .tab-btn:hover{background:#e7f3ff!important;color:#1877F2!important;}
        .rm-btn:hover{color:#fa3e3e!important;}
        .del-btn:hover{color:#fa3e3e!important;}
        .inst-card:hover{border-color:#1877F233!important;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1c1e21", display: "flex" }}>

        {/* Sidebar */}
        <div style={{ width: 224, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e4e6eb", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ padding: "28px 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#25D36622,#1877F222)", border: "1px solid #1877F233", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📲</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1e21", letterSpacing: -0.2 }}>AutoDisparo</div>
                <div style={{ fontSize: 9, color: "#65676b", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>WHATSAPP · v2.0</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#e4e6eb", margin: "0 16px 16px" }} />

          <nav style={{ flex: 1, padding: "0 12px" }}>
            {TABS.map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: tab === t.id ? "#e7f3ff" : "none", border: `1px solid ${tab === t.id ? "#1877F233" : "transparent"}`, borderRadius: 10, cursor: "pointer", color: tab === t.id ? "#1877F2" : "#65676b", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all .18s", marginBottom: 3, textAlign: "left" }}>
                <span style={{ fontSize: 13, opacity: tab === t.id ? 1 : 0.5 }}>{t.icon}</span>
                {t.label}
                {t.id === "schedule" && pending > 0 && <span style={{ marginLeft: "auto", background: "#1877F2", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 9, fontWeight: 700 }}>{pending}</span>}
                {t.id === "whatsapp" && connected.length > 0 && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#00d97e", boxShadow: "0 0 6px #00d97e", flexShrink: 0 }} />}
              </button>
            ))}
          </nav>

          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: config.url ? "#25D366" : "#ccd0d5", boxShadow: config.url ? "0 0 8px #25D36688" : "none" }} />
              <span style={{ fontSize: 9, color: "#65676b", fontFamily: "'DM Mono',monospace", letterSpacing: 0.8 }}>{config.url ? "API CONECTADA" : "SEM CONFIG"}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "32px 36px 24px", borderBottom: "1px solid #e4e6eb" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1c1e21", marginBottom: 3 }}>{TABS.find(t => t.id === tab)?.label}</h1>
            <p style={{ fontSize: 12, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>
              {tab === "projects" && "Crie projetos de disparo automático por produto"}
              {tab === "schedule" && `${dispatches.length} total · ${pending} aguardando disparo`}
              {tab === "whatsapp" && `${connected.length}/${instances.length} número(s) online`}
              {tab === "config" && "Conexão com Evolution API"}
            </p>
          </div>

          <div style={{ padding: "28px 36px 60px", maxWidth: 720 }}>

            {tab === "projects" && (
              <div className="fade-up">
                <Sec label="Produto">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {PRODUCTS.map(p => (
                      <div key={p.id} onClick={() => setForm(f => ({ ...f, product: p.id }))} style={{ border: `1px solid ${form.product === p.id ? p.accent + "60" : "#e4e6eb"}`, background: form.product === p.id ? p.glow : "#ffffff", borderRadius: 14, padding: "16px 10px", cursor: "pointer", textAlign: "center", transition: "all .2s" }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{p.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: form.product === p.id ? p.accent : "#65676b", letterSpacing: 0.3 }}>{p.label}</div>
                      </div>
                    ))}
                  </div>
                </Sec>

                <Sec label="WhatsApp Remetente">
                  {connected.length === 0
                    ? <div style={{ background: "#f0f2f5", border: "1px solid #e4e6eb", borderRadius: 12, padding: "13px 16px", fontSize: 11, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>Nenhum número conectado · Vá em <span style={{ color: "#4a9eff", cursor: "pointer" }} onClick={() => setTab("whatsapp")}>WhatsApp</span></div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{connected.map(inst => <div key={inst.id} onClick={() => setForm(f => ({ ...f, sender: inst.id }))} style={{ border: `1px solid ${form.sender === inst.id ? "#25D36660" : "#e4e6eb"}`, background: form.sender === inst.id ? "#e8fdf2" : "#ffffff", borderRadius: 10, padding: "9px 16px", cursor: "pointer", transition: "all .18s" }}><div style={{ fontSize: 11, fontWeight: 600, color: form.sender === inst.id ? "#128C7E" : "#65676b", fontFamily: "'DM Mono',monospace" }}>📱 {inst.label}</div></div>)}</div>
                  }
                </Sec>

                <Sec label="Telefones · um por linha com DDI">
                  <textarea value={form.phones} rows={4} onChange={e => setForm(f => ({ ...f, phones: e.target.value }))} placeholder={"5511999999999\n5521988888888"} style={{ ...iSt, minHeight: 90 }} />
                  {form.phones.trim() && <div style={{ marginTop: 5, fontSize: 10, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>{form.phones.split("\n").filter(p => p.trim()).length} contato(s)</div>}
                </Sec>

                <Sec label={`Disparos · ${form.slots.length}/3`} action={form.slots.length < 3 && <button onClick={() => setForm(f => ({ ...f, slots: [...f.slots, eSlot()] }))} style={{ background: "#e7f3ff", border: "1px solid #1877F233", color: "#1877F2", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>+ Adicionar</button>}>
                  {form.slots.map((slot, i) => <SlotCard key={slot.id} slot={slot} index={i} canRemove={form.slots.length > 1} onChange={u => setForm(f => ({ ...f, slots: f.slots.map(s => s.id === slot.id ? u : s) }))} onRemove={() => setForm(f => ({ ...f, slots: f.slots.filter(s => s.id !== slot.id) }))} />)}
                </Sec>

                <button onClick={handleCreate} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${prod.accent}bb,${prod.accent})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.2, boxShadow: `0 8px 28px ${prod.glow}`, fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "transform .15s" }}>
                  {prod.emoji} Criar Projeto · {prod.label}
                </button>
              </div>
            )}

            {tab === "schedule" && (
              <div className="fade-up">
                {projects.length === 0
                  ? <div style={{ textAlign: "center", padding: "80px 20px" }}><div style={{ fontSize: 32, color: "#ccd0d5", marginBottom: 12 }}>◷</div><div style={{ fontSize: 12, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>Nenhum projeto criado</div></div>
                  : projects.map(proj => {
                    const p = PRODUCTS.find(x => x.id === proj.product);
                    const projD = dispatches.filter(d => d.projectId === proj.id);
                    return (
                      <div key={proj.id} className="inst-card" style={{ background: "#ffffff", border: "1px solid #e4e6eb", borderRadius: 18, marginBottom: 14, overflow: "hidden", transition: "border-color .2s" }}>
                        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e4e6eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 11, background: p.glow, border: `1px solid ${p.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.emoji}</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#1c1e21" }}>{p.label}</div>
                              <div style={{ fontSize: 10, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>📱 {proj.sender} · {proj.phones.length} contato(s)</div>
                            </div>
                          </div>
                          <button className="del-btn" onClick={() => deleteProject(proj.id)} style={{ background: "none", border: "none", color: "#65676b", cursor: "pointer", fontSize: 15, transition: "color .2s" }}>✕</button>
                        </div>
                        {projD.map(d => (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderBottom: "1px solid #f0f2f5" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 13 }}>{d.imageB64 ? "🖼️" : "💬"}</span>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#1c1e21", fontFamily: "'DM Mono',monospace" }}>{d.sendLabel}</div>
                                <div style={{ fontSize: 10, color: "#65676b", fontFamily: "'DM Mono',monospace" }}>{d.imageB64 && d.message ? "foto + msg" : d.imageB64 ? "foto" : "mensagem"}{d.sentAt && <span style={{ color: "#00d97e", marginLeft: 8 }}>· {d.sent} ok{d.failed ? `, ${d.failed} ✕` : ""}</span>}</div>
                              </div>
                            </div>
                            <Badge status={d.status} />
                          </div>
                        ))}
                      </div>
                    );
                  })
                }
              </div>
            )}

            {tab === "whatsapp" && (
              <div className="fade-up">
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                  <button onClick={refreshStatus} style={{ background: "#ffffff", border: "1px solid #e4e6eb", color: "#65676b", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", transition: "all .2s" }}>↻ Sincronizar</button>
                </div>
                {instances.map(inst => (
                  <div key={inst.id} className="inst-card" style={{ background: "#ffffff", border: "1px solid #e4e6eb", borderRadius: 16, padding: "15px 18px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color .2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 13, background: inst.status === "connected" ? "rgba(0,217,126,0.07)" : "rgba(255,255,255,0.025)", border: `1px solid ${inst.status === "connected" ? "rgba(0,217,126,0.18)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📱</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1e21", marginBottom: 3 }}>{inst.label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: inst.status === "connected" ? "#25D366" : "#ccd0d5", boxShadow: inst.status === "connected" ? "0 0 6px #25D36688" : "none" }} />
                          <span style={{ fontSize: 9, color: inst.status === "connected" ? "#128C7E" : "#65676b", fontFamily: "'DM Mono',monospace", letterSpacing: 0.8 }}>{inst.status === "connected" ? "CONECTADO" : "DESCONECTADO"}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {inst.status !== "connected" && <button onClick={() => setQrModal(inst.id)} style={{ background: "#e8fdf2", border: "1px solid #25D36633", color: "#128C7E", borderRadius: 9, padding: "7px 13px", cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>QR Code</button>}
                      <button className="del-btn" onClick={() => setInstances(prev => prev.filter(i => i.id !== inst.id))} style={{ background: "none", border: "1px solid #e4e6eb", color: "#65676b", borderRadius: 9, padding: "7px 11px", cursor: "pointer", fontSize: 12, transition: "color .2s" }}>✕</button>
                    </div>
                  </div>
                ))}
                {instances.length < 5 && (
                  <div style={{ background: "#ffffff", border: "1.5px dashed #e4e6eb", borderRadius: 16, padding: 24, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#65676b", fontFamily: "'DM Mono',monospace", marginBottom: 14 }}>{instances.length}/5 números configurados</div>
                    <button onClick={() => addInstance(`WA-${instances.length + 1}`)} style={{ background: "linear-gradient(135deg,#25D366,#1877F2)", border: "none", color: "#fff", borderRadius: 12, padding: "11px 28px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      + Conectar WhatsApp {instances.length + 1}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "config" && (
              <div className="fade-up">
                <div style={{ background: "#e7f3ff", border: "1px solid #1877F233", borderRadius: 14, padding: 18, marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1877F2", fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 8 }}>EVOLUTION API</div>
                  <div style={{ fontSize: 11, color: "#65676b", fontFamily: "'DM Mono',monospace", lineHeight: 1.9 }}>
                    URL: https://evolution-api-production-2326.up.railway.app<br />
                    Token: AUTHENTICATION_API_KEY do Railway
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><SLabel>URL da API</SLabel><input value={config.url || ""} onChange={e => setConfig(c => ({ ...c, url: e.target.value }))} placeholder="https://..." style={iSt} /></div>
                  <div><SLabel>API Key (Token)</SLabel><input type="password" value={config.token || ""} onChange={e => setConfig(c => ({ ...c, token: e.target.value }))} placeholder="••••••••••••••••" style={iSt} /></div>
                  <button onClick={() => showToast("✓ Configurações salvas")} style={{ padding: 14, background: "#1877F2", border: "none", color: "#ffffff", borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: 0.2 }}>Salvar Configurações</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {qrModal && <QRModal instanceId={qrModal} apiUrl={config.url} apiKey={config.token} onClose={() => setQrModal(null)} onConnected={() => setInstances(prev => prev.map(i => i.id === qrModal ? { ...i, status: "connected" } : i))} />}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function Sec({ label, children, action }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#65676b", letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function SLabel({ children }) {
  return <div style={{ fontSize: 9, color: "#65676b", fontFamily: "'DM Mono',monospace", fontWeight: 700, letterSpacing: 1.2, marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
}

const iSt = {
  width: "100%", background: "#f0f2f5", border: "1px solid #e4e6eb",
  color: "#1c1e21", borderRadius: 12, padding: "11px 14px", fontSize: 12, transition: "all .2s"
};
