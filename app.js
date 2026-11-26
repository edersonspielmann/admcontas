const SUPABASE_URL = 'https://zsphwqdqrvxozomvogrk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s87sEdRzaBnha9yBhNfwVw_8cq-m3_1';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let usuarioLogado = null, enviando = false, editandoContaId = null, editandoMetaId = null;
let senhaMestraCofre = null;
let deslocamentoMes = 0;
let timeoutPopup = null;
let idEditandoGastoPessoal = null;
let acaoPosDesbloqueio = null; 
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let CORES_CATEGORIAS = {}; 
const loginSenha=document.getElementById("loginSenha"),msgLogin=document.getElementById("mensagemLogin"),appPrincipal=document.getElementById("appPrincipal"),telaLogin=document.getElementById("telaLogin");
const catConta=document.getElementById("catConta"),txtCatConta=document.getElementById("txtCatConta"),descConta=document.getElementById("descConta"),valConta=document.getElementById("valConta"),parcQtdConta=document.getElementById("parcQtdConta"),vencConta=document.getElementById("vencConta"),pagoConta=document.getElementById("pagoConta"),btnSalvarConta=document.getElementById("btnSalvarConta"),msgConta=document.getElementById("msgConta"),listaContas=document.getElementById("listaContas");
function arquivoParaBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); 
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function base64ParaBlob(base64, tipo) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: tipo});
}
function criptografarComSenha(texto) {
    if (!texto || !senhaMestraCofre) return null;
    return CryptoJS.AES.encrypt(texto, senhaMestraCofre).toString();
}
function descriptografarComSenha(texto) {
    if (!texto || !senhaMestraCofre) return "";
    try {
        const bytes = CryptoJS.AES.decrypt(texto, senhaMestraCofre);
        const original = bytes.toString(CryptoJS.enc.Utf8);
        return original || "Erro: Senha incorreta";
    } catch (e) {
        return "Erro: Senha incorreta";
    }
}
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
window.desbloquearCofre = async function() {
    const senhaDigitada = document.getElementById('inputSenhaMestra').value;
    const msg = document.getElementById('msgSenhaMestra');

    if (!senhaDigitada) {
        msg.textContent = "Digite uma senha.";
        return;
    }
    senhaMestraCofre = senhaDigitada;
    const { data } = await supabaseClient.from('gastos_pessoais').select('senha').limit(1);
    if (data && data.length > 0 && data[0].senha) {
        const teste = descriptografarComSenha(data[0].senha);
        if (teste === "Erro: Senha incorreta") {
            senhaMestraCofre = null;
            mostrarConfirmacao("A Senha Mestra está incorreta. Tente novamente.", function() {
                document.getElementById('inputSenhaMestra').focus();
            });
            return;
        }
    }
    fecharPopup('popupSenhaMestra');
    if (acaoPosDesbloqueio) {
        acaoPosDesbloqueio();
        acaoPosDesbloqueio = null; 
    } else {
        carregarGastosPessoais();
    }
};
window.solicitarVisualizacaoCofre = function() {
    if (senhaMestraCofre) {
        carregarGastosPessoais();
    } else {
        acaoPosDesbloqueio = () => carregarGastosPessoais();
        document.getElementById('inputSenhaMestra').value = '';
        document.getElementById('msgSenhaMestra').textContent = '';
        document.getElementById('popupSenhaMestra').classList.add('ativo');
    }
};
window.mostrarConfirmacao = function(mensagem, callbackAcao, isPagamento = false) {
    const popup = document.getElementById('popupConfirmacao');
    const icone = popup.querySelector('.popup-icone');
    const titulo = popup.querySelector('.popup-titulo');
    const btnConfirmar = document.getElementById('btnConfirmarAcao');
    document.getElementById('textoConfirmacao').innerHTML = mensagem;
    if (isPagamento) {
        icone.textContent = '✅';
        icone.style.color = '#188038';
        titulo.textContent = 'Confirmar';
        titulo.style.color = '#188038';
        btnConfirmar.textContent = 'Sim, foi paga!';
        btnConfirmar.style.background = '#188038';
    } else {
        icone.textContent = '⚠️';
        icone.style.color = '#b3261e';
        titulo.textContent = 'Atenção';
        titulo.style.color = '#b3261e';
        btnConfirmar.textContent = 'Sim, tenho certeza';
        btnConfirmar.style.background = '#b3261e';
    }
    btnConfirmar.onclick = null; 
    btnConfirmar.onclick = async () => {
        fecharPopup('popupConfirmacao');
        await callbackAcao();
    };
    popup.classList.add('ativo');
};
window.mudarAba = function(a) {
    document.getElementById('abaContas').style.display = 'none';
    document.getElementById('abaMetas').style.display = 'none';
    document.getElementById('abaPessoais').style.display = 'none';
    document.getElementById('abaCompras').style.display = 'none';
    document.getElementById('abaNotas').style.display = 'none';
    document.getElementById('btnAbaContas').classList.remove('ativa');
    document.getElementById('btnAbaMetas').classList.remove('ativa');
    document.getElementById('btnAbaPessoais').classList.remove('ativa');
    document.getElementById('btnAbaCompras').classList.remove('ativa');
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
        acaoPosDesbloqueio = null; 
        document.getElementById('abaPessoais').style.display = 'block';
        document.getElementById('btnAbaPessoais').classList.add('ativa');
        document.getElementById('listaGastosPessoais').innerHTML = '<div class="ultimos-aviso" style="text-align:center; font-size:12px; color:#64748b; padding: 20px 0;">Clique no botão acima para visualizar suas credenciais.</div>';       
    } else if (a === 'compras') {
        document.getElementById('abaCompras').style.display = 'block';
        document.getElementById('btnAbaCompras').classList.add('ativa');
        carregarCompras();
    }
};
window.alternarTipo = function() {
    const tipo = document.getElementById('tipoConta').value;
    const boxParcelas = document.getElementById('boxParcelas');
    const labelValor = document.getElementById('labelValConta'); 
    if (tipo === 'fixo') {
        boxParcelas.style.display = 'none';
        document.getElementById('parcQtdConta').required = false;
        labelValor.textContent = "Valor (R$)"; 
    } else {
        boxParcelas.style.display = 'block';
        document.getElementById('parcQtdConta').required = true;
        labelValor.textContent = "Valor da Parcela (R$)"; 
    }
};
function atualizarPapelParedeMes(deslocamento){
    const hoje = new Date();
    let mesIndex = (hoje.getMonth() + deslocamento) % 12;
    if (mesIndex < 0) mesIndex += 12;
    const barra = document.querySelector('.mes-nav');
    if (barra) {
        const coresFundo = [
            'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)', 
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', 
            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', 
            'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
            'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', 
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', 
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' 
        ];
        barra.style.backgroundImage = coresFundo[mesIndex];
        barra.style.backgroundSize = '200% 200%';
        barra.style.animation = 'gradientShift 5s ease infinite';
    }
}
function mostrarPopupSucesso(t){document.getElementById("tituloPopup").textContent=t;clearTimeout(timeoutPopup);document.getElementById("popupSucesso").classList.add("ativo");timeoutPopup=setTimeout(()=>{document.getElementById("popupSucesso").classList.remove("ativo")},400)}
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
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
};
window.fazerLogout = async function(){
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    senhaMestraCofre = null;
    window.senhasCofreMemoria = {};
    acaoPosDesbloqueio = null;
	    idEditandoGastoPessoal = null; 
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
    mudarAba('contas');
    atualizarPapelParedeMes(0);
    const hoje = isoLocal(new Date());
    document.getElementById('vencConta').value=hoje;
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
        const moldesUnicos = [...new Map(
            moldes
                .filter(m => m.grupo_parcelamento) 
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
    const totaisPorCategoria = {};
    const itensPorCategoria = {}; 
    allData.forEach(i => {
        if (!i.pago) {
            const nomeCat = i.categorias?.nome;
            if (nomeCat && CORES_CATEGORIAS[nomeCat]) {
                if (!totaisPorCategoria[nomeCat]) {
                    totaisPorCategoria[nomeCat] = 0;
                    itensPorCategoria[nomeCat] = []; 
                }
                totaisPorCategoria[nomeCat] += parseFloat(i.valor);
                itensPorCategoria[nomeCat].push(i);
            }
        }
    });
    const containerResumo = document.getElementById("resumoCategorias");
    if (containerResumo) {
        containerResumo.innerHTML = ''; 
        if (Object.keys(totaisPorCategoria).length === 0) {
            containerResumo.style.display = 'none';
        } else {
            containerResumo.style.display = 'flex';
            for (const [nome, valor] of Object.entries(totaisPorCategoria)) {
                const corCat = CORES_CATEGORIAS[nome];
                const tag = document.createElement('div');
                tag.className = 'tag-resumo-cat';
                tag.style.backgroundColor = corCat;
                tag.style.cursor = 'pointer';
                tag.onclick = () => abrirDetalhesCategoria(nome, itensPorCategoria[nome], valor, corCat);
                tag.innerHTML = `<span>${nome}:</span> <span>${formatarReal(valor)}</span>`; 
                containerResumo.appendChild(tag);
            }
        }
    }
    if(allData.length===0){
        listaContas.innerHTML='<div class="ultimos-aviso">Nenhuma conta neste mês.</div>';
    } else {
        let h=`<table class="tabela-ultimos"><tbody>`;
        allData.forEach(i=>{
            const v=new Date(i.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR');
            const c = i.pago ? 'linha-paga' : 'linha-pendente';
let tag = '';
if (i.pago) {
 tag = `<span style="background:#188038; color:#fff; padding:1px 4px; border-radius:4px; font-size:9px; margin-left:4px; font-weight:bold; font-family:'Poppins', sans-serif;">PAGO</span>`;
} else {
    if (new Date(i.data_vencimento + 'T23:59:59') < new Date()) {
      tag = `<span style="background:#b3261e; color:#fff; padding:1px 4px; border-radius:4px; font-size:9px; margin-left:4px; font-weight:bold; font-family:'Poppins', sans-serif;">VENCIDA</span>`;
    }
}
            const nomeCat = i.categorias?.nome;
            const corCat = CORES_CATEGORIAS[nomeCat]; 
   const estiloLinha = (!i.pago && corCat) ? `style="background-color: ${corCat}15 !important;"` : "";
          const estiloBorda = (!i.pago && corCat) ? `border-left: 12px solid ${corCat} !important;` : "";
           h+=`<tr class="${c}" ${estiloLinha}>
               <td style="width: 45px; padding: 0; vertical-align: middle;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
        <input type="checkbox" class="check-pago" style="background-color: ${i.pago ? '#188038' : (corCat ? corCat : '#b3261e')} !important;" ${i.pago?'checked':''} onclick="solicitarPagamento(event, ${i.id}, ${i.pago}, '${i.descricao.replace(/'/g, "\\'")}', ${i.valor})">
    </div>
</td>
                <td style="padding: 6px 4px; vertical-align: middle;">
                   <strong style="color: ${corCat ? corCat : '#142b42'};">${i.descricao}</strong> ${tag}<br>
                    <small style="color:inherit;opacity:0.9; font-size:11px; display:inline-block; margin-top:2px;">
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
    if (itemAtual.parcelas === 'Mensal') {
        if (tipo === 'parcela') {
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
            await supabaseClient.from('lancamentos')
                .delete().eq('grupo_parcelamento', grupoId);
            const dataBase = new Date(vencConta.value + 'T12:00:00');
            const diaBase = dataBase.getDate();
            const novosMeses = [];
            for (let i = 0; i < 24; i++) {
                const dataAlvo = new Date(dataBase);
                dataAlvo.setMonth(dataAlvo.getMonth() + i);
                if (dataAlvo.getDate() !== diaBase) {
                    dataAlvo.setDate(0); 
                }
                novosMeses.push({
                    user_id: usuarioLogado.id,
                    categoria_id: parseInt(catConta.value),
                    descricao: descBase,
                    valor: v,
                    data_vencimento: dataAlvo.toISOString().split('T')[0],
                    pago: (i === 0) ? pagoConta.checked : false,
                    parcelas: 'Mensal',
                    grupo_parcelamento: grupoId
                });
            }
            await supabaseClient.from('lancamentos').insert(novosMeses);
            mostrarPopupSucesso("Conta fixa atualizada! Novos meses gerados.");
        }
    } else {
        if (tipo === 'fixo') {
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
                }).eq('id', grupo[i].id);
            }
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
            if (q < grupo.length) {
                for (let i = q; i < grupo.length; i++) {
                    await supabaseClient.from('lancamentos').delete().eq('id', grupo[i].id);
                }
            }
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
window.solicitarPagamento = function(event, id, statusAtual, descricao, valor) {
    event.preventDefault(); 
    if (statusAtual) {
        togglePagoConta(id, statusAtual);
        return;
    }
    const valorFormatado = formatarReal(valor);
    const mensagem = `Confirmar o pagamento da conta <strong>${descricao}</strong> no valor de <strong>${valorFormatado}</strong>?`;
    mostrarConfirmacao(mensagem, async function() {
        await togglePagoConta(id, statusAtual);
    }, true); 
};
window.togglePagoConta = async function(id, status) {
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
async function carregarMetas(){
    const listaMetas = document.getElementById('listaMetas');
    listaMetas.innerHTML='<div class="ultimos-aviso" style="grid-column:1/-1;">Carregando metas...</div>';
    const { data, error } = await supabaseClient.from('metas').select('*').order('id', { ascending: false });
    if(error){
        console.error(error);
        listaMetas.innerHTML='<div class="ultimos-aviso" style="color:#b3261e; grid-column:1/-1;">Erro ao carregar metas.</div>';
        return;
    }
    if(data.length === 0){
        listaMetas.innerHTML='<div class="ultimos-aviso" style="grid-column:1/-1;">Nenhuma meta criada ainda.<br>Clique no + para sonhar!</div>';
    } else {
        const coresMetas = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
        let h = '';
        data.forEach((m, index) => {
            const progresso = m.valor_guardado > 0 ? (m.valor_guardado / m.valor_total) * 100 : 0;
            const pct = Math.min(progresso, 100).toFixed(0);
            const falta = m.valor_total - m.valor_guardado;
            const corCard = coresMetas[index % coresMetas.length]; 
let imgHtml = '';
if (m.imagem_url && m.imagem_url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i)) {
    imgHtml = `<img src="${m.imagem_url}" alt="${m.nome}" onclick="window.open('${m.imagem_url}', '_blank')" style="cursor:pointer; width: 100%; height: 100%; object-fit: cover;">`;
} else if (m.imagem_url) {
    imgHtml = `
        <a href="${m.imagem_url}" target="_blank" rel="noopener" style="text-decoration: none; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, ${corCard}22, ${corCard}55); padding: 0 10px; box-sizing: border-box; cursor: pointer;">
           <span style="font-size: 10px; color: #142b42; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Acessar Link</span>
        </a>
    `;
} else {
    imgHtml = `<div style="width:100%; height:100%; background: linear-gradient(135deg, ${corCard}22, ${corCard}55);"></div>`;
}
            const corTextoPct = parseFloat(pct) > 50 ? '#fff' : '#64748b';
            h += `
            <div class="card-meta">
                <div class="meta-img-container">
                    ${imgHtml}
                    <div class="meta-acoes">
                        <button onclick='editarMeta(${JSON.stringify(m).replace(/'/g, "&#39;")})' title="Editar">✏️</button>
                        <button onclick='excluirMeta(${m.id})' title="Excluir">🗑️</button>
                    </div>
                </div>
                <div class="meta-titulo">${m.nome}</div>
                <div class="meta-conteudo">
                    <div class="meta-valores">
                        <div>
                            <span>Guardado</span>
                            <strong>${formatarReal(m.valor_guardado)}</strong>
                        </div>
                        <div style="text-align: right;">
                            <span>Falta</span>
                            <strong>${formatarReal(falta > 0 ? falta : 0)}</strong>
                        </div>
                    </div>
                    <div class="barra-progresso-container">
                        <div class="barra-progresso-preenchida" style="width: ${pct}%; background: ${corCard};"></div>
                        <div class="porcentagem-texto" style="color: ${corTextoPct};">${pct}%</div>
                    </div>
                    
                    <button class="btn-meta-add" onclick="abrirPopupGuardar(${m.id}, '${m.nome.replace(/'/g, "\\'")}')">+ Guardar</button>
                </div>
            </div>`;
        });
        listaMetas.innerHTML = h;
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
    mostrarConfirmacao("Tem certeza que deseja excluir esta meta?", async function() {
        const { error } = await supabaseClient.from('metas').delete().eq('id', id);
        if (!error) carregarMetas();
    });
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
async function carregarGastosPessoais() {
    const lista = document.getElementById('listaGastosPessoais');
    lista.innerHTML = '<div class="ultimos-aviso">Carregando...</div>';
    const { data, error } = await supabaseClient
        .from('gastos_pessoais')
        .select('*')
        .order('id', { ascending: false });
    if (error) {
        console.error("Erro no Supabase:", error);
        lista.innerHTML = '<div class="ultimos-aviso">Erro ao carregar.</div>';
        return;
    }
    if (!data || data.length === 0) {
        lista.innerHTML = '<div class="ultimos-aviso" style="text-align:center; font-size:12px; color:#64748b; padding: 20px 0;">Nenhuma anotação ainda.</div>';
        return;
    }
    const coresBloco = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
let html = '';
window.senhasCofreMemoria = window.senhasCofreMemoria || {};
data.forEach((gasto) => {
    const linkReal = gasto.link ? descriptografarComSenha(gasto.link) : '';
    const loginReal = gasto.login ? descriptografarComSenha(gasto.login) : '';
    const senhaReal = gasto.senha ? descriptografarComSenha(gasto.senha) : '';
    window.senhasCofreMemoria[gasto.id] = senhaReal;
    const cor = coresBloco[gasto.id % coresBloco.length];
    const descEscapada = (gasto.descricao || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const linkHtml = linkReal
        ? `<div class="anot-linha">
             <strong>Link:</strong>
             <a class="anot-link" href="${linkReal}" target="_blank" rel="noopener">${linkReal}</a>
           </div>`
        : '';
    const loginHtml = loginReal
        ? `<div class="anot-linha">
             <strong>Login:</strong>
             <span>${loginReal}</span>
             <button class="btn-copiar" onclick="copiarTextoMemoria(${gasto.id}, 'login', this)">Copiar</button>
           </div>`
        : '';
    const senhaHtml = senhaReal
        ? `<div class="anot-linha">
             <strong>Senha:</strong>
             <span class="senha-valor" id="senha-exibir-${gasto.id}" style="font-family: monospace;">••••••••</span>
             <button class="btn-copiar" onclick="copiarTextoMemoria(${gasto.id}, 'senha', this)">Copiar</button>
             <button class="btn-copiar" onclick="toggleSenha(${gasto.id}, this)">👁</button>
           </div>`
        : '';
    html += `
    <div class="bloco-anotacao" style="border-left-color: ${cor};"
         data-id="${gasto.id}">
        <div class="anot-desc">${descEscapada}</div>
        ${linkHtml}
        ${loginHtml}
        ${senhaHtml}
        <div class="acoes">
            <button class="btn-editar-bloco" title="Editar">✏️</button>
            <button class="btn-excluir-bloco" title="Excluir">🗑️</button>
        </div>
    </div>`;
});
lista.innerHTML = html;
    lista.querySelectorAll('.bloco-anotacao').forEach(bloco => {
        const id = bloco.getAttribute('data-id');
        const item = data.find(x => String(x.id) === String(id));
        bloco.querySelector('.btn-editar-bloco').addEventListener('click', () => {
            editarGastoPessoal(item);
        });
        bloco.querySelector('.btn-excluir-bloco').addEventListener('click', () => {
            excluirGastoPessoal(id);
        });
    });
}
window.toggleSenha = function(id, btn) {
    const span = document.getElementById(`senha-exibir-${id}`);
    if (!span) return;
    const senhaReal = window.senhasCofreMemoria[id];
    if (span.textContent === '••••••••') {
        span.textContent = senhaReal;
    } else {
        span.textContent = '••••••••';
    }
};
window.copiarTextoMemoria = async function(id, tipo, btn) {
    let textoParaCopiar = '';
    
    if (tipo === 'senha') {
        textoParaCopiar = window.senhasCofreMemoria[id];
    } else if (tipo === 'login') {
        textoParaCopiar = btn.parentElement.querySelector('span').textContent; 
    }

    if (!textoParaCopiar) return;

    try {
        await navigator.clipboard.writeText(textoParaCopiar);
        const original = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = original; }, 1200);
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = textoParaCopiar;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const original = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = original; }, 1200);
    }
};
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
    if (!senhaMestraCofre) {
        acaoPosDesbloqueio = () => document.getElementById("formGastoPessoal").requestSubmit();
        document.getElementById('inputSenhaMestra').value = '';
        document.getElementById('msgSenhaMestra').textContent = '';
        document.getElementById('popupSenhaMestra').classList.add('ativo');
        return;
    }
    const desc = document.getElementById("descGastoPessoal").value.trim();
    const link = document.getElementById("linkGastoPessoal").value.trim();
    const login = document.getElementById("loginGastoPessoal").value.trim();
    const senha = document.getElementById("senhaGastoPessoal").value.trim();
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
        const payload = {
            descricao: desc,
            link: link ? criptografarComSenha(link) : null,
            login: login ? criptografarComSenha(login) : null,
            senha: senha ? criptografarComSenha(senha) : null,
            valor: 0,
            data_gasto: new Date().toISOString().split('T')[0]
        };
        if (estavaEditando) {
            const { error } = await supabaseClient.from('gastos_pessoais')
                .update(payload)
                .eq('id', idEditandoGastoPessoal);
            if (error) throw error;
            mostrarPopupSucesso("Anotação atualizada!");
        } else {
            const { error } = await supabaseClient.from('gastos_pessoais')
                .insert([{ user_id: usuarioLogado.id, ...payload }]);
            if (error) throw error;
            mostrarPopupSucesso("Anotação salva!");
        }
        document.getElementById("formGastoPessoal").reset();
        document.getElementById("msgGastoPessoal").textContent = "";
        btn.disabled = false;
        btn.textContent = "Adicionar";
        const btnCancelar = document.getElementById("btnCancelarGastoPessoal");
        if (btnCancelar) btnCancelar.style.display = "none";
        idEditandoGastoPessoal = null;
        carregarGastosPessoais();
    } catch (err) {
        msg.textContent = "Erro: " + err.message;
        btn.disabled = false;
        btn.textContent = estavaEditando ? "Salvar Alterações" : "Adicionar";
    }
};
window.editarGastoPessoal = function(item) {
    idEditandoGastoPessoal = item.id;
    document.getElementById("descGastoPessoal").value = item.descricao || '';
   document.getElementById("linkGastoPessoal").value = item.link ? descriptografarComSenha(item.link) : '';
document.getElementById("loginGastoPessoal").value = item.login ? descriptografarComSenha(item.login) : '';
document.getElementById("senhaGastoPessoal").value = item.senha ? descriptografarComSenha(item.senha) : '';
    const btn = document.querySelector('#formGastoPessoal button[type="submit"]');
    btn.textContent = "Salvar Alterações";
    const btnCancelar = document.getElementById("btnCancelarGastoPessoal");
    if (btnCancelar) btnCancelar.style.display = "block";
    document.getElementById("descGastoPessoal").focus();
};
window.excluirGastoPessoal = async function(id) {
    mostrarConfirmacao("Tem certeza que deseja excluir esta anotação do cofre?", async function() {
        const { error } = await supabaseClient.from('gastos_pessoais').delete().eq('id', id);
        if (!error) carregarGastosPessoais();
    });
};
document.querySelectorAll('.popup-overlay').forEach(popup => {
    popup.addEventListener('click', function(e) {
        if (e.target === this) fecharPopup(this.id);
    });
});
document.getElementById("formCompra").onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeCompra').value.trim();
    const qtd = document.getElementById('qtdCompra').value.trim(); 
    if (!nome || !qtd) return;
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.textContent = "Enviando...";
    btn.disabled = true;
    try {
        const { error } = await supabaseClient.from('compras').insert([{
            nome: nome, 
            quantidade: qtd, 
            status: 'comprar'
        }]);
        if (error) throw error;
        document.getElementById('nomeCompra').value = '';
        document.getElementById('qtdCompra').value = '1';
        carregarCompras();
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
};
async function carregarCompras() {
    const listaComprar = document.getElementById('listaParaComprar');
    const listaEstoque = document.getElementById('listaEstoque');
    listaComprar.innerHTML = 'Carregando...';
    listaEstoque.innerHTML = 'Carregando...';
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    const dataLimiteStr = dataLimite.toISOString();
    await supabaseClient
        .from('compras')
        .delete()
        .eq('status', 'estoque')
        .lt('data_compra', dataLimiteStr);
    const { data, error } = await supabaseClient.from('compras').select('*');
    if (error) {
        listaComprar.innerHTML = 'Erro ao carregar.';
        return;
    }
    const paraComprar = data.filter(item => item.status === 'comprar').sort((a,b) => a.nome.localeCompare(b.nome));
    const emEstoque = data.filter(item => item.status === 'estoque').sort((a,b) => new Date(b.data_compra || 0) - new Date(a.data_compra || 0));
    if (paraComprar.length === 0) {
        listaComprar.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Nada para comprar no momento.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        paraComprar.forEach(item => {
            h += `<tr class="linha-pendente">
                <td style="width:30px;text-align:center">
                    <input type="checkbox" class="check-pago" onchange="marcarComprado(${item.id})">
                </td>
                <td style="padding: 6px 4px;">
                    <strong style="color: #b3261e; font-size: 14px;">${item.quantidade}x</strong> 
                    <span style="font-size: 14px; margin-left: 4px;">${item.nome}</span>
                </td>
            </tr>`;
        });
        listaComprar.innerHTML = h + `</tbody></table>`;
    }
    if (emEstoque.length === 0) {
        listaEstoque.innerHTML = '<div class="ultimos-aviso" style="font-size:12px; color:#64748b;">Nenhum item comprado nos últimos 30 dias.</div>';
    } else {
        let h = `<table class="tabela-ultimos"><tbody>`;
        emEstoque.forEach(item => {
            let dataTexto = "Data não registrada";
            if (item.data_compra) {
                const dataObj = new Date(item.data_compra);
                if (!isNaN(dataObj.getTime())) {
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    dataTexto = `Comprado em: ${dataFormatada} às ${horaFormatada}`;
                }
            }
            h += `<tr class="linha-paga" style="opacity: 0.8;">
                <td style="width:30px;text-align:center">
                    <input type="checkbox" class="check-pago" checked disabled>
                </td>
                <td style="padding: 6px 4px;">
                    <strong style="color: #188038; font-size: 14px;">${item.quantidade}x</strong> 
                    <span style="font-size: 14px; margin-left: 4px; text-decoration: line-through; color: #64748b;">${item.nome}</span>
                    <br>
                    <small style="color: #64748b; font-size: 10px;">${dataTexto}</small>
                </td>
            </tr>`;
        });
        listaEstoque.innerHTML = h + `</tbody></table>`;
    }
}
window.marcarComprado = async function(id) {
    const check = document.querySelector(`input[onchange*="marcarComprado(${id})"]`);
    if (check) check.disabled = true;
    const agora = new Date().toISOString();
    const { error } = await supabaseClient
        .from('compras')
        .update({ 
            status: 'estoque',
            data_compra: agora
        })
        .eq('id', id);
    if (error) {
        console.error("Erro ao marcar como comprado:", error);
        alert("Erro ao salvar no banco. Verifique se a coluna 'data_compra' existe.");
        if (check) check.disabled = false; // Libera o botão se der erro
        return;
    }
    carregarCompras();
};
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
    let h = '';
    data.forEach(n => {
        const isPdf = n.tipo_arquivo === 'pdf';
        const descSegura = n.descricao.replace(/'/g, "\\'");
        const preview = isPdf
            ? `<div style="width:100%; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fef2f2; color:#b3261e;">
                 <span style="font-size:36px;">📄</span>
                 <span style="font-size:10px; font-weight:bold; margin-top:4px;">PDF</span>
               </div>`
            : `<div style="width:100%; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#eff6ff; color:#2563eb;">
                 <span style="font-size:36px;">🖼️</span>
                 <span style="font-size:10px; font-weight:bold; margin-top:4px;">IMAGEM</span>
               </div>`;
        h += `
        <div class="card-nota" style="position:relative; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); cursor:pointer; display:flex; flex-direction:column;"
             onclick="visualizarNota('${n.arquivo_url}', '${n.tipo_arquivo}', '${descSegura}')">
            ${preview}
            <div style="padding:8px; font-size:12px; color:#142b42; font-weight:bold; text-align:center; line-height:1.2; word-break:break-word; background:#f8fafc; border-top:1px solid #e2e8f0; flex:1; display:flex; align-items:center; justify-content:center;">
                ${n.descricao}
            </div>
            <button onclick="event.stopPropagation(); excluirNota(${n.id})"
                    style="position:absolute; top:4px; right:4px; width:24px; height:24px; border-radius:50%; background:rgba(179,38,30,0.9); color:#fff; border:none; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; min-height:auto; padding:0; margin:0; z-index:10;">✕</button>
        </div>`;
    });
    lista.innerHTML = h;
}
window.visualizarNota = async function(caminho, tipo, descricao = '') {
    if (!senhaMestraCofre) {
        acaoPosDesbloqueio = () => visualizarNota(caminho, tipo, descricao); 
        document.getElementById('inputSenhaMestra').value = '';
        document.getElementById('msgSenhaMestra').textContent = '';
        document.getElementById('popupSenhaMestra').classList.add('ativo'); 
        return;
    }
    try {
        const { data: blobData, error: downErr } = await supabaseClient.storage
            .from('notas')
            .download(caminho);
        if (downErr) throw downErr;
        const textoCriptografado = await blobData.text();
        let base64Original = "";
        try {
            const bytes = CryptoJS.AES.decrypt(textoCriptografado, senhaMestraCofre);
            base64Original = bytes.toString(CryptoJS.enc.Utf8);
                } catch (e) {
            mostrarConfirmacao("Este documento é antigo e não possui a nova criptografia. Por favor, envie-o novamente.", function() {});
            return;
        }

        if (!base64Original || base64Original.length === 0) {
            mostrarConfirmacao("Não foi possível abrir o arquivo. A Senha Mestra está incorreta.", function() {});
            return;
        }
        const tipoMime = tipo === 'pdf' ? 'application/pdf' : 'image/jpeg';
        const blobOriginal = base64ParaBlob(base64Original, tipoMime);
        const urlExibir = URL.createObjectURL(blobOriginal);
        const imgElement = document.getElementById('imgVisualizarNota');
        const iframeElement = document.getElementById('pdfVisualizarNota');
        document.getElementById('tituloVisualizarNota').textContent = descricao;
        if (tipo === 'pdf') {
            imgElement.style.display = 'none';
            imgElement.src = '';
            iframeElement.src = urlExibir;
            iframeElement.style.display = 'block';
        } else {
            iframeElement.style.display = 'none';
            iframeElement.src = '';
            imgElement.src = urlExibir;
            imgElement.style.display = 'block';
        }
        document.getElementById('popupVisualizarNota').classList.add('ativo');
      } catch (err) {
        console.error(err);
        mostrarConfirmacao("Erro ao abrir o documento. Verifique se o arquivo não foi corrompido.", function() {});
    }
};
window.excluirNota = async function(id) {
    mostrarConfirmacao("Tem certeza que deseja excluir esta nota/recibo?", async function() {
        const { data } = await supabaseClient.from('notas').select('arquivo_url').eq('id', id).single();
        if (data?.arquivo_url) {
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
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
        msg.textContent = "Formato inválido. Use JPG, PNG, WEBP ou PDF.";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        msg.textContent = "Arquivo muito grande (máx. 10MB).";
        return;
    }
    if (!senhaMestraCofre) {
        acaoPosDesbloqueio = () => document.getElementById("formNota").requestSubmit();
        document.getElementById('inputSenhaMestra').value = '';
        document.getElementById('msgSenhaMestra').textContent = '';
        document.getElementById('popupSenhaMestra').classList.add('ativo');
        msg.textContent = '';
        return;
    }
    msg.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
        const base64Original = await arquivoParaBase64(file);
        const base64Criptografado = CryptoJS.AES.encrypt(base64Original, senhaMestraCofre).toString();
        const blobCriptografado = new Blob([base64Criptografado], { type: 'text/plain' });
        const nomeArquivo = `${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
        const { error: upErr } = await supabaseClient.storage
            .from('notas')
            .upload(nomeArquivo, blobCriptografado, { contentType: 'text/plain' });
        if (upErr) throw new Error("Erro no upload: " + upErr.message);
        const tipo = file.type === 'application/pdf' ? 'pdf' : 'imagem';
        const { error: dbErr } = await supabaseClient.from('notas').insert([{
            user_id: usuarioLogado.id,
            descricao: desc,
            arquivo_url: nomeArquivo,
            tipo_arquivo: tipo
        }]);
        if (dbErr) throw dbErr;
        document.getElementById('formNota').reset();
        fecharPopup('popupNota');
        carregarNotas();
        mostrarPopupSucesso("Documento salvo e criptografado!");
    } catch (err) {
        msg.textContent = "Erro: " + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
};
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