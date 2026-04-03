import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDNWZ_MzZnqKj1fNftsvsY2UIu30VvZw8k",
  authDomain: "horario-trabajadores-c6613.firebaseapp.com",
  projectId: "horario-trabajadores-c6613",
  storageBucket: "horario-trabajadores-c6613.firebasestorage.app",
  messagingSenderId: "104416423790",
  appId: "1:104416423790:web:829e7029c276a2089d1b7f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.rol = "";
window.trabajadores = [];
let diasSemana = ["Lunes<br>16/03/2026", "Martes<br>17/03/2026", "Miércoles<br>18/03/2026", "Jueves<br>19/03/2026", "Viernes<br>20/03/2026", "Sábado<br>21/03/2026", "Domingo<br>22/03/2026"];

// --- FIREBASE OPS ---
function suscribirseADatos() {
  onSnapshot(doc(db, "malla", "semana_actual"), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      window.trabajadores = data.trabajadores || [];
      if(data.diasSemana) diasSemana = data.diasSemana;
      renderFechas();
      window.renderTabla();
    }
  });
}

async function actualizarFirebase() {
  try {
    await setDoc(doc(db, "malla", "semana_actual"), { 
        trabajadores: window.trabajadores, 
        diasSemana: diasSemana 
    });
  } catch (e) { console.error("Error al guardar:", e); }
}

// --- LOGIN ---
window.login = function() {
  const pass = document.getElementById("password").value.trim();
  if(pass === "sodimac") window.rol = "admin";
  else if(pass === "plazanorte") window.rol = "trabajador";
  else return alert("Contraseña incorrecta");

  document.getElementById("login").style.display = "none";
  document.getElementById("contenido").style.display = "block";
  if(window.rol === "admin") document.getElementById("btnFloat").style.display = "block";
  suscribirseADatos();
};

// --- RENDER FECHAS ---
function renderFechas(){
  diasSemana.forEach((dia, i) => {
    let celda = document.getElementById("d" + i);
    celda.innerHTML = (window.rol === "admin") ? `<div contenteditable="true" onblur="window.editarFecha(${i}, this)">${dia}</div>` : dia;
  });
}

window.editarFecha = (i, el) => {
  if(window.rol !== "admin") return;
  diasSemana[i] = el.innerHTML;
  actualizarFirebase();
};

// --- LÓGICA DE TABLA ---
const obtenerClase = (v) => {
  v = (v || "").toUpperCase().trim();
  if(v === "LIBRE") return "libre";
  if(v.includes("VACACI")) return "vacaciones";
  return "";
};

const sumarHoras = (dias) => {
  let min = 0;
  dias.forEach(d => {
    if(d.horas && d.horas.includes(":")){
      let [h, m] = d.horas.split(":").map(Number);
      min += h * 60 + m;
    }
  });
  return `${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`;
};

window.eliminarTrabajador = function(i) {
  if (confirm(`¿Estás seguro de eliminar a ${window.trabajadores[i].nombre}?`)) {
    window.trabajadores.splice(i, 1);
    actualizarFirebase();
  }
};

window.renderTabla = function(filtro = ""){
  window.trabajadores.sort((a, b) => a.nombre.localeCompare(b.nombre));
  const tabla = document.getElementById("tabla");
  tabla.innerHTML = "";

  window.trabajadores.filter(t => t.nombre.toLowerCase().includes(filtro.toLowerCase())).forEach((t, i) => {
    let ed = window.rol === "admin";
    
    // Fila 1: Nombre, Entrada y Salida
    let fila1 = `<tr><td rowspan="3" class="celda-nombre">
      ${ed ? `<button class="btn-del" onclick="window.eliminarTrabajador(${i})">×</button>` : ''}
      <div ${ed ? `contenteditable onblur="window.editarNombre(${i}, this)"` : ''}>${t.nombre}</div></td>`;
    
    t.dias.forEach((d, j) => {
      fila1 += `<td class="${obtenerClase(d.entrada)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'entrada',this)"`:''}>${d.entrada}</td>
                <td class="${obtenerClase(d.salida)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'salida',this)"`:''}>${d.salida}</td>`;
    });
    
    fila1 += `<td rowspan="3" ${ed?`contenteditable onblur="window.editarTotalManual(${i}, this)"`:''}>${t.total}</td><td rowspan="3">Firma</td></tr>`;
    
    // Fila 2: Refrigerio y Horas Día
    let fila2 = "<tr>";
    t.dias.forEach((d, j) => {
      fila2 += `<td class="${obtenerClase(d.refrig)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'refrig',this)"`:''}>${d.refrig}</td>
                <td class="${obtenerClase(d.horas)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'horas',this)"`:''}>${d.horas}</td>`;
    });
    fila2 += "</tr><tr>";
    
    // Fila 3: Capacitación y Lactancia
    t.dias.forEach((d, j) => {
      fila2 += `<td class="${obtenerClase(d.cap)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'cap',this)"`:''}>${d.cap}</td>
                <td class="${obtenerClase(d.lact)}" ${ed?`contenteditable onblur="window.editar(${i},${j},'lact',this)"`:''}>${d.lact}</td>`;
    });
    
    tabla.innerHTML += fila1 + fila2 + "</tr>";
  });
};

// --- EDICIONES ---
window.editarNombre = (i, el) => {
  let n = el.innerText.toUpperCase().trim();
  if(window.trabajadores[i].nombre === n) return;
  window.trabajadores[i].nombre = n;
  actualizarFirebase();
};

window.editar = (i, d, campo, el) => {
  if(window.rol !== "admin") return;
  let v = el.innerText.toUpperCase().trim();
  if(window.trabajadores[i].dias[d][campo] === v) return;
  window.trabajadores[i].dias[d][campo] = v;
  
  if(campo === "horas") {
      window.trabajadores[i].total = sumarHoras(window.trabajadores[i].dias);
  }
  actualizarFirebase(); 
};

window.editarTotalManual = (i, el) => {
  window.trabajadores[i].total = el.innerText.trim();
  actualizarFirebase();
};

// --- MODAL Y BUSCADOR ---
window.buscar = () => window.renderTabla(document.getElementById("buscador").value);

window.abrirModal = () => {
    // IMPORTANTE: 'flex' para que el CSS nuevo lo centre
    document.getElementById("modal").style.display = "flex";
};

window.cerrarModal = () => {
    document.getElementById("modal").style.display = "none";
};

window.guardarTrabajador = () => {
  let n = document.getElementById("nuevoNombre").value.trim();
  if(!n) return;
  
  window.trabajadores.push({ 
      nombre: n.toUpperCase(), 
      dias: Array(7).fill(null).map(() => ({
          entrada:"00:00", salida:"00:00", refrig:"00:00", horas:"00:00", cap:"00:00", lact:"00:00"
      })), 
      total: "00:00" 
  });
  
  actualizarFirebase(); 
  window.cerrarModal(); 
  document.getElementById("nuevoNombre").value = "";
};