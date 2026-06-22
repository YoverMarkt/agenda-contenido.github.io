const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const RED = {fb:"Facebook", ig:"Instagram", tt:"TikTok"};
const TIPOS = ["Post","Reel","Story","Carrusel","Video TikTok"];
const ESTADOS = {idea:"Idea", dis:"En diseño", rev:"En revisión", apr:"Aprobado", pub:"Publicado"};

// SUPABASE_URL, SUPABASE_KEY y CLAVE_ACCESO se definen en config.js
// (se carga antes que este archivo en index.html).

let sb = null;          // cliente supabase
let store = base();     // estado en memoria
let semanaOffset = 0;   // 0 = semana actual
let guardando = false;
let saveTimer = null;

function base(){
  const id = uid();
  return { clientes:[{id, nombre:"Mi primera marca", meta:8, semanas:{}}], clienteActivo:id };
}
function uid(){ return "c"+Math.random().toString(36).slice(2,8); }

function setSync(txt){ const e=document.getElementById("syncStatus"); if(e) e.textContent = txt; }

// ---- Acceso ----
function entrar(){
  const k = document.getElementById("lockKey").value;
  if(k !== CLAVE_ACCESO){
    document.getElementById("lockErr").style.display = "block";
    return;
  }
  document.getElementById("lockScreen").style.display = "none";
  iniciar();
}

// ---- Conexión Supabase ----
async function iniciar(){
  if(!window.supabase){ setSync("⚠️ No se cargó Supabase (revisa internet)"); render(); return; }
  if(SUPABASE_URL.includes("TU-PROYECTO")){ setSync("⚠️ Falta configurar SUPABASE_URL/KEY"); render(); return; }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  setSync("⏳ Cargando datos...");
  await cargarNube();
  // Tiempo real: si la otra persona guarda, se actualiza solo
  sb.channel("agenda-rt")
    .on("postgres_changes", {event:"UPDATE", schema:"public", table:"agenda", filter:"id=eq.main"},
      payload=>{
        if(guardando) return; // evita eco de tu propio guardado
        const d = payload.new && payload.new.data;
        if(d && d.clientes){ store = d; render(); setSync("🔄 Actualizado por tu equipo"); }
      })
    .subscribe();
}

async function cargarNube(){
  try{
    const {data, error} = await sb.from("agenda").select("data").eq("id","main").single();
    if(error) throw error;
    if(data && data.data && data.data.clientes){ store = data.data; }
    else { store = base(); await guardarNube(); }
    setSync("🟢 Conectado");
  }catch(e){
    setSync("⚠️ Error al cargar (revisa la configuración / RLS)");
  }
  render();
}

async function guardarNube(){
  if(!sb) return;
  guardando = true;
  setSync("⏳ Guardando...");
  try{
    const {error} = await sb.from("agenda")
      .update({data: store, updated_at: new Date().toISOString()})
      .eq("id","main");
    if(error) throw error;
    setSync("🟢 Guardado");
  }catch(e){
    setSync("⚠️ No se pudo guardar");
  }
  setTimeout(()=>{ guardando=false; }, 600);
}

// guardar con pequeño retraso para agrupar cambios seguidos
function guardar(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(guardarNube, 400);
}

// ---- Helpers de semana ----
function lunesDe(offset){
  const d = new Date();
  const day = (d.getDay()+6)%7; // lunes=0
  d.setDate(d.getDate()-day + offset*7);
  d.setHours(0,0,0,0);
  return d;
}
function claveSemana(offset){
  const l = lunesDe(offset);
  // ISO week-ish key basada en fecha del lunes
  return l.getFullYear()+"-"+String(l.getMonth()+1).padStart(2,"0")+"-"+String(l.getDate()).padStart(2,"0");
}
function rangoSemanaTxt(offset){
  const l = lunesDe(offset); const dom = new Date(l); dom.setDate(l.getDate()+6);
  const f = d => d.getDate()+"/"+(d.getMonth()+1);
  let etq = offset===0?"Esta semana":offset===1?"Próxima":offset===-1?"Anterior":(offset>0?"+"+offset:offset);
  return etq+" · "+f(l)+"–"+f(dom);
}

function clienteActivo(){ return store.clientes.find(c=>c.id===store.clienteActivo) || store.clientes[0]; }
function semanaActual(){
  const c = clienteActivo();
  const k = claveSemana(semanaOffset);
  if(!c.semanas[k]) c.semanas[k] = DIAS.map(()=>[]);
  return c.semanas[k];
}

// ---- Edición de pieza (modal) ----
let editRef = null; // {di, ti} o null para nueva

function abrirNueva(di){
  editRef = {di, ti:null};
  document.getElementById("modalTitle").textContent = "Nueva pieza";
  llenarSelectModal();
  document.getElementById("mTitle").value = "";
  document.getElementById("mDia").value = di;
  document.getElementById("mRed").value = "ig";
  document.getElementById("mTipo").value = "Post";
  document.getElementById("mEstado").value = "idea";
  document.getElementById("mWhen").value = "";
  document.getElementById("mLink").value = "";
  document.getElementById("mNotes").value = "";
  document.getElementById("taskModal").classList.add("show");
}
function abrirEditar(di,ti){
  editRef = {di, ti};
  const t = semanaActual()[di][ti];
  document.getElementById("modalTitle").textContent = "Editar pieza";
  llenarSelectModal();
  document.getElementById("mTitle").value = t.title;
  document.getElementById("mDia").value = di;
  document.getElementById("mRed").value = t.red;
  document.getElementById("mTipo").value = t.tipo;
  document.getElementById("mEstado").value = t.estado;
  document.getElementById("mWhen").value = t.when||"";
  document.getElementById("mLink").value = t.link||"";
  document.getElementById("mNotes").value = t.notes||"";
  document.getElementById("taskModal").classList.add("show");
}
function llenarSelectModal(){
  document.getElementById("mDia").innerHTML = DIAS.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join("");
  document.getElementById("mRed").innerHTML = Object.entries(RED).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("");
  document.getElementById("mTipo").innerHTML = TIPOS.map(t=>'<option>'+t+'</option>').join("");
  document.getElementById("mEstado").innerHTML = Object.entries(ESTADOS).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("");
}
function cerrarModal(){ document.getElementById("taskModal").classList.remove("show"); }
function guardarPieza(){
  const title = document.getElementById("mTitle").value.trim();
  if(!title){ toast("Escribe un título"); return; }
  const obj = {
    title,
    red: document.getElementById("mRed").value,
    tipo: document.getElementById("mTipo").value,
    estado: document.getElementById("mEstado").value,
    when: document.getElementById("mWhen").value,
    link: document.getElementById("mLink").value.trim(),
    notes: document.getElementById("mNotes").value.trim()
  };
  const sem = semanaActual();
  const nuevoDia = parseInt(document.getElementById("mDia").value,10);
  if(editRef.ti===null){
    sem[nuevoDia].push(obj);
  }else{
    // si cambió de día, mover
    if(nuevoDia!==editRef.di){
      sem[editRef.di].splice(editRef.ti,1);
      sem[nuevoDia].push(obj);
    }else{
      sem[editRef.di][editRef.ti] = obj;
    }
  }
  guardar(); cerrarModal(); render();
}

function borrar(di,ti){ semanaActual()[di].splice(ti,1); guardar(); render(); }
function cambiarEstado(di,ti,val){ semanaActual()[di][ti].estado = val; guardar(); render(); }

// ---- Clientes ----
function nuevoCliente(){
  pedirTexto("Nombre de la nueva marca", "", (n)=>{
    const id = uid();
    store.clientes.push({id, nombre:n.trim(), meta:8, semanas:{}});
    store.clienteActivo = id;
    guardar(); render();
  });
}
function renombrarCliente(){
  const c = clienteActivo();
  pedirTexto("Nuevo nombre de la marca", c.nombre, (n)=>{
    c.nombre = n.trim(); guardar(); render();
  });
}
function cambiarCliente(){
  store.clienteActivo = document.getElementById("clienteSel").value;
  semanaOffset = 0; guardar(); render();
}
function cambiarMeta(){
  clienteActivo().meta = Math.max(1, parseInt(document.getElementById("metaInput").value,10)||8);
  guardar(); render();
}
function cambiarSemana(d){ semanaOffset += d; render(); }

// ---- Render ----
function render(){
  // selector clientes
  const sel = document.getElementById("clienteSel");
  sel.innerHTML = store.clientes.map(c=>'<option value="'+c.id+'">'+escapeH(c.nombre)+'</option>').join("");
  sel.value = store.clienteActivo;
  const c = clienteActivo();
  document.getElementById("metaInput").value = c.meta;
  document.getElementById("weekLbl").textContent = rangoSemanaTxt(semanaOffset);
  document.getElementById("metaTxt").textContent = "meta "+c.meta;

  const sem = semanaActual();
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  DIAS.forEach((dia, di)=>{
    const tareas = sem[di];
    const card = document.createElement("div");
    card.className = "day";
    card.innerHTML = '<h2>'+dia+' <span>'+tareas.length+' pieza(s)</span></h2>';
    tareas.forEach((t, ti)=>{
      const el = document.createElement("div");
      el.className = "task";
      el.setAttribute("data-s", t.estado);
      let html =
        '<div class="task-top">'+
          '<div class="title">'+escapeH(t.title)+'</div>'+
          '<div class="task-actions">'+
            '<button class="ic" onclick="abrirEditar('+di+','+ti+')" title="Editar">✎</button>'+
            '<button class="ic del" onclick="borrar('+di+','+ti+')" title="Eliminar">✕</button>'+
          '</div>'+
        '</div>'+
        '<div class="meta">'+
          '<span class="chip '+t.red+'">'+RED[t.red]+'</span>'+
          '<span class="type">'+escapeH(t.tipo)+'</span>'+
          estadoSelect(di,ti,t.estado)+
        '</div>';
      if(t.when) html += '<div class="when">🕒 '+fmtWhen(t.when)+'</div>';
      if(t.link) html += '<a class="reflink" href="'+escapeAttr(t.link)+'" target="_blank" rel="noopener">🔗 referencia</a>';
      if(t.notes) html += '<div class="notes">'+escapeH(t.notes)+'</div>';
      el.innerHTML = html;
      card.appendChild(el);
    });
    const add = document.createElement("button");
    add.className = "btn";
    add.style.marginTop = "auto";
    add.textContent = "+ Agregar pieza";
    add.onclick = ()=>abrirNueva(di);
    card.appendChild(add);
    grid.appendChild(card);
  });
  actualizarStats();
}
function estadoSelect(di,ti,val){
  let opts = Object.entries(ESTADOS).map(([k,v])=>'<option value="'+k+'"'+(k===val?" selected":"")+'>'+v+'</option>').join("");
  return '<select class="stsel" onchange="cambiarEstado('+di+','+ti+',this.value)">'+opts+'</select>';
}

function actualizarStats(){
  const sem = semanaActual();
  let total=0,pub=0,apr=0; const net={fb:0,ig:0,tt:0};
  sem.forEach(d=>d.forEach(t=>{
    total++; net[t.red]++;
    if(t.estado==="pub") pub++;
    if(t.estado==="apr") apr++;
  }));
  const meta = clienteActivo().meta;
  document.getElementById("stTotal").textContent = total;
  document.getElementById("stPub").textContent = pub;
  document.getElementById("stApr").textContent = apr;
  document.getElementById("stLeft").textContent = Math.max(0, meta-pub);
  const pct = Math.min(100, Math.round((pub/meta)*100));
  document.getElementById("pctBar").style.width = pct+"%";
  document.getElementById("netCounts").innerHTML =
    'Facebook <b>'+net.fb+'</b> · Instagram <b>'+net.ig+'</b> · TikTok <b>'+net.tt+'</b>';
}

// ---- Acciones footer ----
function pedirVaciar(){ document.getElementById("confirmBox").classList.add("show"); }
function cerrarConfirm(){ document.getElementById("confirmBox").classList.remove("show"); }
function vaciar(){
  const c = clienteActivo();
  c.semanas[claveSemana(semanaOffset)] = DIAS.map(()=>[]);
  guardar(); render(); cerrarConfirm();
}
function cargarPlantilla(){
  const sem = DIAS.map(()=>[]);
  const P = (title,red,tipo)=>({title,red,tipo,estado:"idea",when:"",link:"",notes:""});
  sem[0]=[P("Post promocional servicio","ig","Post"), P("Reel tendencia / hook","ig","Reel")];
  sem[1]=[P("Video corto trend","tt","Video TikTok")];
  sem[2]=[P("Carrusel educativo (tips)","ig","Carrusel"), P("Post imagen marca","fb","Post")];
  sem[3]=[P("Reel detrás de cámaras","ig","Reel")];
  sem[4]=[P("Post oferta fin de semana","fb","Post"), P("Video TikTok cierre semana","tt","Video TikTok")];
  clienteActivo().semanas[claveSemana(semanaOffset)] = sem;
  guardar(); render();
}

function resumenTexto(){
  const c = clienteActivo();
  const sem = semanaActual();
  let out = "📅 "+c.nombre+" — "+rangoSemanaTxt(semanaOffset)+"\n\n";
  DIAS.forEach((dia,di)=>{
    if(sem[di].length===0) return;
    out += dia+":\n";
    sem[di].forEach(t=>{
      out += "  • "+t.title+" ["+RED[t.red]+" / "+t.tipo+"] ("+ESTADOS[t.estado]+")";
      if(t.when) out += " 🕒"+fmtWhen(t.when);
      out += "\n";
      if(t.notes) out += "    "+t.notes.replace(/\n/g," ")+"\n";
    });
    out += "\n";
  });
  return out.trim();
}
function copiarResumen(){
  const txt = resumenTexto();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast("Resumen copiado ✓")).catch(()=>fallbackCopy(txt));
  } else fallbackCopy(txt);
}
function fallbackCopy(txt){
  const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta);
  ta.select(); try{document.execCommand("copy"); toast("Resumen copiado ✓");}catch{toast("No se pudo copiar");}
  document.body.removeChild(ta);
}
function exportarPDF(){
  const c = clienteActivo();
  const sem = semanaActual();
  let rows = "";
  DIAS.forEach((dia,di)=>{
    sem[di].forEach(t=>{
      rows += '<tr><td>'+dia+'</td><td>'+escapeH(t.title)+'</td><td>'+RED[t.red]+'</td><td>'+escapeH(t.tipo)+'</td><td>'+ESTADOS[t.estado]+'</td><td>'+(t.when?fmtWhen(t.when):"")+'</td><td>'+escapeH(t.notes||"")+'</td></tr>';
    });
  });
  const w = window.open("","_blank");
  w.document.write('<html><head><title>'+escapeH(c.nombre)+' — '+rangoSemanaTxt(semanaOffset)+'</title>'+
    '<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f0f0f0}</style></head><body>'+
    '<h1>'+escapeH(c.nombre)+'</h1><p>'+rangoSemanaTxt(semanaOffset)+'</p>'+
    '<table><thead><tr><th>Día</th><th>Pieza</th><th>Red</th><th>Formato</th><th>Estado</th><th>Publicación</th><th>Notas</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '</body></html>');
  w.document.close();
  setTimeout(()=>w.print(), 400);
}
function exportarJSON(){
  const blob = new Blob([JSON.stringify(store,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "agenda-respaldo.json";
  a.click();
  toast("Respaldo descargado ✓");
}
function importarJSON(e){
  const file = e.target.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const obj = JSON.parse(r.result);
      if(obj && obj.clientes){ store = obj; semanaOffset=0; guardar(); render(); toast("Respaldo importado ✓"); }
      else toast("Archivo no válido");
    }catch{ toast("Archivo no válido"); }
  };
  r.readAsText(file);
  e.target.value = "";
}

// ---- Modal de texto (reemplaza prompt) ----
let promptCb = null;
function pedirTexto(titulo, valor, cb){
  document.getElementById("promptTitle").textContent = titulo;
  const inp = document.getElementById("promptInput");
  inp.value = valor || "";
  promptCb = cb;
  document.getElementById("promptModal").classList.add("show");
  setTimeout(()=>inp.focus(), 50);
}
function cerrarPrompt(){ document.getElementById("promptModal").classList.remove("show"); promptCb=null; }
function aceptarPrompt(){
  const v = document.getElementById("promptInput").value.trim();
  if(!v){ toast("Escribe un nombre"); return; }
  const cb = promptCb; cerrarPrompt();
  if(cb) cb(v);
}

// ---- Exportar como imagen PNG ----
function exportarImagen(){
  const c = clienteActivo();
  if(typeof html2canvas === "undefined"){ toast("No se pudo cargar el exportador"); return; }
  toast("Generando imagen...");
  const target = document.querySelector(".wrap");
  html2canvas(target, {backgroundColor:"#0f1117", scale:2}).then(canvas=>{
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "agenda-"+c.nombre.replace(/[^a-z0-9]/gi,"_")+".png";
    a.click();
    toast("Imagen descargada ✓");
  }).catch(()=>toast("Error al generar imagen"));
}

// ---- Utils ----
function fmtWhen(v){
  try{ const d=new Date(v); return d.toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})+" "+d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}); }
  catch{ return v; }
}
let toastT;
function toast(msg){
  const el=document.getElementById("toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),2000);
}
function escapeH(s){ return (s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function escapeAttr(s){ return escapeH(s).replace(/'/g,"&#39;"); }

// La app arranca cuando el usuario ingresa la clave (entrar() -> iniciar()).
window.addEventListener("load", ()=>{ document.getElementById("lockKey").focus(); });
