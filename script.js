
// ============================================
// RED FINANCE - CONTROLE FINANCEIRO EMPRESARIAL
// ============================================

// CATEGORIAS DISPONÍVEIS
const categorias = [
    "Vendas",
    "Serviços",
    "Salários",
    "Aluguel",
    "Energia",
    "Internet",
    "Impostos",
    "Marketing",
    "Transporte",
    "Equipamentos",
    "Outros"
];

// CHAVE DO ARMAZENAMENTO
const STORAGE_KEY = "redFinanceTransactions";

// MOEDA BRASILEIRA
const formatarMoeda = valor => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);
};

// DATA LOCAL, SEM PROBLEMAS DE FUSO HORÁRIO
function dataLocal(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// MÊS ATUAL
function mesAtual() {
    return dataLocal().slice(0, 7);
}

// LÊ OS DADOS SALVOS
function carregarTransacoes() {
    try {
        const dados = localStorage.getItem(STORAGE_KEY);

        if (!dados) {
            return [];
        }

        const transacoes = JSON.parse(dados);

        if (!Array.isArray(transacoes)) {
            return [];
        }

        // Verifica os campos essenciais antes de utilizar os dados.
        return transacoes.filter(item => {
            return (
                item &&
                typeof item.id === "string" &&
                typeof item.descricao === "string" &&
                typeof item.valor === "number" &&
                Number.isFinite(item.valor) &&
                item.valor > 0 &&
                ["receita", "despesa"].includes(item.tipo) &&
                categorias.includes(item.categoria) &&
                typeof item.data === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(item.data)
            );
        });

    } catch (erro) {
        console.error("Erro ao carregar os dados:", erro);
        return [];
    }
}

// ESTADO DO SISTEMA
let transacoes = carregarTransacoes();

let flowChart = null;
let categoryChart = null;
let toastTimer = null;

// ============================================
// ELEMENTOS HTML
// ============================================

const modal = document.getElementById("transactionModal");
const form = document.getElementById("transactionForm");

const openModalButton = document.getElementById("openModal");
const closeModalButton = document.getElementById("closeModal");
const cancelModalButton = document.getElementById("cancelModal");

const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const notesInput = document.getElementById("notes");

const transactionTable = document.getElementById("transactionTable");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const dashboardMonth = document.getElementById("dashboardMonth");
const reportMonth = document.getElementById("reportMonth");

const monthAInput = document.getElementById("monthA");
const monthBInput = document.getElementById("monthB");

// ============================================
// ARMAZENAMENTO
// ============================================

function salvarTransacoes() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transacoes)
        );

        return true;

    } catch (erro) {
        console.error("Erro ao salvar os dados:", erro);

        mostrarToast(
            "Não foi possível salvar. Verifique o espaço disponível no navegador.",
            true
        );

        return false;
    }
}

// ============================================
// NOTIFICAÇÕES
// ============================================

function mostrarToast(mensagem, erro = false) {
    const toast = document.getElementById("toast");

    clearTimeout(toastTimer);

    toast.textContent = mensagem;
    toast.classList.toggle("error", erro);
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ============================================
// MODAL
// ============================================

function abrirModal() {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        descriptionInput.focus();
    }, 100);
}

function fecharModal() {
    modal.classList.remove("show");
    document.body.style.overflow = "";

    openModalButton.focus();
}

openModalButton.addEventListener("click", abrirModal);

closeModalButton.addEventListener("click", fecharModal);

cancelModalButton.addEventListener("click", fecharModal);

modal.addEventListener("click", evento => {
    if (evento.target === modal) {
        fecharModal();
    }
});

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && modal.classList.contains("show")) {
        fecharModal();
    }
});

// ============================================
// SELEÇÃO DO TIPO DE LANÇAMENTO
// ============================================

const incomeOption = document.getElementById("incomeOption");
const expenseOption = document.getElementById("expenseOption");

document.querySelectorAll('input[name="type"]').forEach(input => {

    input.addEventListener("change", atualizarTipoSelecionado);

});

function atualizarTipoSelecionado() {
    const tipo = document.querySelector('input[name="type"]:checked').value;

    incomeOption.classList.toggle(
        "selected",
        tipo === "receita"
    );

    expenseOption.classList.toggle(
        "selected",
        tipo === "despesa"
    );
}

// ============================================
// CADASTRO DE RECEITAS E DESPESAS
// ============================================

form.addEventListener("submit", evento => {
    evento.preventDefault();

    const descricao = descriptionInput.value.trim();
    const valor = Number(amountInput.value);
    const data = dateInput.value;
    const categoria = categoryInput.value;
    const observacoes = notesInput.value.trim();

    const tipo = document.querySelector(
        'input[name="type"]:checked'
    ).value;

    if (!descricao) {
        mostrarToast("Informe a descrição do lançamento.", true);
        descriptionInput.focus();
        return;
    }

    if (
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 1000000000000
    ) {
        mostrarToast("Informe um valor válido.", true);
        amountInput.focus();
        return;
    }

    if (!data || !validarData(data)) {
        mostrarToast("Informe uma data válida.", true);
        dateInput.focus();
        return;
    }

    if (!categorias.includes(categoria)) {
        mostrarToast("Selecione uma categoria válida.", true);
        categoryInput.focus();
        return;
    }

    const novaTransacao = {
        id: criarId(),
        descricao,
        valor: Math.round((valor + Number.EPSILON) * 100) / 100,
        tipo,
        categoria,
        data,
        observacoes
    };

    // Mantém o estado anterior se não for possível salvar.
    const transacoesAnteriores = transacoes;

    transacoes = [...transacoes, novaTransacao];

    if (!salvarTransacoes()) {
        transacoes = transacoesAnteriores;
        return;
    }

    form.reset();

    dateInput.value = dataLocal();

    document.querySelector(
        'input[name="type"][value="receita"]'
    ).checked = true;

    atualizarTipoSelecionado();

    // Mostra o mês do lançamento no dashboard e no relatório.
    dashboardMonth.value = data.slice(0, 7);
    reportMonth.value = data.slice(0, 7);

    // Atualiza a tela para o lançamento recém-cadastrado.
    startDateInput.value = "";
    endDateInput.value = "";
    searchInput.value = "";
    filterType.value = "todos";
    filterCategory.value = "todas";

    atualizarSistema();

    fecharModal();

    mostrarToast(
        `${tipo === "receita" ? "Receita" : "Despesa"} cadastrada com sucesso!`
    );
});

// GERA UM IDENTIFICADOR PARA CADA LANÇAMENTO
function criarId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// VALIDA UMA DATA REAL NO FORMATO AAAA-MM-DD
function validarData(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [ano, mes, dia] = valor.split("-").map(Number);

    const data = new Date(ano, mes - 1, dia);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

// ============================================
// CÁLCULOS FINANCEIROS
// ============================================

function calcularTotais(lista) {
    let receitas = 0;
    let despesas = 0;

    lista.forEach(transacao => {
        if (transacao.tipo === "receita") {
            receitas += transacao.valor;
        } else {
            despesas += transacao.valor;
        }
    });

    receitas = Math.round((receitas + Number.EPSILON) * 100) / 100;
    despesas = Math.round((despesas + Number.EPSILON) * 100) / 100;

    return {
        receitas,
        despesas,
        saldo: Math.round(
            (receitas - despesas + Number.EPSILON) * 100
        ) / 100
    };
}

function filtrarPorMes(mes) {
    return transacoes.filter(transacao => {
        return transacao.data.startsWith(mes);
    });
}

// ============================================
// DASHBOARD
// ============================================

function atualizarDashboard() {
    const mes = dashboardMonth.value || mesAtual();

    const listaMensal = filtrarPorMes(mes);
    const totais = calcularTotais(listaMensal);

    // O saldo atual considera todos os lançamentos cadastrados,
    // independentemente do mês selecionado.
    const saldoTotal = calcularTotais(transacoes).saldo;

    document.getElementById("balanceValue").textContent =
        formatarMoeda(saldoTotal);

    document.getElementById("incomeValue").textContent =
        formatarMoeda(totais.receitas);

    document.getElementById("expenseValue").textContent =
        formatarMoeda(totais.despesas);

    document.getElementById("resultValue").textContent =
        formatarMoeda(totais.saldo);

    // Resultado positivo ou negativo.
    const resultValue = document.getElementById("resultValue");
    const resultTag = document.getElementById("resultTag");

    resultValue.style.color =
        totais.saldo < 0 ? "#ff6262" : "#35c98a";

    resultTag.textContent =
        totais.saldo < 0 ? "RESULTADO NEGATIVO" : "RESULTADO DO MÊS";

    // Barra visual de receitas em relação ao movimento mensal.
    const movimentacao = totais.receitas + totais.despesas;

    const percentual = movimentacao > 0
        ? (totais.receitas / movimentacao) * 100
        : 0;

    document.getElementById("balanceProgress").style.width =
        `${percentual}%`;

    atualizarGraficos(listaMensal);
}

// ============================================
// GRÁFICO DE FLUXO FINANCEIRO
// ============================================

function atualizarGraficos(listaMensal) {
    if (typeof Chart === "undefined") {
        console.error("Chart.js não foi carregado.");
        return;
    }

    atualizarGraficoFluxo(listaMensal);
    atualizarGraficoCategorias(listaMensal);
}

function atualizarGraficoFluxo(listaMensal) {
    const contexto = document.getElementById("flowChart");

    const mes = dashboardMonth.value || mesAtual();

    const [ano, numeroMes] = mes.split("-").map(Number);

    const diasNoMes = new Date(
        ano,
        numeroMes,
        0
    ).getDate();

    const receitasPorDia = Array(diasNoMes).fill(0);
    const despesasPorDia = Array(diasNoMes).fill(0);

    listaMensal.forEach(transacao => {
        const dia = Number(transacao.data.slice(8, 10)) - 1;

        if (transacao.tipo === "receita") {
            receitasPorDia[dia] += transacao.valor;
        } else {
            despesasPorDia[dia] += transacao.valor;
        }
    });

    const labels = Array.from(
        { length: diasNoMes },
        (_, indice) => String(indice + 1).padStart(2, "0")
    );

    if (flowChart) {
        flowChart.destroy();
    }

    flowChart = new Chart(contexto, {
        type: "line",

        data: {
            labels,

            datasets: [
                {
                    label: "Receitas",
                    data: receitasPorDia,
                    borderColor: "#35c98a",
                    backgroundColor: "rgba(53, 201, 138, 0.08)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                },

                {
                    label: "Despesas",
                    data: despesasPorDia,
                    borderColor: "#ed3434",
                    backgroundColor: "rgba(237, 52, 52, 0.06)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    labels: {
                        color: "#b8b8b8",
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 18
                    }
                },

                tooltip: {
                    callbacks: {
                        label: contexto => {
                            return `${contexto.dataset.label}: ${formatarMoeda(contexto.raw)}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        color: "rgba(255,255,255,0.04)"
                    },

                    ticks: {
                        color: "#777777",
                        maxTicksLimit: 10
                    },

                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "rgba(255,255,255,0.06)"
                    },

                    ticks: {
                        color: "#777777",

                        callback: valor => {
                            return Number(valor).toLocaleString("pt-BR");
                        }
                    },

                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

// ============================================
// GRÁFICO DE DESPESAS POR CATEGORIA
// ============================================

function atualizarGraficoCategorias(listaMensal) {
    const contexto = document.getElementById("categoryChart");

    const despesas = {};

    listaMensal.forEach(transacao => {
        if (transacao.tipo !== "despesa") {
            return;
        }

        despesas[transacao.categoria] =
            (despesas[transacao.categoria] || 0) + transacao.valor;
    });

    const labels = Object.keys(despesas);
    const valores = Object.values(despesas);

    const cores = [
        "#ed3434",
        "#ff7777",
        "#b91f29",
        "#d97757",
        "#8b3333",
        "#a64b4b",
        "#e5a15b",
        "#8a8a8a",
        "#b9b9b9",
        "#704040",
        "#555555"
    ];

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(contexto, {
        type: "doughnut",

        data: {
            labels,

            datasets: [
                {
                    data: valores,
                    backgroundColor: cores,
                    borderColor: "#121212",
                    borderWidth: 4,
                    hoverOffset: 7
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        color: "#b8b8b8",
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        font: {
                            size: 10
                        }
                    }
                },

                tooltip: {
                    callbacks: {
                        label: contexto => {
                            return `${contexto.label}: ${formatarMoeda(contexto.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// FILTROS DE MOVIMENTAÇÕES
// ============================================

function obterTransacoesFiltradas() {
    const pesquisa = searchInput.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const tipo = filterType.value;
    const categoria = filterCategory.value;

    const inicio = startDateInput.value;
    const fim = endDateInput.value;

    return transacoes
        .filter(transacao => {

            const correspondeDescricao =
                transacao.descricao
                    .toLocaleLowerCase("pt-BR")
                    .includes(pesquisa) ||
                transacao.categoria
                    .toLocaleLowerCase("pt-BR")
                    .includes(pesquisa) ||
                transacao.observacoes
                    ?.toLocaleLowerCase("pt-BR")
                    .includes(pesquisa);

            const correspondeTipo =
                tipo === "todos" || transacao.tipo === tipo;

            const correspondeCategoria =
                categoria === "todas" ||
                transacao.categoria === categoria;

            const correspondeInicio =
                !inicio || transacao.data >= inicio;

            const correspondeFim =
                !fim || transacao.data <= fim;

            return (
                correspondeDescricao &&
                correspondeTipo &&
                correspondeCategoria &&
                correspondeInicio &&
                correspondeFim
            );
        })
        .sort((a, b) => {
            return b.data.localeCompare(a.data) ||
                b.id.localeCompare(a.id);
        });
}

function atualizarTabela() {
    const lista = obterTransacoesFiltradas();

    transactionTable.replaceChildren();

    document.getElementById("transactionCount").textContent =
        `${lista.length} ${lista.length === 1 ? "movimentação" : "movimentações"}`;

    emptyState.style.display = lista.length === 0 ? "block" : "none";

    lista.forEach(transacao => {
        const linha = document.createElement("tr");

        const descricaoCell = document.createElement("td");
        const descricao = document.createElement("span");

        descricao.className = "transaction-description";
        descricao.textContent = transacao.descricao;

        descricaoCell.appendChild(descricao);

        if (transacao.observacoes) {
            const notas = document.createElement("small");

            notas.className = "transaction-notes";
            notas.textContent = transacao.observacoes;

            descricaoCell.appendChild(notas);
        }

        const categoriaCell = document.createElement("td");
        const categoriaBadge = document.createElement("span");

        categoriaBadge.className = "category-badge";
        categoriaBadge.textContent = transacao.categoria;

        categoriaCell.appendChild(categoriaBadge);

        const dataCell = document.createElement("td");

        dataCell.textContent = new Date(
            `${transacao.data}T12:00:00`
        ).toLocaleDateString("pt-BR");

        const tipoCell = document.createElement("td");
        const tipoBadge = document.createElement("span");

        tipoBadge.className = `type-badge ${transacao.tipo}`;

        tipoBadge.textContent =
            transacao.tipo === "receita"
                ? "↗ Receita"
                : "↘ Despesa";

        tipoCell.appendChild(tipoBadge);

        const valorCell = document.createElement("td");

        valorCell.className =
            transacao.tipo === "receita"
                ? "amount-income"
                : "amount-expense";

        valorCell.textContent =
            `${transacao.tipo === "receita" ? "+" : "-"} ${formatarMoeda(transacao.valor)}`;

        const acaoCell = document.createElement("td");
        const excluirButton = document.createElement("button");

        excluirButton.type = "button";
        excluirButton.className = "delete-button";
        excluirButton.textContent = "×";
        excluirButton.setAttribute(
            "aria-label",
            `Excluir ${transacao.descricao}`
        );

        excluirButton.addEventListener("click", () => {
            excluirTransacao(transacao.id);
        });

        acaoCell.appendChild(excluirButton);

        linha.append(
            descricaoCell,
            categoriaCell,
            dataCell,
            tipoCell,
            valorCell,
            acaoCell
        );

        transactionTable.appendChild(linha);
    });
}

// ============================================
// EXCLUSÃO DE LANÇAMENTOS
// ============================================

function excluirTransacao(id) {
    const transacao = transacoes.find(item => item.id === id);

    if (!transacao) {
        mostrarToast("Lançamento não encontrado.", true);
        return;
    }

    const confirmado = confirm(
        `Deseja realmente excluir o lançamento "${transacao.descricao}"?`
    );

    if (!confirmado) {
        return;
    }

    const anteriores = transacoes;

    transacoes = transacoes.filter(item => item.id !== id);

    if (!salvarTransacoes()) {
        transacoes = anteriores;
        return;
    }

    atualizarSistema();

    mostrarToast("Lançamento excluído com sucesso!");
}

// ============================================
// LIMPAR FILTROS
// ============================================

function limparFiltros() {
    searchInput.value = "";
    filterType.value = "todos";
    filterCategory.value = "todas";
    startDateInput.value = "";
    endDateInput.value = "";

    atualizarTabela();
}

document.getElementById("clearFilters").addEventListener(
    "click",
    limparFiltros
);

// Atualiza a tabela conforme o usuário altera os filtros.
[
    searchInput,
    filterType,
    filterCategory,
    startDateInput,
    endDateInput
].forEach(elemento => {

    elemento.addEventListener("input", atualizarTabela);
    elemento.addEventListener("change", atualizarTabela);

});

// ============================================
// RELATÓRIO MENSAL
// ============================================

function atualizarRelatorio() {
    const mes = reportMonth.value || mesAtual();

    const lista = filtrarPorMes(mes);
    const totais = calcularTotais(lista);

    document.getElementById("reportIncome").textContent =
        formatarMoeda(totais.receitas);

    document.getElementById("reportExpense").textContent =
        formatarMoeda(totais.despesas);

    const resultado = document.getElementById("reportResult");

    resultado.textContent = formatarMoeda(totais.saldo);

    resultado.style.color =
        totais.saldo < 0 ? "#ff6262" : "#35c98a";

    document.getElementById("reportCount").textContent =
        lista.length;

    const nomeMes = nomeDoMes(mes);

    let mensagem = "";

    if (lista.length === 0) {
        mensagem =
            `Não existem lançamentos registrados em ${nomeMes}.`;
    } else if (totais.saldo > 0) {
        mensagem =
            `Em ${nomeMes}, a empresa teve resultado positivo de ${formatarMoeda(totais.saldo)}.`;
    } else if (totais.saldo < 0) {
        mensagem =
            `Em ${nomeMes}, as despesas superaram as receitas em ${formatarMoeda(Math.abs(totais.saldo))}.`;
    } else {
        mensagem =
            `Em ${nomeMes}, as receitas e despesas ficaram equilibradas.`;
    }

    document.getElementById("reportMessage").textContent = mensagem;
}

function nomeDoMes(mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
        return mes;
    }

    const [ano, numeroMes] = mes.split("-").map(Number);

    return new Date(
        ano,
        numeroMes - 1,
        1
    ).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });
}

// ============================================
// COMPARAÇÃO ENTRE DOIS MESES
// ============================================

function compararMeses() {
    const mesA = monthAInput.value;
    const mesB = monthBInput.value;

    if (!mesA || !mesB) {
        mostrarToast("Selecione os dois meses para comparar.", true);
        return;
    }

    if (mesA === mesB) {
        mostrarToast("Selecione dois meses diferentes.", true);
        return;
    }

    const despesasA = calcularTotais(
        filtrarPorMes(mesA)
    ).despesas;

    const despesasB = calcularTotais(
        filtrarPorMes(mesB)
    ).despesas;

    const diferenca = Math.round(
        (despesasB - despesasA + Number.EPSILON) * 100
    ) / 100;

    let variacao = 0;

    if (despesasA > 0) {
        variacao = (diferenca / despesasA) * 100;
    }

    let mensagem = "";

    if (despesasA === 0 && despesasB === 0) {
        mensagem =
            "Não houve despesas registradas em nenhum dos dois meses.";
    } else if (despesasA === 0 && despesasB > 0) {
        mensagem =
            `As despesas passaram de R$ 0,00 para ${formatarMoeda(despesasB)}. Não é possível calcular uma variação percentual com base zero.`;
    } else if (diferenca > 0) {
        mensagem =
            `As despesas aumentaram ${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% em ${nomeDoMes(mesB)} em relação a ${nomeDoMes(mesA)}.`;
    } else if (diferenca < 0) {
        mensagem =
            `As despesas diminuíram ${Math.abs(variacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% em ${nomeDoMes(mesB)} em relação a ${nomeDoMes(mesA)}.`;
    } else {
        mensagem =
            "As despesas permaneceram iguais nos dois meses.";
    }

    const resultado = document.getElementById("comparisonResult");

    resultado.replaceChildren();

    const cards = document.createElement("div");
    cards.className = "comparison-cards";

    const cardA = criarCardComparacao(
        nomeDoMes(mesA),
        despesasA
    );

    const cardB = criarCardComparacao(
        nomeDoMes(mesB),
        despesasB
    );

    cards.append(cardA, cardB);

    const resumo = document.createElement("div");
    resumo.className = "comparison-summary";

    const titulo = document.createElement("strong");

    titulo.textContent = diferenca > 0
        ? "↑ Aumento de despesas"
        : diferenca < 0
            ? "↓ Redução de despesas"
            : "→ Sem alteração";

    const texto = document.createElement("p");
    texto.style.marginTop = "8px";

    texto.textContent =
        `${mensagem} Diferença absoluta: ${formatarMoeda(Math.abs(diferenca))}.`;

    resumo.append(titulo, texto);

    resultado.append(cards, resumo);
}

function criarCardComparacao(mes, valor) {
    const card = document.createElement("div");
    card.className = "comparison-card";

    const titulo = document.createElement("span");
    titulo.textContent = mes;

    const valorElemento = document.createElement("strong");
    valorElemento.textContent = formatarMoeda(valor);

    card.append(titulo, valorElemento);

    return card;
}

document.getElementById("compareMonths").addEventListener(
    "click",
    compararMeses
);

// ============================================
// EXPORTAÇÃO CSV
// ============================================

function escaparCSV(valor) {
    let texto = String(valor ?? "");

    // Evita que programas de planilha interpretem campos
    // iniciados por fórmulas como comandos executáveis.
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

function exportarCSV(lista, nomeArquivo) {
    const cabecalho = [
        "Descrição",
        "Tipo",
        "Categoria",
        "Data",
        "Valor",
        "Observações"
    ];

    const linhas = lista.map(transacao => [
        transacao.descricao,
        transacao.tipo === "receita" ? "Receita" : "Despesa",
        transacao.categoria,
        transacao.data,
        transacao.valor.toFixed(2).replace(".", ","),
        transacao.observacoes || ""
    ]);

    const conteudo = [
        cabecalho,
        ...linhas
    ]
        .map(linha => linha.map(escaparCSV).join(";"))
        .join("\r\n");

    // BOM UTF-8 para melhorar a compatibilidade com acentos.
    const blob = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    mostrarToast("Relatório CSV exportado com sucesso!");
}

// Exporta os lançamentos que correspondem aos filtros da tabela.
document.getElementById("exportCsv").addEventListener("click", () => {
    const lista = obterTransacoesFiltradas();

    if (lista.length === 0) {
        mostrarToast("Não há lançamentos para exportar.", true);
        return;
    }

    exportarCSV(
        lista,
        `red-finance-movimentacoes-${dataLocal()}.csv`
    );
});

// Exporta todos os lançamentos do mês selecionado no relatório.
document.getElementById("exportMonthlyCsv").addEventListener("click", () => {
    const mes = reportMonth.value || mesAtual();
    const lista = filtrarPorMes(mes);

    if (lista.length === 0) {
        mostrarToast("Não há lançamentos neste mês para exportar.", true);
        return;
    }

    exportarCSV(
        lista,
        `red-finance-relatorio-${mes}.csv`
    );
});

// ============================================
// MENU LATERAL
// ============================================

document.querySelectorAll(".menu-item").forEach(link => {

    link.addEventListener("click", () => {

        document.querySelectorAll(".menu-item").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });

});

// ============================================
// ATUALIZAÇÃO GERAL DO SISTEMA
// ============================================

function atualizarSistema() {
    atualizarDashboard();
    atualizarTabela();
    atualizarRelatorio();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function inicializarSistema() {
    const hoje = dataLocal();
    const mes = mesAtual();

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    dateInput.value = hoje;

    dashboardMonth.value = mes;
    reportMonth.value = mes;

    // Inicia a comparação com dois meses consecutivos.
    const [ano, numeroMes] = mes.split("-").map(Number);

    const mesAnterior = new Date(
        ano,
        numeroMes - 2,
        1
    );

    monthAInput.value =
        `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;

    monthBInput.value = mes;

    atualizarTipoSelecionado();
    atualizarSistema();
}

// Atualiza os dados quando o usuário muda o mês do dashboard.
dashboardMonth.addEventListener("change", atualizarDashboard);

// Atualiza o relatório ao mudar o mês.
reportMonth.addEventListener("change", atualizarRelatorio);

// Inicia o projeto.
inicializarSistema();
