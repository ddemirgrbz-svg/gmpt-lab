import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Polygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "./App.css";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ---------------- LINKS ----------------
const LINKS = {
  orcid: "https://orcid.org/0009-0001-0488-1103",
  instagram: "https://www.instagram.com/siriusanalyticslab/",
  whatsapp: "https://whatsapp.com/channel/0029Vb6vJlDEAKWAD2XfwG3D",
};

// ---------------- DATA ----------------
const STATIONS = [
  {
    id: "IST",
    name: "İstanbul",
    lat: 41.01,
    lon: 28.97,
    metrics: {
      ERT: 0.35,
      EMF: 0.55,
      Radon: 0.18,
      Cosmic: 0.22,
      Muller: 0.28,
      Leaf: 0.30,
      CO2: 0.20,
      CH4: 0.15,
    },
  },
  {
    id: "BAL",
    name: "Balıkesir",
    lat: 39.65,
    lon: 27.89,
    metrics: {
      ERT: 0.42,
      EMF: 0.62,
      Radon: 0.22,
      Cosmic: 0.25,
      Muller: 0.20,
      Leaf: 0.26,
      CO2: 0.18,
      CH4: 0.16,
    },
  },
  {
    id: "SIN",
    name: "Sinop",
    lat: 42.02,
    lon: 35.15,
    metrics: {
      ERT: 0.30,
      EMF: 0.35,
      Radon: 0.16,
      Cosmic: 0.40,
      Muller: 0.22,
      Leaf: 0.24,
      CO2: 0.12,
      CH4: 0.10,
    },
  },
  {
    id: "KMR",
    name: "Kahramanmaraş",
    lat: 37.57,
    lon: 36.93,
    metrics: {
      ERT: 0.85,
      EMF: 0.95,
      Radon: 0.55,
      Cosmic: 0.35,
      Muller: 0.40,
      Leaf: 0.48,
      CO2: 0.30,
      CH4: 0.28,
    },
  },
];

const REF_CITIES = [
  // Marmara
  { id: "BUR", name: "Bursa", lat: 40.19, lon: 29.06, ref: 0.35 },
  { id: "KOC", name: "Kocaeli", lat: 40.77, lon: 29.92, ref: 0.40 },

  // Ege
  { id: "IZM", name: "İzmir", lat: 38.42, lon: 27.14, ref: 0.33 },
  { id: "MAN", name: "Manisa", lat: 38.62, lon: 27.43, ref: 0.30 },
  { id: "DEN", name: "Denizli", lat: 37.78, lon: 29.09, ref: 0.28 },

  // Akdeniz
  { id: "ANT", name: "Antalya", lat: 36.89, lon: 30.71, ref: 0.34 },
  { id: "ADA", name: "Adana", lat: 37.0, lon: 35.32, ref: 0.45 },
  { id: "HAT", name: "Hatay", lat: 36.2, lon: 36.16, ref: 0.50 },

  // İç Anadolu
  { id: "ANK", name: "Ankara", lat: 39.93, lon: 32.86, ref: 0.32 },
  { id: "KON", name: "Konya", lat: 37.87, lon: 32.48, ref: 0.30 },
  { id: "KAY", name: "Kayseri", lat: 38.72, lon: 35.48, ref: 0.36 },

  // Karadeniz
  { id: "SAM", name: "Samsun", lat: 41.29, lon: 36.33, ref: 0.30 },
  { id: "TRA", name: "Trabzon", lat: 41.0, lon: 39.72, ref: 0.28 },

  // Doğu Anadolu
  { id: "ERZ", name: "Erzurum", lat: 39.9, lon: 41.27, ref: 0.35 },
  { id: "VAN", name: "Van", lat: 38.49, lon: 43.38, ref: 0.42 },
  { id: "MAL", name: "Malatya", lat: 38.35, lon: 38.31, ref: 0.44 },

  // Güneydoğu Anadolu
  { id: "GAZ", name: "Gaziantep", lat: 37.06, lon: 37.38, ref: 0.48 },
  { id: "DIY", name: "Diyarbakır", lat: 37.91, lon: 40.23, ref: 0.46 },

  // Ek denge
  { id: "ESK", name: "Eskişehir", lat: 39.77, lon: 30.52, ref: 0.30 },
  { id: "SIV", name: "Sivas", lat: 39.75, lon: 37.02, ref: 0.34 },
];

// ---------------- UTIL ----------------
function clamp01(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function colorForValue(v) {
  const t = clamp01(v);
  if (t < 0.25) return "#2E86DE";
  if (t < 0.5) return "#27AE60";
  if (t < 0.7) return "#F1C40F";
  if (t < 0.85) return "#E67E22";
  return "#E74C3C";
}

function radiusForValue(v) {
  const t = clamp01(v);
  return 10 + t * 18;
}

function triangleAround(lat, lon, size = 0.22) {
  return [
    [lat + size, lon],
    [lat - size, lon - size * 0.9],
    [lat - size, lon + size * 0.9],
  ];
}

function fmtDay(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

// ---------------- ANOMALY INDEX ----------------
const WEIGHTS = { EMF: 0.4, Radon: 0.25, ERT: 0.2, Muller: 0.1, Leaf: 0.05 };

function anomalyIndex(metrics) {
  let s = 0;
  let w = 0;
  for (const k of Object.keys(WEIGHTS)) {
    const wk = WEIGHTS[k];
    const v = clamp01(metrics?.[k] ?? 0);
    s += wk * v;
    w += wk;
  }
  return w === 0 ? 0 : s / w;
}

function alarmLabel(v) {
  const t = clamp01(v);
  if (t < 0.25) return { txt: "Yeşil (Düşük)", col: "#27AE60" };
  if (t < 0.5) return { txt: "Sarı (Orta)", col: "#F1C40F" };
  if (t < 0.75) return { txt: "Turuncu (Yüksek)", col: "#E67E22" };
  return { txt: "Kırmızı (Çok Yüksek)", col: "#E74C3C" };
}

// ---------------- DEMO TIME SERIES ----------------
function genSeriesForStation(st, days = 30, pointsPerDay = 4) {
  const seed = st.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const now = new Date();
  const out = [];
  const total = days * pointsPerDay;

  for (let i = total - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * (24 / pointsPerDay) * 3600 * 1000);
    const phase = (i + seed) * 0.22;
    const noise = (Math.sin(phase) + Math.cos(phase * 0.7)) * 0.04;

    const m = st.metrics;
    const metrics = {
      ERT: clamp01(m.ERT + noise * 0.8),
      EMF: clamp01(m.EMF + noise * 1.1),
      Radon: clamp01(m.Radon + noise * 0.9),
      Muller: clamp01(m.Muller + noise * 0.6),
      Leaf: clamp01(m.Leaf + noise * 0.5),
      CO2: clamp01(m.CO2 + noise * 0.3),
      CH4: clamp01(m.CH4 + noise * 0.3),
    };

    const idx = anomalyIndex(metrics);

    out.push({
      ts: t.toISOString(),
      pointId: st.id,
      pointName: st.name,
      kind: "station",
      metrics,
      index: idx,
    });
  }
  return out;
}

// Ref için de index serisi üret (Z1/Z2/Z3 her şehirde çalışsın)
function genSeriesForRefCity(ref, days = 30, pointsPerDay = 4) {
  const seed = ref.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const now = new Date();
  const out = [];
  const total = days * pointsPerDay;

  for (let i = total - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * (24 / pointsPerDay) * 3600 * 1000);
    const phase = (i + seed) * 0.22;
    const noise = (Math.sin(phase) + Math.cos(phase * 0.7)) * 0.035;
    const idx = clamp01(ref.ref + noise);

    out.push({
      ts: t.toISOString(),
      pointId: ref.id,
      pointName: ref.name,
      kind: "ref",
      metrics: null,
      index: idx,
    });
  }
  return out;
}

function filterByRange(records, fromISO, toISO) {
  const from = fromISO ? new Date(fromISO).getTime() : -Infinity;
  const to = toISO ? new Date(toISO).getTime() : Infinity;
  return records.filter((r) => {
    const t = new Date(r.ts).getTime();
    return t >= from && t <= to;
  });
}

// ---------------- HEAT LAYER (EMF) ----------------
function HeatLayer({ enabled, points, gradient, radius = 58, blur = 45 }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!enabled) return;

    const heatData = (points || []).map((p) => [p.lat, p.lon, clamp01(p.v)]);
    const layer = L.heatLayer(heatData, {
      radius,
      blur,
      maxZoom: 9,
      minOpacity: 0.3,
      gradient,
    }).addTo(map);

    return () => map.removeLayer(layer);
  }, [map, enabled, points, gradient, radius, blur]);

  return null;
}

// ---------------- UI HELPERS ----------------
function Badge({ mode }) {
  const isReal = mode === "real";
  return (
    <span className={`badge ${isReal ? "real" : "sim"}`}>
      {isReal ? "GERÇEK İSTASYON VERİSİ" : "BÖLGESEL SİMÜLASYON"}
    </span>
  );
}

function TopNav({ page, setPage }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">Sirius Anomali Monitörü</div>
        <div className="brand-sub">gmpt-lab.com</div>
      </div>
      <nav className="mainnav">
        <button
          className={`navlink ${page === "map" ? "active" : ""}`}
          onClick={() => setPage("map")}
          type="button"
        >
          Harita
        </button>
        <button
          className={`navlink ${page === "about" ? "active" : ""}`}
          onClick={() => setPage("about")}
          type="button"
        >
          Biz Kimiz
        </button>
        <button
          className={`navlink ${page === "papers" ? "active" : ""}`}
          onClick={() => setPage("papers")}
          type="button"
        >
          Makaleler / ORCID
        </button>
        <button
          className={`navlink ${page === "contact" ? "active" : ""}`}
          onClick={() => setPage("contact")}
          type="button"
        >
          İletişim
        </button>
      </nav>
    </header>
  );
}

// ---------------- MAIN APP ----------------
export default function App() {
  // pages
  const [page, setPage] = useState("map");

  // map layers
  const [layer, setLayer] = useState("EMF");

  // INDEX mode
  const [indexMode, setIndexMode] = useState("real"); // real | model

  // unified selection (station/ref)
  const [selection, setSelection] = useState({ kind: "station", id: "KMR" });

  // Z1 time range selection
  const [rangePreset, setRangePreset] = useState("7d"); // 24h | 7d | 30d | custom
  const [fromISO, setFromISO] = useState("");
  const [toISO, setToISO] = useState("");

  // report export ref (Z3)
  const reportRef = useRef(null);

  const gradient = useMemo(
    () => ({
      0.0: "#0000ff",
      0.25: "#00ffff",
      0.45: "#00ff00",
      0.65: "#ffff00",
      0.8: "#ff7a00",
      1.0: "#ff0000",
    }),
    []
  );

  // Build series data (demo) for BOTH stations and refs
  const seriesByPoint = useMemo(() => {
    const map = new Map();
    for (const st of STATIONS) map.set(st.id, genSeriesForStation(st, 30, 4));
    for (const r of REF_CITIES) map.set(r.id, genSeriesForRefCity(r, 30, 4));
    return map;
  }, []);

  const selectedStation = useMemo(() => {
    return STATIONS.find((s) => s.id === selection.id) ?? null;
  }, [selection.id]);

  const selectedRef = useMemo(() => {
    return REF_CITIES.find((r) => r.id === selection.id) ?? null;
  }, [selection.id]);

  const selectedName = selectedStation?.name ?? selectedRef?.name ?? "-";

  // Apply rangePreset -> from/to
  useEffect(() => {
    if (rangePreset === "custom") return;

    const now = new Date();
    let from = null;

    if (rangePreset === "24h")
      from = new Date(now.getTime() - 24 * 3600 * 1000);
    if (rangePreset === "7d")
      from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    if (rangePreset === "30d")
      from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    setFromISO(from ? from.toISOString() : "");
    setToISO(now.toISOString());
  }, [rangePreset]);

  // Z1: filtered records for selected point
  const filteredRecords = useMemo(() => {
    const recs = seriesByPoint.get(selection.id) ?? [];
    return filterByRange(recs, fromISO, toISO);
  }, [selection.id, seriesByPoint, fromISO, toISO]);

  const quickStats = useMemo(() => {
    const arr = filteredRecords;
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    let min = 1,
      max = 0,
      sum = 0;
    for (const r of arr) {
      const v = clamp01(r.index);
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
    }
    return {
      min: Number(min.toFixed(3)),
      max: Number(max.toFixed(3)),
      avg: Number((sum / arr.length).toFixed(3)),
    };
  }, [filteredRecords]);

  // Z2 chart data: last 7 days aggregated
  const last7dSeries = useMemo(() => {
    const recs = seriesByPoint.get(selection.id) ?? [];
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const filtered = filterByRange(recs, from, now.toISOString());

    const buckets = new Map();
    for (const r of filtered) {
      const dayKey = fmtDay(r.ts);
      const prev = buckets.get(dayKey) ?? { sum: 0, n: 0 };
      prev.sum += clamp01(r.index);
      prev.n += 1;
      buckets.set(dayKey, prev);
    }

    return Array.from(buckets.entries()).map(([day, v]) => ({
      day,
      anomaly: v.n ? Number((v.sum / v.n).toFixed(3)) : 0,
    }));
  }, [selection.id, seriesByPoint]);

  // Map points (stations)
  const stationsAsPoints = useMemo(() => {
    return STATIONS.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      kind: "station",
      metrics: s.metrics,
      v:
        layer === "ERT"
          ? clamp01(s.metrics.ERT)
          : layer === "EMF"
          ? clamp01(s.metrics.EMF)
          : layer === "Radon"
          ? clamp01(s.metrics.Radon)
          : layer === "Cosmic"
          ? clamp01(s.metrics.Muller)
          : layer === "INDEX"
          ? clamp01(anomalyIndex(s.metrics))
          : 0.3,
    }));
  }, [layer]);

  // Ref points only for INDEX + model
  const refPoints = useMemo(() => {
    if (!(layer === "INDEX" && indexMode === "model")) return [];
    return REF_CITIES.map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lon: r.lon,
      kind: "ref",
      v: clamp01(r.ref),
    }));
  }, [layer, indexMode]);

  // Heat cloud for EMF
  const emfHeatPoints = useMemo(() => {
    const out = [];
    const rings = [
      { d: 0.18, w: 0.75 },
      { d: 0.4, w: 0.45 },
      { d: 0.7, w: 0.25 },
    ];
    for (const s of STATIONS) {
      const base = clamp01(s.metrics.EMF ?? 0);
      out.push({ lat: s.lat, lon: s.lon, v: base });

      for (const r of rings) {
        const d = r.d;
        const v = clamp01(base * r.w);
        out.push({ lat: s.lat + d, lon: s.lon, v });
        out.push({ lat: s.lat - d, lon: s.lon, v });
        out.push({ lat: s.lat, lon: s.lon + d, v });
        out.push({ lat: s.lat, lon: s.lon - d, v });

        out.push({ lat: s.lat + d * 0.7, lon: s.lon + d * 0.7, v });
        out.push({ lat: s.lat + d * 0.7, lon: s.lon - d * 0.7, v });
        out.push({ lat: s.lat - d * 0.7, lon: s.lon + d * 0.7, v });
        out.push({ lat: s.lat - d * 0.7, lon: s.lon - d * 0.7, v });
      }
    }
    return out;
  }, []);

  // Selection from map
  function onSelectPoint(p) {
    setSelection({ kind: p.kind, id: p.id });
  }

  // Current index & alarm:
  const selectedIndex = useMemo(() => {
    if (selectedStation) return anomalyIndex(selectedStation.metrics);
    if (selectedRef) return clamp01(selectedRef.ref);
    return 0;
  }, [selectedStation, selectedRef]);

  const selectedAlarm = useMemo(() => alarmLabel(selectedIndex), [selectedIndex]);

  // Export
  async function exportPNG() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#0b0f1a",
      useCORS: true,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `GMPT_${selectedName}_report.png`;
    a.click();
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#0b0f1a",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = usableWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    pdf.save(`GMPT_${selectedName}_report.pdf`);
  }

  // Non-map pages
  if (page !== "map") {
    return (
      <div className="app">
        <TopNav page={page} setPage={setPage} />
        <DisclaimerBand />

        {page === "about" && <AboutPage onBack={() => setPage("map")} />}
        {page === "papers" && <PapersPage onBack={() => setPage("map")} />}
        {page === "contact" && <ContactPage onBack={() => setPage("map")} />}
      </div>
    );
  }

  return (
    <div className="app">
      <TopNav page={page} setPage={setPage} />
      <DisclaimerBand />

      <section className="page" id="harita">
        <div className="map-layout">
          {/* MAP */}
          <div className="map-wrap">
            <MapContainer center={[39.0, 35.0]} zoom={6} className="map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              {/* EMF heat */}
              <HeatLayer
                enabled={layer === "EMF"}
                points={emfHeatPoints}
                gradient={gradient}
              />

              {/* Radon polygons */}
              {layer === "Radon" &&
                stationsAsPoints.map((p) => (
                  <Polygon
                    key={`radon-${p.id}`}
                    positions={triangleAround(p.lat, p.lon, 0.24)}
                    pathOptions={{
                      color: "rgba(255,255,255,0.35)",
                      weight: 1,
                      fillColor: colorForValue(p.v),
                      fillOpacity: 0.45,
                    }}
                    eventHandlers={{ click: () => onSelectPoint(p) }}
                  >
                    <Tooltip direction="top" opacity={1}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div>
                        Radon: <b>{p.v.toFixed(2)}</b>
                      </div>
                    </Tooltip>
                  </Polygon>
                ))}

              {/* Station markers (ERT/EMF/Cosmic/INDEX) */}
              {layer !== "Radon" &&
                stationsAsPoints.map((p) => (
                  <CircleMarker
                    key={`${layer}-${p.id}`}
                    center={[p.lat, p.lon]}
                    radius={radiusForValue(p.v)}
                    pathOptions={{
                      color: "rgba(255,255,255,0.30)",
                      weight: 1,
                      fillColor: colorForValue(p.v),
                      fillOpacity: 0.55,
                    }}
                    eventHandlers={{ click: () => onSelectPoint(p) }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div>
                        {layer === "INDEX" ? "Anomali" : layer}:{" "}
                        <b>{p.v.toFixed(2)}</b>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

              {/* Ref points for INDEX+model */}
              {layer === "INDEX" &&
                indexMode === "model" &&
                refPoints.map((p) => (
                  <CircleMarker
                    key={`ref-${p.id}`}
                    center={[p.lat, p.lon]}
                    radius={6}
                    pathOptions={{
                      color: "rgba(255,255,255,0.25)",
                      weight: 1,
                      fillColor: colorForValue(p.v),
                      fillOpacity: 0.35,
                    }}
                    eventHandlers={{ click: () => onSelectPoint(p) }}
                  >
                    <Tooltip direction="top" opacity={1}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div>
                        Referans (model): <b>{p.v.toFixed(2)}</b>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
            </MapContainer>
          </div>

          {/* SIDE */}
          <aside className="side">
            {/* Layer tabs */}
            <div className="tabs">
              {["ERT", "EMF", "Radon", "Cosmic", "INDEX"].map((k) => (
                <button
                  key={k}
                  className={`tab ${layer === k ? "active" : ""}`}
                  onClick={() => setLayer(k)}
                  type="button"
                >
                  {k === "INDEX" ? "Anomali Endeksi" : k}
                </button>
              ))}
            </div>

            {/* Badge */}
            {layer === "INDEX" ? (
              <div style={{ marginBottom: 10 }}>
                <Badge mode={indexMode} />
              </div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                <Badge mode="real" />
              </div>
            )}

            {/* INDEX buttons */}
            {layer === "INDEX" && (
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn ${indexMode === "real" ? "" : "ghost"}`}
                  onClick={() => setIndexMode("real")}
                  style={{ flex: 1 }}
                >
                  İstasyon Verisi (Gerçek)
                </button>
                <button
                  type="button"
                  className={`btn ${indexMode === "model" ? "" : "ghost"}`}
                  onClick={() => setIndexMode("model")}
                  style={{ flex: 1 }}
                >
                  Bölgesel Simülasyon (Model)
                </button>
              </div>
            )}

            {/* Z1: Time range selector */}
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Zaman Aralığı</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={rangePreset}
                  onChange={(e) => setRangePreset(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                  }}
                >
                  <option value="24h">Son 24 Saat</option>
                  <option value="7d">Son 7 Gün</option>
                  <option value="30d">Son 30 Gün</option>
                  <option value="custom">Özel Aralık</option>
                </select>

                {rangePreset === "custom" && (
                  <>
                    <input
                      type="datetime-local"
                      value={fromISO ? toLocalInput(fromISO) : ""}
                      onChange={(e) => setFromISO(fromLocalInput(e.target.value))}
                      className="dt"
                    />
                    <input
                      type="datetime-local"
                      value={toISO ? toLocalInput(toISO) : ""}
                      onChange={(e) => setToISO(fromLocalInput(e.target.value))}
                      className="dt"
                    />
                  </>
                )}
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                Seçili: <b>{selectedName}</b> · Kayıt:{" "}
                <b>{filteredRecords.length}</b>
              </div>
              <div className="muted">
                Min/Ort/Max Anomali: <b>{quickStats.min}</b> /{" "}
                <b>{quickStats.avg}</b> / <b>{quickStats.max}</b>
              </div>
            </div>

            {/* City card */}
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Şehir Kartı</div>

              <div className="card">
                <div className="card-h">{selectedName}</div>

                {selectedStation ? (
                  <>
                    <div className="kv">
                      <div>ERT</div>
                      <div>{clamp01(selectedStation.metrics.ERT).toFixed(2)}</div>
                      <div>EMF</div>
                      <div>{clamp01(selectedStation.metrics.EMF).toFixed(2)}</div>
                      <div>Radon</div>
                      <div>{clamp01(selectedStation.metrics.Radon).toFixed(2)}</div>
                      <div>Müller</div>
                      <div>{clamp01(selectedStation.metrics.Muller).toFixed(2)}</div>
                      <div>Bitki</div>
                      <div>{clamp01(selectedStation.metrics.Leaf).toFixed(2)}</div>
                      <div>CO₂</div>
                      <div>{clamp01(selectedStation.metrics.CO2).toFixed(2)}</div>
                      <div>CH₄</div>
                      <div>{clamp01(selectedStation.metrics.CH4).toFixed(2)}</div>

                      <div>Anomali Endeksi</div>
                      <div>
                        <b>{Math.round(clamp01(selectedIndex) * 100)}</b>/100
                      </div>

                      <div>Alarm Seviyesi</div>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: selectedAlarm.col,
                            color: "#111",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {selectedAlarm.txt}
                        </span>
                      </div>
                    </div>

                    <div className="muted" style={{ marginTop: 8 }}>
                      Not: Alarm sınıfı “anomali seviyesi” içindir; deprem tahmini/erken
                      uyarı değildir.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="kv">
                      <div>Referans (Model)</div>
                      <div>{clamp01(selectedRef?.ref ?? 0).toFixed(2)}</div>

                      <div>Anomali Endeksi</div>
                      <div>
                        <b>{Math.round(clamp01(selectedIndex) * 100)}</b>/100
                      </div>

                      <div>Alarm Seviyesi</div>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: selectedAlarm.col,
                            color: "#111",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {selectedAlarm.txt}
                        </span>
                      </div>
                    </div>

                    <div className="muted" style={{ marginTop: 8 }}>
                      Bu şehir “Bölgesel Simülasyon (Model)” referans noktasıdır.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Z2: 7-day trend chart */}
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Son 7 Gün Anomali Trendi</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7dSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 1]} />
                    <RTooltip />
                    <Line type="monotone" dataKey="anomaly" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                Trend, 7 günlük günlük ortalama anomali endeksidir.
              </div>
            </div>

            {/* Z3: Export report */}
            <div className="panel">
              <div className="panel-title">Rapor Export</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <button className="btn ghost" type="button" onClick={exportPNG}>
                  PNG indir
                </button>
                <button className="btn" type="button" onClick={exportPDF}>
                  PDF indir
                </button>
              </div>

              <div ref={reportRef} className="report">
                <div className="report-h">GMPT / Sirius — Anomali Raporu (Beta)</div>
                <div className="muted">
                  Seçim: <b>{selectedName}</b> · Aralık:{" "}
                  <b>{rangeLabel(rangePreset, fromISO, toISO)}</b>
                </div>
                <div className="muted">
                  Min/Ort/Max: <b>{quickStats.min}</b> / <b>{quickStats.avg}</b> /{" "}
                  <b>{quickStats.max}</b>
                </div>

                <div style={{ marginTop: 10, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last7dSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 1]} />
                      <RTooltip />
                      <Line type="monotone" dataKey="anomaly" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="report-note">
                  Bu rapor, gözlemsel anomalilerin izlenmesi amacıyla oluşturulmuştur.
                  Deprem erken uyarı / deprem tahmin sistemi değildir. Model/simülasyon
                  çıktıları içerebilir.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

// ---------------- PAGES (non-map) ----------------
function DisclaimerBand() {
  return (
    <div className="disclaimer">
      <strong>Bilgilendirme:</strong> Bu platform bir <b>deprem erken uyarı</b> veya{" "}
      <b>deprem tahmin</b> sistemi değildir. Yer kabuğu/atmosfer/EMF gibi alanlarda
      gözlemlenen fiziksel anomalilerin izlenmesi ve bilimsel analizine yöneliktir.
      “Anomali Endeksi” çıktıları <b>model/simülasyon</b> içerebilir ve kesin deprem
      iddiası taşımaz.
    </div>
  );
}

function AboutPage({ onBack }) {
  return (
    <div className="page page-text">
      <h1>Biz Kimiz</h1>
      <p>
        <b>SIRIUS</b>, yer kabuğu–atmosfer–elektromanyetik alan etkileşimlerinde gözlenen{" "}
        <b>fiziksel anomalileri</b> eşzamanlı izlemek ve bilimsel olarak analiz etmek
        amacıyla geliştirilen bir anomali gözlem platformudur.
      </p>
      <p className="note">
        Bu platform bir deprem erken uyarı / deprem tahmin sistemi değildir. Kesin
        zaman-yer-büyüklük iddiası içermez.
      </p>
      <button className="btn ghost" type="button" onClick={onBack}>
        Haritaya dön
      </button>
    </div>
  );
}

function PapersPage({ onBack }) {
  return (
    <div className="page page-text">
      <h1>Makaleler / ORCID</h1>
      <ul>
        <li>
          ORCID:{" "}
          <a href={LINKS.orcid} target="_blank" rel="noreferrer" className="link">
            {LINKS.orcid}
          </a>
        </li>
      </ul>
      <button className="btn ghost" type="button" onClick={onBack}>
        Haritaya dön
      </button>
    </div>
  );
}

function ContactPage({ onBack }) {
  return (
    <div className="page page-text">
      <h1>İletişim</h1>
      <ul>
        <li>
          Instagram:{" "}
          <a href={LINKS.instagram} target="_blank" rel="noreferrer" className="link">
            {LINKS.instagram}
          </a>
        </li>
        <li>
          WhatsApp Kanal:{" "}
          <a href={LINKS.whatsapp} target="_blank" rel="noreferrer" className="link">
            {LINKS.whatsapp}
          </a>
        </li>
        <li>
          ORCID:{" "}
          <a href={LINKS.orcid} target="_blank" rel="noreferrer" className="link">
            {LINKS.orcid}
          </a>
        </li>
      </ul>
      <button className="btn ghost" type="button" onClick={onBack}>
        Haritaya dön
      </button>
    </div>
  );
}

// ---------------- helpers for datetime-local ----------------
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInput(v) {
  const d = new Date(v);
  return d.toISOString();
}

function rangeLabel(preset, fromISO, toISO) {
  if (preset === "24h") return "Son 24 Saat";
  if (preset === "7d") return "Son 7 Gün";
  if (preset === "30d") return "Son 30 Gün";
  if (preset === "custom") {
    const f = fromISO ? new Date(fromISO).toLocaleString() : "-";
    const t = toISO ? new Date(toISO).toLocaleString() : "-";
    return `${f} → ${t}`;
  }
  return "-";
}
