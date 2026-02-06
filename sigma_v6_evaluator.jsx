import { useState, useCallback, useRef, useEffect } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIGMA VIABILITY ENGINE V7.0 — "The Bunker Edition"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// MOTOR MATEMÁTICO (Clase Lógica)
class SigmaEngine {
  constructor() { this.reset(); }
  
  reset() {
    this.I = 1.0; 
    this.C = 1.0; 
    this.P = 1.0; 
    this.H = 0.001;
    this.S = 10.0;  // Kernel (Suelo)
    this.Phi = 0.5; // Factor Amigo (Ayuda Externa)
    this.alphaAcc = 0.0; 
    this.omegaAcc = 0.0;
    this.THRESHOLD = 0.90;
  }
  
  // Fórmula Principal: Viabilidad (Ξ)
  xi() {
    if (this.P <= 0) return 0.0;
    // Evitamos división por cero absoluto
    return (this.C * this.I * this.P) / Math.max(this.H, 1e-9);
  }

  // Fórmula Experimental: Resiliencia Gamma (Γ)
  // Γ = S + Ξ · e^(-H · 5 · (1-Φ))
  gamma() {
    const xiVal = this.xi();
    // Factor de escalado (5) para que la entropía sea visible en escala humana
    const exponent = -this.H * 5 * (1 - this.Phi);
    // Limitamos el exponente para evitar underflow matemático (-700 es el límite aprox de e^x)
    const decay = Math.exp(Math.max(exponent, -700)); 
    return this.S + (xiVal * decay);
  }

  // Evaluación de Trayectoria
  assess(dA, dO, dP) {
    const pProj = this.P + dP;
    
    // Check 1: Axioma P
    if (pProj < this.THRESHOLD) {
      return { 
        status: "UNSTABLE", 
        reason: "Axiom P violation — Plenitude < 0.90. Option space collapsed.", 
        xi: this.xi() 
      };
    }
    
    // Check 2: Fricción Omega
    if (dO > 0.15) {
      return { 
        status: "INEFFICIENT", 
        reason: "Omega friction > 0.15. Entropy generation too high.", 
        xi: this.xi() 
      };
    }
    
    // Check 3: Gradiente Alfa
    if (dA <= 0) {
      return { 
        status: "STAGNANT", 
        reason: "Null Alpha gradient. No value creation.", 
        xi: this.xi() 
      };
    }
    
    // Si todo es correcto, actualizamos estado
    this.alphaAcc += dA; 
    this.omegaAcc += dO; 
    this.P = pProj;
    
    return { 
      status: "OPTIMAL", 
      reason: "Trajectory viable. Sigma Law satisfied.", 
      xi: this.xi() 
    };
  }
}

// ━━━ COMPONENTES VISUALES (Micro-UI) ━━━

const STATUS_THEME = {
  OPTIMAL:     { bg: "rgba(34,197,94,0.08)", bd: "rgba(34,197,94,0.25)", fg: "#22c55e", glow: "0 0 20px rgba(34,197,94,0.15)" },
  UNSTABLE:    { bg: "rgba(239,68,68,0.08)", bd: "rgba(239,68,68,0.25)", fg: "#ef4444", glow: "0 0 20px rgba(239,68,68,0.15)" },
  INEFFICIENT: { bg: "rgba(234,179,8,0.08)",  bd: "rgba(234,179,8,0.25)",  fg: "#eab308", glow: "0 0 20px rgba(234,179,8,0.15)" },
  STAGNANT:    { bg: "rgba(148,163,184,0.08)", bd: "rgba(148,163,184,0.2)", fg: "#94a3b8", glow: "none" },
  IDLE:        { bg: "rgba(139,92,246,0.06)", bd: "rgba(139,92,246,0.2)", fg: "#8b5cf6", glow: "none" },
};

function Badge({ status }) {
  const t = STATUS_THEME[status] || STATUS_THEME.IDLE;
  return (
    <span style={{ 
      display:"inline-block", padding:"3px 12px", borderRadius:"4px", fontSize:"10px", 
      fontWeight:600, letterSpacing:"1.8px", fontFamily:"var(--mono)", 
      background:t.bg, border:`1px solid ${t.bd}`, color:t.fg, boxShadow:t.glow 
    }}>
      {status}
    </span>
  );
}

function Slider({ label, sym, value, onChange, min, max, step, hint, color="#8b5cf6" }) {
  return (
    <div style={{ marginBottom:"14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"5px" }}>
        <span style={{ fontSize:"11px", fontFamily:"var(--mono)", color:"#cbd5e1" }}>
          <span style={{ color: color, fontWeight:600 }}>{sym}</span> {label}
        </span>
        <span style={{ fontSize:"13px", fontFamily:"var(--mono)", color:"#f1f5f9", fontWeight:500 }}>{value.toFixed(3)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={e => onChange(+e.target.value)}
        style={{ 
          width:"100%", height:"2px", appearance:"none", 
          background:"rgba(255,255,255,0.07)", borderRadius:"1px", outline:"none", cursor:"pointer" 
        }} 
      />
      {/* Estilo inline dinámico para el slider thumb */}
      <style>{`
        input[type=range]::-webkit-slider-thumb { 
          appearance: none; width: 10px; height: 10px; border-radius: 50%; 
          background: ${color}; border: 2px solid #0a0b14; 
          box-shadow: 0 0 6px ${color}66; cursor: pointer;
        }
      `}</style>
      <div style={{ fontSize:"9px", color:"#475569", marginTop:"2px", fontFamily:"var(--mono)" }}>{hint}</div>
    </div>
  );
}

function Spark({ data, h = 48 }) {
  if (data.length < 2) return <div style={{ height: h, display:"flex", alignItems:"center", justifyContent:"center", color:"#334155", fontSize:"10px", fontFamily:"var(--mono)" }}>Awaiting data…</div>;
  const mx = Math.max(...data, 1), mn = Math.min(...data, 0), r = mx - mn || 1, w = 300;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-6)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sg)"/>
      <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function TheorySection({ collapsed, toggle }) {
  return (
    <section style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"0 0 4px" }}>
      <button onClick={toggle} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"16px 0 12px", display:"flex", alignItems:"center", gap:"8px", color:"#94a3b8" }}>
        <span style={{ fontSize:"10px", fontFamily:"var(--mono)", letterSpacing:"2.5px", fontWeight:600, color:"#7c3aed" }}>I</span>
        <span style={{ fontSize:"10px", fontFamily:"var(--mono)", letterSpacing:"2px", color:"#94a3b8", flex:1, textAlign:"left" }}>THEORETICAL FRAMEWORK</span>
        <span style={{ fontSize:"12px", transition:"transform 0.2s", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}>▸</span>
      </button>
      {!collapsed && (
        <div style={{ padding:"0 0 20px", animation:"fadeIn 0.3s ease" }}>
          <div style={{ maxWidth:"680px" }}>
            <h2 style={{ fontFamily:"var(--serif)", fontSize:"20px", fontWeight:400, color:"#e2e8f0", margin:"0 0 16px", lineHeight:1.4 }}>
              The Unified Star Framework&ensp;<span style={{ color:"#7c3aed" }}>Σ</span>
            </h2>
            <div style={{ margin:"20px 0", padding:"16px 20px", background:"rgba(139,92,246,0.04)", borderRadius:"6px", borderLeft:"3px solid rgba(139,92,246,0.3)" }}>
              <div style={{ fontSize:"10px", fontFamily:"var(--mono)", letterSpacing:"2px", color:"#7c3aed", marginBottom:"10px", fontWeight:600 }}>CORE EQUATION V7.0</div>
              <div style={{ textAlign:"center", margin:"6px 0 14px" }}>
                <span style={{ fontFamily:"var(--serif)", fontSize:"22px", color:"#c4b5fd", letterSpacing:"3px" }}>Ξ&thinsp;=&thinsp;(C&thinsp;·&thinsp;I&thinsp;·&thinsp;P)&thinsp;/&thinsp;H</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px", fontSize:"12px", fontFamily:"var(--mono)", color:"#94a3b8" }}>
                 <div><strong style={{color:"#c4b5fd"}}>C</strong> Consistency</div>
                 <div><strong style={{color:"#c4b5fd"}}>I</strong> Intelligence</div>
                 <div><strong style={{color:"#c4b5fd"}}>P</strong> Plenitude</div>
                 <div><strong style={{color:"#c4b5fd"}}>H</strong> Entropy</div>
              </div>
            </div>
            <p style={{ fontSize:"13px", color:"#94a3b8", lineHeight:1.85, margin:"0", fontFamily:"var(--serif)" }}>
              <strong>Axiom P:</strong> When Plenitude (options) drops below 0.90, Viability (Ξ) collapses regardless of intelligence.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE PRINCIPAL (V7.0 DASHBOARD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SigmaReferenceEvaluator() {
  const engine = useRef(new SigmaEngine());
  
  // Estado 1: Variables de la fórmula Sigma original
  const [sv, setSv] = useState({ I:1, C:1, P:1, H:0.001 });
  
  // Estado 2: Variables de la fórmula Gamma (NUEVO V7.0)
  const [resilience, setResilience] = useState({ S: 10, Phi: 0.5 }); 
  
  // Estado 3: Deltas de simulación
  const [dt, setDt] = useState({ dA:0.10, dO:0.05, dP:0.00 });
  
  // Estado UI
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const [hist, setHist] = useState([1000]);
  const [sec, setSec] = useState({ theory: true });

  // Sincronización del Motor
  const updateEngine = () => {
    const e = engine.current;
    e.I = sv.I; e.C = sv.C; e.P = sv.P; e.H = sv.H;
    e.S = resilience.S; e.Phi = resilience.Phi;
  };

  // Memoized Calculation Wrappers
  const xi = useCallback(() => {
    updateEngine();
    return engine.current.xi();
  }, [sv, resilience]);

  const gamma = useCallback(() => {
    updateEngine();
    return engine.current.gamma();
  }, [sv, resilience]);

  // Ejecutar Evaluación (Botón Play)
  const run = () => {
    updateEngine();
    const r = engine.current.assess(dt.dA, dt.dO, dt.dP);
    setResult(r);
    setLog(p => [{ ...r, t: Date.now() }, ...p].slice(0, 60));
    setHist(p => [...p, r.xi].slice(-50));
    // Si es óptimo, el Plenitud real se actualiza
    if (r.status === "OPTIMAL") setSv(p => ({ ...p, P: engine.current.P }));
  };

  // Reset Total
  const reset = () => {
    engine.current.reset();
    setSv({ I:1, C:1, P:1, H:0.001 });
    setResilience({ S:10, Phi:0.5 });
    setDt({ dA:0.10, dO:0.05, dP:0.00 });
    setResult(null); setLog([]); setHist([1000]);
  };

  // Live Update del Sparkline cuando mueves sliders
  useEffect(() => {
    setHist(p => { const u = [...p]; u[u.length - 1] = xi(); return u; });
  }, [sv, resilience, xi]);

  // Cálculos Visuales
  const pViolation = sv.P < 0.90;
  const xiVal = xi();
  const gammaVal = gamma();
  const hue = Math.min((Math.min(Math.log10(Math.max(xiVal, 1)) / Math.log10(2000), 1)) * 120, 120);
  
  // Estilos comunes
  const btn = { padding:"10px 18px", borderRadius:"5px", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:"11px", letterSpacing:"0.8px", fontWeight:500, transition:"all 0.15s" };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0b14", color:"#e2e8f0", fontFamily:"var(--mono)" }}>
      {/* Estilos Globales embebidos */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        :root { --mono: 'JetBrains Mono', monospace; --serif: 'Crimson Pro', 'Georgia', serif; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header style={{ padding:"28px 32px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3.5px", color:"#7c3aed", fontWeight:600, marginBottom:"6px", fontFamily:"var(--mono)" }}>PROYECTO ESTRELLA — REFERENCE DOCUMENT</div>
            <h1 style={{ margin:0, fontFamily:"var(--serif)", fontSize:"26px", fontWeight:300, color:"#f8fafc", letterSpacing:"0.3px" }}>
              Sigma Viability Evaluator&ensp;<span style={{ color:"#7c3aed", fontWeight:600 }}>V7.0</span>
            </h1>
            <div style={{ fontSize:"11px", color:"#475569", marginTop:"5px", fontFamily:"var(--mono)" }}>
              Unified Star Framework + <span style={{color:"#06b6d4"}}>Experimental Resilience Protocol</span>
            </div>
          </div>
          <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
            <Badge status={result ? result.status : "IDLE"} />
            <div style={{ fontSize:"9px", color:"#334155", fontFamily:"var(--mono)", letterSpacing:"1px" }}>Architect: Rafa · CC BY 4.0</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:"960px", margin:"0 auto", padding:"0 32px 60px" }}>
        
        {/* ═══ I. THEORY ═══ */}
        <TheorySection collapsed={sec.theory} toggle={() => setSec(s => ({...s, theory:!s.theory}))} />

        {/* ═══ II. SIMULATOR (SIGMA) ═══ */}
        <section style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"16px 0 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}>
            <span style={{ fontSize:"10px", fontFamily:"var(--mono)", letterSpacing:"2.5px", fontWeight:600, color:"#7c3aed" }}>II</span>
            <span style={{ fontSize:"10px", fontFamily:"var(--mono)", letterSpacing:"2px", color:"#94a3b8" }}>INTERACTIVE DIAGNOSTIC</span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
            {/* LEFT: Controls */}
            <div>
              {/* Xi Gauge */}
              <div style={{ textAlign:"center", padding:"16px 0 20px" }}>
                <div style={{ fontSize:"11px", fontFamily:"var(--mono)", color:"#64748b", letterSpacing:"2.5px", marginBottom:"6px" }}>Ξ INDEX</div>
                <div style={{ fontSize:"48px", fontWeight:300, fontFamily:"var(--serif)", color:`hsl(${hue},65%,62%)`, lineHeight:1, transition:"color 0.5s" }}>
                  {Math.min(xiVal, 99999).toFixed(1)}
                </div>
                <div style={{ marginTop:"10px", height:"3px", background:"rgba(255,255,255,0.05)", borderRadius:"2px", maxWidth:"180px", margin:"10px auto 0" }}>
                  <div style={{ height:"100%", width:`${Math.min((Math.log10(Math.max(xiVal,1))/Math.log10(2000))*100,100)}%`, background:`linear-gradient(90deg, hsl(${hue},60%,40%), hsl(${hue},75%,58%))`, borderRadius:"2px", transition:"all 0.5s" }}/>
                </div>
              </div>

              {/* State Variables */}
              <div style={{ fontSize:"9px", color:"#7c3aed", letterSpacing:"2.5px", marginBottom:"12px", fontWeight:600 }}>STATE VARIABLES</div>
              <Slider label="Intelligence" sym="I" value={sv.I} min={0.01} max={5} step={0.01} onChange={v=>setSv(p=>({...p,I:v}))} hint="Complexity · processing capacity" />
              <Slider label="Consistency" sym="C" value={sv.C} min={0.01} max={5} step={0.01} onChange={v=>setSv(p=>({...p,C:v}))} hint="Logical coherence · absence of contradiction" />
              <Slider label="Plenitude" sym="P" value={sv.P} min={0} max={5} step={0.01} onChange={v=>setSv(p=>({...p,P:v}))} hint="Diversity · option-space preservation" />
              <Slider label="Entropy" sym="H" value={sv.H} min={0.001} max={2} step={0.001} onChange={v=>setSv(p=>({...p,H:v}))} hint="Noise · disorder · unrecoverable uncertainty" />

              {/* Trajectory Deltas */}
              <div style={{ fontSize:"9px", color:"#7c3aed", letterSpacing:"2.5px", margin:"20px 0 12px", fontWeight:600 }}>TRAJECTORY DELTAS</div>
              <Slider label="Alpha gradient" sym="Δα" value={dt.dA} min={-0.5} max={1} step={0.01} onChange={v=>setDt(p=>({...p,dA:v}))} hint="Abundance / complexity increment per step" />
              <Slider label="Omega friction" sym="Δω" value={dt.dO} min={0} max={0.5} step={0.005} onChange={v=>setDt(p=>({...p,dO:v}))} hint="Entropy / friction / damage increment" />
              
              <div style={{ display:"flex", gap:"8px", marginTop:"20px" }}>
                <button onClick={run} style={{ ...btn, flex:1, background:"rgba(139,92,246,0.1)", color:"#c4b5fd", borderColor:"rgba(139,92,246,0.25)" }}>
                  ▶&ensp;ASSESS TRAJECTORY
                </button>
                <button onClick={reset} style={{ ...btn, background:"rgba(255,255,255,0.025)", color:"#64748b" }}>
                  ↺&ensp;RESET
                </button>
              </div>
            </div>

            {/* RIGHT: Output */}
            <div>
              {/* Result Card */}
              {result && (
                <div style={{ padding:"16px", background:"rgba(255,255,255,0.02)", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.05)", marginBottom:"16px", animation:"fadeIn 0.3s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                    <span style={{ fontSize:"9px", letterSpacing:"2px", color:"#7c3aed", fontWeight:600 }}>LAST ASSESSMENT</span>
                    <Badge status={result.status} />
                  </div>
                  <div style={{ fontSize:"11.5px", color:"#94a3b8", lineHeight:1.65, fontFamily:"var(--serif)" }}>{result.reason}</div>
                  <div style={{ fontSize:"11px", color:"#475569", marginTop:"8px", fontFamily:"var(--mono)" }}>
                    Ξ = {result.xi.toFixed(2)}&ensp;·&ensp;α<sub>acc</sub> = {engine.current.alphaAcc.toFixed(3)}
                  </div>
                </div>
              )}

              {/* Sparkline */}
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#7c3aed", marginBottom:"8px", fontWeight:600 }}>Ξ TRAJECTORY</div>
                <div style={{ padding:"14px", background:"rgba(255,255,255,0.02)", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.05)" }}>
                  <Spark data={hist} />
                </div>
              </div>

              {/* Axiom P Monitor */}
              <div style={{ padding:"12px 16px", background: pViolation ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.03)", borderRadius:"6px", border:`1px solid ${pViolation ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)"}`, marginBottom:"16px", transition:"all 0.4s" }}>
                <div style={{ fontSize:"9px", letterSpacing:"2px", fontWeight:600, color: pViolation ? "#ef4444" : "#22c55e", marginBottom:"4px" }}>
                  AXIOM P {pViolation ? "⚠ VIOLATION" : "✓ SATISFIED"}
                </div>
                <div style={{ fontSize:"11px", color:"#64748b", lineHeight:1.6, fontFamily:"var(--mono)" }}>
                  P = {sv.P.toFixed(3)}&ensp;·&ensp;Threshold = 0.900
                </div>
              </div>

               {/* Log */}
               <div>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#7c3aed", marginBottom:"8px", fontWeight:600 }}>LOG</div>
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.05)", height:"100px", overflowY:"auto" }}>
                     {log.map((e, i) => (
                        <div key={e.t} style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.03)", fontSize:"9px", display:"flex", justifyContent:"space-between", color:"#64748b" }}>
                           <span>#{String(log.length-i).padStart(2,'0')} {e.status}</span>
                           <span>Ξ={e.xi.toFixed(1)}</span>
                        </div>
                     ))}
                  </div>
               </div>

            </div>
          </div>
        </section>

        {/* ═══ III. EXPERIMENTAL: GAMMA PROTOCOL (V7) ═══ */}
        {/* Aquí es donde brilla el código nuevo: Integración NATIVA de Gamma */}
        <section style={{ borderTop: "2px dashed rgba(6,182,212,0.3)", marginTop: "20px", padding: "24px 0" }}>
           <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "4px", fontSize: "9px", letterSpacing: "2px", color: "#06b6d4", fontWeight: 600, marginBottom: "20px" }}>
             ⚗ EXPERIMENTAL — RESILIENCE PROTOCOL
           </div>
           
           <div style={{ background: "rgba(6,182,212,0.03)", border: "1px solid rgba(6,182,212,0.12)", borderRadius: "8px", padding: "20px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
               <div>
                 <h3 style={{ fontFamily: "var(--serif)", fontSize: "18px", margin: "0 0 4px", color: "#e2e8f0" }}>
                   Resilience Protocol <span style={{ color: "#06b6d4" }}>Γ</span>
                 </h3>
                 <div style={{ fontSize: "10px", color: "#64748b" }}>Graceful Degradation Under Entropy</div>
               </div>
               <div style={{ textAlign: "center", padding: "16px 20px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", minWidth: "140px" }}>
                 <div style={{ fontSize: "9px", color: "#06b6d4", letterSpacing: "2px", marginBottom: "6px" }}>Γ INDEX</div>
                 <div style={{ fontSize: "36px", fontFamily: "var(--serif)", fontWeight: 300, color: "#06b6d4" }}>
                   {Math.min(gammaVal, 99999).toFixed(1)}
                 </div>
               </div>
             </div>

             <div style={{ textAlign: "center", padding: "12px", marginBottom: "16px", background: "rgba(6,182,212,0.05)", borderRadius: "6px", fontFamily: "var(--serif)", fontSize: "15px", color: "#06b6d4", letterSpacing: "2px", border: "1px solid rgba(6,182,212,0.15)" }}>
               Γ = S + Ξ · e<sup>−H·5·(1−Φ)</sup>
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
               <div>
                 <div style={{ fontSize: "9px", color: "#06b6d4", letterSpacing: "2.5px", marginBottom: "12px", fontWeight: 600 }}>PARAMETERS</div>
                 <Slider label="Kernel Strength" sym="S" value={resilience.S} min={1} max={50} step={1} color="#06b6d4" onChange={v=>setResilience(p=>({...p,S:v}))} hint="Minimum functionality floor (Suelo)" />
                 <Slider label="External Support" sym="Φ" value={resilience.Phi} min={0} max={1} step={0.01} color="#06b6d4" onChange={v=>setResilience(p=>({...p,Phi:v}))} hint="Factor Amigo / Intervention" />
               </div>
               <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "6px", padding: "14px", fontSize: "11px" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "#64748b" }}>Potential (Ξ)</span>
                    <span style={{ fontWeight: 500 }}>{xiVal.toFixed(1)}</span>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "#64748b" }}>Decay Factor</span>
                    {/* Visualizamos el cálculo de e^... */}
                    <span style={{ fontWeight: 500 }}>{Math.exp(Math.max(-sv.H*5*(1-resilience.Phi), -700)).toFixed(3)}</span>
                 </div>
                 <div style={{ padding: "10px", marginTop: "10px", background: "rgba(6,182,212,0.1)", borderRadius: "4px", color: "#06b6d4", textAlign: "center", fontSize: "10px" }}>
                   {Math.exp(Math.max(-sv.H*5*(1-resilience.Phi), -700)) > 0.7 ? "FULL CAPACITY MODE" : "KERNEL MODE ACTIVE"}
                 </div>
               </div>
             </div>
           </div>
        </section>

      </div>
    </div>
  );
}
