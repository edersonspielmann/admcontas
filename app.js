const SUPABASE_URL = 'https://zsphwqdqrvxozomvogrk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s87sEdRzaBnha9yBhNfwVw_8cq-m3_1';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null, enviando = false, editandoContaId = null, editandoMetaId = null;
let deslocamentoMes = 0;
let timeoutPopup = null;
let idEditandoGastoPessoal = null;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const IMAGENS_MESES = ["mes1.jpg","mes2.jpg","mes3.jpg","mes4.jpg","mes5.jpg","mes6.jpg","mes7.jpg","mes8.jpg","mes9.jpg","mes10.jpg","mes11.jpg","mes12.jpg"];

const loginSenha=document.getElementById("loginSenha"),msgLogin=document.getElementById("mensagemLogin"),appPrincipal=document.getElementById("appPrincipal"),telaLogin=document.getElementById("telaLogin");
const catConta=document.getElementById("catConta"),txtCatConta=document.getElementById("txtCatConta"),descConta=document.getElementById("descConta"),valConta=document.getElementById("valConta"),parcQtdConta=document.getElementById("parcQtdConta"),vencConta=document.getElementById("vencConta"),pagoConta=document.getElementById("pagoConta"),btnSalvarConta=document.getElementById("btnSalvarConta"),msgConta=document.getElementById("msgConta"),listaContas=document.getElementById("listaContas");

window.mudarAba = function(a) {
    document.getElementById('abaContas').style.display = 'none';
    document.getElementById('abaMetas').style.display = 'none';
    document.getElementById('abaPessoais').style.display = 'none';

    document.getElementById('btnAbaContas').classList.remove('ativa');
    document.getElementById('btnAbaMetas').classList.remove('ativa');
    document.getElementById('btnAbaPessoais').classList.remove('ativa');

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

function obterMesAno(d){const h=new Date(),a=new Date(h.getFullYear(),h.getMonth()+d,1);return{stringMesAno:`${MESES[a.getMonth()]} ${a.getFullYear()}`,primeiroDia:new Date(a.getFullYear(),a.getMonth(),1).toISOString().split('T')[0],ultimoDia:new Date(a.getFullYear(),a.getMonth()+1,0).toISOString().split('T')[0]}}
function formatarReal(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)}
function atualizarPapelParedeMes(deslocamento){const hoje=new Date();let mesIndex=(hoje.getMonth()+deslocamento)%12;if(mesIndex<0)mesIndex+=12;const urlImagem=IMAGENS_MESES[mesIndex];document.querySelectorAll('.mes-nav').forEach(barra=>{barra.style.backgroundImage=`url('${urlImagem}')`;});}
function mostrarPopupSucesso(t){document.getElementById("tituloPopup").textContent=t;clearTimeout(timeoutPopup);document.getElementById("popupSucesso").classList.add("ativo");timeoutPopup=setTimeout(()=>{document.getElementById("popupSucesso").classList.remove("ativo")},2000)}
function fecharPopup(id){document.getElementById(id).classList.remove("ativo")}
window.abrirPopupLancamento=function(){document.getElementById("popupLancamento").classList.add("ativo")};
window.abrirPopupMeta=function(){document.getElementById("popupMeta").classList.add("ativo")};

window.fazerLogin = async function(){
    const emailEscolhido = document.getElementById("loginUsuario").value; 
    const s = loginSenha.value;
    
    if(!s){ msgLogin.textContent="Digite a senha."; return; }
    
    let {data, error} = await supabaseClient.auth.signInWithPassword({email: emailEscolhido, password: s});
    
    if(error){
        msgLogin.textContent="Senha incorreta.";
        console.log(error.message);
    } else {
        // Salva quem logou para a próxima vez
        localStorage.setItem('ultimoUsuario', emailEscolhido);
        iniciarApp(data.user);
    }
};

window.fazerLogout = async function(){
    await supabaseClient.auth.signOut();
    localStorage.removeItem('ultimoUsuario'); // Limpa a memória
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
    
    // AQUI ESTÁ A MUDANÇA: Abre a aba pessoal primeiro
    mudarAba('pessoais');
}
// Verifica se já existe uma sessão ativa (pessoa não fechou o app)
supabaseClient.auth.getSession().then(({data:{session}})=>{
    if(session) {
        iniciarApp(session.user);
    } else {
        telaLogin.style.display="block";
        
        // Se não tem sessão, mas tem um "último usuário" salvo, ele já seleciona no dropdown
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
    const d=obterMesAno(deslocamentoMes);document.getElementById("mesTitulo").textContent=d.stringMesAno;
    
    const{data:contasMes,error:err1}=await supabaseClient.from('lancamentos').select('*, categorias(nome)').gte('data_vencimento',d.primeiroDia).lte('data_vencimento',d.ultimoDia).order('data_vencimento',{ascending:true});
    const{data:moldes,error:err2}=await supabaseClient.from('lancamentos').select('*').eq('parcelas','Mensal').lt('data_vencimento',d.primeiroDia);
    
    if(err1 || err2){listaContas.innerHTML='<div class="ultimos-aviso">Erro.</div>';return}

    const novasCriadas = [];
    if(moldes){
        const moldesUnicos = [...new Map(moldes.map(item => [item.descricao, item])).values()];
        for(let molde of moldesUnicos) {
            const jaExiste = contasMes.find(m => m.descricao === molde.descricao && m.parcelas === 'Mensal');
            if(!jaExiste) {
                const diaVenc = molde.data_vencimento.split('-')[2];
                const dataVenc = `${d.primeiroDia.split('-')[0]}-${d.primeiroDia.split('-')[1]}-${diaVenc}`;
                const { data: nova } = await supabaseClient.from('lancamentos').insert([{
                    user_id:usuarioLogado.id, categoria_id: molde.categoria_id, descricao: molde.descricao, valor: molde.valor, data_vencimento: dataVenc, pago: false, parcelas: 'Mensal', grupo_parcelamento: crypto.randomUUID()
                }]).select('*, categorias(nome)');
                if(nova) novasCriadas.push(nova[0]);
            }
        }
    }

    let allData = [...contasMes, ...novasCriadas];
    allData.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
    
    let tp=0, tpe=0;
    allData.forEach(i=>{if(i.pago){tp+=parseFloat(i.valor)}else{tpe+=parseFloat(i.valor)}});
    
    document.getElementById("totalPago").textContent=formatarReal(tp);
    document.getElementById("totalAPagar").textContent=formatarReal(tpe);
    
    if(allData.length===0){listaContas.innerHTML='<div class="ultimos-aviso">Nenhuma conta neste mês.</div>'}
    else{
        let h=`<table class="tabela-ultimos"><tbody>`;
        allData.forEach(i=>{
            const v=new Date(i.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR');
            const c=i.pago?'linha-paga':'linha-pendente';
            h+=`<tr class="${c}">
                <td style="width:30px;text-align:center"><input type="checkbox" class="check-pago" ${i.pago?'checked':''} onchange="togglePagoConta(${i.id}, ${i.pago})"></td>
                <td><strong>${i.descricao}</strong><br><small style="color:inherit;opacity:0.8">Venc: ${v}</small></td>
                <td class="col-valor">${formatarReal(i.valor)}</td>
                <td class="col-acoes">
                    <button class="btn-acao" onclick='editarConta(${JSON.stringify(i)})'>✏️</button>
                    <button class="btn-acao" onclick='excluirGasto(${i.id}, "${i.grupo_parcelamento}", ${i.parcelas === 'Mensal'})'>🗑️</button>
                </td>
            </tr>`
        });
        listaContas.innerHTML=h+`</tbody></table>`;
    }
}
document.getElementById("formLancamento").onsubmit=async(e)=>{
    e.preventDefault();if(enviando)return;
    const tipo = document.getElementById('tipoConta').value;
    const v=parseFloat(valConta.value.replace(',','.'));
    let q = parseInt(parcQtdConta.value) || 2;
    
    if(isNaN(v)||v<=0 || catConta.value==="" || !vencConta.value){msgConta.textContent="Preencha os dados.";return}
    
    enviando=true;btnSalvarConta.disabled=true;btnSalvarConta.textContent="Salvando...";
    try{
        if(editandoContaId) {
            const { data: itemAtual } = await supabaseClient.from('lancamentos').select('*').eq('id', editandoContaId).single();
            const db=new Date(vencConta.value+'T12:00:00');
            const grupoId = itemAtual.grupo_parcelamento || crypto.randomUUID();

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
                        await supabaseClient.from('lancamentos').update({categoria_id:parseInt(catConta.value),descricao:`${descConta.value.trim()} (${i+1}/${q})`,valor:v,data_vencimento:dp.toISOString().split('T')[0]}).eq('id', grupo[i].id);
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
                const{error}=await supabaseClient.from('lancamentos').insert([{user_id:usuarioLogado.id,categoria_id:parseInt(catConta.value),descricao:descConta.value.trim(),valor:v,data_vencimento:vencConta.value,pago:pagoConta.checked,parcelas:'Mensal',grupo_parcelamento:crypto.randomUUID()}]);
                if(error)throw error;
                mostrarPopupSucesso("Conta fixa registrada!");
            } else {
                const db=new Date(vencConta.value+'T12:00:00'),novos=[],grupoId=crypto.randomUUID();
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
    finally{enviando=false;btnSalvarConta.disabled=false;btnSalvarConta.textContent=editandoContaId ? "Salvar Alterações" : "Registrar Conta"}
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
    abrirPopupLancamento();
};

window.cancelarEdicaoConta = function() {
    editandoContaId = null;
    document.getElementById("formLancamento").reset();
    txtCatConta.textContent = "Selecione...";
    document.getElementById("vencConta").value = new Date().toISOString().split('T')[0];
    btnSalvarConta.textContent = "Registrar Conta";
    alternarTipo();
    fecharPopup('popupLancamento');
};

window.togglePagoConta=async function(id,status){
    await supabaseClient.from('lancamentos').update({pago:!status}).eq('id',id);
    carregarContas();
};

window.excluirGasto=async function(id,grupo, isFixo){
    if(!confirm("Tem certeza que deseja excluir?"))return;
    if(isFixo){
        const { data: item } = await supabaseClient.from('lancamentos').select('descricao').eq('id', id).single();
        if (item) {
            const nomeBase = item.descricao.replace(/\s\(Mensal\)$/, '');
            await supabaseClient.from('lancamentos').delete().like('descricao', `${nomeBase}%`).eq('parcelas', 'Mensal');
        }
    } else if(grupo && grupo !== 'undefined' && grupo !== null){
        await supabaseClient.from('lancamentos').delete().eq('grupo_parcelamento',grupo);
    } else {
        await supabaseClient.from('lancamentos').delete().eq('id',id);
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
    const valorTotal = parseFloat(document.getElementById('valorMeta').value.replace(',','.'));
    const imagem = document.getElementById('imagemMeta').value.trim();
    
    if(!nome || isNaN(valorTotal) || valorTotal <= 0){document.getElementById('msgMeta').textContent="Preencha o nome e o valor corretamente.";return}
    
    const btn = document.getElementById('btnSalvarMeta');
    btn.disabled = true; btn.textContent = "Salvando...";
    
    try {
        if (editandoMetaId) {
            const { error } = await supabaseClient.from('metas').update({nome: nome,valor_total: valorTotal,imagem_url: imagem}).eq('id', editandoMetaId);
            if (error) throw error;
            mostrarPopupSucesso("Meta atualizada!");
        } else {
            const { error } = await supabaseClient.from('metas').insert([{user_id: usuarioLogado.id,nome: nome,valor_total: valorTotal,valor_guardado: 0,imagem_url: imagem}]);
            if (error) throw error;
            mostrarPopupSucesso("Meta criada!");
        }
        editandoMetaId = null;
        document.getElementById("formMeta").reset();
        document.getElementById('btnSalvarMeta').textContent = "Salvar Meta";
        fecharPopup('popupMeta');
        carregarMetas();
    } catch(err) {
        document.getElementById('msgMeta').textContent = "Erro: " + err.message;
    } finally {
        btn.disabled = false; 
        btn.textContent = editandoMetaId ? "Salvar Alterações" : "Salvar Meta";
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
    const valorAdd = parseFloat(document.getElementById('valorGuardado').value.replace(',','.'));
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
        .order('data_gasto', { ascending: false });

    if (error) {
        console.error("Erro no Supabase:", error);
        return;
    }

    if (data.length === 0) {
        totalSpan.textContent = 'R$ 0,00';
    } else {
        let html = `<table class="tabela-ultimos"><tbody>`;
        let total = 0;

        data.forEach(gasto => {
            total += parseFloat(gasto.valor);
            
            // Se o valor for 0, ele deixa o campo do valor em branco na tela
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
                    <button class="btn-acao" style="color: #6b21a8; font-size: 12px; padding: 0; margin: 0 2px; min-height: auto; line-height: 1;" onclick="editarGastoPessoal(${gasto.id}, '${gasto.descricao}', ${gasto.valor})">✏️</button>
                    <button class="btn-acao" style="color: #6b21a8; font-size: 12px; padding: 0; margin: 0 2px; min-height: auto; line-height: 1;" onclick="excluirGastoPessoal(${gasto.id})">🗑️</button>
                </td>
            </tr>`;
        });

        lista.innerHTML = html + `</tbody></table>`;
        totalSpan.textContent = formatarReal(total);
    }
}

// Ajuste na função de Salvar para incluir a data de hoje automaticamente e retirar o input manual
document.getElementById("formGastoPessoal").onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById("descGastoPessoal").value.trim();
    const valorInput = document.getElementById("valGastoPessoal").value.trim();
    
    // Se o campo de valor estiver vazio, ele salva como 0
    const valor = valorInput === "" ? 0 : parseFloat(valorInput.replace(',', '.'));
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

// Ajuste na função de Editar (removemos o parâmetro data que não é mais usado na interface)
window.editarGastoPessoal = function(id, desc, valor) {
    idEditandoGastoPessoal = id;
    document.getElementById("descGastoPessoal").value = desc;
    document.getElementById("valGastoPessoal").value = valor.toString().replace('.', ',');
    
    const btn = document.querySelector('#formGastoPessoal button[type="submit"]');
    btn.textContent = "Salvar Alterações";
    
    document.getElementById("descGastoPessoal").focus();
};

// 5. Excluir Gasto Pessoal
window.excluirGastoPessoal = async function(id) {
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return;
    const { error } = await supabaseClient.from('gastos_pessoais').delete().eq('id', id);
    if (!error) carregarGastosPessoais();
};

// 6. Fechar Popups ao clicar fora
document.querySelectorAll('.popup-overlay').forEach(popup => {
    popup.addEventListener('click', function(e) {
        if (e.target === this) fecharPopup(this.id);
    });
});