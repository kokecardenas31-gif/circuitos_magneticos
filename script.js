const MU_0 = 4 * Math.PI * 1e-7; // H/m
let modoActual = "rotor";

const $ = (id) => document.getElementById(id);

function val(id) {
  return parseFloat($(id).value);
}

function fmt(num, dec = 4) {
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("es-MX", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function mostrarError(msg) {
  const box = $("errorBox");
  if (!msg) {
    box.textContent = "";
    box.classList.add("hidden");
  } else {
    box.textContent = msg;
    box.classList.remove("hidden");
  }
}

function renderKPIs(items) {
  $("resultadosPrincipales").innerHTML = items
    .map(
      (it) => `
      <div class="kpi">
        <div class="kpi-label">${it.label}</div>
        <div class="kpi-value">${it.value}</div>
      </div>`
    )
    .join("");
}

function dibujarDiagrama(texto = "Ingresa los datos y presiona 'Cargar resultados'") {
  const svg = $("diagramaSvg");
  if (modoActual === "serie") {
    svg.innerHTML = `
      <rect x="65" y="35" width="510" height="155" rx="10" fill="none" stroke="#1e293b" stroke-width="12"/>
      <rect x="42" y="80" width="46" height="65" rx="5" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
      <text x="65" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e3a8a">N, I</text>
      <text x="320" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">${texto}</text>
      <text x="320" y="118" text-anchor="middle" font-size="12" fill="#1d4ed8" font-weight="bold">R1 + R2 + R3 + R4</text>
    `;
  } else {
    svg.innerHTML = `
      <rect x="65" y="32" width="510" height="162" rx="10" fill="none" stroke="#1e293b" stroke-width="12"/>
      <line x1="275" y1="32" x2="275" y2="194" stroke="#1e293b" stroke-width="12"/>
      <rect x="42" y="78" width="46" height="70" rx="5" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
      <text x="65" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e3a8a">N, I</text>
      <circle cx="490" cy="113" r="28" fill="#e2e8f0" stroke="#0f172a" stroke-width="2.5"/>
      <text x="490" y="117" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">Rotor</text>
      <text x="300" y="117" text-anchor="middle" font-size="12" font-weight="bold" fill="#1d4ed8">Φx</text>
      <text x="532" y="117" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f766e">Φy</text>
      <text x="320" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">${texto}</text>
    `;
  }
}

function limpiarCampos() {
  mostrarError("");
  document.querySelectorAll("input").forEach((inp) => {
    inp.value = "";
  });

  renderKPIs([
    { label: "Reluctancia total", value: "—" },
    { label: "Flujo total (ΦT)", value: "—" },
    { label: "Flujos Φx / Φy", value: "—" },
    { label: "Densidades Bx / By", value: "—" },
  ]);

  dibujarDiagrama();
  $("detallePasos").textContent = "Completa los campos y presiona 'Cargar resultados' para ver el procedimiento.";
}

function cambiarModo(nuevoModo) {
  modoActual = nuevoModo;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.modo === nuevoModo);
  });

  $("formRotor").classList.toggle("hidden", nuevoModo !== "rotor");
  $("formSerie").classList.toggle("hidden", nuevoModo !== "serie");
  document.querySelectorAll(".modo-rotor-only").forEach((el) => {
    el.classList.toggle("hidden", nuevoModo !== "rotor");
  });

  limpiarCampos();
}

function reluctancia(l, mur, area) {
  return l / (mur * MU_0 * area);
}

function calcularSerie() {
  const I = val("corriente");
  const N = val("espiras");
  const mur = val("mur");
  const fa = val("factorApilamiento");

  const tramos = [1, 2, 3, 4].map((k) => ({
    k,
    lc: val(`s_lc${k}`),
    a: val(`s_a${k}`) * fa,
  }));

  if ([I, N, mur, fa].some((x) => !Number.isFinite(x) || x <= 0) ||
      tramos.some((t) => !Number.isFinite(t.lc) || t.lc <= 0 || !Number.isFinite(t.a) || t.a <= 0)) {
    mostrarError("Completa todos los campos con valores positivos antes de cargar los resultados.");
    return;
  }

  mostrarError("");
  const F = N * I;
  const rels = tramos.map((t) => reluctancia(t.lc, mur, t.a));
  const Req = rels.reduce((acc, r) => acc + r, 0);
  const phiT = F / Req;
  const phiMax = phiT * 1e8;
  const B = phiT / tramos[0].a;

  renderKPIs([
    { label: "Reluctancia total (Req)", value: `${fmt(Req, 3)} A·v/Wb` },
    { label: "Flujo total (ΦT)", value: `${fmt(phiT, 4)} Wb` },
    { label: "Flujo en Maxwells", value: `${fmt(phiMax, 1)} Mx` },
    { label: "Densidad en tramo 1 (B1)", value: `${fmt(B, 4)} T` },
  ]);

  dibujarDiagrama(`Req = ${fmt(Req, 3)} A·v/Wb | ΦT = ${fmt(phiT, 4)} Wb`);

  $("detallePasos").textContent = [
    `F = N · I = ${N} · ${I} = ${fmt(F, 2)} A·v`,
    ...rels.map((r, idx) => `R${idx + 1} = ${tramos[idx].lc} / (${mur} · μ0 · ${fmt(tramos[idx].a, 6)}) = ${fmt(r, 3)} A·v/Wb`),
    `Req = R1 + R2 + R3 + R4 = ${fmt(Req, 3)} A·v/Wb`,
    `ΦT = F / Req = ${fmt(phiT, 4)} Wb (${fmt(phiMax, 1)} Maxwells)`,
    `B1 = ΦT / A1 = ${fmt(B, 4)} T`,
  ].join("\n");
}

function calcularRotor() {
  const I = val("corriente");
  const N = val("espiras");
  const mur = val("mur");
  const fa = val("factorApilamiento");
  const la = val("entrehierroM");
  const lcr = val("lcr");

  const lcs = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => val(`lc${k}`));
  const areas = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => val(`a${k}`) * fa);
  const Ar = val("ar") * fa;
  const Aa = val("aa");

  const todos = [I, N, mur, fa, la, lcr, ...lcs, ...areas, Ar, Aa];
  if (todos.some((x) => !Number.isFinite(x) || x <= 0)) {
    mostrarError("Completa todos los campos con valores positivos antes de cargar los resultados.");
    return;
  }

  mostrarError("");

  const [lc1, lc2, lc3, lc4, lc5, lc6, lc7, lc8] = lcs;
  const [A1, A2, A3, A4, A5, A6, A7, A8] = areas;

  const R1 = reluctancia(lc1, mur, A1);
  const R2 = reluctancia(lc2, mur, A2);
  const R3 = reluctancia(lc3, mur, A3);
  const R4 = reluctancia(lc4, mur, A4);
  const R5 = reluctancia(lc5, mur, A5);
  const R6 = reluctancia(lc6, mur, A6);
  const R7 = reluctancia(lc7, mur, A7);
  const R8 = reluctancia(lc8, mur, A8);
  const Ra1 = reluctancia(la, 1, Aa);
  const Ra2 = reluctancia(la, 1, Aa);
  const Rr = reluctancia(lcr, mur, Ar);

  const Req1 = R1 + R2 + R7;
  const Req2 = R3 + R4 + Ra1 + Rr + Ra2 + R5 + R6;
  const Req3 = (Req2 * R8) / (Req2 + R8);
  const Req4 = Req3 + Req1;

  const F = N * I;
  const phiT = F / Req4;
  const phiMax = phiT * 1e8;

  const phiX = (Req2 / (R8 + Req2)) * phiT;
  const phiY = (R8 / (R8 + Req2)) * phiT;

  const Bx = phiX / A8;
  const By = phiY / A4;

  renderKPIs([
    { label: "Reluctancia total (Req4)", value: `${fmt(Req4, 3)} A·v/Wb` },
    { label: "Flujo total (ΦT)", value: `${fmt(phiT, 4)} Wb` },
    { label: "Flujos Φx / Φy", value: `${fmt(phiX, 4)} Wb / ${fmt(phiY, 5)} Wb` },
    { label: "Densidades Bx / By", value: `${fmt(Bx, 4)} T / ${fmt(By, 4)} T` },
  ]);

  dibujarDiagrama(`Req4 = ${fmt(Req4, 2)} | ΦT = ${fmt(phiT, 4)} Wb`);

  $("detallePasos").textContent = [
    `F = N · I = ${N} · ${I} = ${fmt(F, 2)} A·v`,
    ``,
    `--- Reluctancias individuales (A·v/Wb) ---`,
    `R1 = ${fmt(R1, 3)} | R2 = ${fmt(R2, 3)} | R3 = ${fmt(R3, 3)}`,
    `R4 = ${fmt(R4, 3)} | R5 = ${fmt(R5, 3)} | R6 = ${fmt(R6, 3)}`,
    `R7 = ${fmt(R7, 3)} | R8 = ${fmt(R8, 3)} | Rr = ${fmt(Rr, 3)}`,
    `Ra1 = Ra2 (μr = 1) = ${fmt(Ra1, 3)}`,
    ``,
    `--- Reducción y reluctancia total ---`,
    `Req1 = R1 + R2 + R7 = ${fmt(Req1, 3)} A·v/Wb`,
    `Req2 = R3 + R4 + Ra1 + Rr + Ra2 + R5 + R6 = ${fmt(Req2, 3)} A·v/Wb`,
    `Req3 = (Req2 · R8) / (Req2 + R8) = ${fmt(Req3, 3)} A·v/Wb`,
    `Req4 (Total) = Req3 + Req1 = ${fmt(Req4, 3)} A·v/Wb`,
    ``,
    `--- Flujos y densidades ---`,
    `ΦT = F / Req4 = ${fmt(phiT, 4)} Wb (${fmt(phiMax, 1)} Maxwells)`,
    `Φx = (Req2 / (R8 + Req2)) · ΦT = ${fmt(phiX, 4)} Wb`,
    `Φy = (R8 / (R8 + Req2)) · ΦT = ${fmt(phiY, 5)} Wb`,
    `Bx = Φx / A8 = ${fmt(phiX, 4)} / ${fmt(A8, 6)} = ${fmt(Bx, 4)} T`,
    `By = Φy / A4 = ${fmt(phiY, 5)} / ${fmt(A4, 6)} = ${fmt(By, 4)} T`,
  ].join("\n");
}

function calcular() {
  if (modoActual === "serie") {
    calcularSerie();
  } else {
    calcularRotor();
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => cambiarModo(tab.dataset.modo));
});
$("btnCalcular").addEventListener("click", calcular);
$("btnLimpiar").addEventListener("click", limpiarCampos);

limpiarCampos();