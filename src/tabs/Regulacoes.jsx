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

export default function Regulacoes({ tema, cores }) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const accentColor = tema === "escuro" ? "#FFCB05" : "#FF0073";

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("regulacoes")
        .select("*")
        .order("data_execucao", { ascending: false });
      if (!error) setDados(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  function filtrarPorPeriodo(lista) {
    return lista.filter((r) => {
      const exec = getDataOnly(r.data_execucao);
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

  let filtrados = filtrarPorPeriodo(dados);
  if (busca.trim()) {
    filtrados = filtrados.filter((r) =>
      (r.numero_guia || "").toLowerCase().includes(busca.trim().toLowerCase())
    );
  }

  const totalGuias = filtrados.length;
  const totalProc = filtrados.reduce((acc, r) => acc + (r.procedimentos?.length || 0), 0);
  const media = totalGuias > 0 ? (totalProc / totalGuias).toFixed(1) : "0";

  // Contagem de procedimentos para gráfico
  const procCount = {};
  filtrados.forEach((r) => {
    r.procedimentos?.forEach((p) => {
      procCount[p] = (procCount[p] || 0) + 1;
    });
  });
  const chartData = Object.entries(procCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([nome, valor]) => ({ nome: nome.length > 28 ? nome.slice(0, 28) + "…" : nome, valor }));

  function exportarExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["", "", "", "Total de guias", filtrados.length],
      ["", "", "", "Total de procedimentos", totalProc],
      ["", "", "", "Média por guia", media],
      [],
      ["Nº da Guia", "Qtd. Procedimentos", "Data de Execução"],
      ...filtrados.map((r) => [
        r.numero_guia || "—",
        r.procedimentos?.length ?? 0,
        formatarDataHora(r.data_execucao),
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regulações");
    XLSX.writeFile(wb, "regulacoes.xlsx");
  }

  return (
    <>
      {/* CARDS */}
      <div className="cards">
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Total de Guias Reguladas</h3>
          <p>{totalGuias.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Total de Procedimentos</h3>
          <p>{totalProc.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Média por Guia</h3>
          <p>{media} proc.</p>
        </div>
      </div>

      {/* GRÁFICO */}
      {chartData.length > 0 && (
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Top Procedimentos Mais Frequentes</h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" stroke={cores.texto} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" width={210} stroke={cores.texto} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="valor" fill={accentColor} name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="filtro">
        <div className="linha-filtros">
          <label>Nº da Guia:</label>
          <input
            className="filtro-processo"
            type="text"
            placeholder="Buscar número da guia"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label>Período:</label>
          <input
            className="filtro-data"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <span className="ate-text">até</span>
          <input
            className="filtro-data"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
          <button
            className="btn-tema"
            onClick={() => { setBusca(""); setDataInicio(""); setDataFim(""); }}
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
              <th style={{ color: cores.texto }}>Nº da Guia</th>
              <th style={{ color: cores.texto }}>Qtd. Procedimentos</th>
              <th style={{ color: cores.texto }}>Data de Execução</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ color: cores.texto, padding: 32 }}>Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={3} style={{ color: cores.texto, padding: 32 }}>Nenhum registro encontrado.</td></tr>
            ) : filtrados.map((r, i) => (
              <tr key={i}>
                <td style={{ color: cores.texto }}>{r.numero_guia || "—"}</td>
                <td style={{ color: cores.texto }}>{r.procedimentos?.length ?? 0}</td>
                <td style={{ color: cores.texto }}>{formatarDataHora(r.data_execucao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AÇÕES */}
      <div className="acoes-tabela">
        <button className="btn-tema" onClick={exportarExcel}>
          <span className="material-symbols-outlined">download</span>
          Exportar Planilha
        </button>
      </div>
    </>
  );
}
