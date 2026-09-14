from pathlib import Path
from datetime import datetime

BASE = Path('index.html')
if not BASE.exists():
    raise SystemExit('ERRO: index.html nao encontrado.')

text = BASE.read_text(encoding='utf-8')
backup = BASE.with_name(f'index_PRE_PATCH161_{datetime.now():%Y%m%d_%H%M%S}.html')
backup.write_text(text, encoding='utf-8')
print('BACKUP criado:', backup.name)

# ---------- 1) Tooltip dos graficos: caixa fixa, sem seguir o mouse ----------
style_marker = '<style id="patch161TooltipStyle">'
if style_marker not in text:
    block = '''<style id="patch161TooltipStyle">
#p120Area{position:relative!important;}
#p120Dica{position:absolute!important;right:12px!important;bottom:12px!important;left:auto!important;top:auto!important;z-index:30!important;pointer-events:none!important;display:none;box-sizing:border-box;min-width:190px;max-width:300px;padding:9px 12px!important;border:1px solid rgba(148,163,184,.35);border-radius:10px!important;background:rgba(15,23,42,.96)!important;color:#fff!important;font-size:.76rem!important;line-height:1.4!important;box-shadow:0 8px 24px rgba(0,0,0,.25)!important;}
#p120Dica b{display:block;font-size:.8rem;margin-bottom:3px;}
</style>
'''
    text = text.replace('</head>', block + '</head>', 1)

script_marker = '<script id="patch161TooltipFix">'
if script_marker not in text:
    script = '''<script id="patch161TooltipFix">
(function(){
  function ocultar(){
    var d=document.getElementById('p120Dica');
    if(d){d.style.display='none';d.setAttribute('aria-hidden','true');}
  }
  window.ocultarDicaP120=ocultar;
  window.dica=function(texto){
    var area=document.getElementById('p120Area');
    var d=document.getElementById('p120Dica');
    if(!d){d=document.createElement('div');d.id='p120Dica';}
    if(area && d.parentNode!==area){area.appendChild(d);}
    if(!texto){ocultar();return;}
    d.innerHTML=texto;
    d.style.display='block';
    d.setAttribute('aria-hidden','false');
  };
  document.addEventListener('click',function(ev){
    var area=document.getElementById('p120Area');
    if(!area || !area.contains(ev.target)){ocultar();}
  },true);
  document.addEventListener('pointerdown',function(ev){
    var area=document.getElementById('p120Area');
    if(!area || !area.contains(ev.target)){ocultar();}
  },true);
  document.addEventListener('mousemove',function(ev){
    var area=document.getElementById('p120Area');
    if(!area || !area.contains(ev.target)){ocultar();}
  },true);
  window.addEventListener('blur',ocultar);
  document.addEventListener('visibilitychange',ocultar);
  window.addEventListener('mouseout',function(ev){if(!ev.relatedTarget) ocultar();},true);
  try{
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){
        var area=document.getElementById('p120Area');
        var d=document.getElementById('p120Dica');
        if(d && (!area || !area.contains(d))) ocultar();
      });
      mo.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
  var ant=window.trocarAba;
  if(typeof ant==='function' && !ant.__patch161Tooltip){
    var nova=function(){ocultar();return ant.apply(this,arguments);};
    nova.__patch161Tooltip=true;
    window.trocarAba=nova;
  }
})();
</script>
'''
    text = text.replace('</body>', script + '</body>', 1)

# ---------- 2) Dados da Tarefa: data + layout ----------
old = '''                        <!-- Seção 1: Dados da Tarefa -->
                        <div class="lanc-section">
                            <div class="lanc-section-title">📝 Dados da Tarefa</div>
                            <div class="lanc-fields-row">
                                <div class="lanc-field lanc-field-wide">
                                    <label>Obra</label>
                                    <select id="inputLancObra"></select>
                                </div>
                                <div class="lanc-field lanc-field-wide">
                                    <label>Material Instalado</label>
                                    <input type="text" id="inputLancMaterial" placeholder="Ex: Porta, Janela...">
                                </div>
                                <div class="lanc-field">
                                    <label>Instalação M²</label>
                                    <input type="number" id="inputLancInstalacaoM2" step="0.01" min="0" placeholder="0,00">
                                </div>
                            </div>
                        </div>
'''
new = '''                        <!-- PATCH 161: Dados da Tarefa -->
                        <div class="lanc-section lanc-section-tarefa">
                            <div class="lanc-section-title">📝 Dados da Tarefa <span class="lanc-section-hint">identificação, data e metragem</span></div>
                            <div class="lanc-fields-row lanc-task-fields">
                                <div class="lanc-field">
                                    <label>Obra</label>
                                    <select id="inputLancObra"></select>
                                </div>
                                <div class="lanc-field">
                                    <label>Data da Tarefa</label>
                                    <input type="date" id="inputLancData" title="Data em que a instalação foi realizada">
                                </div>
                                <div class="lanc-field">
                                    <label>Material Instalado</label>
                                    <input type="text" id="inputLancMaterial" placeholder="Ex: Porta, Janela, Fachada...">
                                </div>
                                <div class="lanc-field">
                                    <label>Instalação M²</label>
                                    <input type="number" id="inputLancInstalacaoM2" step="0.01" min="0" placeholder="0,00">
                                </div>
                            </div>
                        </div>
'''
if old not in text:
    raise SystemExit('ERRO: Dados da Tarefa nao encontrado.')
text = text.replace(old,new,1)

# CSS appended so it is independent of previous payment styles.
css_marker = '<style id="patch161DadosTarefaStyle">'
if css_marker not in text:
    css = '''<style id="patch161DadosTarefaStyle">
.lanc-section-tarefa{border:1px solid var(--border,#dbe2ec)!important;border-radius:14px!important;background:var(--card-bg,#fff);padding:14px 16px!important;box-shadow:0 2px 8px rgba(15,23,42,.05);}
.lanc-section-tarefa .lanc-section-title{display:flex;align-items:center;gap:9px;font-size:.92rem;font-weight:800;margin-bottom:11px;}
.lanc-section-hint{margin-left:auto;font-size:.7rem;font-weight:600;color:var(--text-light,#64748b);}
.lanc-task-fields{display:grid!important;grid-template-columns:minmax(190px,1.1fr) minmax(145px,.65fr) minmax(230px,1.35fr) minmax(125px,.55fr)!important;gap:12px!important;align-items:end;}
.lanc-task-fields .lanc-field{min-width:0;}
.lanc-task-fields label{display:block;margin-bottom:5px;font-size:.72rem;font-weight:800;letter-spacing:.35px;text-transform:uppercase;color:var(--text-light,#64748b);}
.lanc-task-fields input,.lanc-task-fields select{width:100%;min-height:38px;box-sizing:border-box;border-radius:9px;border:1px solid var(--border,#dbe2ec);padding:8px 10px;background:var(--input-bg,#fff);color:var(--text,#0f172a);outline:none;}
.lanc-task-fields input:focus,.lanc-task-fields select:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.12);}
body.dark-mode .lanc-section-tarefa{background:#0f172a;border-color:#334155!important;}
body.dark-mode .lanc-task-fields input,body.dark-mode .lanc-task-fields select{background:#111827;color:#f8fafc;border-color:#334155;}
@media(max-width:900px){.lanc-task-fields{grid-template-columns:1fr 1fr!important;}.lanc-section-hint{display:none;}}
</style>
'''
    text = text.replace('</head>', css + '</head>', 1)

# ---------- 3) Data in manual launch ----------
old = """            function salvarLancamentoPgto() {
              const obraId = document.getElementById('inputLancObra').value;
              const m2 = parseFloat(document.getElementById('inputLancInstalacaoM2').value) || 0;
"""
new = """            function salvarLancamentoPgto() {
              const obraId = document.getElementById('inputLancObra').value;
              const dataInput = document.getElementById('inputLancData');
              const dataLancamento = dataInput && dataInput.value ? dataInput.value : new Date().toISOString().slice(0, 10);
              const mesLancamento = dataLancamento.substring(0, 7);
              const m2 = parseFloat(document.getElementById('inputLancInstalacaoM2').value) || 0;
"""
if old not in text: raise SystemExit('ERRO: salvarLancamentoPgto nao encontrado.')
text=text.replace(old,new,1)
old="""                data: new Date().toISOString().slice(0, 10),
                mesAnoKey: getChaveMesPgto(),"""
new="""                data: dataLancamento,
                mesAnoKey: mesLancamento,"""
if old not in text: raise SystemExit('ERRO: data do lancamento nao encontrada.')
text=text.replace(old,new,1)
old="""              document.getElementById('inputLancMaterial').value = '';
              document.getElementById('inputLancObra').selectedIndex = 0;"""
new="""              document.getElementById('inputLancMaterial').value = '';
              if (dataInput) { dataInput.value = new Date().toISOString().slice(0, 10); }
              document.getElementById('inputLancObra').selectedIndex = 0;"""
if old not in text: raise SystemExit('ERRO: limpeza do formulario nao encontrada.')
text=text.replace(old,new,1)

# ---------- 4) Date in edit modal ----------
old='''                        <div>\n                            <label style="font-size:0.82rem;font-weight:600;">Instalação M²</label>\n                            <input type="number" id="editLancInstalacaoM2" step="0.01" min="0" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;">\n                        </div>\n                        <div>\n                            <label style="font-size:0.82rem;font-weight:600;">Material</label>\n'''
new='''                        <div>\n                            <label style="font-size:0.82rem;font-weight:600;">Data da Tarefa</label>\n                            <input type="date" id="editLancData" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;">\n                        </div>\n                        <div>\n                            <label style="font-size:0.82rem;font-weight:600;">Instalação M²</label>\n                            <input type="number" id="editLancInstalacaoM2" step="0.01" min="0" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;">\n                        </div>\n                        <div>\n                            <label style="font-size:0.82rem;font-weight:600;">Material</label>\n'''
if old not in text: raise SystemExit('ERRO: modal de edicao nao encontrado.')
text=text.replace(old,new,1)
old="""              document.getElementById('editLancInstalacaoM2').value = lanc.instalacaoM2;
              document.getElementById('editLancMaterial').value = lanc.material;"""
new="""              document.getElementById('editLancInstalacaoM2').value = lanc.instalacaoM2;
              var editDataEl = document.getElementById('editLancData');
              if (editDataEl) { editDataEl.value = lanc.data || new Date().toISOString().slice(0, 10); }
              document.getElementById('editLancMaterial').value = lanc.material;"""
if old not in text: raise SystemExit('ERRO: preenchimento de edicao nao encontrado.')
text=text.replace(old,new,1)
old="""              lanc.instalacaoM2 = parseFloat(document.getElementById('editLancInstalacaoM2').value) || 0;
              lanc.material = document.getElementById('editLancMaterial').value.trim();"""
new="""              var editDataEl = document.getElementById('editLancData');
              if (editDataEl && editDataEl.value) {
                lanc.data = editDataEl.value;
                lanc.mesAnoKey = editDataEl.value.substring(0, 7);
              }
              lanc.instalacaoM2 = parseFloat(document.getElementById('editLancInstalacaoM2').value) || 0;
              lanc.material = document.getElementById('editLancMaterial').value.trim();"""
if old not in text: raise SystemExit('ERRO: salvamento de edicao nao encontrado.')
text=text.replace(old,new,1)

# ---------- 5) Default date on render ----------
old="""              autoImportarItensPgto();
              popularSelectsPgto();
            
              const label = formatarMesAnoPgto(pgtoMes, pgtoAno);"""
new="""              autoImportarItensPgto();
              popularSelectsPgto();
              var dataPgto = document.getElementById('inputLancData');
              if (dataPgto && !dataPgto.value) { dataPgto.value = new Date().toISOString().slice(0, 10); }
            
              const label = formatarMesAnoPgto(pgtoMes, pgtoAno);"""
if old not in text: raise SystemExit('ERRO: renderPagamento nao encontrado.')
text=text.replace(old,new,1)

# marker
if '<!-- PATCH 161: TOOLTIP FIX + DADOS DA TAREFA -->' not in text:
    text=text.replace('<body','<!-- PATCH 161: TOOLTIP FIX + DADOS DA TAREFA -->\n<body',1)

BASE.write_text(text,encoding='utf-8')
print('PATCH 161 aplicado com sucesso.')
print('Arquivo final:', BASE.name)
