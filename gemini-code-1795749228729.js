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

function cargarEjemplo() {
  mostrarError("");
  if (modoActual === "rotor") {
    $("corriente").value = 3.7;
    $("espiras").value = 700;
    $("mur").value = 4500;
    $("factorApilamiento").value = 0.98;
    $("entrehierroCm").value = 0.05;
    $("diametroRotorCm").value = 16;

    $("r_fondo").value = 20;
    $("r_colIzq").value = 14;
    $("r_colCen").value = 22;
    $("r_colDer").value = 16;
    $("r_ventAncho").value = 60;
    $("r_yugoSup").value = 14;
    $("r_yugoInf").value = 15;
    $("r_tramoVert").value = 15;

    $("lc1").value = 0.631;
    $("lc2").value = 1.57;
    $("lc3").value = 1.57;
    $("lc4").value = 0.22;
    $("lc5").value = 0.25;
    $("lc6").value = 1.57;
    $("lc7").value = 1.57;
    $("lc8").value = 0.631;
    $("lcr").value = 0.16;
  } else {
    $("corriente").value = 7;
    $("espiras").value = 900;
    $("mur").value = 4500;
    $("factorApilamiento").value = 1.0;

    $("s_lc1").value = 0.71;
    $("s_a1").value = 0.072;
    $("s_lc2").value = 0.94;
    $("s_a2").value = 0.088;
    $("s_lc3").value = 0.71;
    $("s_a3").value = 0.12;
    $("s_lc4").value = 0.94;
    $("s_a4").value = 0.08;
  }
  calcular();
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

  cargarEjemplo();
}

function reluctancia(l, mur, area) {
  return l / (mur * MU_0 * area);
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

function dibujarDiagrama(textoCentral) {
  const svg = $("diagramaSvg");
  if (modoActual === "serie") {
    svg.innerHTML = `
      <rect x="60" y="35" width="520" height="170" rx="12" fill="none" stroke="#1e293b" stroke-width="14"/>
      <rect x="35" y="85" width="50" height="70" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
      <text x="60" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e3a8a">N, I</text>
      <text x="320" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">Circuito magnético en serie (R_eq = R1 + R2 + R3 + R4)</text>
      <text x="320" y="125" text-anchor="middle" font-size="13" fill="#1d4ed8" font-weight="bold">${textoCentral}</text>
    `;
  } else {
    svg.innerHTML = `
      <rect x="60" y="30" width="520" height="180" rx="10" fill="none" stroke="#1e293b" stroke-width="12"/>
      <line x1="270" y1="30" x2="270" y2="210" stroke="#1e293b" stroke-width="12"/>
      <rect x="36" y="82" width="48" height="76" rx="5" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
      <text x="60" y="125" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e3a8a">N, I</text>
      <circle cx="490" cy="120" r="32" fill="#e2e8f0" stroke="#0f172a" stroke-width="2.5"/>
      <text x="490" y="124" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">Rotor</text>
      <text x="295" y="124" font-size="12" font-weight="bold" fill="#1d4ed8">Φx</text>
      <text x="532" y="124" font-size="12" font-weight="bold" fill="#0f766e">Φy</text>
      <text x="320" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">${textoCentral}</text>
    `;
  }
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
    mostrarError("Verifica que todos los valores numéricos sean mayores que cero.");
    return;
  }

  mostrarError("");
  const F = N * I;
  const rels = tramos.map((t) => reluctancia(t.lc, mur, t.a));
  const Req = rels.reduce((acc, r) => acc + r, 0);
  const phiT = F / Req;
  const phiMax = phiT * 1e8;

  renderKPIs([
    { label: "Fuerza magnetomotriz (F)", value: `${fmt(F, 2)} A·v` },
    { label: "Reluctancia total (Req)", value: `${fmt(Req, 3)} A·v/Wb` },
    { label: "Flujo total (ΦT)", value: `${fmt(phiT, 4)} Wb` },
    { label: "Flujo en Maxwells", value: `${fmt(phiMax, 1)} Mx` },
  ]);

  dibujarDiagrama(`ΦT = ${fmt(phiT, 4)} Wb`);

  $("detallePasos").textContent = [
    `F = N · I = ${N} · ${I} = ${fmt(F, 2)} A·v`,
    ...rels.map((r, idx) => `R${idx + 1} = ${tramos[idx].lc} / (${mur} · μ0 · ${fmt(tramos[idx].a, 6)}) = ${fmt(r, 3)} A·v/Wb`),
    `Req = R1 + R2 + R3 + R4 = ${fmt(Req, 3)} A·v/Wb`,
    `ΦT = F / Req = ${fmt(F, 2)} / ${fmt(Req, 3)} = ${fmt(phiT, 4)} Wb (${fmt(phiMax, 1)} Maxwells)`,
  ].join("\n");
}

function calcularRotor() {
  const I = val("corriente");
  const N = val("espiras");
  const mur = val("mur");
  const fa = val("factorApilamiento");
  const laM = val("entrehierroCm") / 100;

  const fondoM = val("r_fondo") / 100;
  const colIzqM = val("r_colIzq") / 100;
  const colCenM = val("r_colCen") / 100;
  const colDerM = val("r_colDer") / 100;

  const lc1 = val("lc1");
  const lc2 = val("lc2");
  const lc3 = val("lc3");
  const lc4 = val("lc4");
  const lc5 = val("lc5");
  const lc6 = val("lc6");
  const lc7 = val("lc7");
  const lc8 = val("lc8");
  const lcr = val("lcr");

  const nums = [I, N, mur, fa, laM, fondoM, colIzqM, colCenM, colDerM, lc1, lc2, lc3, lc4, lc5, lc6, lc7, lc8, lcr];
  if (nums.some((x) => !Number.isFinite(x) || x <= 0)) {
    mostrarError("Verifica que todos los campos tengan valores positivos válidos.");
    return;
  }

  mostrarError("");

  // Áreas efectivas (m^2) aplicando factor de apilamiento
  const A1 = fondoM * colIzqM * fa;
  const A2 = fondoM * colIzqM * fa;
  const A3 = fondoM * colIzqM * fa;
  const A4 = fondoM * colDerM * fa;
  const A5 = fondoM * colDerM * fa;
  const A6 = fondoM * fondoM * fa;
  const A7 = fondoM * fondoM * fa;
  const A8 = fondoM * colCenM * fa;
  const Ar = fondoM * colDerM * fa;
  const Aa = A4; // Área de entrehierro asociada a la rama derecha

  // Reluctancias individuales
  const R1 = reluctancia(lc1, mur, A1);
  const R2 = reluctancia(lc2, mur, A2);
  const R3 = reluctancia(lc3, mur, A3);
  const R4 = reluctancia(lc4, mur, A4);
  const R5 = reluctancia(lc5, mur, A5);
  const R6 = reluctancia(lc6, mur, A6);
  const R7 = reluctancia(lc7, mur, A7);
  const R8 = reluctancia(lc8, mur, A8);
  const Ra1 = reluctancia(laM, 1, Aa);
  const Ra2 = reluctancia(laM, 1, Aa);
  const Rr = reluctancia(lcr, mur, Ar);

  // Reducción por bloques (según apuntes 5-S)
  const Req1 = R1 + R2 + R7;
  const Req2 = R3 + R4 + Ra1 + Rr + Ra2 + R5 + R6;
  const Req3 = (Req2 * R8) / (Req2 + R8);
  const Req4 = Req3 + Req1;

  const F = N * I;
  const phiT = F / Req4;
  const phiMax = phiT * 1e8;

  // Divisor de flujo: Φx en rama central (R8), Φy en rama derecha con rotor (Req2)
  const phiX = (Req2 / (R8 + Req2)) * phiT;
  const phiY = (R8 / (R8 + Req2)) * phiT;

  const Bx = phiX / A8;
  const By = phiY / A4;

  renderKPIs([
    { label: "Flujo total (ΦT)", value: `${fmt(phiT, 4)} Wb` },
    { label: "Flujo Φx (rama central)", value: `${fmt(phiX, 4)} Wb` },
    { label: "Flujo Φy (rama rotor)", value: `${fmt(phiY, 5)} Wb` },
    { label: "Densidades Bx / By", value: `${fmt(Bx, 4)} T / ${fmt(By, 4)} T` },
  ]);

  dibujarDiagrama(`ΦT = ${fmt(phiT, 4)} Wb | Req4 = ${fmt(Req4, 2)}`);

  $("detallePasos").textContent = [
    `--- 1. Fuerza magnetomotriz ---`,
    `F = N · I = ${N} · ${I} = ${fmt(F, 2)} A·v`,
    ``,
    `--- 2. Reluctancias individuales (A·v/Wb) ---`,
    `R1 = ${fmt(R1, 3)} | R2 = ${fmt(R2, 3)} | R3 = ${fmt(R3, 3)}`,
    `R4 = ${fmt(R4, 3)} | R5 = ${fmt(R5, 3)} | R6 = ${fmt(R6, 3)}`,
    `R7 = ${fmt(R7, 3)} | R8 = ${fmt(R8, 3)} | Rr = ${fmt(Rr, 3)}`,
    `Ra1 = Ra2 (μr=1) = ${fmt(Ra1, 3)}`,
    ``,
    `--- 3. Reducción del circuito ---`,
    `Req1 = R1 + R2 + R7 = ${fmt(Req1, 3)} A·v/Wb`,
    `Req2 = R3 + R4 + Ra1 + Rr + Ra2 + R5 + R6 = ${fmt(Req2, 3)} A·v/Wb`,
    `Req3 = (Req2 · R8) / (Req2 + R8) = ${fmt(Req3, 3)} A·v/Wb`,
    `Req4 = Req3 + Req1 = ${fmt(Req4, 3)} A·v/Wb`,
    ``,
    `--- 4. Flujos y densidades ---`,
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
$("btnEjemplo").addEventListener("click", cargarEjemplo);

cargarEjemplo();