import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: "bombeiro",   label: "Bombeiro Mirim",   emoji: "🔥", color: "#ef4444", dark: "#1a0505" },
  { id: "premilitar", label: "Pré Militar",       emoji: "⭐", color: "#f59e0b", dark: "#1a1005" },
  { id: "guarda",     label: "Guarda Municipal",  emoji: "🛡️", color: "#3b82f6", dark: "#05101a" },
];

const TABS = ["Projetos", "Agendamentos", "WhatsApp", "Configuração"];

const ST = {
  pending: { bg:"#0a1a0a", color:"#4ade80", border:"#14532d", label:"Aguardando" },
  sending: { bg:"#1a1a05", color:"#fbbf24", border:"#78350f", label:"Enviando…"  },
  sent:    { bg:"#05101a", color:"#60a5fa", border:"#1e3a8a", label:"Enviado"    },
  failed:  { bg:"#1a0505", color:"#f87171", border:"#7f1d1d", label:"Falhou"     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = ST[status] || ST.pending;
  return <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:5, padding:"2px 9px", fontSize:10, fontFamily:"monospace", fontWeight:700, letterSpacing:.8 }}>{s.label}</span>;
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"#0d1117", border:"1px solid #334155", color:"#e2e8f0", padding:"13px 26px", borderRadius:12, fontFamily:"monospace", fontWeight:600, fontSize:13, zIndex:9999, boxShadow:"0 8px 40px #00000088", whiteSpace:"nowrap", animation:"toastIn .3s cubic-bezier(.21,1.02,.73,1) both" }}>
      {msg}
    </div>
  );
}

// Convert file to base64
function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Dispatch Slot Editor ─────────────────────────────────────────────────────
function SlotEditor({ slot, index, onChange, onRemove }) {
  const fileRef = useRef();
  return (
    <div style={{ background:"#0a0e18", border:"1px solid #1e293b", borderRadius:10, padding:"14px", marginBottom:10, position:"relative" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#94a3b8", fontFamily:"monospace" }}>DISPARO {index+1}</span>
        <button onClick={onRemove} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:16, transition:"color .2s" }} className="del-btn">✕</button>
      </div>

      {/* Date/time */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
        <div>
          <FieldLabel>Data</FieldLabel>
          <input type="date" value={slot.date||""} onChange={e=>onChange({...slot,date:e.target.value})} style={iSt}/>
        </div>
        <div>
          <FieldLabel>Hora</FieldLabel>
          <input type="time" value={slot.time||""} onChange={e=>onChange({...slot,time:e.target.value})} style={iSt}/>
        </div>
      </div>

      {/* Image toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <button onClick={()=>onChange({...slot,hasImage:!slot.hasImage})} style={{ flex:1, padding:"7px", background:slot.hasImage?"#0a1f10":"#0d1117", border:`1px solid ${slot.hasImage?"#166534":"#1e293b"}`, color:slot.hasImage?"#4ade80":"#475569", borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:"monospace", fontWeight:700, transition:"all .2s" }}>
          {slot.hasImage ? "🖼️ Com foto" : "+ Foto"}
        </button>
        <button onClick={()=>onChange({...slot,hasMessage:!slot.hasMessage})} style={{ flex:1, padding:"7px", background:slot.hasMessage?"#05101a":"#0d1117", border:`1px solid ${slot.hasMessage?"#1e3a8a":"#1e293b"}`, color:slot.hasMessage?"#60a5fa":"#475569", borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:"monospace", fontWeight:700, transition:"all .2s" }}>
          {slot.hasMessage ? "💬 Com mensagem" : "+ Mensagem"}
        </button>
      </div>

      {/* Image upload */}
      {slot.hasImage && (
        <div style={{ marginBottom:8 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={async e => {
              const f = e.target.files[0]; if (!f) return;
              const b64 = await fileToB64(f);
              onChange({ ...slot, imageB64: b64, imageName: f.name, imageType: f.type });
            }}/>
          <div onClick={()=>fileRef.current.click()} style={{ border:`1.5px dashed ${slot.imageB64?"#334155":"#1e293b"}`, borderRadius:8, overflow:"hidden", cursor:"pointer", minHeight:60, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            {slot.imageB64
              ? <><img src={slot.imageB64} alt="" style={{ width:"100%", maxHeight:80, objectFit:"cover" }}/><div style={{ position:"absolute", bottom:0, left:0, right:0, background:"#000a", padding:"3px 8px", fontSize:10, color:"#94a3b8", fontFamily:"monospace" }}>{slot.imageName}</div></>
              : <span style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>Clique para selecionar imagem</span>}
          </div>
        </div>
      )}

      {/* Message */}
      {slot.hasMessage && (
        <textarea value={slot.message||""} rows={2} placeholder="Mensagem deste disparo..." onChange={e=>onChange({...slot,message:e.target.value})} style={{ ...iSt, resize:"vertical" }}/>
      )}
    </div>
  );
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────
function QRModal({ instanceId, apiUrl, apiKey, onClose, onConnected }) {
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState("loading");
  const pollRef = useRef();

  useEffect(() => {
    fetchQR();
    pollRef.current = setInterval(checkStatus, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function fetchQR() {
    try {
      const res = await fetch(`${apiUrl}/instance/connect/${instanceId}`, { headers: { apikey: apiKey } });
      const data = await res.json();
      if (data.base64) { setQr(data.base64); setStatus("qr"); }
    } catch { setStatus("error"); }
  }

  async function checkStatus() {
    try {
      const res = await fetch(`${apiUrl}/instance/fetchInstances`, { headers: { apikey: apiKey } });
      const data = await res.json();
      const inst = Array.isArray(data) ? data.find(i => i.instance?.instanceName === instanceId) : null;
      if (inst?.instance?.state === "open") {
        clearInterval(pollRef.current);
        setStatus("connected");
        setTimeout(() => { onConnected(); onClose(); }, 1500);
      }
    } catch {}
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:16, padding:"28px", maxWidth:340, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>Conectar WhatsApp</div>
        <div style={{ fontSize:11, color:"#64748b", fontFamily:"monospace", marginBottom:18 }}>{instanceId}</div>
        {status === "loading" && <div style={{ color:"#64748b", fontFamily:"monospace", fontSize:12 }}>Carregando QR Code...</div>}
        {status === "qr" && qr && <img src={qr} alt="QR" style={{ width:220, height:220, borderRadius:8, border:"1px solid #1e293b" }}/>}
        {status === "connected" && <div style={{ color:"#4ade80", fontSize:24 }}>✅ Conectado!</div>}
        {status === "error" && <div style={{ color:"#f87171", fontSize:12, fontFamily:"monospace" }}>Erro ao carregar QR Code</div>}
        {status === "qr" && <div style={{ marginTop:12, fontSize:11, color:"#64748b", fontFamily:"monospace" }}>Escaneie com o WhatsApp → Aparelhos conectados</div>}
        <button onClick={onClose} style={{ marginTop:18, background:"none", border:"1px solid #1e293b", color:"#64748b", borderRadius:8, padding:"8px 20px", cursor:"pointer", fontFamily:"monospace", fontSize:12 }}>Fechar</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_cfg")||"{}"); } catch { return {}; } });
  const [instances, setInstances] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_instances")||"[]"); } catch { return []; } });
  const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_projects2")||"[]"); } catch { return []; } });
  const [dispatches, setDispatches] = useState(() => { try { return JSON.parse(localStorage.getItem("wa_dispatches2")||"[]"); } catch { return []; } });
  const [toast, setToast] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const timers = useRef({});

  // Form state
  const emptyForm = () => ({ product:"bombeiro", phones:"", sender:"", slots:[{ id:Date.now(), date:"", time:"", hasImage:false, hasMessage:false, imageB64:null, imageName:"", imageType:"", message:"" }] });
  const [form, setForm] = useState(emptyForm());

  // Persist
  useEffect(() => { localStorage.setItem("wa_cfg", JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem("wa_instances", JSON.stringify(instances)); }, [instances]);
  useEffect(() => { localStorage.setItem("wa_projects2", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("wa_dispatches2", JSON.stringify(dispatches)); }, [dispatches]);

  // Scheduler engine
  useEffect(() => {
    dispatches.forEach(d => {
      if (d.status !== "pending") return;
      if (timers.current[d.id]) return;
      const delay = d.sendAt - Date.now();
      if (delay <= 0) return;
      timers.current[d.id] = setTimeout(() => executeSend(d.id), delay);
    });
    return () => { Object.values(timers.current).forEach(clearTimeout); timers.current = {}; };
  }, [dispatches]);

  async function executeSend(id) {
    const d = dispatches.find(x => x.id === id);
    if (!d || d.status !== "pending") return;
    setDispatches(prev => prev.map(x => x.id === id ? {...x, status:"sending"} : x));
    let sent = 0, failed = 0;
    for (const phone of d.phones) {
      try {
        if (d.imageB64 && d.message) {
          await fetch(`${config.url}/message/sendMedia/${d.sender}`, { method:"POST", headers:{"Content-Type":"application/json", apikey:config.token}, body: JSON.stringify({ number:phone.replace(/\D/g,""), mediatype:"image", media:d.imageB64.split(",")[1], mimetype:d.imageType, caption:d.message }) });
        } else if (d.imageB64) {
          await fetch(`${config.url}/message/sendMedia/${d.sender}`, { method:"POST", headers:{"Content-Type":"application/json", apikey:config.token}, body: JSON.stringify({ number:phone.replace(/\D/g,""), mediatype:"image", media:d.imageB64.split(",")[1], mimetype:d.imageType }) });
        } else if (d.message) {
          await fetch(`${config.url}/message/sendText/${d.sender}`, { method:"POST", headers:{"Content-Type":"application/json", apikey:config.token}, body: JSON.stringify({ number:phone.replace(/\D/g,""), text:d.message }) });
        }
        sent++;
      } catch { failed++; }
    }
    setDispatches(prev => prev.map(x => x.id === id ? {...x, status: failed===d.phones.length?"failed":"sent", sentAt:new Date().toISOString(), sent, failed} : x));
    showToast(`Disparo ${sent} enviado(s), ${failed} falha(s)`);
  }

  function showToast(msg) { setToast(msg); }

  // Create project
  function handleCreate() {
    if (!form.phones.trim()) return showToast("⚠️ Cole pelo menos um telefone");
    if (!form.sender) return showToast("⚠️ Selecione o WhatsApp que vai enviar");
    const validSlots = form.slots.filter(s => s.date && s.time && (s.hasImage || s.hasMessage));
    if (validSlots.length === 0) return showToast("⚠️ Configure pelo menos 1 disparo com data, hora e conteúdo");
    if (!config.url || !config.token) return showToast("⚠️ Configure a API primeiro");

    const phones = form.phones.split("\n").map(p=>p.trim()).filter(Boolean);
    const prod = PRODUCTS.find(p=>p.id===form.product);
    const pid = Date.now().toString();

    const newDispatches = validSlots.map(s => ({
      id: `${pid}_${s.id}`,
      projectId: pid,
      productLabel: prod.label,
      sender: form.sender,
      phones,
      imageB64: s.hasImage ? s.imageB64 : null,
      imageType: s.imageType,
      message: s.hasMessage ? s.message : null,
      sendAt: new Date(`${s.date}T${s.time}`).getTime(),
      sendLabel: `${s.date} ${s.time}`,
      status: "pending",
    }));

    setProjects(prev => [{ id:pid, product:form.product, productLabel:prod.label, phones, sender:form.sender, slotCount:validSlots.length, createdAt:new Date().toISOString() }, ...prev]);
    setDispatches(prev => [...newDispatches, ...prev]);
    setForm(emptyForm());
    setTab(1);
    showToast(`✅ ${validSlots.length} disparo(s) agendado(s) para ${phones.length} contato(s)`);
  }

  function deleteProject(pid) {
    dispatches.filter(d=>d.projectId===pid).forEach(d => { clearTimeout(timers.current[d.id]); delete timers.current[d.id]; });
    setProjects(prev=>prev.filter(p=>p.id!==pid));
    setDispatches(prev=>prev.filter(d=>d.projectId!==pid));
    showToast("🗑️ Projeto removido");
  }

  // WhatsApp instances
  async function createInstance(name) {
    if (!config.url || !config.token) return showToast("⚠️ Configure a API primeiro");
    if (instances.length >= 5) return showToast("⚠️ Máximo de 5 WhatsApps atingido");
    try {
      await fetch(`${config.url}/instance/create`, { method:"POST", headers:{"Content-Type":"application/json", apikey:config.token}, body: JSON.stringify({ instanceName:name, integration:"WHATSAPP-BAILEYS" }) });
      const updated = [...instances, { id:name, label:name, status:"disconnected" }];
      setInstances(updated);
      setQrModal(name);
    } catch { showToast("❌ Erro ao criar instância"); }
  }

  async function refreshInstances() {
    if (!config.url || !config.token) return;
    try {
      const res = await fetch(`${config.url}/instance/fetchInstances`, { headers:{ apikey:config.token } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInstances(prev => prev.map(inst => {
          const found = data.find(d => d.instance?.instanceName === inst.id);
          return found ? { ...inst, status: found.instance?.state === "open" ? "connected" : "disconnected" } : inst;
        }));
      }
    } catch {}
  }

  const prod = PRODUCTS.find(p=>p.id===form.product);
  const pendingCount = dispatches.filter(d=>d.status==="pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#060910;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) scale(.92);}to{opacity:1;transform:translateX(-50%) scale(1);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        .fade-up{animation:fadeUp .3s ease both;}
        input,textarea,select{font-family:'JetBrains Mono',monospace!important;}
        input:focus,textarea:focus,select:focus{outline:none!important;border-color:#3b82f6!important;box-shadow:0 0 0 2px #3b82f620!important;}
        textarea{resize:vertical;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px;}
        .del-btn:hover{color:#ef4444!important;}
        .tab-btn:hover{color:#e2e8f0!important;}
        .prod-card:hover{border-color:var(--c)!important;}
        .inst-card:hover{border-color:#3b82f6!important;}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#060910", fontFamily:"'Rajdhani',sans-serif", color:"#e2e8f0" }}>

        {/* Header */}
        <div style={{ background:"#0a0e18", borderBottom:"1px solid #0f172a" }}>
          <div style={{ maxWidth:820, margin:"0 auto", padding:"0 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📲</div>
                <div>
                  <div style={{ fontSize:17, fontWeight:700, letterSpacing:1, color:"#f1f5f9" }}>DISPARO AUTOMÁTICO</div>
                  <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace", letterSpacing:1 }}>WhatsApp · Evolution API</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {instances.filter(i=>i.status==="connected").length > 0 && (
                  <span style={{ background:"#0a1f10", border:"1px solid #166534", color:"#4ade80", borderRadius:20, padding:"2px 10px", fontSize:10, fontFamily:"monospace" }}>
                    {instances.filter(i=>i.status==="connected").length} WA online
                  </span>
                )}
                {pendingCount > 0 && (
                  <span style={{ background:"#1e3a8a", border:"1px solid #1d4ed8", color:"#93c5fd", borderRadius:20, padding:"2px 10px", fontSize:10, fontFamily:"monospace" }}>
                    {pendingCount} pendente{pendingCount>1?"s":""}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:"flex" }}>
              {TABS.map((t,i) => (
                <button key={t} className="tab-btn" onClick={()=>setTab(i)} style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:12, fontFamily:"'Rajdhani',sans-serif", fontWeight:tab===i?700:500, letterSpacing:1, color:tab===i?"#60a5fa":"#475569", borderBottom:tab===i?"2px solid #3b82f6":"2px solid transparent", transition:"all .18s" }}>{t.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:820, margin:"0 auto", padding:"24px 20px 60px" }}>

          {/* ══════ TAB 0: NOVO PROJETO ══════ */}
          {tab===0 && (
            <div className="fade-up">
              {/* Product */}
              <SectionLabel>1. Produto</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, margin:"8px 0 20px" }}>
                {PRODUCTS.map(p=>(
                  <div key={p.id} className="prod-card" onClick={()=>setForm(f=>({...f,product:p.id}))} style={{ "--c":p.color, border:`1.5px solid ${form.product===p.id?p.color:"#1e293b"}`, background:form.product===p.id?p.dark:"#0a0e18", borderRadius:10, padding:"12px 8px", cursor:"pointer", transition:"all .18s", textAlign:"center" }}>
                    <div style={{ fontSize:26, marginBottom:4 }}>{p.emoji}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:form.product===p.id?p.color:"#64748b", letterSpacing:.5 }}>{p.label}</div>
                  </div>
                ))}
              </div>

              {/* WhatsApp sender */}
              <SectionLabel>2. Enviar pelo número</SectionLabel>
              <div style={{ margin:"8px 0 20px" }}>
                {instances.filter(i=>i.status==="connected").length === 0
                  ? <div style={{ background:"#0a0e18", border:"1px solid #1e293b", borderRadius:8, padding:"12px", fontSize:12, color:"#475569", fontFamily:"monospace" }}>Nenhum WhatsApp conectado. Vá para a aba <strong style={{color:"#60a5fa"}}>WhatsApp</strong> e conecte um número.</div>
                  : <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {instances.filter(i=>i.status==="connected").map(inst=>(
                        <div key={inst.id} onClick={()=>setForm(f=>({...f,sender:inst.id}))} style={{ border:`1.5px solid ${form.sender===inst.id?"#22c55e":"#1e293b"}`, background:form.sender===inst.id?"#0a1f10":"#0a0e18", borderRadius:8, padding:"8px 14px", cursor:"pointer", transition:"all .18s" }}>
                          <div style={{ fontSize:11, fontWeight:700, color:form.sender===inst.id?"#4ade80":"#64748b", fontFamily:"monospace" }}>📱 {inst.label}</div>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Phones */}
              <SectionLabel>3. Telefones (um por linha, com DDI)</SectionLabel>
              <textarea value={form.phones} rows={4} onChange={e=>setForm(f=>({...f,phones:e.target.value}))} placeholder={"5511999999999\n5521988888888"} style={{ ...iSt, margin:"8px 0 20px" }}/>
              {form.phones.trim() && <div style={{ fontSize:11, color:"#64748b", fontFamily:"monospace", marginTop:-16, marginBottom:16 }}>{form.phones.split("\n").filter(p=>p.trim()).length} telefone(s)</div>}

              {/* Slots */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <SectionLabel>4. Disparos ({form.slots.length}/3)</SectionLabel>
                {form.slots.length < 3 && (
                  <button onClick={()=>setForm(f=>({...f,slots:[...f.slots,{id:Date.now(),date:"",time:"",hasImage:false,hasMessage:false,imageB64:null,imageName:"",imageType:"",message:""}]}))}
                    style={{ background:"#0a1f10", border:"1px solid #166534", color:"#4ade80", borderRadius:7, padding:"5px 14px", cursor:"pointer", fontSize:11, fontFamily:"monospace", fontWeight:700 }}>
                    + Adicionar disparo
                  </button>
                )}
              </div>
              {form.slots.map((slot,i)=>(
                <SlotEditor key={slot.id} slot={slot} index={i}
                  onChange={updated=>setForm(f=>({...f,slots:f.slots.map(s=>s.id===slot.id?updated:s)}))}
                  onRemove={()=>form.slots.length>1&&setForm(f=>({...f,slots:f.slots.filter(s=>s.id!==slot.id)}))}/>
              ))}

              <button onClick={handleCreate} style={{ width:"100%", padding:14, background:`linear-gradient(135deg,${prod.color}cc,${prod.color})`, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", cursor:"pointer", transition:"all .2s", letterSpacing:1, boxShadow:`0 4px 20px ${prod.color}33`, marginTop:8 }}>
                {prod.emoji} AGENDAR PROJETO
              </button>
            </div>
          )}

          {/* ══════ TAB 1: AGENDAMENTOS ══════ */}
          {tab===1 && (
            <div className="fade-up">
              {projects.length===0
                ? <div style={{ textAlign:"center", padding:"70px 20px", color:"#1e293b" }}><div style={{ fontSize:48, marginBottom:14 }}>📭</div><div style={{ fontFamily:"monospace", fontSize:12, color:"#334155" }}>Nenhum projeto agendado.</div></div>
                : projects.map(proj=>{
                    const p = PRODUCTS.find(x=>x.id===proj.product);
                    const projD = dispatches.filter(d=>d.projectId===proj.id);
                    return (
                      <div key={proj.id} style={{ background:"#0a0e18", border:"1px solid #1e293b", borderRadius:14, marginBottom:14, overflow:"hidden" }}>
                        <div style={{ background:p.dark, borderBottom:"1px solid #1e293b", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:20 }}>{p.emoji}</span>
                            <div>
                              <div style={{ fontWeight:700, fontSize:14, color:p.color }}>{p.label}</div>
                              <div style={{ fontSize:10, color:"#64748b", fontFamily:"monospace" }}>📱 {proj.sender} · {proj.phones.length} contato(s) · {proj.slotCount} disparo(s)</div>
                            </div>
                          </div>
                          <button className="del-btn" onClick={()=>deleteProject(proj.id)} style={{ background:"none", border:"none", color:"#334155", cursor:"pointer", fontSize:16, transition:"color .2s" }}>✕</button>
                        </div>
                        {projD.map(d=>(
                          <div key={d.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #0a0e18" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:14 }}>{d.imageB64?"🖼️":"💬"}</span>
                              <div>
                                <div style={{ fontSize:11, fontWeight:600, color:"#cbd5e1", fontFamily:"monospace" }}>{d.sendLabel}</div>
                                <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace" }}>
                                  {d.imageB64&&d.message?"foto + mensagem":d.imageB64?"só foto":"só mensagem"}
                                  {d.sentAt&&<span style={{ color:"#22c55e", marginLeft:8 }}>✓ {d.sent} ok{d.failed?`, ${d.failed} falha`:""}</span>}
                                </div>
                              </div>
                            </div>
                            <Badge status={d.status}/>
                          </div>
                        ))}
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* ══════ TAB 2: WHATSAPP ══════ */}
          {tab===2 && (
            <div className="fade-up">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#64748b", fontFamily:"monospace" }}>Até 5 números conectados</div>
                <button onClick={refreshInstances} style={{ background:"#0a0e18", border:"1px solid #1e293b", color:"#94a3b8", borderRadius:7, padding:"6px 14px", cursor:"pointer", fontSize:11, fontFamily:"monospace" }}>🔄 Atualizar status</button>
              </div>

              {instances.map(inst=>(
                <div key={inst.id} className="inst-card" style={{ background:"#0a0e18", border:"1px solid #1e293b", borderRadius:12, padding:"14px 18px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", transition:"border-color .2s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, background:inst.status==="connected"?"#0a1f10":"#1a0a0a", border:`1px solid ${inst.status==="connected"?"#166534":"#7f1d1d"}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📱</div>
                    <div>
                      <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:14 }}>{inst.label}</div>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:inst.status==="connected"?"#4ade80":"#f87171" }}>{inst.status==="connected"?"● Conectado":"● Desconectado"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {inst.status!=="connected" && (
                      <button onClick={()=>setQrModal(inst.id)} style={{ background:"#0a1f10", border:"1px solid #166534", color:"#4ade80", borderRadius:7, padding:"6px 14px", cursor:"pointer", fontSize:11, fontFamily:"monospace", fontWeight:700 }}>QR Code</button>
                    )}
                    <button onClick={()=>setInstances(prev=>prev.filter(i=>i.id!==inst.id))} className="del-btn" style={{ background:"none", border:"1px solid #1e293b", color:"#475569", borderRadius:7, padding:"6px 10px", cursor:"pointer", fontSize:12, transition:"color .2s" }}>✕</button>
                  </div>
                </div>
              ))}

              {instances.length < 5 && (
                <div style={{ background:"#0a0e18", border:"1.5px dashed #1e293b", borderRadius:12, padding:"20px", textAlign:"center" }}>
                  <div style={{ fontSize:13, color:"#64748b", fontFamily:"monospace", marginBottom:12 }}>Adicionar novo WhatsApp ({instances.length}/5)</div>
                  <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                    {["WA-1","WA-2","WA-3","WA-4","WA-5"].filter(n=>!instances.find(i=>i.id===n)).slice(0,1).map(name=>(
                      <button key={name} onClick={()=>createInstance(name)} style={{ background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", cursor:"pointer", fontSize:13, fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>
                        + Conectar WhatsApp {instances.length+1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════ TAB 3: CONFIG ══════ */}
          {tab===3 && (
            <div className="fade-up">
              <div style={{ background:"#0a0e18", border:"1px solid #1e3a8a", borderRadius:12, padding:"16px", marginBottom:20 }}>
                <div style={{ fontSize:11, color:"#60a5fa", fontFamily:"monospace", fontWeight:600, marginBottom:6 }}>📌 Evolution API</div>
                <div style={{ fontSize:11, color:"#475569", fontFamily:"monospace", lineHeight:1.8 }}>URL: sua URL do Railway<br/>Token: AUTHENTICATION_API_KEY</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div><FieldLabel>URL da API</FieldLabel><input value={config.url||""} onChange={e=>setConfig(c=>({...c,url:e.target.value}))} placeholder="https://..." style={iSt}/></div>
                <div><FieldLabel>API Key (Token)</FieldLabel><input type="password" value={config.token||""} onChange={e=>setConfig(c=>({...c,token:e.target.value}))} placeholder="••••••••••••" style={iSt}/></div>
                <button onClick={()=>showToast("💾 Salvo!")} style={{ padding:13, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", cursor:"pointer", letterSpacing:1 }}>💾 SALVAR</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {qrModal && (
        <QRModal instanceId={qrModal} apiUrl={config.url} apiKey={config.token}
          onClose={()=>setQrModal(null)}
          onConnected={()=>{ setInstances(prev=>prev.map(i=>i.id===qrModal?{...i,status:"connected"}:i)); }}/>
      )}
      {toast && <Toast msg={toast} onClose={()=>setToast(null)}/>}
    </>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"monospace" }}>{children}</div>;
}
function FieldLabel({ children }) {
  return <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace", fontWeight:600, letterSpacing:1, marginBottom:4 }}>{children}</div>;
}
const iSt = { width:"100%", background:"#060910", border:"1px solid #1e293b", color:"#e2e8f0", borderRadius:8, padding:"10px 12px", fontSize:12, transition:"border-color .2s" };
