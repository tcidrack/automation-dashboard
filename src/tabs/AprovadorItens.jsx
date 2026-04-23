import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../lib/supabase";

function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    `${String(d.getDate()).padStart(2, "0")}/` +
    `${String(d.getMonth() + 1).padStart(2, "0")}/` +
    `${d.getFullYear()} ` +
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  );
}

function getDataOnly(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function AprovadorItens({ tema, cores }) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPrestador, setFiltroPrestador] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const accentColor = tema === "escuro" ? "#FFCB05" : "#FF0073";
  const COLOR_APROV = tema === "escuro" ? "#34d399" : "#059669";
  const COLOR_GLOS = tema === "escuro" ? "#f87171" : "#dc2626";

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("aprovador_itens")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setDados(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  function filtrarPorPeriodo(lista) {
    return lista.filter((r) => {
      const exec = getDataOnly(r.created_at);
      if (!exec) return false;
      if (dataInicio) {
        const [y, m, d] = dataInicio.split("-");
        if (exec < new Date(y, m - 1, d)) return false;
      }
      if (dataFim) {
        const [y, m, d] = dataFim.split("-");
        if (exec > new Date(y, m - 1, d)) return false;
      }
      return true;
    });
  }

  const prestadoresUnicos = ["Todos", ...new Set(dados.map((r) => r.prestador).filter(Boolean))];

  let filtrados = filtrarPorPeriodo(dados);
  if (filtroPrestador !== "Todos") filtrados = filtrados.filter((r) => r.prestador === filtroPrestador);
  if (busca.trim()) {
    filtrados = filtrados.filter((r) =>
      (r.numero_lote || "").toLowerCase().includes(busca.trim().toLowerCase()) ||
      (r.prestador || "").toLowerCase().includes(busca.trim().toLowerCase())
    );
  }

  const totalAprov = filtrados.reduce((acc, r) => acc + (r.qtd_itens_aprovados || 0), 0);
  const totalGlos = filtrados.reduce((acc, r) => acc + (r.qtd_itens_glosados || 0), 0);
  const totalItens = totalAprov + totalGlos;
  const taxaAprov = totalItens > 0 ? ((totalAprov / totalItens) * 100).toFixed(1) : "0";

  const totalMin = filtrados.reduce((acc, r) => acc + (r.tempo_gasto_minutos || 0), 0);
  const totalSeg = filtrados.reduce((acc, r) => acc + (r.tempo_gasto_segundos || 0), 0);
  const tempoTotal = totalMin + Math.floor(totalSeg / 60);
  const avgTempo = filtrados.length > 0 ? (tempoTotal / filtrados.length).toFixed(1) : "0";

  const chartData = [
    { nome: "Aprovados", valor: totalAprov },
    { nome: "Glosados", valor: totalGlos },
  ];

  function exportarExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["", "", "", "Total aprovados", totalAprov],
      ["", "", "", "Total glosados", totalGlos],
      ["", "", "", "Taxa de aprovação", taxaAprov + "%"],
      ["", "", "", "Tempo médio/lote", avgTempo + " min"],
      [],
      ["Prestador", "Nº do Lote", "Aprovados", "Glosados", "Tempo (min)", "Tempo (seg)", "Data"],
      ...filtrados.map((r) => [
        r.prestador,
        r.numero_lote,
        r.qtd_itens_aprovados ?? 0,
        r.qtd_itens_glosados ?? 0,
        r.tempo_gasto_minutos ?? 0,
        r.tempo_gasto_segundos ?? 0,
        formatarDataHora(r.created_at),
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aprovador de Itens");
    XLSX.writeFile(wb, "aprovador_itens.xlsx");
  }

  return (
    <>
      {/* CARDS */}
      <div className="cards">
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer'  }}>
          <h3>Itens Aprovados</h3>
          <p style={{ color: COLOR_APROV }}>{totalAprov.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer'  }}>
          <h3>Itens Glosados</h3>
          <p style={{ color: COLOR_GLOS }}>{totalGlos.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer'  }}>
          <h3>Taxa de Aprovação</h3>
          <p>{taxaAprov}%</p>
          <p style={{ fontSize: 13, fontWeight: 400 }}>{totalItens.toLocaleString("pt-BR")} itens no total</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer'  }}>
          <h3>Tempo Médio por Lote</h3>
          <p>{avgTempo} min</p>
          <p style={{ fontSize: 13, fontWeight: 400 }}>{tempoTotal.toLocaleString("pt-BR")} min economizados</p>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer'  }}>
        <h3>Aprovados vs Glosados</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="nome" stroke={cores.texto} tick={{ fontSize: 13 }} />
              <YAxis stroke={cores.texto} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="valor" fill={accentColor} name="Itens" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filtro">
        <div className="linha-filtros">
          <label>Busca:</label>
          <input
            className="filtro-processo"
            type="text"
            placeholder="Prestador ou nº do lote"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label>Prestador:</label>
          <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)}>
            {prestadoresUnicos.map((p) => <option key={p}>{p}</option>)}
          </select>
          <label>Período:</label>
          <input className="filtro-data" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <span className="ate-text">até</span>
          <input className="filtro-data" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <button
            className="btn-tema"
            onClick={() => { setBusca(""); setFiltroPrestador("Todos"); setDataInicio(""); setDataFim(""); }}
          >
            <span className="material-symbols-outlined">mop</span>
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="tabela-container" style={{ backgroundColor: cores.card }}>
        <table>
          <thead>
            <tr>
              <th style={{ color: cores.texto }}>Prestador</th>
              <th style={{ color: cores.texto }}>Nº do Lote</th>
              <th style={{ color: cores.texto }}>Aprovados</th>
              <th style={{ color: cores.texto }}>Glosados</th>
              <th style={{ color: cores.texto }}>Tempo</th>
              <th style={{ color: cores.texto }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ color: cores.texto, padding: 32 }}>Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} style={{ color: cores.texto, padding: 32 }}>Nenhum registro encontrado.</td></tr>
            ) : filtrados.map((r, i) => (
              <tr key={i}>
                <td style={{ color: cores.texto }}>{r.prestador}</td>
                <td style={{ color: cores.texto }}>{r.numero_lote}</td>
                <td style={{ color: COLOR_APROV, fontWeight: 600 }}>{r.qtd_itens_aprovados ?? 0}</td>
                <td style={{ color: r.qtd_itens_glosados > 0 ? COLOR_GLOS : cores.texto, fontWeight: r.qtd_itens_glosados > 0 ? 600 : 400 }}>
                  {r.qtd_itens_glosados ?? 0}
                </td>
                <td style={{ color: cores.texto }}>{r.tempo_gasto_minutos ?? 0}m {r.tempo_gasto_segundos ?? 0}s</td>
                <td style={{ color: cores.texto }}>{formatarDataHora(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="acoes-tabela">
        <button className="btn-tema" onClick={exportarExcel}>
          <span className="material-symbols-outlined">download</span>
          Exportar Planilha
        </button>
      </div>
    </>
  );
}
