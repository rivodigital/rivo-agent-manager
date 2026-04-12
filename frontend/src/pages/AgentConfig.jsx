import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post, del } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import Badge from "../components/ui/Badge.jsx";
import { ArrowLeft, Save, Plus, Trash2, Wifi, WifiOff, QrCode, RefreshCw, Unplug, Bot, Clock } from "lucide-react";

const TABS = ["Geral", "Prompt & Regras", "Conhecimento", "Canais", "WhatsApp", "Horários", "Notas", "Métricas"];

export default function AgentConfig() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState("Geral");

  const { data: agent } = useQuery({ queryKey: ["agent", id], queryFn: () => get(`/agents/${id}`) });
  const { data: providers = [] } = useQuery({ queryKey: ["providers"], queryFn: () => get("/providers") });

  const update = useMutation({
    mutationFn: (data) => put(`/agents/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", id] });
      toast("Alterações salvas");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao salvar", "error"),
  });

  if (!agent) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-muted">carregando…</div>
    </div>
  );

  return (
    <div className="space-y-8">
      <Link to={`/clients/${agent.clientId}`} className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-white transition">
        <ArrowLeft size={16} /> {agent.client.name}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold">{agent.name}</h1>
          <div className="text-sm text-brand-muted mt-1">{agent.description || "—"}</div>
        </div>
        <div className="flex gap-3">
          <Badge status={agent.implementationPhase}>{agent.implementationPhase}</Badge>
          <Badge status={agent.status}>{agent.status}</Badge>
        </div>
      </div>

      <div className="border-b border-brand-border/50 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] border-b-2 -mb-px transition-all duration-300 ${
              tab === t ? "border-brand-accent text-brand-white" : "border-transparent text-brand-muted hover:text-brand-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Geral" && <TabGeneral agent={agent} providers={providers} onSave={(d) => update.mutate(d)} loading={update.isPending} />}
      {tab === "Prompt & Regras" && <TabPrompt agent={agent} onSave={(d) => update.mutate(d)} loading={update.isPending} />}
      {tab === "Conhecimento" && <TabKnowledge agent={agent} />}
      {tab === "Canais" && <TabChannels agent={agent} onSave={(d) => update.mutate(d)} loading={update.isPending} />}
      {tab === "WhatsApp" && <TabWhatsApp agent={agent} />}
      {tab === "Horários" && <TabBusinessHours agent={agent} onSave={(d) => update.mutate(d)} loading={update.isPending} />}
      {tab === "Notas" && <TabNotes agent={agent} />}
      {tab === "Métricas" && <TabMetrics agent={agent} onSave={(d) => update.mutate(d)} loading={update.isPending} />}
    </div>
  );
}

function TabGeneral({ agent, providers, onSave, loading }) {
  const [f, setF] = useState({ ...agent });
  const provider = providers.find(p => p.id === f.providerId);
  let models = [];
  try { models = typeof provider?.models === "string" ? JSON.parse(provider.models) : (provider?.models || []); } catch { models = []; }
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const handleProviderChange = (e) => {
    const newProviderId = e.target.value;
    const newProvider = providers.find(p => p.id === newProviderId);
    let newModels = [];
    try { newModels = typeof newProvider?.models === "string" ? JSON.parse(newProvider.models) : (newProvider?.models || []); } catch {}
    setF(s => ({ ...s, providerId: newProviderId, model: newModels[0] || "" }));
  };
  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="label">Nome</label>
        <input className="input" value={f.name} onChange={upd("name")} />
      </div>
      <div>
        <label className="label">Descrição</label>
        <input className="input" value={f.description || ""} onChange={upd("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Provedor</label>
          <select className="input" value={f.providerId} onChange={handleProviderChange}>
            {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Modelo</label>
          <select className="input" value={f.model} onChange={upd("model")}>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Temperature: {f.temperature}</label>
          <input type="range" min="0" max="2" step="0.1" value={f.temperature}
                 onChange={(e) => setF(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                 className="w-full accent-brand-accent" />
        </div>
        <div>
          <label className="label">Max Tokens</label>
          <input type="number" className="input" value={f.maxTokens}
                 onChange={(e) => setF(s => ({ ...s, maxTokens: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.status} onChange={upd("status")}>
            <option value="draft">Draft</option><option value="testing">Testing</option>
            <option value="active">Active</option><option value="paused">Paused</option>
          </select>
        </div>
        <div>
          <label className="label">Fase</label>
          <select className="input" value={f.implementationPhase} onChange={upd("implementationPhase")}>
            <option value="diagnosis">Diagnosis</option><option value="building">Building</option>
            <option value="testing">Testing</option><option value="live">Live</option>
            <option value="optimizing">Optimizing</option><option value="paused">Paused</option>
            <option value="churned">Churned</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" onClick={() => onSave(f)} disabled={loading}>
        <Save size={16} /> Salvar
      </button>
    </div>
  );
}

function TabPrompt({ agent, onSave, loading }) {
  const [f, setF] = useState({
    systemPrompt: agent.systemPrompt || "",
    qualificationCriteria: agent.qualificationCriteria || "",
    escalationRules: agent.escalationRules || "",
    responseGuidelines: agent.responseGuidelines || "",
  });
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="label">System Prompt</label>
        <textarea className="input min-h-[240px] font-mono text-xs resize-none" value={f.systemPrompt} onChange={upd("systemPrompt")} />
      </div>
      <div>
        <label className="label">Critérios de Qualificação (JSON)</label>
        <textarea className="input min-h-[120px] font-mono text-xs resize-none" value={f.qualificationCriteria} onChange={upd("qualificationCriteria")} />
      </div>
      <div>
        <label className="label">Regras de Escalação (JSON)</label>
        <textarea className="input min-h-[100px] font-mono text-xs resize-none" value={f.escalationRules} onChange={upd("escalationRules")} />
      </div>
      <div>
        <label className="label">Diretrizes de Resposta (JSON)</label>
        <textarea className="input min-h-[100px] font-mono text-xs resize-none" value={f.responseGuidelines} onChange={upd("responseGuidelines")} />
      </div>
      <button className="btn btn-primary" onClick={() => onSave(f)} disabled={loading}>
        <Save size={16} /> Salvar
      </button>
    </div>
  );
}

const CATEGORIES = ["context", "product", "faq", "script", "rules", "objections"];

function TabKnowledge({ agent }) {
  const qc = useQueryClient();
  const id = agent.id;
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: (data) => post(`/agents/${id}/knowledge`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent", id] }); setAdding(false); },
  });
  const update = useMutation({
    mutationFn: ({ fileId, data }) => put(`/agents/${id}/knowledge/${fileId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent", id] }); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (fileId) => del(`/agents/${id}/knowledge/${fileId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", id] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs font-mono uppercase tracking-wider text-brand-muted">
          {agent.knowledgeFiles.length} arquivo(s)
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Novo Arquivo
        </button>
      </div>

      {adding && (
        <KnowledgeForm
          onCancel={() => setAdding(false)}
          onSubmit={(data) => create.mutate({ ...data, sortOrder: agent.knowledgeFiles.length })}
        />
      )}

      <div className="space-y-3">
        {agent.knowledgeFiles.map((kf) => (
          <div key={kf.id} className="card p-5">
            {editing === kf.id ? (
              <KnowledgeForm
                initial={kf}
                onCancel={() => setEditing(null)}
                onSubmit={(data) => update.mutate({ fileId: kf.id, data })}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{kf.title}</div>
                    <span className="badge badge-neutral mt-2">{kf.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost" onClick={() => setEditing(kf.id)}>Editar</button>
                    <button className="btn btn-ghost hover:text-red-500" onClick={() => confirm("Deletar?") && remove.mutate(kf.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-brand-muted whitespace-pre-wrap font-mono mt-3 max-h-40 overflow-y-auto p-4 bg-brand-surface/30 rounded-xl">
                  {kf.content}
                </pre>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeForm({ initial, onSubmit, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || "",
    category: initial?.category || "context",
    content: initial?.content || "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Título</label>
          <input className="input" value={f.title} onChange={(e) => setF(s => ({ ...s, title: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={f.category} onChange={(e) => setF(s => ({ ...s, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Conteúdo (markdown)</label>
        <textarea className="input min-h-[200px] font-mono text-xs resize-none" value={f.content} onChange={(e) => setF(s => ({ ...s, content: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">Salvar</button>
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function TabChannels({ agent, onSave, loading }) {
  const [json, setJson] = useState(agent.channels || "[]");
  const [err, setErr] = useState("");
  const handleSave = () => {
    try { JSON.parse(json); setErr(""); onSave({ channels: json }); }
    catch (e) { setErr("JSON inválido: " + e.message); }
  };
  return (
    <div className="card p-6 space-y-4">
      <div>
        <label className="label">Canais (JSON array)</label>
        <textarea className="input min-h-[300px] font-mono text-xs resize-none" value={json} onChange={(e) => setJson(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={loading}><Save size={16} /> Salvar</button>
    </div>
  );
}

function TabBusinessHours({ agent, onSave, loading }) {
  const [bh, setBh] = useState(() => {
    try {
      return JSON.parse(agent.businessHours || "null") || {
        timezone: "America/Sao_Paulo",
        schedule: {
          mon: { start: "08:00", end: "18:00", enabled: true },
          tue: { start: "08:00", end: "18:00", enabled: true },
          wed: { start: "08:00", end: "18:00", enabled: true },
          thu: { start: "08:00", end: "18:00", enabled: true },
          fri: { start: "08:00", end: "18:00", enabled: true },
          sat: { start: "08:00", end: "12:00", enabled: false },
          sun: { start: "08:00", end: "12:00", enabled: false },
        },
        offHoursMessage: "Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Deixe seu nome e o que precisa que retornamos assim que possível!",
      };
    } catch {
      return {
        timezone: "America/Sao_Paulo",
        schedule: {
          mon: { start: "08:00", end: "18:00", enabled: true },
          tue: { start: "08:00", end: "18:00", enabled: true },
          wed: { start: "08:00", end: "18:00", enabled: true },
          thu: { start: "08:00", end: "18:00", enabled: true },
          fri: { start: "08:00", end: "18:00", enabled: true },
          sat: { start: "08:00", end: "12:00", enabled: false },
          sun: { start: "08:00", end: "12:00", enabled: false },
        },
        offHoursMessage: "Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Deixe seu nome e o que precisa que retornamos assim que possível!",
      };
    }
  });

  const days = [
    { key: "mon", label: "Segunda" },
    { key: "tue", label: "Terça" },
    { key: "wed", label: "Quarta" },
    { key: "thu", label: "Quinta" },
    { key: "fri", label: "Sexta" },
    { key: "sat", label: "Sábado" },
    { key: "sun", label: "Domingo" },
  ];

  const toggleDay = (key) => {
    setBh(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: { ...prev.schedule[key], enabled: !prev.schedule[key].enabled },
      },
    }));
  };

  const setTime = (key, field, value) => {
    setBh(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: { ...prev.schedule[key], [field]: value },
      },
    }));
  };

  const handleSave = () => {
    const payload = {
      ...bh,
      schedule: Object.fromEntries(
        Object.entries(bh.schedule).map(([k, v]) => [k, v.enabled ? { start: v.start, end: v.end } : null])
      ),
    };
    onSave({ businessHours: JSON.stringify(payload) });
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Clock size={18} className="text-brand-accent" />
        <h3 className="font-sora text-lg font-semibold">Horário de Atendimento</h3>
      </div>

      <div>
        <label className="label">Timezone</label>
        <select
          className="input max-w-[300px]"
          value={bh.timezone}
          onChange={(e) => setBh(prev => ({ ...prev, timezone: e.target.value }))}
        >
          <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília)</option>
          <option value="America/Manaus">America/Manaus (Amazonas)</option>
          <option value="America/Noronha">America/Noronha (Fernando de Noronha)</option>
          <option value="America/Rio_Branco">America/Rio_Branco (Acre)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="America/Chicago">America/Chicago (CST)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
          <option value="Europe/Lisbon">Europe/Lisbon (WET)</option>
        </select>
      </div>

      <div className="space-y-3">
        {days.map(({ key, label }) => {
          const day = bh.schedule[key];
          return (
            <div key={key} className="flex items-center gap-4">
              <label className="flex items-center gap-2 min-w-[140px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={() => toggleDay(key)}
                  className="w-4 h-4 rounded accent-brand-accent"
                />
                <span className="text-sm">{label}</span>
              </label>
              {day.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input w-[120px]"
                    value={day.start}
                    onChange={(e) => setTime(key, "start", e.target.value)}
                  />
                  <span className="text-brand-muted text-sm">até</span>
                  <input
                    type="time"
                    className="input w-[120px]"
                    value={day.end}
                    onChange={(e) => setTime(key, "end", e.target.value)}
                  />
                </div>
              )}
              {!day.enabled && (
                <span className="text-xs text-brand-muted/50">Fechado</span>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="label">Mensagem fora do expediente</label>
        <textarea
          className="input min-h-[100px] resize-none"
          value={bh.offHoursMessage}
          onChange={(e) => setBh(prev => ({ ...prev, offHoursMessage: e.target.value }))}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
        <Save size={16} /> Salvar
      </button>
    </div>
  );
}

const NOTE_TYPES = ["diagnosis", "feedback", "adjustment", "incident", "general"];

function TabNotes({ agent }) {
  const qc = useQueryClient();
  const id = agent.id;
  const [type, setType] = useState("general");
  const [content, setContent] = useState("");

  const create = useMutation({
    mutationFn: (data) => post(`/agents/${id}/notes`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent", id] }); setContent(""); },
  });
  const remove = useMutation({
    mutationFn: (noteId) => del(`/agents/${id}/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", id] }),
  });

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex gap-3">
          <select className="input max-w-[200px]" value={type} onChange={(e) => setType(e.target.value)}>
            {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <textarea className="input min-h-[100px] resize-none" placeholder="Nova nota…" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="btn btn-primary" disabled={!content.trim() || create.isPending}
                onClick={() => create.mutate({ type, content })}>
          <Plus size={16} /> Adicionar Nota
        </button>
      </div>

      <div className="space-y-3">
        {agent.agentNotes.map((n) => (
          <div key={n.id} className="card p-5">
            <div className="flex items-start justify-between mb-2">
              <span className="badge badge-success">{n.type}</span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-brand-muted">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </span>
                <button onClick={() => remove.mutate(n.id)} className="text-brand-muted hover:text-red-500 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm text-brand-white/80 whitespace-pre-wrap leading-relaxed">{n.content}</p>
          </div>
        ))}
        {agent.agentNotes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brand-muted text-sm">Sem notas ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabMetrics({ agent, onSave, loading }) {
  const [f, setF] = useState({
    monthlyCostEstimate: agent.monthlyCostEstimate ?? "",
    clientValueMetric: agent.clientValueMetric || "",
  });
  return (
    <div className="card p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Custo Estimado Mensal (USD)</label>
          <input type="number" step="0.01" className="input" value={f.monthlyCostEstimate}
                 onChange={(e) => setF(s => ({ ...s, monthlyCostEstimate: e.target.value }))} />
        </div>
        <div>
          <label className="label">KPI Impactado</label>
          <input className="input" value={f.clientValueMetric}
                 onChange={(e) => setF(s => ({ ...s, clientValueMetric: e.target.value }))} />
        </div>
      </div>
      <p className="text-xs text-brand-muted">Gráficos de uso aparecem quando houver dados em UsageLog.</p>
      <button className="btn btn-primary" onClick={() => onSave({
        monthlyCostEstimate: f.monthlyCostEstimate ? parseFloat(f.monthlyCostEstimate) : null,
        clientValueMetric: f.clientValueMetric || null,
      })} disabled={loading}><Save size={16} /> Salvar</button>
    </div>
  );
}

function TabWhatsApp({ agent }) {
  const qc = useQueryClient();
  const instance = agent.whatsappInstance;

  const createInstance = useMutation({
    mutationFn: () => post("/whatsapp/instances", {
      agentId: agent.id,
      instanceName: agent.slug,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agent.id] }),
  });

  const deleteInstance = useMutation({
    mutationFn: (instanceId) => del(`/whatsapp/instances/${instanceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agent.id] }),
  });

  const reconnect = useMutation({
    mutationFn: (instanceId) => post(`/whatsapp/instances/${instanceId}/connect`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agent.id] }),
  });

  const { data: statusData } = useQuery({
    queryKey: ["wa-status", instance?.id],
    queryFn: () => get(`/whatsapp/instances/${instance.id}/status`),
    enabled: !!instance && instance.status !== "connected",
    refetchInterval: 5000,
    onSuccess: (data) => {
      if (data.status !== instance.status) {
        qc.invalidateQueries({ queryKey: ["agent", agent.id] });
      }
    },
  });

  const currentStatus = statusData?.status || instance?.status;
  const currentQr = statusData?.qrCode || instance?.qrCode;
  const currentPhone = statusData?.phoneNumber || instance?.phoneNumber;

  if (!instance) {
    return (
      <div className="card p-10 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
          <QrCode size={32} className="text-brand-accent" />
        </div>
        <div className="text-center">
          <h3 className="font-sora text-lg font-semibold">Conectar WhatsApp</h3>
          <p className="text-sm text-brand-muted mt-2 max-w-md">Vincule uma instância do WhatsApp a este agente para receber e responder mensagens automaticamente.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => createInstance.mutate()}
          disabled={createInstance.isPending}
        >
          <Wifi size={16} />
          {createInstance.isPending ? "Conectando…" : "Conectar WhatsApp"}
        </button>
        {createInstance.error && (
          <p className="text-xs text-red-500">{createInstance.error?.response?.data?.error || createInstance.error.message}</p>
        )}
      </div>
    );
  }

  if (currentStatus !== "connected") {
    return (
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode size={18} className="text-brand-accent" />
            <span className="text-xs font-mono uppercase tracking-wider text-brand-muted">Instância: {instance.instanceName}</span>
          </div>
          <span className={`badge ${
            currentStatus === "qr_code" ? "badge-warning"
            : currentStatus === "connecting" ? "badge-success"
            : "badge-neutral"
          }`}>{currentStatus}</span>
        </div>

        {currentQr && (
          <div className="flex flex-col items-center gap-4 py-6">
            <img
              src={`data:image/png;base64,${currentQr}`}
              alt="QR Code WhatsApp"
              className="w-56 h-56 rounded-2xl border border-brand-border"
            />
            <p className="text-xs text-brand-muted">Escaneie o QR code com o WhatsApp no celular</p>
          </div>
        )}

        {!currentQr && (
          <div className="flex flex-col items-center gap-4 py-10">
            <RefreshCw size={28} className="text-brand-muted animate-spin" />
            <p className="text-sm text-brand-muted">Aguardando QR code…</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="btn"
            onClick={() => reconnect.mutate(instance.id)}
            disabled={reconnect.isPending}
          >
            <RefreshCw size={16} />
            {reconnect.isPending ? "Gerando…" : "Gerar Novo QR"}
          </button>
          <button
            className="btn btn-ghost hover:text-red-500 hover:border-red-500/20"
            onClick={() => confirm("Desconectar WhatsApp?") && deleteInstance.mutate(instance.id)}
            disabled={deleteInstance.isPending}
          >
            <Unplug size={16} />
            Desconectar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <Wifi size={22} className="text-brand-accent" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-3">
              {instance.instanceName}
              <span className="badge badge-success text-[10px]">Conectado</span>
            </div>
            {currentPhone && (
              <div className="text-xs text-brand-muted mt-1">+{currentPhone}</div>
            )}
          </div>
        </div>
      </div>

      {instance.connectedAt && (
        <div className="text-xs text-brand-muted">
          Conectado desde: {new Date(instance.connectedAt).toLocaleString("pt-BR")}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          className="btn"
          onClick={() => reconnect.mutate(instance.id)}
          disabled={reconnect.isPending}
        >
          <RefreshCw size={16} />
          Reconectar
        </button>
        <button
          className="btn btn-ghost hover:text-red-500 hover:border-red-500/20"
          onClick={() => confirm("Desconectar WhatsApp? O agente parará de responder.") && deleteInstance.mutate(instance.id)}
          disabled={deleteInstance.isPending}
        >
          <Unplug size={16} />
          Desconectar
        </button>
      </div>
    </div>
  );
}
