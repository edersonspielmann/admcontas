const SUPABASE_URL = 'https://zsphwqdqrvxozomvogrk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s87sEdRzaBnha9yBhNfwVw_8cq-m3_1';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null, enviando = false, editandoContaId = null, editandoMetaId = null;
let deslocamentoMes = 0;
let timeoutPopup = null;
let idEditandoGastoPessoal = null;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const IMAGENS_MESES = ["mes1.jpg","mes2.jpg","mes3.jpg","mes4.jpg","mes5.jpg","mes6.jpg","mes7.jpg","mes8.jpg","mes9.jpg","mes10.jpg","mes11.jpg","mes12.jpg"];
// COLOQUE ISSO:
let CORES_CATEGORIAS = {}; 
const loginSenha=document.getElementById("loginSenha"),msgLogin=document.getElementById("mensagemLogin"),appPrincipal=document.getElementById("appPrincipal"),telaLogin=document.getElementById("telaLogin");
const catConta=document.getElementById("catConta"),txtCatConta=document.getElementById("txtCatConta"),descConta=document.getElementById("descConta"),valConta=document.getElementById("valConta"),parcQtdConta=document.getElementById("parcQtdConta"),vencConta=document.getElementById("vencConta"),pagoConta=document.getElementById("pagoConta"),btnSalvarConta=document.getElementById("btnSalvarConta"),msgConta=document.getElementById("msgConta"),listaContas=document.getElementById("listaContas");

// FUNÇÕES DE APOIO
function gerarUUID(){
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function parseMoeda(str){
    if(!str) return NaN;
    const limpo = String(str).trim().replace(/\./g,'').replace(',','.');
    return parseFloat(limpo);
}

function isoLocal(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function obterMesAno(d){
    const h = new Date();
    const a = new Date(h.getFullYear(), h.getMonth()+d, 1);
    return {
        stringMesAno: `${MESES[a.getMonth()]} ${a.getFullYear()}`,
        primeiroDia: isoLocal(new Date(a.getFullYear(), a.getMonth(), 1)),
        ultimoDia: isoLocal(new Date(a.getFullYear(), a.getMonth()+1, 0))
    };
}

function formatarReal(v){
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

window.mudarAba = function(a) {
    document.getElementById('abaContas').style.display = 'none';
    document.getElementById('abaMetas').style.display = 'none';
    document.getElementById('abaPessoais').style.display = 'none';
    document.getElementById('abaCompras').style.display = 'none';

    document.getElementById('btnAbaContas').classList.remove('ativa');
    document.getElementById('btnAbaMetas').classList.remove('ativa');
    document.getElementById('btnAbaPessoais').classList.remove('ativa');
    document.getElementById('btnAbaCompras').classList.remove('ativa');
	
	document.getElementById('abaNotas').style.display = 'none';
document.getElementById('btnAbaNotas').classList.remove('ativa');

    if (a === 'contas') {
        document.getElementById('abaContas').style.display = 'block';
        document.getElementById('btnAbaContas').classList.add('ativa');
	} else if (a === 'notas') {
    document.getElementById('abaNotas').style.display = 'block';
    document.getElementById('btnAbaNotas').classList.add('ativa');
    carregarNotas();
    } else if (a === 'metas') {
        document.getElementById('abaMetas').style.display = 'block';
        document.getElementById('btnAbaMetas').classList.add('ativa');
        carregarMetas();
    } else if (a === 'pessoais') {
        document.getElementById('abaPessoais').style.display = 'block';
        document.getElementById('btnAbaPessoais').classList.add('ativa');
        carregarGastosPessoais();
    } else if (a === 'compras') {
        document.getElementById('abaCompras').style.display = 'block';
        document.getElementById('btnAbaCompras').classList.add('ativa');
        carregarCompras();
    }
};

window.alternarTipo = function() {
    const tipo = document.getElementById('tipoConta').value;
    const boxParcelas = document.getElementById('boxParcelas');
    const labelValor = document.getElementById('labelValConta'); // Pega o texto do label

    if (tipo === 'fixo') {
        boxParcelas.style.display = 'none';
        document.getElementById('parcQtdConta').required = false;
        labelValor.textContent = "Valor (R$)"; // Texto para conta fixa
    } else {
        boxParcelas.style.display = 'block';
        document.getElementById('parcQtdConta').required = true;
        labelValor.textContent = "Valor da Parcela (R$)"; // Texto para parcelado/à vista
    }
};

function atualizarPapelParedeMes(deslocamento){const hoje=new Date();let mesIndex=(hoje.getMonth()+deslocamento)%12;if(mesIndex<0)mesIndex+=12;const urlImagem=IMAGENS_MESES[mesIndex];document.querySelectorAll('.mes-nav').forEach(barra=>{barra.style.backgroundImage=`url('${urlImagem}')`;});}
function mostrarPopupSucesso(t){document.getElementById("tituloPopup").textContent=t;clearTimeout(timeoutPopup);document.getElementById("popupSucesso").classList.add("ativo");timeoutPopup=setTimeout(()=>{document.getElementById("popupSucesso").classList.remove("ativo")},1000)}

function fecharPopup(id){
    document.getElementById(id).classList.remove("ativo");
    if (id === 'popupLancamento' && editandoContaId) {
        cancelarEdicaoConta();
    }
    if (id === 'popupMeta' && editandoMetaId) {
        editandoMetaId = null;
        document.getElementById('formMeta').reset();
        document.getElementById('msgMeta').textContent = '';
        document.getElementById('btnSalvarMeta').textContent = "Salvar Meta";
    }
}

window.abrirPopupLancamento = function(){
    if (!editandoContaId) {
        document.getElementById("formLancamento").reset();
        txtCatConta.textContent = "Selecione...";
        document.getElementById("vencConta").value = isoLocal(new Date());
        alternarTipo();
    }
    document.getElementById("popupLancamento").classList.add("ativo");
};

window.abrirPopupMeta = function(){
    if (!editandoMetaId) {
        document.getElementById("formMeta").reset();
        document.getElementById('msgMeta').textContent = '';
        document.getElementById('btnSalvarMeta').textContent = "Salvar Meta";
    }
    document.getElementById("popupMeta").classList.add("ativo");
};

window.fazerLogin = async function(){
    const emailEscolhido = document.getElementById("loginUsuario").value; 
    const s = loginSenha.value;
    const btn = document.querySelector('#telaLogin button');
    
    msgLogin.textContent = "";
    if(!s){ msgLogin.textContent="Digite a senha."; return; }
    
    // Feedback visual
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = "Entrando...";
    
    try {
        let {data, error} = await supabaseClient.auth.signInWithPassword({email: emailEscolhido, password: s});
        
        if(error){
            msgLogin.textContent="Senha incorreta.";
            console.log(error.message);
        } else {
            localStorage.setItem('ultimoUsuario', emailEscolhido);
            iniciarApp(data.user);
        }
    } finally {
        // Restaura o botão (se o login falhou; se deu certo, a tela já sumiu)
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
};

window.fazerLogout = async function(){
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    localStorage.removeItem('ultimoUsuario');
    appPrincipal.style.display="none";
    telaLogin.style.display="block";
    loginSenha.value="";
    msgLogin.textContent="";
};

async function iniciarApp(user){
    usuarioLogado = user;
    telaLogin.style.display = "none";
    appPrincipal.style.display = "block";

    const nome = user.email.split('@')[0]; 
    document.querySelector('header p').textContent = `Logado como: ${nome.charAt(0).toUpperCase() + nome.slice(1)}`;

    // Renderiza a aba PRIMEIRO (com "Carregando...")
    mudarAba('contas');

    // Depois dispara as cargas em paralelo
    atualizarPapelParedeMes(0);
    const hoje = isoLocal(new Date());
    document.getElementById('vencConta').value=hoje;

    // await Promise.all para garantir que ambos rodem juntos (não em cascata)
    await Promise.all([
        carregarCategorias(),
        carregarContas()
    ]);
}

supabaseClient.auth.getSession().then(({data:{session}})=>{
    if(session) {
        iniciarApp(session.user);
    } else {
        telaLogin.style.display="block";
        const ultimo = localStorage.getItem('ultimoUsuario');
        if(ultimo) document.getElementById("loginUsuario").value = ultimo;
    }
});

window.abrirAlterarSenha=function(){document.getElementById("popupSenha").classList.add("ativo")};
window.salvarNovaSenha=async function(){const n=document.getElementById("novaSenha").value,msg=document.getElementById("msgSenha");if(n.length<6){msg.textContent="Min. 6 caracteres.";return}const{error}=await supabaseClient.auth.updateUser({password:n});if(error){msg.textContent="Erro."}else{msg.style.color="#188038";msg.textContent="Alterada!";setTimeout(()=>{fecharPopup('popupSenha');msg.style.color="#b3261e"},2000)}};

async function carregarCategorias(){
    const{data,error}=await supabaseClient.from('categorias').select('*').order('id');
    if(error)return;
    
    // Limpa e reconstrói a lista de cores baseada no banco de dados!
    CORES_CATEGORIAS = {}; 
    data.forEach(item => {
        if (item.cor) CORES_CATEGORIAS[item.nome] = item.cor;
    });

    catConta.innerHTML='<option value="">Selecione</option>';
    document.getElementById("listaCategoriasPopup").innerHTML = ''; 
    
    data.forEach(item=>{
        const l=document.createElement("div");l.className="cat-item";
        l.innerHTML=`<div class="cat-nome">${item.nome}</div><div class="cat-desc">${item.descricao}</div>`;
        l.onclick=function(){
            catConta.value=item.id;
            txtCatConta.textContent = item.nome; 
            fecharPopup('popupCategorias');
        };
        document.getElementById("listaCategoriasPopup").appendChild(l);
        const o=document.createElement("option");o.value=item.id;o.text=item.nome;catConta.appendChild(o);
    });
}
document.getElementById("btnCatConta").onclick=()=>{document.getElementById("popupCategorias").classList.add("ativo")};
document.getElementById("popupCategorias").onclick=(e)=>{if(e.target.id==='popupCategorias')fecharPopup('popupCategorias')};
async function carregarContas(){
    listaContas.innerHTML='<div class="ultimos-aviso">Carregando...</div>';
    const d=obterMesAno(deslocamentoMes);
    document.getElementById("mesTitulo").textContent=d.stringMesAno;
    
    const dAnterior = obterMesAno(deslocamentoMes - 1);

    const hoje = new Date();
	const ehPrimeiroDia = hoje.getDate() === 1;
    // Só busca as contas do mês anterior se hoje for dia 1º
    const buscaAtrasadas = ehPrimeiroDia 
        ? supabaseClient
            .from('lancamentos')
            .select('*, categorias(nome)')
            .gte('data_vencimento', dAnterior.primeiroDia)
            .lte('data_vencimento', dAnterior.ultimoDia)
            .eq('pago', false)
        : Promise.resolve({ data: [], error: null });

    const [resMes, resAtrasadas, resMoldes] = await Promise.all([
        supabaseClient.from('lancamentos').select('*, categorias(nome)').gte('data_vencimento', d.primeiroDia).lte('data_vencimento', d.ultimoDia).order('data_vencimento', { ascending: true }),
        buscaAtrasadas,
        supabaseClient.from('lancamentos').select('*').eq('parcelas', 'Mensal').gte('data_vencimento', dAnterior.primeiroDia).lte('data_vencimento', dAnterior.ultimoDia)
    ]);

    const contasMes = resMes.data || [];
    const contasAtrasadas = resAtrasadas.data || [];
    const moldes = resMoldes.data || [];

    if (resMes.error || resMoldes.error) {
        listaContas.innerHTML = '<div class="ultimos-aviso">Erro ao carregar.</div>';
        return;
    }

    const novasCriadas = [];
    if(moldes.length > 0){
        // --- B2: deduplicar por grupo_parcelamento (não por descricao) ---
        const moldesUnicos = [...new Map(
            moldes
                .filter(m => m.grupo_parcelamento) // só moldes válidos
                .map(item => [item.grupo_parcelamento, item])
        ).values()];

        const paraCriar = [];
        const gruposMoldes = moldesUnicos.map(m => m.grupo_parcelamento);

        let existentesPorGrupo = {};
        if (gruposMoldes.length > 0) {
            const { data: existentes } = await supabaseClient
                .from('lancamentos')
                .select('grupo_parcelamento, data_vencimento')
                .in('grupo_parcelamento', gruposMoldes);

            (existentes || []).forEach(e => {
                if (!existentesPorGrupo[e.grupo_parcelamento]) {
                    existentesPorGrupo[e.grupo_parcelamento] = new Set();
                }
                existentesPorGrupo[e.grupo_parcelamento].add(e.data_vencimento);
            });
        }

        for (let molde of moldesUnicos) {
            const jaExiste = contasMes.find(m =>
                m.grupo_parcelamento === molde.grupo_parcelamento &&
                m.parcelas === 'Mensal'
            );
            if (jaExiste) continue;

            const diaVenc = parseInt(molde.data_vencimento.split('-')[2]);
            const [anoMolde, mesMolde] = molde.data_vencimento.split('-').slice(0,2).map(Number);
            const [anoAlvo, mesAlvo] = d.primeiroDia.split('-').slice(0,2).map(Number);

            let cursorAno = anoMolde;
            let cursorMes = mesMolde + 1;
            if (cursorMes > 12) { cursorMes = 1; cursorAno++; }

            const setExistente = existentesPorGrupo[molde.grupo_parcelamento] || new Set();

                       while (cursorAno < anoAlvo || (cursorAno === anoAlvo && cursorMes <= mesAlvo)) {
                // --- INÍCIO DA ALTERAÇÃO ---
                const mesAtual = hoje.getMonth() + 1; // Mês atual em número (1 a 12)
                const ultimoDiaDoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
                const ehUltimoDiaDoMes = hoje.getDate() === ultimoDiaDoMesAtual;

                // Se o mês que queremos criar for MAIOR que o mês atual, 
                // E hoje NÃO for o último dia do mês, então bloqueia a criação!
                if (cursorAno > hoje.getFullYear() || 
                   (cursorAno === hoje.getFullYear() && cursorMes > mesAtual)) {
                    if (!ehUltimoDiaDoMes) {
                        break;
                    }
                }
                // --- FIM DA ALTERAÇÃO ---

                const ultimoDiaMes = new Date(cursorAno, cursorMes, 0).getDate();
                const diaFinal = Math.min(diaVenc, ultimoDiaMes);
                const dataVenc = `${cursorAno}-${String(cursorMes).padStart(2,'0')}-${String(diaFinal).padStart(2,'0')}`;

                if (!setExistente.has(dataVenc)) {
                    paraCriar.push({
                        user_id: usuarioLogado.id,
                        categoria_id: molde.categoria_id,
                        descricao: molde.descricao,
                        valor: molde.valor,
                        data_vencimento: dataVenc,
                        pago: false,
                        parcelas: 'Mensal',
                        grupo_parcelamento: molde.grupo_parcelamento
                    });
                }

                cursorMes++;
                if (cursorMes > 12) { cursorMes = 1; cursorAno++; }
            }
        }

        if(paraCriar.length > 0){
            const { data: criadas, error: errNova } = await supabaseClient
                .from('lancamentos')
                .insert(paraCriar)
                .select('*, categorias(nome)');
            if(!errNova && criadas) novasCriadas.push(...criadas);
        }
    }

    let allData = [...contasAtrasadas, ...contasMes, ...novasCriadas];
    allData = [...new Map(allData.map(item => [item.id, item])).values()];
    allData.sort((a, b) => {
        if (a.pago !== b.pago) return a.pago ? 1 : -1; 
        return new Date(a.data_vencimento) - new Date(b.data_vencimento);
    });
    
    let tp=0, tpe=0;
    allData.forEach(i=>{if(i.pago){tp+=parseFloat(i.valor)}else{tpe+=parseFloat(i.valor)}});
    
    document.getElementById("totalPago").textContent=formatarReal(tp);
    document.getElementById("totalAPagar").textContent=formatarReal(tpe);
    
    // ==========================================
    // NOVO: CÁLCULO E RENDERIZAÇÃO DO RESUMO POR CATEGORIA
    // ==========================================
    const totaisPorCategoria = {};
    const itensPorCategoria = {}; // NOVO: Guarda os itens para o popup
    
    // Soma apenas o que NÃO está pago
    allData.forEach(i => {
        if (!i.pago) {
            const nomeCat = i.categorias?.nome;
            
            // Só soma se a categoria for ROSANA, CARLOS ou LEOCIR
            if (nomeCat && CORES_CATEGORIAS[nomeCat]) {
                if (!totaisPorCategoria[nomeCat]) {
                    totaisPorCategoria[nomeCat] = 0;
                    itensPorCategoria[nomeCat] = []; // Inicia a lista
                }
                totaisPorCategoria[nomeCat] += parseFloat(i.valor);
                itensPorCategoria[nomeCat].push(i); // Guarda o item na lista
            }
        }
    });

    const containerResumo = document.getElementById("resumoCategorias");
    if (containerResumo) {
        containerResumo.innerHTML = ''; // Limpa antes de adicionar
        
        if (Object.keys(totaisPorCategoria).length === 0) {
            containerResumo.style.display = 'none';
        } else {
            containerResumo.style.display = 'flex';
            
            for (const [nome, valor] of Object.entries(totaisPorCategoria)) {
                const corCat = CORES_CATEGORIAS[nome];
                
                const tag = document.createElement('div');
                tag.className = 'tag-resumo-cat';
                tag.style.backgroundColor = corCat;
                tag.style.cursor = 'pointer'; // Muda o mouse para "mãozinha" ao passar por cima
                
                // Adiciona a ação de clique!
                tag.onclick = () => abrirDetalhesCategoria(nome, itensPorCategoria[nome], valor, corCat);
                
                tag.innerHTML = `<span>${nome}:</span> <span>${formatarReal(valor)}</span>`;
                
                containerResumo.appendChild(tag);
            }
        }
    }
    // ==========================================
    // FIM DO NOVO BLOCO
    // ==========================================
	
    if(allData.length===0){
        listaContas.innerHTML='<div class="ultimos-aviso">Nenhuma conta neste mês.</div>';
    } else {
        let h=`<table class="tabela-ultimos"><tbody>`;
        allData.forEach(i=>{
            const v=new Date(i.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR');
            const c = i.pago ? 'linha-paga' : 'linha-pendente';
            
                        let tag = '';
            if (i.pago) {
             tag = `<span style="background:#188038; color:#fff; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:8px;">✓ Pago</span>`;
            } else {
                if (new Date(i.data_vencimento + 'T23:59:59') < new Date()) {
                  tag = `<span style="background:#b3261e; color:#fff; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:8px; display:inline-block; vertical-align:middle;">Vencida</span>`;
                }
            }

            const nomeCat = i.categorias?.nome;
            const corCat = CORES_CATEGORIAS[nomeCat]; 
            const estiloLinha = (!i.pago && corCat) ? `style="background-color: ${corCat}10 !important;"` : "";
            const estiloBorda = (!i.pago && corCat) ? `border-left: 16px solid ${corCat} !important;` : "";

            h+=`<tr class="${c}" ${estiloLinha}>
                <td style="width:30px;text-align:center; ${estiloBorda}">
                    <input type="checkbox" class="check-pago" ${i.pago?'checked':''} onchange="togglePagoConta(${i.id}, ${i.pago})">
                </td>
                <td>
                    <strong>${i.descricao}</strong> ${tag}<br>
                    <small style="color:inherit;opacity:0.7">
                        Venc: ${v} ${i.categorias ? ` • ${i.categorias.nome}` : ''}
                    </small>
                </td>
                <td class="col-valor">${formatarReal(i.valor)}</td>
                <td class="col-acoes">
                    <button class="btn-acao btn-editar-item" data-id="${i.id}">✏️</button>
                    <button class="btn-acao" onclick='excluirGasto(${i.id}, "${i.grupo_parcelamento}", ${i.parcelas === 'Mensal'})'>🗑️</button>
                </td>
            </tr>`;
        });
        listaContas.innerHTML=h+`</tbody></table>`;
		listaContas.querySelectorAll('.btn-editar-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = allData.find(x => String(x.id) === btn.dataset.id);
        if (item) editarConta(item);
    });
});
    }
}

document.getElementById("formLancamento").onsubmit=async(e)=>{
    e.preventDefault();if(enviando)return;
    const tipo = document.getElementById('tipoConta').value;
    
    const v = parseMoeda(valConta.value);
    let q = parseInt(parcQtdConta.value) || 2;
    
    if(isNaN(v)||v<=0 || catConta.value==="" || !vencConta.value){msgConta.textContent="Preencha os dados.";return}
    
    enviando=true;btnSalvarConta.disabled=true;btnSalvarConta.textContent="Salvando...";
    try{
if(editandoContaId) {
    const { data: itemAtual } = await supabaseClient.from('lancamentos')
        .select('*').eq('id', editandoContaId).single();
    
    const grupoId = itemAtual.grupo_parcelamento || gerarUUID();
    const descBase = descConta.value.trim();

    // ============================================================
    // CASO 1: era fixo mensal (parcelas === 'Mensal')
    // ============================================================
    if (itemAtual.parcelas === 'Mensal') {

        if (tipo === 'parcela') {
            // Transformar mensal em parcelado: deleta o grupo inteiro e recria
            await supabaseClient.from('lancamentos')
                .delete().eq('grupo_parcelamento', grupoId);

            const db = new Date(vencConta.value + 'T12:00:00');
            const novos = [];
            for (let i = 1; i <= q; i++) {
                let dp = new Date(db);
                dp.setMonth(dp.getMonth() + (i - 1));
                novos.push({
                    user_id: usuarioLogado.id,
                    categoria_id: parseInt(catConta.value),
                    descricao: `${descBase} (${i}/${q})`,
                    valor: v,
                    data_vencimento: dp.toISOString().split('T')[0],
                    pago: (i === 1) ? pagoConta.checked : false,
                    parcelas: `${i}/${q}`,
                    grupo_parcelamento: grupoId
                });
            }
            await supabaseClient.from('lancamentos').insert(novos);
            mostrarPopupSucesso("Transformado em parcelado!");
        } else {
            // Continua fixo mensal: ATUALIZA TODOS DO GRUPO
            // Mantém a data original de cada ocorrência (não recalcula)
            await supabaseClient.from('lancamentos').update({
                categoria_id: parseInt(catConta.value),
                descricao: descBase,
                valor: v
            }).eq('grupo_parcelamento', grupoId);

            // Atualiza só a data e o "pago" do item editado (o que o usuário está vendo)
            await supabaseClient.from('lancamentos').update({
                data_vencimento: vencConta.value,
                pago: pagoConta.checked
            }).eq('id', editandoContaId);

            mostrarPopupSucesso("Conta fixa atualizada em todos os meses!");
        }

    // ============================================================
    // CASO 2: era parcelado (1/N, 2/N...)
    // ============================================================
    } else {

        if (tipo === 'fixo') {
            // Transformar parcelado em fixo mensal
            await supabaseClient.from('lancamentos')
                .delete().eq('grupo_parcelamento', grupoId);

            await supabaseClient.from('lancamentos').insert([{
                user_id: usuarioLogado.id,
                categoria_id: parseInt(catConta.value),
                descricao: descBase,
                valor: v,
                data_vencimento: vencConta.value,
                pago: pagoConta.checked,
                parcelas: 'Mensal',
                grupo_parcelamento: grupoId
            }]);
            mostrarPopupSucesso("Transformado em conta fixa!");
        } else {
            // Continua parcelado: preserva as datas originais de cada parcela
            // NÃO recalcula data_vencimento de todas as parcelas
            const { data: grupo } = await supabaseClient.from('lancamentos')
                .select('id, data_vencimento')
                .eq('grupo_parcelamento', grupoId)
                .order('data_vencimento', { ascending: true });

            for (let i = 0; i < grupo.length && i < q; i++) {
                await supabaseClient.from('lancamentos').update({
                    categoria_id: parseInt(catConta.value),
                    descricao: `${descBase} (${i+1}/${q})`,
                    valor: v,
                    parcelas: `${i+1}/${q}`
                    // ⚠️ data_vencimento NÃO é atualizado — preserva a original
                }).eq('id', grupo[i].id);
            }

            // Se aumentou a quantidade de parcelas, cria as novas a partir da última
            if (q > grupo.length) {
                const ultimaData = grupo.length > 0
                    ? new Date(grupo[grupo.length - 1].data_vencimento + 'T12:00:00')
                    : new Date(vencConta.value + 'T12:00:00');
                const novos = [];
                for (let i = grupo.length; i < q; i++) {
                    const dp = new Date(ultimaData);
                    dp.setMonth(dp.getMonth() + (i - grupo.length + 1));
                    novos.push({
                        user_id: usuarioLogado.id,
                        categoria_id: parseInt(catConta.value),
                        descricao: `${descBase} (${i+1}/${q})`,
                        valor: v,
                        data_vencimento: dp.toISOString().split('T')[0],
                        pago: false,
                        parcelas: `${i+1}/${q}`,
                        grupo_parcelamento: grupoId
                    });
                }
                await supabaseClient.from('lancamentos').insert(novos);
            }

            // Se diminuiu, apaga as excedentes
            if (q < grupo.length) {
                for (let i = q; i < grupo.length; i++) {
                    await supabaseClient.from('lancamentos').delete().eq('id', grupo[i].id);
                }
            }

            // Atualiza data e status de pagamento SOMENTE do item editado
            await supabaseClient.from('lancamentos').update({
                data_vencimento: vencConta.value,
                pago: pagoConta.checked
            }).eq('id', editandoContaId);

            mostrarPopupSucesso("Parcelas atualizadas!");
        }
    }

    cancelarEdicaoConta();
}
 else {
            if (tipo === 'fixo') {
                const{error}=await supabaseClient.from('lancamentos').insert([{user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:descConta.value.trim(),valor:v,data_vencimento:vencConta.value,pago:pagoConta.checked,parcelas:'Mensal',grupo_parcelamento:gerarUUID()}]);
                if(error)throw error;
                mostrarPopupSucesso("Conta fixa registrada!");
            } else {
                const db=new Date(vencConta.value+'T12:00:00'),novos=[],grupoId=gerarUUID();
                for(let i=1;i<=q;i++){
                    const dp=new Date(db);dp.setMonth(dp.getMonth()+(i-1));
                    novos.push({user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:`${descConta.value.trim()} (${i}/${q})`,valor:v,data_vencimento:dp.toISOString().split('T')[0],pago:(i===1)?pagoConta.checked:false,parcelas:`${i}/${q}`,grupo_parcelamento:grupoId});
                }
                const{error}=await supabaseClient.from('lancamentos').insert(novos);
                if(error)throw error;
                mostrarPopupSucesso("Parcelas registradas!");
            }
            document.getElementById("formLancamento").reset();txtCatConta.textContent="Selecione...";
            document.getElementById("vencConta").value=new Date().toISOString().split('T')[0];
            alternarTipo();
            fecharPopup('popupLancamento');
        }
        carregarContas();
       }catch(err){msgConta.textContent="Erro: "+err.message}
    finally{
        enviando=false;
        btnSalvarConta.disabled=false;
        btnSalvarConta.textContent=editandoContaId ? "Salvar Alterações" : "Registrar Conta";
    }
};

window.editarConta = function(item) {
    editandoContaId = item.id;
    catConta.value = item.categoria_id;
    txtCatConta.textContent = item.categorias ? `${String(item.categoria_id).padStart(2,'0')} — ${item.categorias.nome}` : '';
    descConta.value = item.descricao.replace(/\s\(\d+\/\d+\)$/, '').replace(/\s\(Mensal\)$/, '');
    valConta.value = item.valor.toString().replace('.', ',');
    vencConta.value = item.data_vencimento;
    pagoConta.checked = item.pago;
    
    if (item.parcelas === 'Mensal') {
        document.getElementById('tipoConta').value = 'fixo';
        parcQtdConta.value = 1;
    } else {
        document.getElementById('tipoConta').value = 'parcela';
        parcQtdConta.value = item.parcelas.split('/')[1] || 1; 
    }
    alternarTipo();
    btnSalvarConta.textContent = "Salvar Alterações";
    document.getElementById('btnCancelarEdicao').style.display = 'block';
    abrirPopupLancamento();
};

window.cancelarEdicaoConta = function() {
    editandoContaId = null;
    document.getElementById("formLancamento").reset();
    txtCatConta.textContent = "Selecione...";
   document.getElementById("vencConta").value = isoLocal(new Date());
    btnSalvarConta.textContent = "Registrar Conta";
    document.getElementById('btnCancelarEdicao').style.display = 'none';
    alternarTipo();
    fecharPopup('popupLancamento');
};

window.togglePagoConta = async function(id, status){
    const check = document.querySelector(`input[onchange*="togglePagoConta(${id},"]`);
    if(check) check.checked = !status;

    const pagador = !status ? usuarioLogado.id : null; 
    
    await supabaseClient.from('lancamentos').update({
        pago: !status,
        pago_por: pagador
    }).eq('id', id);
    
    carregarContas();
};

let idParaExcluir = null;
let grupoParaExcluir = null;
let isFixoParaExcluir = false;

window.excluirGasto = function(id, grupo, isFixo){
    idParaExcluir = id;
    grupoParaExcluir = grupo;
    isFixoParaExcluir = isFixo;
    
    const txt = document.getElementById('txtExcluir');
    
    if (isFixo) {
        txt.innerHTML = "Você está prestes a excluir uma <strong>CONTA FIXA MENSAL</strong>.<br><br>Isso apagará este lançamento de <strong>TODOS OS MESES</strong> (passados e futuros).<br><br>Deseja continuar?";
    } else if (grupo && grupo !== 'undefined' && grupo !== null) {
        txt.innerHTML = "Você está prestes a excluir <strong>TODAS AS PARCELAS</strong> deste lançamento.<br><br>Deseja continuar?";
    } else {
        txt.innerHTML = "Tem certeza que deseja excluir este lançamento?";
    }
    
    document.getElementById('popupExcluir').classList.add('ativo');
};

window.confirmarExclusao = async function(){
    fecharPopup('popupExcluir'); 
    
    try {
        if (isFixoParaExcluir) {
            // Conta fixa: preferir SEMPRE grupo_parcelamento.
            // Fallback: casar descrição EXATA (trim) + parcelas='Mensal'
            // para não apagar "Água mineral" quando o item é "Água".
            if (grupoParaExcluir && grupoParaExcluir !== 'undefined' && grupoParaExcluir !== null) {
                await supabaseClient.from('lancamentos').delete().eq('grupo_parcelamento', grupoParaExcluir);
            } else {
                const { data: item } = await supabaseClient
                    .from('lancamentos')
                    .select('descricao')
                    .eq('id', idParaExcluir)
                    .single();
                if (item) {
                    const nomeLimpo = item.descricao.replace(/\s\(\d+\/\d+\)$/, '').trim();
                    // Exato (case-insensitive) — não usa % no final
                    await supabaseClient.from('lancamentos')
                        .delete()
                        .ilike('descricao', nomeLimpo)
                        .eq('parcelas', 'Mensal');
                }
            }
        } else if (grupoParaExcluir && grupoParaExcluir !== 'undefined' && grupoParaExcluir !== null) {
            await supabaseClient.from('lancamentos').delete().eq('grupo_parcelamento', grupoParaExcluir);
        } else {
            await supabaseClient.from('lancamentos').delete().eq('id', idParaExcluir);
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao excluir no banco de dados. Tente novamente.");
    }
    
    carregarContas(); 
};

document.getElementById("mesAnterior").onclick=()=>{deslocamentoMes--;carregarContas();atualizarPapelParedeMes(deslocamentoMes)};
document.getElementById("mesProximo").onclick=()=>{deslocamentoMes++;carregarContas();atualizarPapelParedeMes(deslocamentoMes)};
// ==========================================
// METAS
// ==========================================
async function carregarMetas(){
    const listaMetas = document.getElementById('listaMetas');
    listaMetas.innerHTML='<div class="ultimos-aviso">Carregando metas...</div>';
    const{data,error}=await supabaseClient.from('metas').select('*').order('id',{ascending:false});
    if(error){
        console.error(error);
        listaMetas.innerHTML='<div class="ultimos-aviso" style="color:#b3261e;">Erro ao carregar metas.</div>';
        return;
    }
    
    if(data.length===0){listaMetas.innerHTML='<div class="ultimos-aviso">Nenhuma meta criada ainda.<br>Clique no + para sonhar!</div>'}
    else{
        let h='';
        data.forEach(m=>{
            const progresso = m.valor_guardado > 0 ? (m.valor_guardado / m.valor_total) * 100 : 0;
            const pct = Math.min(progresso, 100).toFixed(0);
            const falta = m.valor_total - m.valor_guardado;
            
            h+=`
            <div class="card-meta">
                ${m.imagem_url ? `<img src="${m.imagem_url}" alt="${m.nome}">` : ''}
                
                <div style="display:flex; justify-content:space-between; padding: 5px 5px 0 5px; align-items: center;">
    <div class="meta-titulo" style="margin:0; flex:1;">${m.nome}</div>
    <div style="display:flex; gap:2px;">
        <button class="btn-acao" style="font-size:12px; margin:0;" onclick='editarMeta(${JSON.stringify(m)})' title="Editar">✏️</button>
        <button class="btn-acao" style="font-size:12px; margin:0;" onclick='excluirMeta(${m.id})' title="Excluir">🗑️</button>
    </div>
</div>

                <div class="meta-conteudo" style="padding-top: 5px; padding: 5px;">
                    <div class="meta-valores">
                        <span>Guardado: <strong>${formatarReal(m.valor_guardado)}</strong></span>
                        <span>Falta: <strong>${formatarReal(falta > 0 ? falta : 0)}</strong></span>
                    </div>
                    
                    <div class="barra-progresso-container">
                        <div class="barra-progresso-preenchida" style="width: ${pct}%;"></div>
                        <div class="porcentagem-texto">${pct}%</div>
                    </div>
                    
                    <button class="btn-meta-add" onclick="abrirPopupGuardar(${m.id}, '${m.nome}')">+ Guardar Dinheiro</button>
                </div>
            </div>`;
        });
        listaMetas.innerHTML=h;
    }
}

document.getElementById("formMeta").onsubmit=async(e)=>{
    e.preventDefault();
    const nome = document.getElementById('nomeMeta').value.trim();
    const valorTotal = parseMoeda(document.getElementById('valorMeta').value);
    const imagem = document.getElementById('imagemMeta').value.trim();
    
    if(!nome || isNaN(valorTotal) || valorTotal <= 0){document.getElementById('msgMeta').textContent="Preencha o nome e o valor corretamente.";return}
    
    const btn = document.getElementById('btnSalvarMeta');
    btn.disabled = true; btn.textContent = "Salvando...";
    const idEdicao = editandoMetaId;
    
    try {
        if (idEdicao) {
            const { error } = await supabaseClient.from('metas').update({nome: nome,valor_total: valorTotal,imagem_url: imagem}).eq('id', idEdicao);
            if (error) throw error;
            mostrarPopupSucesso("Meta atualizada!");
        } else {
            const { error } = await supabaseClient.from('metas').insert([{user_id: usuarioLogado.id,nome: nome,valor_total: valorTotal,valor_guardado: 0,imagem_url: imagem}]);
            if (error) throw error;
            mostrarPopupSucesso("Meta criada!");
        }
        editandoMetaId = null;
        document.getElementById("formMeta").reset();
        fecharPopup('popupMeta');
        carregarMetas();
    } catch(err) {
        document.getElementById('msgMeta').textContent = "Erro: " + err.message;
    } finally {
        btn.disabled = false; 
        btn.textContent = idEdicao ? "Salvar Alterações" : "Salvar Meta";
    }
};

window.editarMeta = function(item) {
    editandoMetaId = item.id;
    document.getElementById('nomeMeta').value = item.nome;
    document.getElementById('valorMeta').value = item.valor_total.toString().replace('.', ',');
    document.getElementById('imagemMeta').value = item.imagem_url || '';
    document.getElementById('btnSalvarMeta').textContent = "Salvar Alterações";
    abrirPopupMeta();
};

window.excluirMeta = async function(id) {
    if(!confirm("Tem certeza que deseja excluir esta meta?")) return;
    const { error } = await supabaseClient.from('metas').delete().eq('id', id);
    if (!error) carregarMetas();
};

let metaIdSelecionada = null;
window.abrirPopupGuardar = function(id, nome){
    metaIdSelecionada = id;
    document.getElementById('valorGuardado').value = '';
    document.getElementById('msgGuardar').textContent = '';
    document.querySelector('#popupGuardar h2').textContent = `Guardar para: ${nome}`;
    document.getElementById('popupGuardar').classList.add("ativo");
}

window.adicionarValorMeta = async function(){
    const valorAdd = parseMoeda(document.getElementById('valorGuardado').value);
    if(isNaN(valorAdd) || valorAdd <= 0){document.getElementById('msgGuardar').textContent="Insira um valor válido.";return}
    
    const { data: meta, error: err1 } = await supabaseClient.from('metas').select('valor_guardado').eq('id', metaIdSelecionada).single();
    if(err1) return;
    
    const novoValor = parseFloat(meta.valor_guardado) + valorAdd;
    const { error: err2 } = await supabaseClient.from('metas').update({ valor_guardado: novoValor }).eq('id', metaIdSelecionada);
    
    if(!err2){
        fecharPopup('popupGuardar');
        carregarMetas();
    } else {
        document.getElementById('msgGuardar').textContent="Erro ao salvar.";
    }
};

// ==========================================
// GASTOS PESSOAIS
// ==========================================
async function carregarGastosPessoais() {
    const lista = document.getElementById('listaGastosPessoais');
    const totalSpan = document.getElementById('totalGastosPessoais');
    
    lista.innerHTML = ''; 

    // Removido o filtro .eq('user_id') para ser compartilhado
    const { data, error } = await supabaseClient
    .from('gastos_pessoais')
    .select('*')
    .order('data_gasto', { ascending: false });

    if (error) {
        console.error("Erro no Supabase:", error);
        return;
    }

    if (!data || data.length === 0) {
        totalSpan.textContent = 'R$ 0,00';
    } else {
        let html = `<table class="tabela-ultimos"><tbody>`;
        let total = 0;

        data.forEach(gasto => {
            total += parseFloat(gasto.valor);
            
            html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 4px 6px; color: #4c1d95; border: none; background: transparent; width: 100%; text-align: left; font-size: 13px; border-left: 4px solid #8b5cf6;">
                    ${gasto.descricao}
                </td>
                <td class="col-valor" style="padding: 4px 6px; color: #6b21a8; border: none; background: transparent; font-weight: bold; text-align: right; white-space: nowrap; font-size: 13px;">
                    ${gasto.valor > 0 ? formatarReal(gasto.valor) : ''}
                </td>
                <td class="col-acoes" style="border: none; background: transparent; padding: 4px 4px; vertical-align: middle;">
                    <button class="btn-acao" style="color: #6b21a8; font-size: 12px; padding: 0; margin: 0 2px; min-height: auto; line-height: 1;" onclick='editarGastoPessoal(${gasto.id}, ${JSON.stringify(gasto.descricao)}, ${gasto.valor})'>✏️</button>
                    <button class="btn-acao" style="color: #6b21a8; font-size: 12px; padding: 0; margin: 0 2px; min-height: auto; line-height: 1;" onclick="excluirGastoPessoal(${gasto.id})">🗑️</button>
                </td>
            </tr>`;
        });

        lista.innerHTML = html + `</tbody></table>`;
        totalSpan.textContent = formatarReal(total);
    }
}

// Cancela edição de gasto pessoal (novo — chamado pelo botão Cancelar e ao resetar)
window.cancelarEdicaoGastoPessoal = function() {
    idEditandoGastoPessoal = null;
    document.getElementById("formGastoPessoal").reset();
    document.getElementById("msgGastoPessoal").textContent = "";

    const btn = document.querySelector('#formGastoPessoal button[type="submit"]');
    btn.textContent = "Adicionar";

    const btnCancelar = document.getElementById("btnCancelarGastoPessoal");
    if (btnCancelar) btnCancelar.style.display = "none";
};

document.getElementById("formGastoPessoal").onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById("descGastoPessoal").value.trim();
    const valorInput = document.getElementById("valGastoPessoal").value.trim();
    
    const valor = valorInput === "" ? 0 : parseMoeda(valorInput);
    const dataGasto = new Date().toISOString().split('T')[0]; 
    
    const msg = document.getElementById("msgGastoPessoal");
    const btn = e.target.querySelector('button[type="submit"]');

    if (!desc) {
        msg.textContent = "Preencha a descrição.";
        return;
    }

    msg.textContent = "";
    btn.disabled = true;
    btn.textContent = "Salvando...";

    const estavaEditando = !!idEditandoGastoPessoal;

    try {
        if (estavaEditando) {
            const { error } = await supabaseClient.from('gastos_pessoais')
                .update({ descricao: desc, valor: valor })
                .eq('id', idEditandoGastoPessoal);
            if (error) throw error;
            mostrarPopupSucesso("Anotação atualizada!");
        } else {
            const { error } = await supabaseClient.from('gastos_pessoais')
                .insert([{ 
                    user_id: usuarioLogado.id, 
                    descricao: desc, 
                    valor: valor, 
                    data_gasto: dataGasto 
                }]);
            if (error) throw error;
            mostrarPopupSucesso("Anotação salva!");
        }

        // Reset SEMPRE — limpa o modo edição junto
        cancelarEdicaoGastoPessoal();
        carregarGastosPessoais();

    } catch (err) {
        msg.textContent = "Erro: " + err.message;
        // Em caso de erro, NÃO perde o modo edição
        btn.disabled = false;
        btn.textContent = estavaEditando ? "Salvar Alterações" : "Adicionar";
    }
};

window.editarGastoPessoal = function(id, desc, valor) {
    idEditandoGastoPessoal = id;
    document.getElementById("descGastoPessoal").value = desc;
    document.getElementById("valGastoPessoal").value = valor.toString().replace('.', ',');
    
    const btn = document.querySelector('#formGastoPessoal button[type="submit"]');
    btn.textContent = "Salvar Alterações";

    // Mostra botão Cancelar
    const btnCancelar = document.getElementById("btnCancelarGastoPessoal");
    if (btnCancelar) btnCancelar.style.display = "block";

    document.getElementById("descGastoPessoal").focus();
};

window.excluirGastoPessoal = async function(id) {
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return;
    const { error } = await supabaseClient.from('gastos_pessoais').delete().eq('id', id);
    if (!error) carregarGastosPessoais();
};

document.querySelectorAll('.popup-overlay').forEach(popup => {
    popup.addEventListener('click', function(e) {
        if (e.target === this) fecharPopup(this.id);
    });
});

// ==========================================
// COMPRAS E ESTOQUE
// ==========================================
async function carregarCompras() {
    const listaComprar = document.getElementById('listaParaComprar');
    const listaEstoque = document.getElementById('listaEstoque');
    listaComprar.innerHTML = 'Carregando...';
    listaEstoque.innerHTML = 'Carregando...';

    const { data, error } = await supabaseClient.from('compras').select('*');
    if (error) {
        listaComprar.innerHTML = 'Erro ao carregar.';
        return;
    }

    const paraComprar = data.filter(item => item.status === 'comprar').sort((a,b) => a.nome.localeCompare(b.nome));
    const emEstoque = data.filter(item => item.status === 'estoque').sort((a,b) => a.nome.localeCompare(b.nome));

    if (paraComprar.length === 0) {
        listaComprar.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Nada para comprar no momento.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        paraComprar.forEach(item => {
            const img = item.imagem_url ? item.imagem_url : 'https://cdn-icons-png.flaticon.com/512/1169/1169628.png';
            h += `<tr class="linha-pendente">
                <td style="width:30px;text-align:center"><input type="checkbox" class="check-pago" onchange="marcarComprado(${item.id})"></td>
                <td style="display: flex; align-items: center; gap: 10px; padding: 4px;">
                    <img src="${img}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" alt="img">
                    <strong>${item.nome}</strong>
                </td>
                <td class="col-valor" style="color:#b3261e;">Qtd: ${item.quantidade}</td>
                <td class="col-acoes"><button class="btn-acao" onclick="excluirCompra(${item.id})">🗑️</button></td>
            </tr>`;
        });
        listaComprar.innerHTML = h + `</tbody></table>`;
    }

    if (emEstoque.length === 0) {
        listaEstoque.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Estoque vazio.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        emEstoque.forEach(item => {
            const img = item.imagem_url ? item.imagem_url : 'https://cdn-icons-png.flaticon.com/512/1169/1169628.png';
            h += `<tr class="linha-paga">
                <td style="width:30px;text-align:center"><input type="checkbox" class="check-pago" checked disabled></td>
                <td style="display: flex; align-items: center; gap: 10px; padding: 4px;">
                    <img src="${img}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" alt="img">
                    <strong>${item.nome}</strong>
                </td>
                <td class="col-valor" style="color:#188038;">Qtd: ${item.quantidade}</td>
                <td class="col-acoes">
                    <button class="btn-acao" style="color:#188038;" onclick="alterarEstoque(${item.id}, -1)">➖</button>
                    <button class="btn-acao" style="color:#188038;" onclick="alterarEstoque(${item.id}, 1)">➕</button>
                    <button class="btn-acao" style="color:#188038;" onclick="excluirCompra(${item.id})">🗑️</button>
                </td>
            </tr>`;
        });
        listaEstoque.innerHTML = h + `</tbody></table>`;
    }
}

document.getElementById("formCompra").onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeCompra').value.trim();
    const qtd = parseInt(document.getElementById('qtdCompra').value);
    const fileInput = document.getElementById('imgCompra');
    const file = fileInput.files[0];

    if (!nome || qtd < 1) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    
    btn.textContent = "Enviando...";
    btn.disabled = true;

    let imagemUrl = null;

    try {
        if (file) {
            const nomeArquivo = `${Date.now()}_${file.name.replace(/\s/g, '_')}`; 
            const { data, error: uploadError } = await supabaseClient.storage.from('imagens').upload(nomeArquivo, file);
            if (uploadError) throw new Error("Erro ao subir imagem: " + uploadError.message);
            const { data: publicUrlData } = supabaseClient.storage.from('imagens').getPublicUrl(nomeArquivo);
            imagemUrl = publicUrlData.publicUrl;
        }

        const { error } = await supabaseClient.from('compras').insert([{
            nome: nome, quantidade: qtd, status: 'comprar', imagem_url: imagemUrl
        }]);

        if (error) throw error;

        document.getElementById('nomeCompra').value = '';
        document.getElementById('qtdCompra').value = '1';
        fileInput.value = '';
        carregarCompras();

    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
};

window.marcarComprado = async function(id) {
    const { data: itemComprado, error: errBusca } = await supabaseClient.from('compras').select('*').eq('id', id).single();
    if (errBusca || !itemComprado) return;

    const { data: itemNoEstoque } = await supabaseClient.from('compras').select('*').ilike('nome', itemComprado.nome).eq('status', 'estoque').maybeSingle();

    if (itemNoEstoque) {
        const novaQtd = itemNoEstoque.quantidade + itemComprado.quantidade;
        const novaImagem = itemComprado.imagem_url ? itemComprado.imagem_url : itemNoEstoque.imagem_url;
        await supabaseClient.from('compras').update({ quantidade: novaQtd, imagem_url: novaImagem, nome: itemComprado.nome }).eq('id', itemNoEstoque.id);
        await supabaseClient.from('compras').delete().eq('id', id);
    } else {
        await supabaseClient.from('compras').update({ status: 'estoque' }).eq('id', id);
    }
    
    carregarCompras();
};

window.alterarEstoque = async function(id, mudanca) {
    const { data } = await supabaseClient.from('compras').select('quantidade').eq('id', id).single();
    if (!data) return;

    const novaQtd = data.quantidade + mudanca;

    if (novaQtd <= 0) {
        mostrarConfirmacao("A quantidade chegou a zero. Deseja excluir este item do estoque?", async function() {
            await supabaseClient.from('compras').delete().eq('id', id);
            carregarCompras();
        });
    } else {
        await supabaseClient.from('compras').update({ quantidade: novaQtd }).eq('id', id);
        carregarCompras();
    }
};

window.excluirCompra = async function(id) {
    mostrarConfirmacao("Tem certeza que deseja excluir este item?", async function() {
        await supabaseClient.from('compras').delete().eq('id', id);
        carregarCompras();
    });
};

window.mostrarConfirmacao = function(mensagem, callback) {
    document.getElementById('textoConfirmacao').textContent = mensagem;
    const btn = document.getElementById('btnConfirmarAcao');
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.onclick = function() {
        fecharPopup('popupConfirmacao');
        callback();
    };
    document.getElementById('popupConfirmacao').classList.add('ativo');
};

// ==========================================
// NOTAS E RECIBOS
// ==========================================
window.abrirPopupNota = function() {
    document.getElementById('formNota').reset();
    document.getElementById('msgNota').textContent = '';
    document.getElementById('popupNota').classList.add('ativo');
};

async function carregarNotas() {
    const lista = document.getElementById('listaNotas');
    lista.innerHTML = '<div class="ultimos-aviso" style="grid-column:1/-1;">Carregando...</div>';

    const { data, error } = await supabaseClient
        .from('notas')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        lista.innerHTML = '<div class="ultimos-aviso" style="grid-column:1/-1;">Erro ao carregar.</div>';
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = '<div class="ultimos-aviso" style="grid-column:1/-1;">Nenhuma nota ou recibo salvo.</div>';
        return;
    }

    // Gera todas as signed URLs em paralelo (mais rápido que em série)
    const comUrls = await Promise.all(data.map(async (n) => {
        const { data: signed, error: signErr } = await supabaseClient.storage
            .from('notas')
            .createSignedUrl(n.arquivo_url, 3600); // 1 hora
        return { ...n, _urlExibir: signErr ? '' : signed.signedUrl };
    }));

    let h = '';
    comUrls.forEach(n => {
        const isPdf = n.tipo_arquivo === 'pdf';
        
        // A imagem/PDF agora tem altura fixa de 120px, deixando espaço para o título embaixo
        const preview = isPdf
            ? `<div style="width:100%; height:120px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; font-size:36px;">📄</div>`
            : `<img src="${n._urlExibir}" style="width:100%; height:120px; object-fit:cover;">`;

        const descSegura = n.descricao.replace(/'/g, "\\'");

        h += `
        <div class="card-nota" style="position:relative; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); cursor:pointer; display:flex; flex-direction:column;"
             onclick="visualizarNota('${n.arquivo_url}', '${n.tipo_arquivo}', '${descSegura}')">
            
            <!-- Imagem/PDF -->
            ${preview}
            
            <!-- Título fixo abaixo da imagem -->
            <div style="padding:8px; font-size:12px; color:#142b42; font-weight:bold; text-align:center; line-height:1.2; word-break:break-word; background:#f8fafc; border-top:1px solid #e2e8f0; flex:1; display:flex; align-items:center; justify-content:center;">
                ${n.descricao}
            </div>

            <!-- Botão Excluir -->
            <button onclick="event.stopPropagation(); excluirNota(${n.id})"
                    style="position:absolute; top:4px; right:4px; width:24px; height:24px; border-radius:50%; background:rgba(179,38,30,0.9); color:#fff; border:none; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; min-height:auto; padding:0; margin:0; z-index:10;">✕</button>
        </div>`;
    });
    lista.innerHTML = h;
}

window.visualizarNota = async function(caminho, tipo, descricao = '') {
    // Gera signed URL fresca no momento do clique (vale 1h)
    const { data: signed, error } = await supabaseClient.storage
        .from('notas')
        .createSignedUrl(caminho, 3600);

    if (error || !signed) {
        alert("Não foi possível abrir o arquivo. Tente novamente.");
        return;
    }

    const url = signed.signedUrl;
    
    // Captura os elementos
    const imgElement = document.getElementById('imgVisualizarNota');
    const iframeElement = document.getElementById('pdfVisualizarNota');
    
    // Define o título
    document.getElementById('tituloVisualizarNota').textContent = descricao;

    // Alterna entre imagem e PDF
    if (tipo === 'pdf') {
        imgElement.style.display = 'none';
        imgElement.src = ''; // Limpa a imagem anterior
        iframeElement.src = url;
        iframeElement.style.display = 'block';
    } else {
        iframeElement.style.display = 'none';
        iframeElement.src = ''; // Limpa o PDF anterior
        imgElement.src = url;
        imgElement.style.display = 'block';
    }
    
    // Abre o modal
    document.getElementById('popupVisualizarNota').classList.add('ativo');
};

window.excluirNota = async function(id) {
    mostrarConfirmacao("Tem certeza que deseja excluir esta nota?", async function() {
        const { data } = await supabaseClient.from('notas').select('arquivo_url').eq('id', id).single();
        if (data?.arquivo_url) {
            // arquivo_url agora é o caminho puro (ex: "1234_abc.pdf")
            await supabaseClient.storage.from('notas').remove([data.arquivo_url]).catch(() => {});
        }
        await supabaseClient.from('notas').delete().eq('id', id);
        carregarNotas();
    });
};

document.getElementById("formNota").onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById('descNota').value.trim();
    const fileInput = document.getElementById('arquivoNota');
    const file = fileInput.files[0];
    const msg = document.getElementById('msgNota');
    const btn = document.getElementById('btnSalvarNota');

    if (!desc || !file) {
        msg.textContent = "Preencha descrição e selecione um arquivo.";
        return;
    }

    // Validação (do Bloco C original, aplicada aqui)
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
        msg.textContent = "Formato inválido. Use JPG, PNG, WEBP ou PDF.";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        msg.textContent = "Arquivo muito grande (máx. 10MB).";
        return;
    }

    msg.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const nomeArquivo = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: upErr } = await supabaseClient.storage
            .from('notas')
            .upload(nomeArquivo, file, { contentType: file.type });

        if (upErr) throw new Error("Erro no upload: " + upErr.message);

        const tipo = file.type === 'application/pdf' ? 'pdf' : 'imagem';

        // Bucket privado: salva só o CAMINHO, não a URL
        const { error: dbErr } = await supabaseClient.from('notas').insert([{
            user_id: usuarioLogado.id,
            descricao: desc,
            arquivo_url: nomeArquivo,   // apenas o caminho no bucket
            tipo_arquivo: tipo
        }]);

        if (dbErr) throw dbErr;

        document.getElementById('formNota').reset();
        fecharPopup('popupNota');
        carregarNotas();
        mostrarPopupSucesso("Nota salva!");

    } catch (err) {
        msg.textContent = "Erro: " + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
};

// ==========================================
// FUNÇÃO PARA ABRIR O POPUP DE DETALHES DA CATEGORIA
// ==========================================
window.abrirDetalhesCategoria = function(nome, itens, total, cor) {
    document.getElementById('tituloDetalhesCategoria').textContent = `Detalhes: ${nome}`;
    document.getElementById('tituloDetalhesCategoria').style.color = cor;
    
    let h = '<table style="width:100%; border-collapse: collapse; font-size: 13px;">';
    itens.forEach(item => {
        const dt = new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR');
        h += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0;">${item.descricao}<br><small style="color:#64748b;">Venc: ${dt}</small></td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatarReal(item.valor)}</td>
            </tr>
        `;
    });
    h += '</table>';
    
    document.getElementById('listaDetalhesCategoria').innerHTML = h;
    document.getElementById('totalDetalhesCategoria').innerHTML = `Total: <span style="color: ${cor};">${formatarReal(total)}</span>`;
    
    document.getElementById('popupDetalhesCategoria').classList.add('ativo');
};