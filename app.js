const SUPABASE_URL = 'https://zsphwqdqrvxozomvogrk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s87sEdRzaBnha9yBhNfwVw_8cq-m3_1';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null, enviando = false, editandoContaId = null, editandoMetaId = null;
let deslocamentoMes = 0;
let timeoutPopup = null;
let idEditandoGastoPessoal = null;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const IMAGENS_MESES = ["mes1.jpg","mes2.jpg","mes3.jpg","mes4.jpg","mes5.jpg","mes6.jpg","mes7.jpg","mes8.jpg","mes9.jpg","mes10.jpg","mes11.jpg","mes12.jpg"];
// Paleta de cores para as categorias
const CORES_CATEGORIAS = {
    "CARLOS": "#e11d48", // Vermelho escuro
    "ROSANA": "#d946ef", // Rosa/Roxo
    "LEOCIR": "#14b8a6"  // Turquesa/Verde água
};

const loginSenha=document.getElementById("loginSenha"),msgLogin=document.getElementById("mensagemLogin"),appPrincipal=document.getElementById("appPrincipal"),telaLogin=document.getElementById("telaLogin");
const catConta=document.getElementById("catConta"),txtCatConta=document.getElementById("txtCatConta"),descConta=document.getElementById("descConta"),valConta=document.getElementById("valConta"),parcQtdConta=document.getElementById("parcQtdConta"),vencConta=document.getElementById("vencConta"),pagoConta=document.getElementById("pagoConta"),btnSalvarConta=document.getElementById("btnSalvarConta"),msgConta=document.getElementById("msgConta"),listaContas=document.getElementById("listaContas");

// ==========================================
// FUNÇÕES DE APOIO (CORREÇÕES)
// ==========================================
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

    if (a === 'contas') {
        document.getElementById('abaContas').style.display = 'block';
        document.getElementById('btnAbaContas').classList.add('ativa');
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
    if (tipo === 'fixo') {
        boxParcelas.style.display = 'none';
        document.getElementById('parcQtdConta').required = false;
    } else {
        boxParcelas.style.display = 'block';
        document.getElementById('parcQtdConta').required = true;
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
        document.getElementById("vencConta").value = new Date().toISOString().split('T')[0];
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
    
    msgLogin.textContent = "";
    if(!s){ msgLogin.textContent="Digite a senha."; return; }
    
    let {data, error} = await supabaseClient.auth.signInWithPassword({email: emailEscolhido, password: s});
    
    if(error){
        msgLogin.textContent="Senha incorreta.";
        console.log(error.message);
    } else {
        localStorage.setItem('ultimoUsuario', emailEscolhido);
        iniciarApp(data.user);
    }
};

window.fazerLogout = async function(){
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.log("Erro de rede ao sair, mas limpando a tela localmente.");
    }
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

    carregarCategorias();
    carregarContas();
    atualizarPapelParedeMes(0);
    const hoje=new Date().toISOString().split('T')[0];
    document.getElementById('vencConta').value=hoje;
    
    mudarAba('contas');
}

supabaseClient.auth.getSession().then(({data:{session}})=>{
    if(session) {
        iniciarApp(session.user);
    } else {
        telaLogin.style.display="block";
        const ultimo = localStorage.getItem('ultimoUsuario');
        if(ultimo) {
            document.getElementById("loginUsuario").value = ultimo;
        }
    }
});

window.abrirAlterarSenha=function(){document.getElementById("popupSenha").classList.add("ativo")};
window.salvarNovaSenha=async function(){const n=document.getElementById("novaSenha").value,msg=document.getElementById("msgSenha");if(n.length<6){msg.textContent="Min. 6 caracteres.";return}const{error}=await supabaseClient.auth.updateUser({password:n});if(error){msg.textContent="Erro."}else{msg.style.color="#188038";msg.textContent="Alterada!";setTimeout(()=>{fecharPopup('popupSenha');msg.style.color="#b3261e"},2000)}};

async function carregarCategorias(){
    const{data,error}=await supabaseClient.from('categorias').select('*').order('id');
    if(error)return;
    catConta.innerHTML='<option value="">Selecione</option>';
    data.forEach(item=>{
        const l=document.createElement("div");l.className="cat-item";
        l.innerHTML=`<div class="cat-nome">${String(item.id).padStart(2,'0')} — ${item.nome}</div><div class="cat-desc">${item.descricao}</div>`;
        l.onclick=function(){
            catConta.value=item.id;txtCatConta.textContent=`${String(item.id).padStart(2,'0')} — ${item.nome}`;
            fecharPopup('popupCategorias');
        };
        document.getElementById("listaCategoriasPopup").appendChild(l);
        const o=document.createElement("option");o.value=item.id;o.text=item.nome;catConta.appendChild(o);
    });
}
document.getElementById("btnCatConta").onclick=()=>{document.getElementById("tituloPopupCat").innerText="Categoria da Conta";document.getElementById("popupCategorias").classList.add("ativo")};
document.getElementById("popupCategorias").onclick=(e)=>{if(e.target.id==='popupCategorias')fecharPopup('popupCategorias')};

async function carregarContas(){
    listaContas.innerHTML='<div class="ultimos-aviso">Carregando...</div>';
    const d=obterMesAno(deslocamentoMes);
    document.getElementById("mesTitulo").textContent=d.stringMesAno;
    
    // 1. OTIMIZAÇÃO: Faz as 3 buscas ao mesmo tempo (em paralelo) para ser mais rápido
    const [resMes, resAtrasadas, resMoldes] = await Promise.all([
        supabaseClient.from('lancamentos').select('*, categorias(nome)').gte('data_vencimento',d.primeiroDia).lte('data_vencimento',d.ultimoDia).order('data_vencimento',{ascending:true}),
        supabaseClient.from('lancamentos').select('*, categorias(nome)').gte('data_vencimento', obterMesAno(deslocamentoMes - 1).primeiroDia).lte('data_vencimento', obterMesAno(deslocamentoMes - 1).ultimoDia).eq('pago', false).lt('data_vencimento', new Date().toISOString().split('T')[0]),
        supabaseClient.from('lancamentos').select('*').eq('parcelas','Mensal').lt('data_vencimento',d.primeiroDia)
    ]);

    const contasMes = resMes.data || [];
    const contasAtrasadas = resAtrasadas.data || [];
    const moldes = resMoldes.data || [];
    
    if(resMes.error || resAtrasadas.error || resMoldes.error){
        listaContas.innerHTML='<div class="ultimos-aviso">Erro ao carregar.</div>';
        return;
    }

    // 2. OTIMIZAÇÃO: Cria as contas fixas do mês novo de uma vez só, em lote
    const novasCriadas = [];
    if(moldes.length > 0){
        const moldesUnicos = [...new Map(moldes.map(item => [item.descricao, item])).values()];
        const paraCriar = [];
        
        for(let molde of moldesUnicos) {
            const jaExiste = contasMes.find(m => m.descricao === molde.descricao && m.parcelas === 'Mensal');
            if(!jaExiste) {
                const diaVenc = parseInt(molde.data_vencimento.split('-')[2]);
                const [anoMes, mesStr] = [d.primeiroDia.split('-')[0], d.primeiroDia.split('-')[1]];
                const ultimoDiaMes = new Date(parseInt(anoMes), parseInt(mesStr), 0).getDate();
                const diaFinal = Math.min(diaVenc, ultimoDiaMes);
                const diaStr = String(diaFinal).padStart(2,'0');
                const dataVenc = `${anoMes}-${mesStr}-${diaStr}`;
                
                paraCriar.push({
                    user_id:usuarioLogado.id, categoria_id: molde.categoria_id, descricao: molde.descricao, valor: molde.valor, data_vencimento: dataVenc, pago: false, parcelas: 'Mensal', grupo_parcelamento: molde.grupo_parcelamento
                });
            }
        }
        
        if(paraCriar.length > 0){
            const { data: criadas, error: errNova } = await supabaseClient.from('lancamentos').insert(paraCriar).select('*, categorias(nome)');
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
    
    if(allData.length===0){
        listaContas.innerHTML='<div class="ultimos-aviso">Nenhuma conta neste mês.</div>';
    } else {
        let h=`<table class="tabela-ultimos"><tbody>`;
        allData.forEach(i=>{
            const v=new Date(i.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR');
            const c = i.pago ? 'linha-paga' : 'linha-pendente';
            
            let tag = '';
            if (i.pago) {
                tag = `<span style="background:#188038; color:#fff; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:5px;">✓ Pago</span>`;
            } else {
                if (new Date(i.data_vencimento + 'T23:59:59') < new Date()) {
                    tag = `<span style="background:#b3261e; color:#fff; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:5px;">Vencida</span>`;
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
                    <button class="btn-acao" onclick='editarConta(${JSON.stringify(i)})'>✏️</button>
                    <button class="btn-acao" onclick='excluirGasto(${i.id}, "${i.grupo_parcelamento}", ${i.parcelas === 'Mensal'})'>🗑️</button>
                </td>
            </tr>`;
        });
        listaContas.innerHTML=h+`</tbody></table>`;
    }
}

document.getElementById("formLancamento").onsubmit=async(e)=>{
    e.preventDefault();if(enviando)return;
    const tipo = document.getElementById('tipoConta').value;
    
    // CORREÇÃO: Usando parseMoeda
    const v = parseMoeda(valConta.value);
    let q = parseInt(parcQtdConta.value) || 2;
    
    if(isNaN(v)||v<=0 || catConta.value==="" || !vencConta.value){msgConta.textContent="Preencha os dados.";return}
    
    enviando=true;btnSalvarConta.disabled=true;btnSalvarConta.textContent="Salvando...";
    try{
        if(editandoContaId) {
            const { data: itemAtual } = await supabaseClient.from('lancamentos').select('*').eq('id', editandoContaId).single();
            const db=new Date(vencConta.value+'T12:00:00');
            const grupoId = itemAtual.grupo_parcelamento || gerarUUID();

            if (itemAtual.parcelas === 'Mensal' && tipo === 'parcela') {
                await supabaseClient.from('lancamentos').delete().eq('id', editandoContaId);
                const novos = [];
                for (let i = 1; i <= q; i++) {
                    let dp = new Date(db); dp.setMonth(dp.getMonth() + (i - 1));
                    novos.push({user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:`${descConta.value.trim()} (${i}/${q})`,valor:v,data_vencimento:dp.toISOString().split('T')[0],pago:(i === 1) ? pagoConta.checked : false,parcelas:`${i}/${q}`,grupo_parcelamento:grupoId});
                }
                await supabaseClient.from('lancamentos').insert(novos);
                mostrarPopupSucesso("Transformado em parcelado!");
            } else if (itemAtual.parcelas !== 'Mensal' && tipo === 'fixo') {
                await supabaseClient.from('lancamentos').delete().eq('grupo_parcelamento', itemAtual.grupo_parcelamento);
                await supabaseClient.from('lancamentos').insert([{user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:descConta.value.trim(),valor:v,data_vencimento:vencConta.value,pago:pagoConta.checked,parcelas:'Mensal',grupo_parcelamento:grupoId}]);
                mostrarPopupSucesso("Transformado em conta fixa!");
            } else {
                if (tipo === 'fixo') {
                    await supabaseClient.from('lancamentos').update({categoria_id:parseInt(catConta.value),descricao:descConta.value.trim(),valor:v,data_vencimento:vencConta.value,pago:pagoConta.checked}).eq('id', editandoContaId);
                    mostrarPopupSucesso("Conta fixa atualizada!");
                } else {
                    const { data: grupo } = await supabaseClient.from('lancamentos').select('id').eq('grupo_parcelamento', itemAtual.grupo_parcelamento).order('data_vencimento', {ascending: true});
                    for (let i = 0; i < grupo.length && i < q; i++) {
                        let dp = new Date(db); dp.setMonth(dp.getMonth() + i);
                        // CORREÇÃO: Adicionado 'parcelas' no update
                        await supabaseClient.from('lancamentos').update({categoria_id:parseInt(catConta.value),descricao:`${descConta.value.trim()} (${i+1}/${q})`,valor:v,data_vencimento:dp.toISOString().split('T')[0],parcelas:`${i+1}/${q}`}).eq('id', grupo[i].id);
                    }
                    if (q > grupo.length) {
                        const novos = [];
                        for (let i = grupo.length; i < q; i++) {
                            let dp = new Date(db); dp.setMonth(dp.getMonth() + i);
                            novos.push({user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:`${descConta.value.trim()} (${i+1}/${q})`,valor:v,data_vencimento:dp.toISOString().split('T')[0],pago:false,parcelas:`${i+1}/${q}`,grupo_parcelamento:itemAtual.grupo_parcelamento});
                        }
                        await supabaseClient.from('lancamentos').insert(novos);
                    }
                    if (q < grupo.length) {
                        for (let i = q; i < grupo.length; i++) { await supabaseClient.from('lancamentos').delete().eq('id', grupo[i].id); }
                    }
                    mostrarPopupSucesso("Parcelas atualizadas!");
                }
            }
            cancelarEdicaoConta();
        } else {
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
    document.getElementById('btnCancelarEdicao').style.display = 'block'; // Mostra o botão de cancelar
    abrirPopupLancamento();
};

window.cancelarEdicaoConta = function() {
    editandoContaId = null;
    document.getElementById("formLancamento").reset();
    txtCatConta.textContent = "Selecione...";
    document.getElementById("vencConta").value = new Date().toISOString().split('T')[0];
    btnSalvarConta.textContent = "Registrar Conta";
    document.getElementById('btnCancelarEdicao').style.display = 'none'; // Esconde o botão de cancelar
    alternarTipo();
    fecharPopup('popupLancamento');
};

window.togglePagoConta = async function(id, status){
    // Atualiza o visual imediatamente antes de ir no banco (deixa o app mais rápido)
    const check = document.querySelector(`input[onchange*="togglePagoConta(${id},"]`);
    if(check) check.checked = !status;

    const pagador = !status ? usuarioLogado.id : null; 
    
    await supabaseClient.from('lancamentos').update({
        pago: !status,
        pago_por: pagador
    }).eq('id', id);
    
    carregarContas(); // Atualiza os totais no final
};

// Variáveis para guardar o que vai ser excluído
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
        if (grupoParaExcluir && grupoParaExcluir !== 'undefined' && grupoParaExcluir !== null) {
            // Apaga todas as parcelas ou todos os meses fixos de uma vez
            await supabaseClient.from('lancamentos').delete().eq('grupo_parcelamento', grupoParaExcluir);
        } else {
            // Apaga um lançamento único
            await supabaseClient.from('lancamentos').delete().eq('id', idParaExcluir);
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao excluir. Tente novamente.");
    }
    
    carregarContas(); 
};

document.getElementById("mesAnterior").onclick=()=>{deslocamentoMes--;carregarContas();atualizarPapelParedeMes(deslocamentoMes)};
document.getElementById("mesProximo").onclick=()=>{deslocamentoMes++;carregarContas();atualizarPapelParedeMes(deslocamentoMes)};

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
                
                <div style="display:flex; justify-content:space-between; padding: 10px 15px 0 15px;">
                    <div class="meta-titulo" style="margin:0;">${m.nome}</div>
                    <div>
                        <button class="btn-acao" onclick='editarMeta(${JSON.stringify(m)})' title="Editar">✏️</button>
                        <button class="btn-acao" onclick='excluirMeta(${m.id})' title="Excluir">🗑️</button>
                    </div>
                </div>

                <div class="meta-conteudo" style="padding-top: 5px;">
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
    // CORREÇÃO: Usando parseMoeda
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
    // CORREÇÃO: Usando parseMoeda
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
// LÓGICA DE GASTOS PESSOAIS (INDIVIDUAIS)
// ==========================================
async function carregarGastosPessoais() {
    const lista = document.getElementById('listaGastosPessoais');
    const totalSpan = document.getElementById('totalGastosPessoais');
    
    lista.innerHTML = ''; 

    const { data, error } = await supabaseClient
    .from('gastos_pessoais')
    .select('*')
    .eq('user_id', usuarioLogado.id)
    .order('data_gasto', { ascending: false });

    if (error) {
        console.error("Erro no Supabase:", error);
        return;
    }

    // CORREÇÃO: Verifica se data existe e se está vazio
    if (!data || data.length === 0) {
        totalSpan.textContent = 'R$ 0,00';
    } else {
        let html = `<table class="tabela-ultimos"><tbody>`;
        let total = 0;

        data.forEach(gasto => {
            total += parseFloat(gasto.valor);
            
            const valorExibicao = gasto.valor > 0 ? formatarReal(gasto.valor) : '';

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

document.getElementById("formGastoPessoal").onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById("descGastoPessoal").value.trim();
    const valorInput = document.getElementById("valGastoPessoal").value.trim();
    
    // CORREÇÃO: Usando parseMoeda
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

    try {
        if (idEditandoGastoPessoal) {
            const { error } = await supabaseClient.from('gastos_pessoais')
                .update({ descricao: desc, valor: valor })
                .eq('id', idEditandoGastoPessoal);
            if (error) throw error;
            idEditandoGastoPessoal = null;
            btn.textContent = "Adicionar";
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

        document.getElementById("formGastoPessoal").reset();
        carregarGastosPessoais();

    } catch (err) {
        msg.textContent = "Erro: " + err.message;
    } finally {
        btn.disabled = false;
        if (!idEditandoGastoPessoal) btn.textContent = "Adicionar";
    }
};

window.editarGastoPessoal = function(id, desc, valor) {
    idEditandoGastoPessoal = id;
    document.getElementById("descGastoPessoal").value = desc;
    document.getElementById("valGastoPessoal").value = valor.toString().replace('.', ',');
    
    const btn = document.querySelector('#formGastoPessoal button[type="submit"]');
    btn.textContent = "Salvar Alterações";
    
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
// LÓGICA DE COMPRAS E ESTOQUE
// ==========================================
async function carregarCompras() {
    const listaComprar = document.getElementById('listaParaComprar');
    const listaEstoque = document.getElementById('listaEstoque');
    listaComprar.innerHTML = 'Carregando...';
    listaEstoque.innerHTML = 'Carregando...';

    // Busca tudo do banco
    const { data, error } = await supabaseClient.from('compras').select('*');
    if (error) {
        listaComprar.innerHTML = 'Erro ao carregar.';
        return;
    }

    // Separa o que é comprar e o que é estoque
    const paraComprar = data.filter(item => item.status === 'comprar').sort((a,b) => a.nome.localeCompare(b.nome));
    const emEstoque = data.filter(item => item.status === 'estoque').sort((a,b) => a.nome.localeCompare(b.nome)); // Ordem Alfabética

    // Monta a lista de Comprar
    if (paraComprar.length === 0) {
        listaComprar.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Nada para comprar no momento.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        paraComprar.forEach(item => {
            h += `<tr class="linha-pendente">
                <td style="width:30px;text-align:center"><input type="checkbox" class="check-pago" onchange="marcarComprado(${item.id})"></td>
                <td><strong>${item.nome}</strong></td>
                <td class="col-valor" style="color:#b3261e;">Qtd: ${item.quantidade}</td>
                <td class="col-acoes"><button class="btn-acao" onclick="excluirCompra(${item.id})">🗑️</button></td>
            </tr>`;
        });
        listaComprar.innerHTML = h + `</tbody></table>`;
    }

    // Monta o Estoque
    if (emEstoque.length === 0) {
        listaEstoque.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Estoque vazio.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        emEstoque.forEach(item => {
            h += `<tr class="linha-paga">
                <td style="width:30px;text-align:center"><input type="checkbox" class="check-pago" checked disabled></td>
                <td><strong>${item.nome}</strong></td>
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

// Adicionar novo item
document.getElementById("formCompra").onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeCompra').value.trim();
    const qtd = parseInt(document.getElementById('qtdCompra').value);

    if (!nome || qtd < 1) return;

    const { error } = await supabaseClient.from('compras').insert([{
        nome: nome,
        quantidade: qtd,
        status: 'comprar'
    }]);

    if (!error) {
        document.getElementById('nomeCompra').value = '';
        document.getElementById('qtdCompra').value = '1';
        carregarCompras();
    } else {
        alert("Erro ao adicionar item.");
    }
};

// Mover para o estoque
window.marcarComprado = async function(id) {
    await supabaseClient.from('compras').update({ status: 'estoque' }).eq('id', id);
    carregarCompras();
};

// Aumentar ou diminuir do estoque
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

// Excluir item
window.excluirCompra = async function(id) {
    mostrarConfirmacao("Tem certeza que deseja excluir este item?", async function() {
        await supabaseClient.from('compras').delete().eq('id', id);
        carregarCompras();
    });
};

// Função de confirmação customizada (substitui o confirm feio do navegador)
window.mostrarConfirmacao = function(mensagem, callback) {
    document.getElementById('textoConfirmacao').textContent = mensagem;
    
    const btn = document.getElementById('btnConfirmarAcao');
    // Remove o evento antigo do botão para não acumular
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    
    // Adiciona o novo evento
    novoBtn.onclick = function() {
        fecharPopup('popupConfirmacao');
        callback(); // Executa a ação que você queria
    };

    document.getElementById('popupConfirmacao').classList.add('ativo');
};