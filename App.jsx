import { useState, useEffect, useRef } from "react";

const PRODUCTS = [
  { id: "bombeiro", label: "Bombeiro Mirim", emoji: "🔥", color: "#ef4444", dark: "#450a0a" },
  { id: "premilitar", label: "Pré Militar", emoji: "⭐", color: "#f59e0b", dark: "#451a03" },
  { id: "guarda", label: "Guarda Municipal", emoji: "🛡️", color: "#3b82f6", dark: "#0c1a3a" },
];

const DISPATCH_SLOTS = [
  { key: "before", label: "1 dia antes", offset: -24 * 60, icon: "📆" },
  { key: "day", label: "No dia", offset: 0, icon: "📅" },
  { key: "after", label: "1h antes", offset: -60, icon: "⏰" },
];

const TABS = ["Projetos", "Agendamentos", "Configuração"];

const STATUSES = { pending: "Aguardando", sending: "Enviando...", sent: "Enviado", failed: "Falhou" };
const STATUS_STYLE = {
  pending:  { bg: "#0f2020", color: "#34d399", border: "#065f46" },
  sending:  { bg: "#1a1a0a", color: "#fbbf24", border: "#92400e" },
  sent:     { bg: "#0a1020", color: "#60a5fa", border: "#1e3a8a" },
  failed:   { bg: "#200a0a", color: "#f87171", border: "#7f1d1d" },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 5, padding: "2px 9px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.8 }}>
      {STATUSES[status]}
    </span>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#0d1117", border: "1px solid #334155", color: "#e2e8f0",
      padding: "13px 26px", borderRadius: 12, fontFamily: "monospace", fontWeight: 600,
      fontSize: 13, zIndex: 9999, boxShadow: "0 8px 40px #00000088", whiteSpace: "nowrap",
      animation: "toastIn 0.3s cubic-bezier(.21,1.02,.73,1) both"
    }}>{msg}</div>
  );
}

function ImageUploadZone({ label, icon, value, onChange }) {
  const ref = useRef();
  const [preview, setPreview] = useState(value?.preview || null);
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setPreview(e.target.result);
      onChange({ file, preview: e.target.result, base64: e.target.result.split(",")[1], type: file.type });
    };
    reader.readAsDataURL(file);
  }
  return (
    <div onClick={() => ref.current.click()} style={{
      border: `1.5px dashed ${preview ? "#334155" : "#1e293b"}`, borderRadius: 10,
      background: preview ? "#0d1117" : "#080c10", cursor: "pointer", overflow: "hidden",
      transition: "border-color 0.2s", minHeight: 90, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative"
    }}>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files[0])} />
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#000a", padding: "4px 8px", fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{label}</div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "10px 6px" }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", lineHeight: 1.4 }}>{label}</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState({ url: "", instance: "", token: "" });
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wa_projects") || "[]"); } catch { return []; }
  });
  const [dispatches, setDispatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wa_dispatches") || "[]"); } catch { return []; }
  });

  // Images stored separately (not in localStorage due to size)
  const [images, setImages] = useState({});
  const [toast, setToast] = useState(null);
  const timers = useRef({});

  // Per-product form
  const emptyForm = () => ({
    product: "bombeiro",
    phones: "",
    message: "",
    appointmentDate: "",
    appointmentTime: "",
    imgs: { before: null, day: null, after: null },
  });
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    localStorage.setItem("wa_projects", JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem("wa_dispatches", JSON.stringify(dispatches));
  }, [dispatches]);

  // Schedule engine
  useEffect(() => {
    dispatches.forEach(d => {
      if (d.status !== "pending") return;
      const key = d.id;
      if (timers.current[key]) return;
      const now = Date.now();
      const delay = d.sendAt - now;
      if (delay <= 0) return;
      timers.current[key] = setTimeout(() => executeDispatch(d.id), delay);
    });
    return () => { Object.values(timers.current).forEach(clearTimeout); timers.current = {}; };
  }, [dispatches]);

  async function executeDispatch(id) {
    const d = dispatches.find(x => x.id === id);
    if (!d || d.status !== "pending") return;
    setDispatches(prev => prev.map(x => x.id === id ? { ...x, status: "sending" } : x));

    const img = images[d.imageKey];
    if (!img) {
      setDispatches(prev => prev.map(x => x.id === id ? { ...x, status: "failed", error: "Imagem não encontrada" } : x));
      return;
    }

    let failed = 0, sent = 0;
    for (const phone of d.phones) {
      try {
        const endpoint = `${config.url}/message/sendMedia/${config.instance}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: config.token },
          body: JSON.stringify({
            number: phone.replace(/\D/g, ""),
            mediatype: "image",
            media: img.base64,
            mimetype: img.type,
            caption: d.message,
          }),
        });
        if (!res.ok) throw new Error();
        sent++;
      } catch { failed++; }
    }

    setDispatches(prev => prev.map(x => x.id === id ? {
      ...x, status: failed === d.phones.length ? "failed" : "sent",
      sentAt: new Date().toISOString(), sent, failed
    } : x));
    showToast(`${d.slotLabel}: ${sent} enviado(s), ${failed} falha(s)`);
  }

  function showToast(msg) { setToast(msg); }

  function handleCreateProject() {
    if (!form.appointmentDate || !form.appointmentTime) return showToast("⚠️ Defina a data e hora do agendamento");
    if (!form.phones.trim()) return showToast("⚠️ Cole pelo menos um telefone");
    if (!form.message.trim()) return showToast("⚠️ Escreva a mensagem");
    if (!form.imgs.before || !form.imgs.day || !form.imgs.after) return showToast("⚠️ Faça upload das 3 imagens");
    if (!config.url || !config.instance || !config.token) return showToast("⚠️ Configure a API primeiro (aba Configuração)");

    const phones = form.phones.split("\n").map(p => p.trim()).filter(Boolean);
    const apptMs = new Date(`${form.appointmentDate}T${form.appointmentTime}`).getTime();
    const product = PRODUCTS.find(p => p.id === form.product);
    const projectId = Date.now().toString();

    // Save images in memory
    const newImages = { ...images };
    DISPATCH_SLOTS.forEach(slot => {
      const imgKey = `${projectId}_${slot.key}`;
      newImages[imgKey] = form.imgs[slot.key];
    });
    setImages(newImages);

    const newDispatches = DISPATCH_SLOTS.map(slot => ({
      id: `${projectId}_${slot.key}`,
      projectId,
      productId: form.product,
      productLabel: product.label,
      slotKey: slot.key,
      slotLabel: slot.label,
      imageKey: `${projectId}_${slot.key}`,
      phones,
      message: form.message,
      sendAt: apptMs + slot.offset * 60 * 1000,
      status: "pending",
      createdAt: new Date().toISOString(),
    }));

    setProjects(prev => [{
      id: projectId,
      product: form.product,
      productLabel: product.label,
      phones,
      message: form.message,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      createdAt: new Date().toISOString(),
    }, ...prev]);

    setDispatches(prev => [...newDispatches, ...prev]);
    setForm(emptyForm());
    setTab(1);
    showToast(`✅ Projeto criado! 3 disparos agendados para ${phones.length} contato(s)`);
  }

  function deleteProject(pid) {
    DISPATCH_SLOTS.forEach(slot => {
      const key = `${pid}_${slot.key}`;
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    });
    setDispatches(prev => prev.filter(d => d.projectId !== pid));
    setProjects(prev => prev.filter(p => p.id !== pid));
    showToast("🗑️ Projeto removido");
  }

  const product = PRODUCTS.find(p => p.id === form.product);
  const pendingCount = dispatches.filter(d => d.status === "pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #060910; }
        @keyframes toastIn { from { opacity:0; transform: translateX(-50%) scale(.92); } to { opacity:1; transform: translateX(-50%) scale(1); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
        .fade-up { animation: fadeUp 0.35s ease both; }
        input, textarea, select { font-family: 'JetBrains Mono', monospace !important; }
        input:focus, textarea:focus, select:focus { outline: none !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 2px #3b82f620 !important; }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .tab-pill:hover { background: #0f172a !important; color: #e2e8f0 !important; }
        .prod-card:hover { border-color: var(--prod-color) !important; }
        .action-btn:hover { opacity: 0.8 !important; transform: translateY(-1px) !important; }
        .del-btn:hover { color: #ef4444 !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#060910", fontFamily: "'Rajdhani', sans-serif", color: "#e2e8f0" }}>

        {/* Topbar */}
        <div style={{ background: "#0a0e18", borderBottom: "1px solid #0f172a", padding: "0 20px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", alignItems: "stretch", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📲</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1, color: "#f1f5f9" }}>DISPARO AUTOMÁTICO</div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", letterSpacing: 1 }}>WhatsApp · Evolution API</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: config.url ? "#22c55e" : "#ef4444", boxShadow: config.url ? "0 0 8px #22c55e" : "none" }} />
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                {config.url ? "API OK" : "SEM CONFIG"}
              </span>
              {pendingCount > 0 && (
                <span style={{ marginLeft: 8, background: "#1e3a8a", color: "#93c5fd", border: "1px solid #1d4ed8", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontFamily: "monospace" }}>
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", gap: 0 }}>
            {TABS.map((t, i) => (
              <button key={t} className="tab-pill" onClick={() => setTab(i)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 20px", fontSize: 13, fontFamily: "'Rajdhani', sans-serif",
                fontWeight: tab === i ? 700 : 500, letterSpacing: 1,
                color: tab === i ? "#60a5fa" : "#475569",
                borderBottom: tab === i ? "2px solid #3b82f6" : "2px solid transparent",
                transition: "all 0.18s"
              }}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 20px 60px" }}>

          {/* ═══════════════ TAB 0: NOVO PROJETO ═══════════════ */}
          {tab === 0 && (
            <div className="fade-up">

              {/* Produto */}
              <div style={{ marginBottom: 22 }}>
                <SectionLabel>1. Selecione o Produto</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 8 }}>
                  {PRODUCTS.map(p => (
                    <div key={p.id} className="prod-card" onClick={() => setForm(f => ({ ...f, product: p.id }))}
                      style={{ "--prod-color": p.color, border: `1.5px solid ${form.product === p.id ? p.color : "#1e293b"}`, background: form.product === p.id ? p.dark : "#0a0e18", borderRadius: 10, padding: "14px 10px", cursor: "pointer", transition: "all 0.18s", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{p.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.product === p.id ? p.color : "#64748b", letterSpacing: 0.5 }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data/hora */}
              <div style={{ marginBottom: 22 }}>
                <SectionLabel>2. Data e Hora do Agendamento</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                  <div>
                    <FieldLabel>Data</FieldLabel>
                    <input type="date" value={form.appointmentDate}
                      onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))}
                      style={inputSt} />
                  </div>
                  <div>
                    <FieldLabel>Hora</FieldLabel>
                    <input type="time" value={form.appointmentTime}
                      onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))}
                      style={inputSt} />
                  </div>
                </div>
                {form.appointmentDate && form.appointmentTime && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {DISPATCH_SLOTS.map(slot => {
                      const ms = new Date(`${form.appointmentDate}T${form.appointmentTime}`).getTime() + slot.offset * 60000;
                      return (
                        <div key={slot.key} style={{ background: "#0a0e18", border: "1px solid #1e293b", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>
                          {slot.icon} {slot.label}: <span style={{ color: "#60a5fa" }}>{new Date(ms).toLocaleString("pt-BR")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Imagens */}
              <div style={{ marginBottom: 22 }}>
                <SectionLabel>3. Imagens do {product.label}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 8 }}>
                  {DISPATCH_SLOTS.map(slot => (
                    <ImageUploadZone key={slot.key} label={slot.label} icon={slot.icon}
                      value={form.imgs[slot.key]}
                      onChange={img => setForm(f => ({ ...f, imgs: { ...f.imgs, [slot.key]: img } }))} />
                  ))}
                </div>
              </div>

              {/* Mensagem */}
              <div style={{ marginBottom: 22 }}>
                <SectionLabel>4. Mensagem</SectionLabel>
                <textarea value={form.message} rows={3}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder={`Olá! Lembrete sobre seu ${product.label}...`}
                  style={{ ...inputSt, marginTop: 8 }} />
              </div>

              {/* Telefones */}
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>5. Telefones (um por linha, com DDI)</SectionLabel>
                <div style={{ background: "#0a0e18", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", marginTop: 8, marginBottom: 8, fontSize: 11, color: "#475569", fontFamily: "monospace", lineHeight: 1.7 }}>
                  Exemplo:<br />
                  5511999999999<br />
                  5521988888888
                </div>
                <textarea value={form.phones} rows={5}
                  onChange={e => setForm(f => ({ ...f, phones: e.target.value }))}
                  placeholder={"5511999999999\n5521988888888\n5531977777777"}
                  style={{ ...inputSt }} />
                {form.phones.trim() && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                    {form.phones.split("\n").filter(p => p.trim()).length} telefone(s) detectado(s)
                  </div>
                )}
              </div>

              <button className="action-btn" onClick={handleCreateProject} style={{
                width: "100%", padding: 15, background: `linear-gradient(135deg, ${product.color}dd, ${product.color})`,
                color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                fontFamily: "'Rajdhani', sans-serif", cursor: "pointer", transition: "all 0.2s",
                letterSpacing: 1, boxShadow: `0 4px 24px ${product.color}44`
              }}>
                {product.emoji} AGENDAR PROJETO · {product.label.toUpperCase()}
              </button>
            </div>
          )}

          {/* ═══════════════ TAB 1: AGENDAMENTOS ═══════════════ */}
          {tab === 1 && (
            <div className="fade-up">
              {projects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "70px 20px", color: "#1e293b" }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>📭</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#334155" }}>Nenhum projeto agendado ainda.</div>
                </div>
              ) : (
                projects.map(proj => {
                  const prod = PRODUCTS.find(p => p.id === proj.product);
                  const projDispatches = dispatches.filter(d => d.projectId === proj.id);
                  return (
                    <div key={proj.id} style={{ background: "#0a0e18", border: `1px solid #1e293b`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
                      {/* Project header */}
                      <div style={{ background: prod.dark, borderBottom: "1px solid #1e293b", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{prod.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: prod.color, letterSpacing: 0.5 }}>{prod.label}</div>
                            <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                              📅 {new Date(`${proj.appointmentDate}T${proj.appointmentTime}`).toLocaleString("pt-BR")} · {proj.phones.length} contato(s)
                            </div>
                          </div>
                        </div>
                        <button className="del-btn" onClick={() => deleteProject(proj.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 16, transition: "color 0.2s" }}>✕</button>
                      </div>

                      {/* Message preview */}
                      <div style={{ padding: "10px 18px 0", fontSize: 12, color: "#64748b", fontFamily: "monospace", borderBottom: "1px solid #0f172a" }}>
                        <span style={{ color: "#475569" }}>💬 </span>{proj.message.slice(0, 80)}{proj.message.length > 80 ? "..." : ""}
                      </div>

                      {/* Dispatch rows */}
                      <div style={{ padding: "8px 0" }}>
                        {projDispatches.map(d => (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", borderBottom: "1px solid #0a0e18" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 16 }}>{DISPATCH_SLOTS.find(s => s.key === d.slotKey)?.icon}</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{d.slotLabel}</div>
                                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                                  {new Date(d.sendAt).toLocaleString("pt-BR")}
                                  {d.sentAt && <span style={{ color: "#22c55e", marginLeft: 8 }}>✓ {d.sent} ok{d.failed ? `, ${d.failed} falha` : ""}</span>}
                                </div>
                              </div>
                            </div>
                            <Badge status={d.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ═══════════════ TAB 2: CONFIG ═══════════════ */}
          {tab === 2 && (
            <div className="fade-up">
              <div style={{ background: "#0a0e18", border: "1px solid #1e3a8a", borderRadius: 12, padding: "18px", marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: "#60a5fa", fontFamily: "monospace", fontWeight: 600, marginBottom: 8 }}>📌 Como configurar a Evolution API</div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "monospace", lineHeight: 1.8 }}>
                  1. Instale a Evolution API no seu servidor (VPS, Railway, Render...)<br />
                  2. Acesse o painel e crie uma instância<br />
                  3. Conecte via QR Code no WhatsApp<br />
                  4. Cole as informações abaixo e salve
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <FieldLabel>URL da API</FieldLabel>
                  <input value={config.url} onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
                    placeholder="https://sua-evolution-api.com" style={inputSt} />
                </div>
                <div>
                  <FieldLabel>Nome da Instância</FieldLabel>
                  <input value={config.instance} onChange={e => setConfig(c => ({ ...c, instance: e.target.value }))}
                    placeholder="minha-instancia" style={inputSt} />
                </div>
                <div>
                  <FieldLabel>API Key</FieldLabel>
                  <input type="password" value={config.token} onChange={e => setConfig(c => ({ ...c, token: e.target.value }))}
                    placeholder="••••••••••••••••••" style={inputSt} />
                </div>
                <button className="action-btn" onClick={() => { localStorage.setItem("wa_config", JSON.stringify(config)); showToast("💾 Configurações salvas!"); }} style={{
                  padding: 14, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                  fontFamily: "'Rajdhani', sans-serif", cursor: "pointer", transition: "all 0.2s", letterSpacing: 1
                }}>
                  💾 SALVAR CONFIGURAÇÕES
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 2 }}>{children}</div>;
}
function FieldLabel({ children }) {
  return <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>{children}</div>;
}
const inputSt = {
  width: "100%", background: "#060910", border: "1px solid #1e293b", color: "#e2e8f0",
  borderRadius: 8, padding: "10px 12px", fontSize: 12, transition: "border-color 0.2s, box-shadow 0.2s"
};
