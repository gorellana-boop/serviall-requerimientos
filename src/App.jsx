import { useState, useEffect, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STAGES = ["Aprobado Gabriel","Cotización","OV","Picking","Despachado","Pañol"];
const STAGE_FULL = ["Aprobado por Gabriel","Cotización","Orden de Venta","Picking","Despachado","Ingresado en pañol"];
const STAGE_COLORS = ["#2563EB","#0D9488","#16A34A","#D97706","#EA580C","#9333EA"];

const RAW_DATA = [
  {n:1,sol:"Soplador",sku:"10021393",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:2,sol:"Limpia contactos",sku:"10016518",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:3,sol:"Silicona",sku:"10009629",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:4,sol:"Buzo XL",sku:"10010875",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:5,sol:"Buzo L",sku:"10010873",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
  {n:6,sol:"Cinta roja",sku:"10009831",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:7,sol:"Buzo talla M",sku:"10010874",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:8,sol:"Aire comprimido",sku:"10011040",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:9,sol:"Cinta delimitadora",sku:"10042499",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:10,sol:"Eslinga de 3 mts urgente!!!",sku:"40041077",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:11,sol:"Eslinga de 2 mts urgente!!",sku:"10015206",qty:1,resp:"",due:"",stages:[true,true,true,true,true,true]},
  {n:13,sol:"Escalera 4 peldaños",sku:"10023170",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
  {n:14,sol:"Bidón de 20 lts",sku:"10007003",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
  {n:15,sol:"Cinta teflón",sku:"10040608",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
  {n:16,sol:"Teflón líquido",sku:"10040686",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
  {n:17,sol:"Herramienta de medición rodado",sku:"6v-9413",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:18,sol:"Ultra sonido",sku:"518-9400",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:19,sol:"Pie de metro",sku:"10011681",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:20,sol:"Juego de dados",sku:"",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:21,sol:"Feller",sku:"",qty:1,resp:"",due:"",stages:[false,false,false,false,false,false]},
  {n:46,sol:"Tacómetro digital",sku:"",qty:1,resp:"",due:"",stages:[true,false,false,false,false,false]},
];

const DEFAULT_USERS = [
  { id:"admin1",   name:"Carlos Mendoza",  role:"admin",        email:"carlos.mendoza@empresa.cl",  password:"admin123",  avatar:"CM", active:true },
  { id:"super1",   name:"María González",  role:"supervisor",   email:"maria.gonzalez@empresa.cl",  password:"super123",  avatar:"MG", active:true },
  { id:"plan1",    name:"Pedro Alvarado",  role:"planificador", email:"pedro.alvarado@empresa.cl",  password:"plan123",   avatar:"PA", active:true },
];

const ROLE_CONFIG = {
  admin:        { label:"Administrador de Contrato", color:"#FBBF24", border:"rgba(251,191,36,0.35)", icon:"👑" },
  supervisor:   { label:"Supervisor",                color:"#60A5FA", border:"rgba(96,165,250,0.35)", icon:"🔷" },
  planificador: { label:"Planificador",              color:"#34D399", border:"rgba(52,211,153,0.35)", icon:"📋" },
};

const PERMS = {
  admin:        ["addItem","editSol","editSku","editQty","editResp","editDue","editStages","deleteItem","changeResp","exportCSV","manageUsers"],
  supervisor:   ["addItem","editSol","editQty","editResp"],
  planificador: ["changeResp","editDue","editStages","exportCSV"],
};
const can = (role, action) => (PERMS[role] || []).includes(action);
const makeAvatar = name => name.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");

// ─── EMAILJS CONFIG — reemplaza con tus credenciales ─────────────────────────
const EMAILJS_SERVICE_ID  = "service_0zktieu";
const EMAILJS_TEMPLATE_ID = "template_ln15cxe";
const EMAILJS_PUBLIC_KEY  = "0hgzu-aCH5p4P67MA";

// ─── EMAIL (envío directo vía EmailJS) ───────────────────────────────────────
async function enviarCorreo(toEmail, toName, subject, message) {
  if(!EMAILJS_SERVICE_ID.startsWith("service_")||!EMAILJS_TEMPLATE_ID.startsWith("template_")||!EMAILJS_PUBLIC_KEY||EMAILJS_PUBLIC_KEY==="TU_PUBLIC_KEY") return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: { to_email: toEmail, to_name: toName, subject, message, nombre: toName, mensaje: message }
      })
    });
    return res.ok;
  } catch { return false; }
}

async function sendEmailAlert(toEmail, toName, itemName, fromName) {
  const subject = "Nueva asignación de requerimiento";
  const message = `
Hola ${toName},

Se te ha asignado el siguiente requerimiento:

  📦 ${itemName}
  Asignado por: ${fromName}

Por favor accede al sistema de requerimientos para revisar los detalles y actualizar el estado.

──────────────────────────
Serviall · Sistema de Requerimientos
Este es un correo automático, no responder.
  `.trim();
  return enviarCorreo(toEmail, toName, subject, message);
}

async function sendDueAlert(toEmail, toName, itemName, status, dl) {
  const subject = status==="overdue" ? "⚠️ Requerimiento vencido – acción requerida" : "🔔 Requerimiento próximo a vencer";
  const message = status==="overdue"
    ? `Hola ${toName},\n\nEl requerimiento "${itemName}" venció hace ${Math.abs(dl)} día${Math.abs(dl)!==1?"s":""} y aún no está completado.\n\nPor favor accede al sistema para actualizarlo a la brevedad.\n\n──────────────────────────\nServiall · Sistema de Requerimientos\nEste es un correo automático, no responder.`
    : `Hola ${toName},\n\nEl requerimiento "${itemName}" vence en ${dl} día${dl!==1?"s":""}.\n\nPor favor accede al sistema para revisarlo a tiempo.\n\n──────────────────────────\nServiall · Sistema de Requerimientos\nEste es un correo automático, no responder.`;
  return enviarCorreo(toEmail, toName, subject, message);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pct = s => Math.round(s.filter(Boolean).length / 6 * 100);
const fmtDate = s => { if(!s) return "—"; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const daysLeft = due => { if(!due) return null; const t=new Date(); t.setHours(0,0,0,0); return Math.round((new Date(due+"T00:00:00")-t)/86400000); };
const dueStatus = (due,stages) => {
  if(!due) return null; if(pct(stages)===100) return "done";
  const t=new Date(); t.setHours(0,0,0,0);
  const diff=Math.round((new Date(due+"T00:00:00")-t)/86400000);
  if(diff<0) return "overdue"; if(diff<=3) return "soon"; return "ok";
};
const DUE_BADGE = {overdue:{bg:"#FEE2E2",color:"#DC2626"},soon:{bg:"#FEF3C7",color:"#D97706"},ok:{bg:"#DCFCE7",color:"#16A34A"},done:{bg:"#EDE9FE",color:"#7C3AED"}};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const btnStyle = {display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:9,fontSize:13,fontWeight:500,cursor:"pointer",border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",color:"#fff",transition:"all 0.15s",whiteSpace:"nowrap"};
const inputStyle = {width:"100%",padding:"8px 12px",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,fontSize:13,color:"#fff",background:"rgba(255,255,255,0.06)",outline:"none",marginBottom:"0.75rem",boxSizing:"border-box"};
const labelStyle = {fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",display:"block",marginBottom:5};
const thStyle = {padding:"10px 12px",textAlign:"center",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid rgba(255,255,255,0.07)",whiteSpace:"nowrap",background:"rgb(18,20,26)"};

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, show, type="info" }) {
  const bg={info:"#1a1c24",success:"#14532D",error:"#7F1D1D",email:"#1E3A5F"}[type]||"#1a1c24";
  return <div style={{position:"fixed",bottom:28,right:28,zIndex:999,background:bg,color:"#fff",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",transform:show?"translateY(0)":"translateY(90px)",opacity:show?1:0,transition:"all 0.35s cubic-bezier(.34,1.56,.64,1)",pointerEvents:"none",maxWidth:320}}>{msg}</div>;
}

// ─── CONFIRM ─────────────────────────────────────────────────────────────────
function ConfirmDialog({ open, msg, onConfirm, onCancel, confirmLabel="Eliminar", confirmColor="#DC2626" }) {
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"rgb(40,43,52)",borderRadius:14,padding:"1.5rem",width:"min(380px,92vw)",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:"#fff"}}>Confirmar acción</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:20}}>{msg}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={btnStyle}>Cancelar</button>
          <button onClick={onConfirm} style={{...btnStyle,background:confirmColor,color:"#fff",border:"none"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── USER MODAL ───────────────────────────────────────────────────────────────
function UserModal({ open, onClose, onSave, editUser, currentAdminId }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState("supervisor");
  const [password, setPassword] = useState("");
  const [active,   setActive]   = useState(true);
  const [pwVis,    setPwVis]    = useState(false);
  const nameRef = useRef();

  useEffect(()=>{
    if(open){
      if(editUser){ setName(editUser.name); setEmail(editUser.email); setRole(editUser.role); setPassword(editUser.password); setActive(editUser.active??true); }
      else { setName(""); setEmail(""); setRole("supervisor"); setPassword(""); setActive(true); }
      setPwVis(false); setTimeout(()=>nameRef.current?.focus(),60);
    }
  },[open,editUser]);

  const handleSave = ()=>{
    if(!name.trim()||!email.trim()||!email.includes("@")||!password.trim()) return;
    onSave({ id:editUser?.id||`u_${Date.now()}`, name:name.trim(), email:email.trim().toLowerCase(), role, password:password.trim(), avatar:makeAvatar(name.trim()), active });
  };

  const isSelf = editUser?.id===currentAdminId;
  if(!open) return null;

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:850,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"rgb(40,43,52)",borderRadius:16,padding:"1.75rem",width:"min(480px,94vw)",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>{editUser?"Editar usuario":"Nuevo usuario"}</div>
            <div style={{fontSize:11,color:"#FBBF24",marginTop:2}}>👑 Solo administradores pueden gestionar usuarios</div>
          </div>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:22,color:"rgba(255,255,255,0.45)",lineHeight:1,padding:4}}>×</button>
        </div>

        {/* Preview */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginBottom:"1.25rem",border:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{width:44,height:44,borderRadius:11,background:ROLE_CONFIG[role]?.color+"28",border:`1.5px solid ${ROLE_CONFIG[role]?.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:ROLE_CONFIG[role]?.color,flexShrink:0}}>
            {name.trim()?makeAvatar(name.trim()):"??"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{name.trim()||"Nombre del usuario"}</div>
            <div style={{fontSize:11,color:ROLE_CONFIG[role]?.color,marginTop:2}}>{ROLE_CONFIG[role]?.icon} {ROLE_CONFIG[role]?.label}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:1}}>{email.trim()||"correo@empresa.cl"}</div>
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:active?"#14532D":"rgba(255,255,255,0.08)",color:active?"#4ADE80":"rgba(255,255,255,0.4)"}}>
            {active?"● Activo":"○ Inactivo"}
          </span>
        </div>

        {/* Nombre */}
        <label style={labelStyle}>Nombre completo *</label>
        <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Juan Pérez García" style={inputStyle}/>

        {/* Email */}
        <label style={labelStyle}>Correo electrónico *</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="juan.perez@empresa.cl" style={inputStyle}/>

        {/* Rol */}
        <label style={labelStyle}>Perfil / Rol *</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"0.75rem"}}>
          {Object.entries(ROLE_CONFIG).map(([r,cfg])=>(
            <div key={r} onClick={()=>!isSelf&&setRole(r)} style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${role===r?cfg.color:"rgba(255,255,255,0.1)"}`,background:role===r?cfg.color+"18":"transparent",cursor:isSelf?"not-allowed":"pointer",transition:"all 0.15s",textAlign:"center",opacity:isSelf&&r!==role?0.35:1}}>
              <div style={{fontSize:22,marginBottom:4}}>{cfg.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:role===r?cfg.color:"rgba(255,255,255,0.5)",lineHeight:1.2}}>{cfg.label}</div>
            </div>
          ))}
        </div>
        {isSelf&&<div style={{fontSize:11,color:"#F87171",marginBottom:"0.75rem"}}>⚠️ No puedes cambiar tu propio rol.</div>}

        {/* Contraseña */}
        <label style={labelStyle}>{editUser?"Contraseña":"Contraseña *"}</label>
        <div style={{position:"relative",marginBottom:"0.75rem"}}>
          <input type={pwVis?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={editUser?"Dejar en blanco para no cambiar":"Mínimo 6 caracteres"} style={{...inputStyle,marginBottom:0,paddingRight:42}}/>
          <button onClick={()=>setPwVis(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",fontSize:14,padding:0}}>
            {pwVis?"🙈":"👁️"}
          </button>
        </div>

        {/* Estado activo */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:9,marginBottom:"1.25rem",border:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>Usuario activo</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Los usuarios inactivos no pueden iniciar sesión</div>
          </div>
          <div onClick={()=>!isSelf&&setActive(v=>!v)} style={{width:44,height:24,borderRadius:12,background:active?"#16A34A":"rgba(255,255,255,0.15)",cursor:isSelf?"not-allowed":"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:active?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:"1px solid rgba(255,255,255,0.09)",paddingTop:"1rem"}}>
          <button onClick={onClose} style={btnStyle}>Cancelar</button>
          <button onClick={handleSave} style={{...btnStyle,background:"#92400E",color:"#fff",border:"none"}}>
            {editUser?"Guardar cambios":"Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── USERS PANEL ─────────────────────────────────────────────────────────────
function UsersPanel({ users, onAdd, onEdit, onDelete, currentAdminId, showToast }) {
  const [uModal,   setUModal]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [confDel,  setConfDel]  = useState(null);
  const [search,   setSearch]   = useState("");
  const [roleFilt, setRoleFilt] = useState("");

  const filtered = users.filter(u=>{
    const q=search.toLowerCase();
    if(q&&!u.name.toLowerCase().includes(q)&&!u.email.toLowerCase().includes(q)) return false;
    if(roleFilt&&u.role!==roleFilt) return false;
    return true;
  });

  const handleSave = ud => {
    if(editing){ onEdit(ud); showToast("Usuario actualizado ✓","success"); }
    else       { onAdd(ud);  showToast(`Usuario ${ud.name} creado ✓`,"success"); }
    setUModal(false); setEditing(null);
  };

  const ALL_PERMS = [
    {key:"addItem",    label:"Agregar ítems"},
    {key:"editSku",    label:"Editar SKU"},
    {key:"editQty",    label:"Editar cantidad"},
    {key:"editResp",   label:"Asignar responsable"},
    {key:"changeResp", label:"Cambiar responsable"},
    {key:"editDue",    label:"Fecha cumplimiento"},
    {key:"editStages", label:"Gestionar etapas"},
    {key:"deleteItem", label:"Eliminar ítems"},
    {key:"exportCSV",  label:"Exportar CSV"},
    {key:"manageUsers",label:"Gestionar usuarios"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1}}>👥 Gestión de Usuarios</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginTop:4}}>
            <span style={{color:"#FBBF24"}}>👑</span> Exclusivo para el Administrador de Contrato
          </div>
        </div>
        <button onClick={()=>{setEditing(null);setUModal(true);}} style={{...btnStyle,background:"#92400E",color:"#fff",border:"none"}}>+ Nuevo usuario</button>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          {label:"Total",     value:users.length,                    color:"#FBBF24"},
          {label:"Activos",   value:users.filter(u=>u.active).length,color:"#4ADE80"},
          {label:"Inactivos", value:users.filter(u=>!u.active).length,color:"#F87171"},
          ...Object.entries(ROLE_CONFIG).map(([r,cfg])=>({label:cfg.label,value:users.filter(u=>u.role===r).length,color:cfg.color}))
        ].map((s,i)=>(
          <div key={i} style={{background:"rgb(40,43,52)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"0.9rem 1.1rem",flex:"1 1 100px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
        {/* Filtros */}
        <div style={{display:"flex",gap:8,alignItems:"center",padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o correo..." style={{...inputStyle,paddingLeft:32,margin:0}}/>
          </div>
          <select value={roleFilt} onChange={e=>setRoleFilt(e.target.value)} style={{...inputStyle,margin:0,width:"auto",cursor:"pointer",colorScheme:"dark"}}>
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_CONFIG).map(([r,cfg])=><option key={r} value={r}>{cfg.icon} {cfg.label}</option>)}
          </select>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.35)",whiteSpace:"nowrap"}}>{filtered.length} de {users.length}</span>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:650}}>
            <thead>
              <tr>
                <th style={{...thStyle,textAlign:"left"}}>Usuario</th>
                <th style={{...thStyle,textAlign:"left"}}>Correo</th>
                <th style={thStyle}>Perfil</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Contraseña</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr><td colSpan={6} style={{textAlign:"center",padding:"3rem",color:"rgba(255,255,255,0.3)"}}>
                  <div style={{fontSize:28,marginBottom:8}}>👥</div>
                  <div style={{fontWeight:600}}>Sin resultados</div>
                </td></tr>
              ):filtered.map(u=>{
                const rc=ROLE_CONFIG[u.role]; const isSelf=u.id===currentAdminId;
                return (
                  <tr key={u.id} style={{borderBottom:"1px solid rgba(255,255,255,0.05)",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:36,height:36,borderRadius:9,background:rc.color+"22",border:`1.5px solid ${rc.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:rc.color,flexShrink:0}}>{u.avatar}</div>
                        <div>
                          <div style={{fontWeight:600,color:"#fff"}}>{u.name} {isSelf&&<span style={{fontSize:10,color:"#FBBF24",fontWeight:400}}>(tú)</span>}</div>
                          <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:1,fontFamily:"monospace"}}>ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px"}}><span style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>{u.email}</span></td>
                    <td style={{padding:"10px 14px",textAlign:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:rc.color,background:rc.color+"18",padding:"3px 10px",borderRadius:20,border:`1px solid ${rc.color}35`}}>{rc.icon} {rc.label}</span>
                    </td>
                    <td style={{padding:"10px 14px",textAlign:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:u.active?"#14532D":"rgba(255,255,255,0.07)",color:u.active?"#4ADE80":"rgba(255,255,255,0.35)"}}>
                        {u.active?"● Activo":"○ Inactivo"}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px",textAlign:"center"}}>
                      <span style={{fontSize:12,fontFamily:"monospace",color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em"}}>{"•".repeat(Math.min(u.password.length,8))}</span>
                    </td>
                    <td style={{padding:"10px 14px",textAlign:"center"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                        <button onClick={()=>{setEditing(u);setUModal(true);}} title="Editar" style={{width:28,height:28,border:"none",background:"none",cursor:"pointer",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"rgba(255,255,255,0.35)"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(251,191,36,0.2)";e.currentTarget.style.color="#FBBF24";}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.35)";}}>✏️</button>
                        {!isSelf&&<button onClick={()=>setConfDel(u)} title="Eliminar" style={{width:28,height:28,border:"none",background:"none",cursor:"pointer",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"rgba(255,255,255,0.35)"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(220,38,38,0.2)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.35)";}}>✕</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de permisos por rol */}
      <div style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1.25rem"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:"1rem",color:"rgba(255,255,255,0.75)"}}>📋 Tabla de permisos por perfil</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {Object.entries(ROLE_CONFIG).map(([r,cfg])=>(
            <div key={r} style={{padding:"12px",borderRadius:10,border:`1px solid ${cfg.color}28`,background:cfg.color+"07"}}>
              <div style={{fontSize:12,fontWeight:700,color:cfg.color,marginBottom:10}}>{cfg.icon} {cfg.label}</div>
              {ALL_PERMS.map(p=>(
                <div key={p.key} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <div style={{width:14,height:14,borderRadius:4,background:PERMS[r].includes(p.key)?cfg.color:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {PERMS[r].includes(p.key)&&<svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:11,color:PERMS[r].includes(p.key)?"rgba(255,255,255,0.75)":"rgba(255,255,255,0.25)"}}>{p.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <UserModal open={uModal} onClose={()=>{setUModal(false);setEditing(null);}} onSave={handleSave} editUser={editing} currentAdminId={currentAdminId}/>
      <ConfirmDialog open={!!confDel} msg={`¿Eliminar al usuario "${confDel?.name}"? Esta acción es irreversible.`} onConfirm={()=>{ onDelete(confDel.id); showToast("Usuario eliminado","info"); setConfDel(null); }} onCancel={()=>setConfDel(null)}/>
    </div>
  );
}

// ─── ITEM MODAL ───────────────────────────────────────────────────────────────
function ItemModal({ open, onClose, onSave, editItem, userRole, userName, responsables }) {
  const [sol,setSol]=useState(""); const [sku,setSku]=useState(""); const [qty,setQty]=useState(1);
  const [resp,setResp]=useState(""); const [due,setDue]=useState(""); const [stages,setStages]=useState([false,false,false,false,false,false]);
  const [sending,setSending]=useState(false); const inputRef=useRef();

  useEffect(()=>{
    if(open){
      if(editItem){setSol(editItem.sol);setSku(editItem.sku||"");setQty(editItem.qty??1);setResp(editItem.resp||"");setDue(editItem.due||"");setStages([...editItem.stages]);}
      else{setSol("");setSku("");setQty(1);setResp("");setDue("");setStages([false,false,false,false,false,false]);}
      setTimeout(()=>inputRef.current?.focus(),50);
    }
  },[open,editItem]);

  const handleSave=async()=>{
    if(!sol.trim()){inputRef.current?.focus();return;}
    const prev=editItem?.resp||""; const nr=resp.trim();
    if(nr&&nr!==prev){setSending(true); const r=responsables.find(r=>r.name===nr); if(r) await sendEmailAlert(r.email,r.name,sol.trim(),userName); setSending(false);}
    onSave({sol:sol.trim(),sku:sku.trim(),qty:Math.max(1,parseInt(qty)||1),resp:nr,due,stages},nr!==prev&&nr?nr:null);
  };

  if(!open) return null;
  const showSku=can(userRole,"editSku"); const showDue=can(userRole,"editDue"); const showStages=can(userRole,"editStages");

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"rgb(40,43,52)",borderRadius:16,padding:"1.75rem",width:"min(520px,94vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>{editItem?"Editar ítem":"Nuevo ítem"}</div>
            <div style={{fontSize:11,color:ROLE_CONFIG[userRole].color,marginTop:2}}>{ROLE_CONFIG[userRole].icon} {ROLE_CONFIG[userRole].label}</div>
          </div>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:22,color:"rgba(255,255,255,0.45)",lineHeight:1,padding:4}}>×</button>
        </div>
        <label style={labelStyle}>Solicitud / descripción *</label>
        <input ref={inputRef} value={sol} onChange={e=>setSol(e.target.value)} placeholder="Ej: Guantes de cuero talla M" style={inputStyle}/>
        {showSku&&<><label style={labelStyle}>SKU interno / N° de parte</label><input value={sku} onChange={e=>setSku(e.target.value)} placeholder="Ej: 10021393" style={inputStyle}/></>}
        <div style={{display:"grid",gridTemplateColumns:showDue?"1fr 1fr":"1fr",gap:12}}>
          <div><label style={labelStyle}>Cantidad</label><input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} style={inputStyle}/></div>
          {showDue&&<div><label style={labelStyle}>📅 Fecha de cumplimiento</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{...inputStyle,colorScheme:"dark"}}/></div>}
        </div>
        <label style={labelStyle}>Responsable</label>
        <select value={resp} onChange={e=>setResp(e.target.value)} style={{...inputStyle,cursor:"pointer",colorScheme:"dark"}}>
          <option value="">— Sin asignar —</option>
          {responsables.map(r=><option key={r.name} value={r.name}>{r.name} ({r.email})</option>)}
        </select>
        {showStages&&<>
          <label style={labelStyle}>Etapas completadas</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1.25rem"}}>
            {STAGE_FULL.map((s,i)=>(
              <label key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:stages[i]?"#fff":"rgba(255,255,255,0.8)",cursor:"pointer",padding:"7px 10px",borderRadius:8,background:stages[i]?STAGE_COLORS[i]+"33":"rgba(255,255,255,0.07)",border:`1.5px solid ${stages[i]?STAGE_COLORS[i]:"rgba(255,255,255,0.15)"}`,transition:"all 0.15s"}}>
                <input type="checkbox" checked={stages[i]} onChange={e=>{const ns=[...stages];if(i===5&&!stages[i]){setStages(ns.map(()=>true));return;}if(i===5&&stages[i]){setStages(ns.map(()=>false));return;}ns[i]=e.target.checked;if(!e.target.checked&&ns[5])ns[5]=false;setStages(ns);}} style={{accentColor:STAGE_COLORS[i],width:15,height:15}}/>
                <span style={{fontWeight:stages[i]?600:400}}>{s}</span>
              </label>
            ))}
          </div>
        </>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:"1px solid rgba(255,255,255,0.09)",paddingTop:"1rem"}}>
          <button onClick={onClose} style={btnStyle}>Cancelar</button>
          <button onClick={handleSave} disabled={sending} style={{...btnStyle,background:"#2563EB",color:"#fff",border:"none",opacity:sending?0.7:1}}>
            {sending?"⏳ Enviando...":editItem?"Guardar cambios":"Agregar ítem"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BULK ADD MODAL ───────────────────────────────────────────────────────────
function BulkAddModal({ open, onClose, onSave }) {
  const [tab, setTab] = useState("paste");
  const [pasteText, setPasteText] = useState("");
  const [aiDesc, setAiDesc] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => { if(open){ setPasteText(""); setAiDesc(""); setPreview([]); setAiError(""); setTab("paste"); } }, [open]);

  // Parse pasted text: each line = "Solicitud | SKU | Cantidad"
  useEffect(() => {
    if(tab !== "paste") return;
    const lines = pasteText.split("\n").map(l=>l.trim()).filter(Boolean);
    const parsed = lines.map((line, i) => {
      const parts = line.split("|").map(p=>p.trim());
      return { n: i+1, sol: parts[0]||"", sku: parts[1]||"", qty: parseInt(parts[2])||1, stages:[false,false,false,false,false,false], resp:"", due:"" };
    }).filter(p=>p.sol);
    setPreview(parsed);
  }, [pasteText, tab]);

  const generateWithAI = async () => {
    if(!aiDesc.trim()) return;
    setLoading(true); setAiError(""); setPreview([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1500,
          messages:[{ role:"user", content:`Genera una lista de requerimientos de materiales, herramientas o insumos para el siguiente contexto de trabajo: "${aiDesc.trim()}". Responde ÚNICAMENTE con un array JSON sin backticks ni texto adicional, usando este formato exacto: [{"sol":"nombre descriptivo del item","sku":"","qty":1}]. Genera entre 8 y 20 ítems relevantes y específicos.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const items = JSON.parse(clean);
      setPreview(items.map((it,i)=>({ n:i+1, sol:it.sol||"", sku:it.sku||"", qty:parseInt(it.qty)||1, stages:[false,false,false,false,false,false], resp:"", due:"" })).filter(p=>p.sol));
    } catch(e) { setAiError("No se pudo generar la lista. Intenta de nuevo."); }
    setLoading(false);
  };

  const handleSave = () => { if(preview.length) { onSave(preview); onClose(); } };

  if(!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"rgb(40,43,52)",borderRadius:16,padding:"1.75rem",width:"min(680px,96vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",gap:"1.25rem"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>📋 Agregar lista masiva</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Importa múltiples requerimientos de una vez</div>
          </div>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:22,color:"rgba(255,255,255,0.45)",lineHeight:1,padding:4}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"rgb(22,25,30)",borderRadius:10,padding:4}}>
          {[{id:"paste",label:"📄 Pegar texto"},{id:"ai",label:"🤖 Generar con IA"}].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setPreview([]);setAiError("");}} style={{flex:1,padding:"8px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.2s",background:tab===t.id?"#2563EB":"transparent",color:tab===t.id?"#fff":"rgba(255,255,255,0.4)"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PASTE MODE */}
        {tab==="paste"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 12px",border:"1px solid rgba(255,255,255,0.08)"}}>
              <strong style={{color:"rgba(255,255,255,0.75)"}}>Formato:</strong> una solicitud por línea.<br/>
              <span style={{fontFamily:"monospace",fontSize:11,color:"#60A5FA"}}>Nombre del ítem | SKU (opcional) | Cantidad (opcional)</span>
            </div>
            <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"Guantes de cuero talla M | 10021393 | 2\nCinta adhesiva roja | 10009831 | 5\nEscalera 4 peldaños\nSoplador industrial | | 3"} style={{...inputStyle,height:180,resize:"vertical",fontFamily:"monospace",fontSize:12,lineHeight:1.6,marginBottom:0}}/>
          </div>
        )}

        {/* AI MODE */}
        {tab==="ai"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <label style={labelStyle}>Describe el contexto o tipo de trabajo</label>
            <textarea value={aiDesc} onChange={e=>setAiDesc(e.target.value)} placeholder={"Ej: Mantención eléctrica de subestación industrial, trabajos en altura con andamios, necesito EPP y herramientas eléctricas."} style={{...inputStyle,height:110,resize:"vertical",fontSize:13,lineHeight:1.6,marginBottom:0}}/>
            <button onClick={generateWithAI} disabled={loading||!aiDesc.trim()} style={{...btnStyle,background:"#7C3AED",color:"#fff",border:"none",justifyContent:"center",opacity:loading||!aiDesc.trim()?0.6:1}}>
              {loading?"⏳ Generando lista...":"✨ Generar requerimientos con IA"}
            </button>
            {aiError&&<div style={{fontSize:12,color:"#F87171",background:"rgba(239,68,68,0.1)",padding:"8px 12px",borderRadius:8}}>⚠️ {aiError}</div>}
          </div>
        )}

        {/* PREVIEW */}
        {preview.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)"}}>Vista previa — {preview.length} ítem{preview.length!==1?"s":""} a importar</div>
            <div style={{maxHeight:260,overflowY:"auto",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,background:"rgb(22,25,30)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"rgb(18,20,26)"}}>
                    <th style={{...thStyle,textAlign:"left",padding:"8px 10px"}}>#</th>
                    <th style={{...thStyle,textAlign:"left",padding:"8px 10px"}}>Solicitud</th>
                    <th style={{...thStyle,textAlign:"left",padding:"8px 10px"}}>SKU</th>
                    <th style={{...thStyle,padding:"8px 10px"}}>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((it,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <td style={{padding:"7px 10px",color:"rgba(255,255,255,0.35)"}}>{i+1}</td>
                      <td style={{padding:"7px 10px",fontWeight:500,color:"#fff"}}>{it.sol}</td>
                      <td style={{padding:"7px 10px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{it.sku||"—"}</td>
                      <td style={{padding:"7px 10px",textAlign:"center",fontWeight:600}}>{it.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:"1px solid rgba(255,255,255,0.09)",paddingTop:"1rem"}}>
          <button onClick={onClose} style={btnStyle}>Cancelar</button>
          <button onClick={handleSave} disabled={preview.length===0} style={{...btnStyle,background:"#16A34A",color:"#fff",border:"none",opacity:preview.length===0?0.4:1}}>
            ✓ Agregar {preview.length>0?`${preview.length} ítem${preview.length!==1?"s":""}`:""} al listado
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STAGE PROGRESS & CHECK ───────────────────────────────────────────────────
function StageProgress({ stages }) {
  const p=pct(stages); const c=p===100?"#16A34A":p>0?"#D97706":"#DC2626"; const bg=p===100?"#DCFCE7":p>0?"#FEF3C7":"#FEE2E2";
  return <div style={{minWidth:80}}><span style={{fontSize:11,fontWeight:700,color:c,background:bg,padding:"1px 7px",borderRadius:20,display:"inline-block",marginBottom:3}}>{p}%</span><div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.12)",overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c,borderRadius:3,transition:"width 0.4s"}}/></div></div>;
}
function StageCheck({ checked, color, onChange, label, disabled }) {
  return <td style={{textAlign:"center",padding:"8px 4px"}}><div onClick={disabled?undefined:onChange} title={label} style={{width:22,height:22,borderRadius:6,border:`2px solid ${checked?color:"rgba(255,255,255,0.2)"}`,background:checked?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:disabled?"not-allowed":"pointer",transition:"all 0.15s",opacity:disabled?0.3:1,margin:"0 auto"}}>{checked&&<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div></td>;
}
function MetricCard({ label, value, sub, color }) {
  return <div style={{background:"rgb(40,43,52)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"1rem 1.25rem",flex:"1 1 130px"}}><div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{label}</div><div style={{fontSize:28,fontWeight:800,color,lineHeight:1}}>{value}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:5}}>{sub}</div></div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, users }) {
  const [sel,setSel]=useState(null); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const ref=useRef();
  const active=users.filter(u=>u.active);
  const selUser=users.find(u=>u.id===sel);

  const doLogin=()=>{
    const u=users.find(u=>u.id===sel&&u.password===pw);
    if(!u){setErr("Contraseña incorrecta");return;}
    if(!u.active){setErr("Usuario inactivo. Contacta al administrador.");return;}
    onLogin(u);
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"rgb(15,17,22)",fontFamily:"'Segoe UI',system-ui,sans-serif",alignItems:"center",justifyContent:"center",padding:"1.5rem",position:"relative",overflow:"hidden"}}>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAp4AAALtCAYAAACBwGT8AAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAceUlEQVR4nO3dTY9lSWLX4X/EOedmZlX1y8zYY2xLwAaEx7I0SCAhZBaIDRJLxIIVn4ZvwdY7fwOWSAgDwsgIjyUk82Zg5GmP+60qM+89J4LFuVnVbVu2VdkTtyvreaTsqKquakVnZuX9ZZwTcRIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+POVS08A3lf/+Bd+qf/c7Ze5WU9JL0np79aYpCZZa3Kckp6k9uSw1dyckq3UvLo+5Eeff5LfeuJfa/7Zh9/v371t+WCasrb7vDy0HOuW2lrm1nK97r/vVGvWmmylpJdkbknJZT5+Ncm81fSS3M4tNT3PTy29tHxx1bKVmhf9OodyyP1dzxcfPMtvfPIHT/rjCPzszZeeALyvfvjX/nr+0Xe/l+/e3156Km+l9qT0lq0mr5ZkrTVTq7laa65PJWud89O55t/95P/mt37nP1x6uj8z/+QXv9v/xQ//Qf7Kqy0fbD13x5d59WLKduipa8uhtVyvLVPb30dr3QO0l2Rqlyvy2mvqNqXVni8PLVNf8/F9S8mWz6/2bxzKqy3P5w9yf1/yP5bkN/7NH1xotsBTITzhQn7++lm+f7zP92/vLz2VtzL1lqttyzq1fHGoOdaaqZcc1jnPjkuOteRwU/PLy/Wlp/ozNb38NN/PKT9/e8yHa8txu8+rueTUW6at57DtK4nzlmwP4TklLSVTT9LrReZdelL7nOOUPMuauW/5ubs1pbd80HvWUnJ1LLk6zWnlOjlcXWSewNMiPOFCystXub5acn13l5qkJe/UWHvLoZ2ylaStU65qTenJ3GoOpyWlnnK1LfnoiV+cfTbPebaesrz6LNel5rpsmdeal8f7TDU5tC3Xx2Tq+yX2udTMtZ2vetek14t8/JIkfUqdetLWzK1lue+paXnW90vtz/oh6/0XqfU+V88++lm/K4H3gPCEC7lqPaUkmXp6T1LyTo2995zKlF6SmqssLZlyTMmWdZmylTU3S8np888GvlfH67nK6e5lnl21rOtdaq2p65JnZcnW15RSsk1JerKWJS1JaklJy/4JcJmPfz9naCnJzdZTe8lxnpLs31TUnrRMaXNLndZs/Tjy3Qo8UcITLqSkpfT9x+e9Ou/UuO3NlJaS9JKSZEpPK8lWWrZSMuWYmu0v8+54Z/XMqekpWdPLll5KpvOyYn/4PaVlS81WalpJ6p6fb/4bF/j4ta+sgR62fa7HaV8LnbeampZWanpp6WVLK1+fM8DbuMzNRQAAvHeEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkA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" alt="" style={{position:"absolute",bottom:"-60px",right:"-60px",width:"55vw",maxWidth:520,opacity:0.07,pointerEvents:"none",userSelect:"none",zIndex:0}}/>
      <img src="data:image/png;base64,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RQAAvHeEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkAwBDCEwCAIYQnAABDCE8AAIYQngAADCE8AQAYQngCADCE8AQAYAjhCQDAEMITAIAhhCcAAEMITwAAhhCeAAAMITwBABhCeAIAMITwBABgCOEJAMAQwhMAgCGEJwAAQwhPAACGEJ4AAAwhPAEAGEJ4AgAwhPAEAGAI4QkA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" alt="" style={{position:"absolute",top:"-80px",left:"-80px",width:"40vw",maxWidth:380,opacity:0.04,pointerEvents:"none",userSelect:"none",zIndex:0,transform:"rotate(180deg)"}}/>
      <div style={{width:"min(520px,100%)",display:"flex",flexDirection:"column",gap:"1.5rem",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{background:"#CC0000",borderRadius:14,padding:"14px 28px",display:"inline-block"}}>
            <img src="data:image/png;base64,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" alt="Serviall" style={{height:52,objectFit:"contain"}}/>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",lineHeight:1.2}}>Requerimientos Serviall RT</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Selecciona tu perfil para continuar</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {active.map(u=>{
            const rc=ROLE_CONFIG[u.role]; const isSel=sel===u.id;
            return (
              <div key={u.id} onClick={()=>{setSel(u.id);setPw("");setErr("");setTimeout(()=>ref.current?.focus(),80);}}
                style={{padding:"1rem 1.25rem",borderRadius:14,border:`1.5px solid ${isSel?rc.color:"rgba(255,255,255,0.09)"}`,background:isSel?"rgba(255,255,255,0.05)":"rgb(22,25,30)",cursor:"pointer",transition:"all 0.2s",boxShadow:isSel?`0 0 0 3px ${rc.color}20`:"",display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:42,height:42,borderRadius:11,background:isSel?rc.color+"22":"rgba(255,255,255,0.05)",border:`1.5px solid ${isSel?rc.color:"rgba(255,255,255,0.09)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{rc.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{u.name}</span>
                    {isSel&&<span style={{fontSize:10,fontWeight:700,color:rc.color,background:rc.color+"20",padding:"2px 8px",borderRadius:20}}>SELECCIONADO</span>}
                  </div>
                  <div style={{fontSize:12,color:rc.color,marginTop:1}}>{rc.label}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>{u.email}</div>
                </div>
                <div style={{fontSize:16,color:isSel?rc.color:"rgba(255,255,255,0.15)"}}>{isSel?"●":"○"}</div>
              </div>
            );
          })}
        </div>
        {sel&&(
          <div style={{background:"rgb(22,25,30)",borderRadius:14,padding:"1.25rem",border:"1px solid rgba(255,255,255,0.09)"}}>
            <label style={labelStyle}>Contraseña para {selUser?.name}</label>
            <input ref={ref} type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Ingresa tu contraseña" style={{...inputStyle,marginBottom:err?"0.5rem":"0"}}/>
            {err&&<div style={{fontSize:12,color:"#F87171",marginBottom:"0.75rem"}}>⚠️ {err}</div>}
            <button onClick={doLogin} style={{...btnStyle,background:selUser?.role==="admin"?"#92400E":selUser?.role==="supervisor"?"#1D4ED8":"#065F46",color:"#fff",border:"none",width:"100%",justifyContent:"center",fontSize:14,fontWeight:600,padding:"10px 16px"}}>
              Ingresar
            </button>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.22)",textAlign:"center",marginTop:10}}>
              Demo: <span style={{fontFamily:"monospace",color:"rgba(255,255,255,0.4)"}}>{selUser?.password}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users,setUsers]=useState(null); const [ul,setUL]=useState(false); const [currentUser,setCU]=useState(null);

  useEffect(()=>{
    (async()=>{
      try{const r=JSON.parse(localStorage.getItem("sys_users_v2") || "null") !== null ? {value: localStorage.getItem("sys_users_v2")} : null;setUsers(r?JSON.parse(r.value):DEFAULT_USERS);}
      catch{setUsers(DEFAULT_USERS);}
      setUL(true);
    })();
  },[]);
  useEffect(()=>{if(users&&ul) localStorage.setItem("sys_users_v2", JSON.stringify(users));},[users,ul]);

  if(!ul) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#999",fontSize:14}}>Cargando...</div>;
  if(!currentUser) return <LoginScreen onLogin={setCU} users={users}/>;
  return <Dashboard user={currentUser} users={users} setUsers={setUsers} onLogout={()=>setCU(null)} onUserUpdated={u=>{if(currentUser.id===u.id) setCU(u);}}/>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, users, setUsers, onLogout, onUserUpdated }) {
  const [activeTab,setAT]=useState("cliente"); const [mainView,setMV]=useState("dashboard");
  const [dataCliente,setDC]=useState(null); const [dataInterno,setDI]=useState(null); const [loaded,setLoaded]=useState(false);
  const [view,setView]=useState("all"); const [search,setSrch]=useState(""); const [stageFilter,setSF]=useState("");
  const [modal,setModal]=useState(false); const [editItem,setEI]=useState(null);
  const [bulkModal,setBulkModal]=useState(false);
  const [confirm,setCnf]=useState(null); const [toast,setToast]=useState({show:false,msg:"",type:"info"});
  const [inlineResp,setIR]=useState({}); const [inlineDue,setID]=useState({});

  const role=user.role;
  const data=activeTab==="cliente"?dataCliente:dataInterno;
  const setData=activeTab==="cliente"?setDC:setDI;
  const responsables=useMemo(()=>users.filter(u=>u.active).map(u=>({name:u.name,email:u.email})),[users]);

  useEffect(()=>{
    (async()=>{
      try{const r=JSON.parse(localStorage.getItem("reqs_cliente_v3") || "null") !== null ? {value: localStorage.getItem("reqs_cliente_v3")} : null;setDC(r?JSON.parse(r.value):RAW_DATA.map(d=>({...d,stages:[...d.stages]})));}
      catch{setDC(RAW_DATA.map(d=>({...d,stages:[...d.stages]})));}
      try{const r=JSON.parse(localStorage.getItem("reqs_interno_v3") || "null") !== null ? {value: localStorage.getItem("reqs_interno_v3")} : null;setDI(r?JSON.parse(r.value):[]);}
      catch{setDI([]);}
      setLoaded(true);
    })();
  },[]);
  useEffect(()=>{if(dataCliente&&loaded) localStorage.setItem("reqs_cliente_v3", JSON.stringify(dataCliente));},[dataCliente,loaded]);
  useEffect(()=>{if(dataInterno&&loaded) localStorage.setItem("reqs_interno_v3", JSON.stringify(dataInterno));},[dataInterno,loaded]);

  // ── Alertas de vencimiento ────────────────────────────────────────────────
  useEffect(()=>{
    if(!loaded||!dataCliente||!dataInterno) return;
    const checkDueAlerts = async () => {
      // Cargar set de alertas ya enviadas hoy para no duplicar
      let sent = {};
      try { const r=JSON.parse(localStorage.getItem("due_alerts_sent_v1") || "null") !== null ? {value: localStorage.getItem("due_alerts_sent_v1")} : null; sent=r?JSON.parse(r.value):{}; } catch{}
      const today = new Date().toISOString().slice(0,10);
      // Limpiar alertas de días anteriores
      Object.keys(sent).forEach(k=>{ if(!k.startsWith(today)) delete sent[k]; });

      const allItems = [...(dataCliente||[]),...(dataInterno||[])];
      let sentCount=0;
      for(const item of allItems){
        if(!item.due||!item.resp||pct(item.stages)===100) continue;
        const st=dueStatus(item.due,item.stages);
        if(st!=="overdue"&&st!=="soon") continue;
        const dl=daysLeft(item.due);
        const alertKey=`${today}_${item.n}_${item.sol}_${st}`;
        if(sent[alertKey]) continue; // ya enviada hoy
        const r=users.find(u=>u.name===item.resp&&u.active);
        if(!r) continue;
        const ok=await sendDueAlert(r.email,r.name,item.sol,st,dl);
        if(ok){ sent[alertKey]=true; sentCount++; }
      }
      if(sentCount>0){
        localStorage.setItem("due_alerts_sent_v1", JSON.stringify(sent));
        showToast(`✅ ${sentCount} correo${sentCount!==1?"s":""} de vencimiento enviado${sentCount!==1?"s":""}`, "success");
      }
    };
    checkDueAlerts();
    // Repetir cada hora mientras la sesión esté abierta
    const interval = setInterval(checkDueAlerts, 60*60*1000);
    return ()=>clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loaded]);

  const showToast=(msg,type="info")=>{setToast({show:true,msg,type});setTimeout(()=>setToast(t=>({...t,show:false})),3200);};

  const toggleStage=(idx,si)=>{
    if(!can(role,"editStages")) return;
    setData(d=>d.map((item,i)=>{
      if(i!==idx) return item; const ns=[...item.stages];
      if(si===5&&!ns[5]) return {...item,stages:ns.map(()=>true)};
      if(si===5&&ns[5])  return {...item,stages:ns.map(()=>false)};
      if(si<5&&ns[si]&&ns[5]){ns[si]=false;ns[5]=false;return {...item,stages:ns};}
      ns[si]=!ns[si]; return {...item,stages:ns};
    }));
  };

  const removeItem=idx=>setCnf({idx,name:data[idx].sol});
  const confirmRemove=()=>{setData(d=>d.filter((_,i)=>i!==confirm.idx));showToast("Ítem eliminado");setCnf(null);};
  const openEdit=(item,idx)=>{setEI({...item,_idx:idx});setModal(true);};

  const handleSave=({sol,sku,qty,resp,due,stages},newResp)=>{
    if(editItem&&editItem._idx!==undefined){setData(d=>d.map((it,i)=>i===editItem._idx?{...it,sol,sku,qty,resp,due,stages}:it));showToast("Ítem actualizado ✓","success");}
    else{const maxN=data.length?Math.max(...data.map(d=>d.n)):0;setData(d=>[...d,{n:maxN+1,sol,sku,qty,resp,due,stages}]);showToast("Ítem agregado ✓","success");}
    if(newResp) showToast(`📧 Enviando correo a ${newResp}...`,"email");
    setModal(false);setEI(null);
  };

  const handleBulkSave=(items)=>{
    const maxN=data.length?Math.max(...data.map(d=>d.n)):0;
    const newItems=items.map((it,i)=>({...it,n:maxN+1+i}));
    setData(d=>[...d,...newItems]);
    showToast(`✓ ${newItems.length} ítem${newItems.length!==1?"s":""} agregados al listado`,"success");
  };

  const handleInlineResp=async(idx,nr)=>{
    const item=data[idx]; const prev=item.resp;
    setData(d=>d.map((it,i)=>i===idx?{...it,resp:nr}:it)); setIR(p=>({...p,[idx]:false}));
    if(nr&&nr!==prev){const r=responsables.find(r=>r.name===nr);if(r){showToast(`📧 Enviando correo a ${nr}...`,"email");const ok=await sendEmailAlert(r.email,r.name,item.sol,user.name);showToast(ok?`✅ Correo enviado a ${nr}`:`⚠️ Error al enviar correo (revisa credenciales EmailJS)`,ok?"success":"error");}}
  };
  const handleInlineDue=(idx,nd)=>{setData(d=>d.map((it,i)=>i===idx?{...it,due:nd}:it));setID(p=>({...p,[idx]:false}));showToast("Fecha actualizada ✓","success");};

  const exportCSV=()=>{
    const h=["N°","Solicitud","SKU","Cantidad","Responsable","Fecha",...STAGE_FULL,"% Avance"];
    const rows=data.map(d=>[d.n,`"${d.sol}"`,d.sku,d.qty??1,`"${d.resp||""}"`,d.due||"",...d.stages.map(v=>v?"Sí":"No"),pct(d.stages)+"%"]);
    const csv=[h,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    a.download=activeTab==="cliente"?"reqs_cliente.csv":"reqs_internos.csv";a.click();showToast("CSV exportado ↓");
  };

  const filtered=useMemo(()=>{
    if(!data) return [];
    return data.filter(d=>{
      const q=search.toLowerCase();
      if(q&&!d.sol.toLowerCase().includes(q)&&!(d.sku||"").toLowerCase().includes(q)) return false;
      const p=pct(d.stages);
      if(view==="done"&&p!==100) return false; if(view==="mid"&&!(p>0&&p<100)) return false;
      if(view==="none"&&p!==0) return false;
      if(view==="overdue"){const st=dueStatus(d.due,d.stages);if(st!=="overdue")return false;}
      if(stageFilter!==""&&!d.stages[parseInt(stageFilter)]) return false;
      return true;
    });
  },[data,view,search,stageFilter]);

  const metrics=useMemo(()=>{
    if(!data) return {total:0,done:0,mid:0,none:0,overdue:0,overall:0};
    const total=data.length; const done=data.filter(d=>pct(d.stages)===100).length;
    const mid=data.filter(d=>{const p=pct(d.stages);return p>0&&p<100;}).length;
    const none=data.filter(d=>pct(d.stages)===0).length;
    const overdue=data.filter(d=>dueStatus(d.due,d.stages)==="overdue").length;
    const overall=total?Math.round(data.reduce((a,d)=>a+pct(d.stages),0)/total):0;
    return {total,done,mid,none,overdue,overall};
  },[data]);

  const pieData=useMemo(()=>{
    if(!data||!metrics.total) return [];
    return [{name:"Completados",value:metrics.done,color:"#16A34A"},{name:"En progreso",value:metrics.mid,color:"#D97706"},{name:"Sin iniciar",value:metrics.none,color:"#DC2626"}].filter(d=>d.value>0);
  },[data,metrics]);

  const rc=ROLE_CONFIG[role];
  const NavBtn=({v,label,dot,cnt})=><button onClick={()=>{setView(v);setMV("dashboard");}} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 12px",borderRadius:9,border:"none",width:"100%",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:(view===v&&mainView==="dashboard")?600:400,background:(view===v&&mainView==="dashboard")?"rgba(255,255,255,0.12)":"transparent",color:"#fff",transition:"all 0.15s"}}><div style={{width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0}}/>{label}<span style={{marginLeft:"auto",fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:400}}>{cnt}</span></button>;

  if(!loaded) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#999",fontSize:14}}>Cargando...</div>;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"rgb(30,33,40)",fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:14,color:"#fff"}}>

      {/* SIDEBAR */}
      <aside style={{background:"rgb(22,25,30)",borderRight:"1px solid rgba(255,255,255,0.07)",width:232,flexShrink:0,display:"flex",flexDirection:"column",gap:"1rem",padding:"1.25rem 0.875rem",overflowY:"auto"}}>
        <div style={{paddingBottom:"0.75rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP8AAADFCAYAAACb6SQBAACH1UlEQVR4nOy9d7xt51Xf+x1zzlV2OfX2e9UlW7JlW26yMe4Fm2BsegvNQIDgkPAIJLSQAoEEEkIJoQQSeI8WAo4BY2Mbg3GvsrEsF/V+putpt+tzj/SP95b28Z9L3n7OlvS3e5p7971x33PO2WuvvddZ67u+3+934IQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOOGEE0444YQTTjjhhBNOOGEE04oIP8PJJmSoQAAAABJRU5ErkJggg==" alt="" style={{height:36,objectFit:"contain",opacity:0.85}}/>
            <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>Requerimientos</div>
            <div style={{padding:"8px 10px",borderRadius:10,background:`${rc.color}10`,border:`1px solid ${rc.border}`,width:"100%",boxSizing:"border-box",textAlign:"center"}}>
              <div style={{width:30,height:30,borderRadius:8,background:rc.color+"28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rc.color,margin:"0 auto 4px"}}>{user.avatar}</div>
              <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{user.name}</div>
              <div style={{fontSize:10,color:rc.color,marginTop:1}}>{rc.icon} {rc.label}</div>
            </div>
          </div>
        </div>

        {mainView!=="users"&&data&&(
          <>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5,paddingLeft:12}}>Vistas</div>
              <NavBtn v="all"     label="Todos"       dot="#2563EB" cnt={data.length}/>
              <NavBtn v="done"    label="Completados" dot="#16A34A" cnt={metrics.done}/>
              <NavBtn v="mid"     label="En progreso" dot="#D97706" cnt={metrics.mid}/>
              <NavBtn v="none"    label="Sin iniciar" dot="#DC2626" cnt={metrics.none}/>
              <NavBtn v="overdue" label="⚠️ Vencidos" dot="#F59E0B" cnt={metrics.overdue}/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,paddingLeft:12}}>Etapas</div>
              {STAGES.map((s,i)=>{
                const cnt=data.filter(d=>d.stages[i]).length; const p=data.length?Math.round(cnt/data.length*100):0;
                return <div key={i} style={{marginBottom:7,paddingLeft:4}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><div style={{width:7,height:7,borderRadius:"50%",background:STAGE_COLORS[i],flexShrink:0}}/><span style={{fontSize:11,color:"rgba(255,255,255,0.7)",flex:1}}>{s}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{cnt}</span></div><div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.09)",overflow:"hidden",marginLeft:13}}><div style={{height:"100%",width:`${p}%`,background:STAGE_COLORS[i],borderRadius:2}}/></div></div>;
              })}
            </div>
          </>
        )}

        <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:7}}>
          {/* Botón gestión usuarios — admin only */}
          {can(role,"manageUsers")&&(
            <button onClick={()=>setMV(v=>v==="users"?"dashboard":"users")}
              style={{...btnStyle,justifyContent:"center",width:"100%",background:mainView==="users"?"rgba(251,191,36,0.18)":"rgba(255,255,255,0.04)",border:mainView==="users"?"1px solid rgba(251,191,36,0.45)":"1px solid rgba(255,255,255,0.09)",color:mainView==="users"?"#FBBF24":"rgba(255,255,255,0.6)",fontWeight:mainView==="users"?700:400}}>
              {mainView==="users"?"← Volver al dashboard":"👥 Gestión de usuarios"}
            </button>
          )}
          {can(role,"addItem")&&mainView==="dashboard"&&<button onClick={()=>{setEI(null);setModal(true);}} style={{...btnStyle,background:"#2563EB",color:"#fff",border:"none",justifyContent:"center",width:"100%"}}>+ Agregar ítem</button>}
          {can(role,"addItem")&&mainView==="dashboard"&&<button onClick={()=>setBulkModal(true)} style={{...btnStyle,background:"rgba(37,99,235,0.15)",color:"#60A5FA",border:"1px solid rgba(37,99,235,0.3)",justifyContent:"center",width:"100%"}}>📋 Importar lista</button>}
          {can(role,"exportCSV")&&mainView==="dashboard"&&<button onClick={exportCSV} style={{...btnStyle,justifyContent:"center",width:"100%"}}>↓ Exportar CSV</button>}
          <button onClick={onLogout} style={{...btnStyle,justifyContent:"center",width:"100%",color:"rgba(255,255,255,0.35)",fontSize:12,padding:"7px",border:"1px solid rgba(255,255,255,0.07)"}}>← Cerrar sesión</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:"auto",padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1.25rem",minWidth:0}}>

        {/* Panel usuarios */}
        {mainView==="users"&&role==="admin"&&(
          <UsersPanel users={users} onAdd={u=>setUsers(p=>[...p,u])} onEdit={u=>{setUsers(p=>p.map(x=>x.id===u.id?u:x));onUserUpdated(u);}} onDelete={id=>setUsers(p=>p.filter(u=>u.id!==id))} currentAdminId={user.id} showToast={showToast}/>
        )}

        {/* Dashboard */}
        {mainView==="dashboard"&&data&&(<>

          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1}}>Dashboard</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Seguimiento de requerimientos</span>
                <span style={{fontSize:11,fontWeight:700,color:rc.color,background:rc.color+"15",padding:"2px 10px",borderRadius:20,border:`1px solid ${rc.border}`}}>{rc.icon} {rc.label}</span>
              </div>
            </div>
            {can(role,"addItem")&&<div style={{display:"flex",gap:8}}><button onClick={()=>{setEI(null);setModal(true);}} style={{...btnStyle,background:"#2563EB",color:"#fff",border:"none"}}>+ Agregar ítem</button><button onClick={()=>setBulkModal(true)} style={{...btnStyle,background:"rgba(37,99,235,0.12)",color:"#60A5FA",border:"1px solid rgba(37,99,235,0.3)"}}>📋 Importar lista</button></div>}
          </div>

          {/* Banner EmailJS no configurado */}
          {(EMAILJS_PUBLIC_KEY==="TU_PUBLIC_KEY"||!EMAILJS_SERVICE_ID.startsWith("service_"))&&(
            <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:15}}>⚠️</span>
              <div style={{flex:1}}>
                <span style={{fontSize:12,fontWeight:700,color:"#FBBF24"}}>EmailJS no configurado — </span>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Los correos no se enviarán hasta que ingreses tu Service ID, Template ID y Public Key en el archivo JSX.</span>
              </div>
            </div>
          )}

          {/* Permisos activos */}
          <div style={{background:"rgb(22,25,30)",border:`1px solid ${rc.border}`,borderRadius:10,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:rc.color,fontWeight:700}}>{rc.icon} Permisos:</span>
            {[can(role,"addItem")&&"➕ Agregar",can(role,"editSku")&&"🔢 SKU",can(role,"editStages")&&"✅ Etapas",can(role,"editDue")&&"📅 Fechas",can(role,"changeResp")&&"👤 Responsable",can(role,"deleteItem")&&"🗑️ Eliminar",can(role,"manageUsers")&&"👥 Usuarios"].filter(Boolean).map((p,i)=>(
              <span key={i} style={{fontSize:11,color:"rgba(255,255,255,0.5)",background:"rgba(255,255,255,0.05)",padding:"2px 8px",borderRadius:20}}>{p}</span>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:4,background:"rgb(22,25,30)",borderRadius:12,padding:4,width:"fit-content"}}>
            {[{id:"cliente",label:"📦 Requerimientos Cliente",color:"#2563EB"},{id:"interno",label:"🔧 Internos Serviall",color:"#0D9488"}].map(tab=>(
              <button key={tab.id} onClick={()=>{setAT(tab.id);setView("all");setSrch("");setSF("");}} style={{padding:"9px 18px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.2s",background:activeTab===tab.id?tab.color:"transparent",color:activeTab===tab.id?"#fff":"rgba(255,255,255,0.4)",boxShadow:activeTab===tab.id?"0 2px 8px rgba(0,0,0,0.3)":"none"}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Metrics */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <MetricCard label="Total ítems"  value={metrics.total}   sub="solicitudes registradas" color="#2563EB"/>
            <MetricCard label="Completados"  value={metrics.done}    sub={`${metrics.total?Math.round(metrics.done/metrics.total*100):0}% del total`} color="#16A34A"/>
            <MetricCard label="En progreso"  value={metrics.mid}     sub={`${metrics.total?Math.round(metrics.mid/metrics.total*100):0}% del total`} color="#D97706"/>
            <MetricCard label="Sin iniciar"  value={metrics.none}    sub={`${metrics.total?Math.round(metrics.none/metrics.total*100):0}% del total`} color="#DC2626"/>
            <MetricCard label="⚠️ Vencidos"  value={metrics.overdue} sub="con fecha superada" color="#F59E0B"/>
            <MetricCard label="Cumplimiento" value={`${metrics.overall}%`} sub="promedio de avance" color={metrics.overall===100?"#16A34A":metrics.overall>0?"#D97706":"#DC2626"}/>
          </div>

          {/* Pie */}
          <div style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1.25rem",display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <ResponsiveContainer width={170} height={170}>
                <PieChart>
                  <Pie data={pieData.length?pieData:[{name:"Sin datos",value:1,color:"rgba(255,255,255,0.1)"}]} dataKey="value" innerRadius="62%" outerRadius="85%" paddingAngle={pieData.length>1?3:0} startAngle={90} endAngle={-270}>
                    {(pieData.length?pieData:[{color:"rgba(255,255,255,0.1)"}]).map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[`${v} ítems`,n]} contentStyle={{borderRadius:8,border:"none",background:"#1e2128",color:"#fff",fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                <div style={{fontSize:28,fontWeight:900,color:metrics.overall===100?"#16A34A":metrics.overall>0?"#D97706":"#DC2626"}}>{metrics.overall}%</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>cumplimiento</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{l:"Completados",v:metrics.done,c:"#16A34A",b:"#DCFCE7"},{l:"En progreso",v:metrics.mid,c:"#D97706",b:"#FEF3C7"},{l:"Sin iniciar",v:metrics.none,c:"#DC2626",b:"#FEE2E2"}].map(item=>(
                <div key={item.l} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:8,background:item.b,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:12,fontWeight:800,color:item.c}}>{item.v}</span>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{item.l}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{metrics.total?Math.round(item.v/metrics.total*100):0}% del total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
            <div style={{display:"flex",gap:8,alignItems:"center",padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:180}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e=>setSrch(e.target.value)} placeholder="Buscar solicitud o SKU..." style={{...inputStyle,paddingLeft:32,margin:0}}/>
              </div>
              <select value={stageFilter} onChange={e=>setSF(e.target.value)} style={{...inputStyle,margin:0,width:"auto",cursor:"pointer",colorScheme:"dark"}}>
                <option value="">Todas las etapas</option>
                {STAGE_FULL.map((s,i)=><option key={i} value={String(i)}>{s}</option>)}
              </select>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.35)",whiteSpace:"nowrap"}}>{filtered.length} de {data.length}</span>
            </div>
            <div style={{overflowX:"auto",maxHeight:500}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:950}}>
                <thead>
                  <tr style={{background:"rgb(18,20,26)",position:"sticky",top:0,zIndex:2}}>
                    <th style={thStyle}>#</th>
                    <th style={{...thStyle,textAlign:"left"}}>Solicitud</th>
                    <th style={{...thStyle,textAlign:"left"}}>SKU</th>
                    <th style={thStyle}>Cant.</th>
                    <th style={{...thStyle,textAlign:"left"}}>Responsable</th>
                    <th style={{...thStyle,textAlign:"left"}}>📅 Cumplimiento</th>
                    {STAGES.map((s,i)=><th key={i} style={{...thStyle,color:STAGE_COLORS[i]}} title={STAGE_FULL[i]}>{s.split(" ")[0]}</th>)}
                    <th style={thStyle}>Avance</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0?(<tr><td colSpan={15} style={{textAlign:"center",padding:"3rem",color:"rgba(255,255,255,0.3)"}}><div style={{fontSize:26,marginBottom:8}}>📋</div><div style={{fontWeight:600,marginBottom:4}}>No hay ítems</div><div style={{fontSize:12}}>Ajusta los filtros</div></td></tr>)
                  :filtered.map(d=>{
                    const gi=data.indexOf(d); const st=dueStatus(d.due,d.stages); const dl=daysLeft(d.due);
                    const csEd=can(role,"editStages"); const csRe=can(role,"changeResp")||can(role,"editResp"); const csDu=can(role,"editDue");
                    return (
                      <tr key={d.n} style={{borderBottom:"1px solid rgba(255,255,255,0.05)",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"9px 10px",color:"rgba(255,255,255,0.35)",fontSize:12,width:32}}>{d.n}</td>
                        <td style={{padding:"9px 10px",fontWeight:500}}>{d.sol}</td>
                        <td style={{padding:"9px 10px"}}><span style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{d.sku||"—"}</span></td>
                        <td style={{padding:"9px 6px",textAlign:"center",width:50}}>
                          {can(role,"editQty")?<input type="number" min="1" value={d.qty??1} onChange={e=>{const v=Math.max(1,parseInt(e.target.value)||1);setData(dd=>dd.map((it,i)=>i===gi?{...it,qty:v}:it));}} style={{width:42,textAlign:"center",background:"transparent",border:"1px solid rgba(255,255,255,0.13)",borderRadius:5,color:"#fff",fontSize:13,fontWeight:600,padding:"2px 4px",outline:"none"}}/>:<span style={{fontSize:13,fontWeight:600}}>{d.qty??1}</span>}
                        </td>
                        {/* Responsable */}
                        <td style={{padding:"9px 10px",minWidth:130}}>
                          {csRe?(inlineResp[gi]?(<select autoFocus value={d.resp||""} onChange={e=>handleInlineResp(gi,e.target.value)} onBlur={()=>setIR(p=>({...p,[gi]:false}))} style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#fff",fontSize:12,padding:"3px 6px",outline:"none",colorScheme:"dark",maxWidth:140}}>
                            <option value="">— Sin asignar —</option>{responsables.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}</select>
                          ):(<div style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{fontSize:12,color:d.resp?"#fff":"rgba(255,255,255,0.2)",fontStyle:d.resp?"normal":"italic"}}>{d.resp||"—"}</span>
                            <button onClick={()=>setIR(p=>({...p,[gi]:true}))} style={{width:16,height:16,border:"none",background:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",fontSize:11,padding:0}} onMouseEnter={e=>e.currentTarget.style.color="#60A5FA"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.25)"}>✎</button>
                          </div>)):(<span style={{fontSize:12,color:d.resp?"#fff":"rgba(255,255,255,0.2)",fontStyle:d.resp?"normal":"italic"}}>{d.resp||"—"}</span>)}
                        </td>
                        {/* Fecha */}
                        <td style={{padding:"9px 10px",minWidth:140}}>
                          {csDu&&role!=="admin"?(inlineDue[gi]?(<input type="date" autoFocus value={d.due||""} onChange={e=>handleInlineDue(gi,e.target.value)} onBlur={()=>setID(p=>({...p,[gi]:false}))} style={{background:"rgb(22,25,30)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#fff",fontSize:12,padding:"3px 6px",outline:"none",colorScheme:"dark"}}/>)
                          :(<div style={{display:"flex",flexDirection:"column",gap:2}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12,fontWeight:d.due?600:400,color:d.due?"#fff":"rgba(255,255,255,0.2)",fontStyle:d.due?"normal":"italic"}}>{d.due?fmtDate(d.due):"—"}</span><button onClick={()=>setID(p=>({...p,[gi]:true}))} style={{width:16,height:16,border:"none",background:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",fontSize:11,padding:0}} onMouseEnter={e=>e.currentTarget.style.color="#34D399"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.25)"}>✎</button></div>
                          {st&&<span style={{fontSize:10,fontWeight:700,color:DUE_BADGE[st].color,background:DUE_BADGE[st].bg,padding:"1px 6px",borderRadius:20,width:"fit-content"}}>{st==="overdue"?`Vencido hace ${Math.abs(dl)}d`:st==="done"?"✓ Completado":st==="soon"?`Vence en ${dl}d`:`${dl}d restantes`}</span>}</div>))
                          :(d.due?<div style={{display:"flex",flexDirection:"column",gap:2}}><span style={{fontSize:12,fontWeight:600}}>{fmtDate(d.due)}</span>{st&&<span style={{fontSize:10,fontWeight:700,color:DUE_BADGE[st].color,background:DUE_BADGE[st].bg,padding:"1px 6px",borderRadius:20,width:"fit-content"}}>{st==="overdue"?`Vencido hace ${Math.abs(dl)}d`:st==="done"?"✓ Completado":st==="soon"?`Vence en ${dl}d`:`${dl}d restantes`}</span>}</div>:<span style={{fontSize:12,color:"rgba(255,255,255,0.2)",fontStyle:"italic"}}>—</span>)}
                        </td>
                        {d.stages.map((v,si)=><StageCheck key={si} checked={v} color={STAGE_COLORS[si]} label={STAGE_FULL[si]} disabled={!csEd} onChange={()=>toggleStage(gi,si)}/>)}
                        <td style={{padding:"9px 10px"}}><StageProgress stages={d.stages}/></td>
                        <td style={{padding:"9px 10px",width:70}}>
                          <div style={{display:"flex",gap:4}}>
                            {can(role,"editSol")&&<button onClick={()=>openEdit(d,gi)} title="Editar" style={{width:26,height:26,border:"none",background:"none",cursor:"pointer",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"rgba(255,255,255,0.32)"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(37,99,235,0.2)";e.currentTarget.style.color="#60A5FA";}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.32)";}}>✏️</button>}
                            {can(role,"deleteItem")&&<button onClick={()=>removeItem(gi)} title="Eliminar" style={{width:26,height:26,border:"none",background:"none",cursor:"pointer",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"rgba(255,255,255,0.32)"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(220,38,38,0.2)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.32)";}}>✕</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}
      </main>

      <ItemModal open={modal} onClose={()=>{setModal(false);setEI(null);}} onSave={handleSave} editItem={editItem} userRole={role} userName={user.name} responsables={responsables}/>
      <BulkAddModal open={bulkModal} onClose={()=>setBulkModal(false)} onSave={handleBulkSave}/>
      <ConfirmDialog open={!!confirm} msg={`¿Eliminar "${confirm?.name}"?`} onConfirm={confirmRemove} onCancel={()=>setCnf(null)}/>
      <Toast msg={toast.msg} show={toast.show} type={toast.type}/>
    </div>
  );
}
