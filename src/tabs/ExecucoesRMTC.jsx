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

export default function ExecucoesRMTC({ tema, cores }) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const accentColor = tema === "escuro" ? "#FFCB05" : "#FF0073";
  const COLOR_RM = tema === "escuro" ? "#60a5fa" : "#1d4ed8";
  const COLOR_TC = tema === "escuro" ? "#f87171" : "#dc2626";

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("execucoes_rmtc")
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
  if (filtroTipo !== "Todos") filtrados = filtrados.filter((r) => r.tipo === filtroTipo);
  if (busca.trim()) {
    filtrados = filtrados.filter((r) =>
      (r.numero_processo || "").toLowerCase().includes(busca.trim().toLowerCase())
    );
  }

  const totalRM = dados.filter((r) => r.tipo === "RM").length;
  const totalTC = dados.filter((r) => r.tipo === "TC").length;
  const totalGuias = filtrados.reduce((acc, r) => acc + (r.quantidade_guias || 0), 0);

  const chartData = [
    { nome: "RM", valor: dados.filter((r) => r.tipo === "RM").length },
    { nome: "TC", valor: dados.filter((r) => r.tipo === "TC").length },
  ];

  function exportarExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["", "", "", "Total RM", totalRM],
      ["", "", "", "Total TC", totalTC],
      ["", "", "", "Total de guias (filtrado)", totalGuias],
      [],
      ["Nº do Processo", "Tipo", "Qtd. Guias", "Data de Execução"],
      ...filtrados.map((r) => [
        r.numero_processo,
        r.tipo,
        r.quantidade_guias,
        formatarDataHora(r.data_execucao),
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Execuções RM-TC");
    XLSX.writeFile(wb, "execucoes_rmtc.xlsx");
  }

  return (
    <>
      {/* CARDS */}
      <div className="cards">
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Total de Processos RM</h3>
          <p style={{ color: COLOR_RM }}>{totalRM.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Total de Processos TC</h3>
          <p style={{ color: COLOR_TC }}>{totalTC.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
          <h3>Total de Guias</h3>
          <p>{totalGuias.toLocaleString("pt-BR")}</p>
          <p style={{ fontSize: 13, fontWeight: 400 }}>nos registros filtrados</p>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="card animated-card" style={{ backgroundColor: cores.card, color: cores.texto, cursor: 'pointer' }}>
        <h3>Distribuição RM vs TC</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="nome" stroke={cores.texto} tick={{ fontSize: 13 }} />
              <YAxis stroke={cores.texto} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="valor" fill={accentColor} name="Processos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filtro">
        <div className="linha-filtros">
          <label>Nº do Processo:</label>
          <input
            className="filtro-processo"
            type="text"
            placeholder="Buscar processo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label>Tipo:</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            {["Todos", "RM", "TC"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <label>Período:</label>
          <input className="filtro-data" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <span className="ate-text">até</span>
          <input className="filtro-data" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <button
            className="btn-tema"
            onClick={() => { setBusca(""); setFiltroTipo("Todos"); setDataInicio(""); setDataFim(""); }}
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
              <th style={{ color: cores.texto }}>Nº do Processo</th>
              <th style={{ color: cores.texto }}>Tipo</th>
              <th style={{ color: cores.texto }}>Qtd. de Guias</th>
              <th style={{ color: cores.texto }}>Data de Execução</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ color: cores.texto, padding: 32 }}>Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={4} style={{ color: cores.texto, padding: 32 }}>Nenhum registro encontrado.</td></tr>
            ) : filtrados.map((r, i) => (
              <tr key={i}>
                <td style={{ color: cores.texto }}>{r.numero_processo}</td>
                <td style={{ color: cores.texto }}>
                  <span className={r.tipo === "RM" ? "badge-rm" : "badge-tc"}>{r.tipo}</span>
                </td>
                <td style={{ color: cores.texto }}>{r.quantidade_guias}</td>
                <td style={{ color: cores.texto }}>{formatarDataHora(r.data_execucao)}</td>
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
