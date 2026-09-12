
                /* ============================================================
                   CTM - CONTRAMARCO LIBERATION SYSTEM (Integrated)
                   ============================================================ */
                (function(){
                    // ---- DATA LAYER ----
                    function getObraCTM(){ return getObraAtual(); }
                    function getCTMSpecs(){
                        var obra = getObraCTM();
                        if(!obra) return [];
                        var specs = [];
                        var seenRefs = {};
                        obra.itens.forEach(function(item){
                            if(!seenRefs[item.ref]){
                                seenRefs[item.ref] = true;
                                specs.push({
                                    ref: item.ref,
                                    L: Math.round((item.larg||0)*1000),
                                    H: Math.round((item.alt||0)*1000),
                                    qty: item.qtd||0,
                                    type: item.tipo||'',
                                    hasBottom: item.hasBottom !== undefined ? item.hasBottom : true,
                                    ctmProfile: item.ctmProfile || 'largo'
                                });
                            } else {
                                var existing = specs.find(function(s){ return s.ref === item.ref; });
                                if(existing) existing.qty += (item.qtd||0);
                            }
                        });
                        if(obra.ctmExtraSpecs && obra.ctmExtraSpecs.length){
                            obra.ctmExtraSpecs.forEach(function(es){
                                if(!seenRefs[es.ref]){
                                    seenRefs[es.ref] = true;
                                    specs.push(es);
                                }
                            });
                        }
                        return specs;
                    }
                    function getCTMLogs(){ var obra = getObraCTM(); return obra ? (obra.ctmLogs||[]) : []; }
                    function getReleasedQtyForRefCTM(ref){
                        var logs = getCTMLogs();
                        var total = 0;
                        logs.forEach(function(l){ if(l.ref === ref && l.status === 'APROVADO') total += l.qty; });
                        return total;
                    }
                    function syncCTMToItemFem(ref){
                        var obra = getObraCTM();
                        if(!obra) return;
                        var released = getReleasedQtyForRefCTM(ref);
                        obra.itens.forEach(function(item){
                            if(item.ref === ref){ item.fem = released; }
                        });
                        salvarDB();
                    }
                    function escapeH(t){ return typeof t === 'string' ? escaparHTML(t) : t; }
                    function fmtDate(d){ var dt = new Date(d); return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); }
                
                    // ---- DASHBOARD ----
                    window.renderCTMDashboard = function(){
                        var specs = getCTMSpecs(), logs = getCTMLogs();
                        var totalQty = 0, totalReleased = 0;
                        specs.forEach(function(s){ totalQty += s.qty; });
                        var refSet = {};
                        logs.forEach(function(l){ if(l.status === 'APROVADO' && !refSet[l.ref + l.scope]){ totalReleased += l.qty; refSet[l.ref + l.scope] = true; }});
                        var pct = totalQty > 0 ? Math.round((totalReleased / totalQty) * 100) : 0;
                        document.getElementById('totalReleasedQty').textContent = totalReleased + ' peças';
                        document.getElementById('totalPendingQty').textContent = (totalQty - totalReleased) + ' peças';
                        document.getElementById('approvalRate').textContent = pct + '%';
                        document.getElementById('progressBar').style.width = pct + '%';
                        renderCTMSpecsTable();
                        renderCTMHistoryTable();
                        populateCTMRefSelect();
                        populateTypeFilterCTM();
                    };
                
                    // ---- MODE SWITCH ----
                    window.switchCTMMode = function(mode){
                        document.getElementById('ctmModeIndividual').style.opacity = mode === 'individual' ? '1' : '0.5';
                        document.getElementById('ctmModeBulk').style.opacity = mode === 'bulk' ? '1' : '0.5';
                        document.getElementById('ctmIndividualSection').style.display = mode === 'individual' ? 'block' : 'none';
                        document.getElementById('ctmBulkSection').style.display = mode === 'bulk' ? 'block' : 'none';
                        if(mode === 'bulk') renderBulkItemsCTM();
                    };
                
                    // ---- POPULATE REFS ----
                    function populateCTMRefSelect(){
                        var sel = document.getElementById('refSelectCTM');
                        if(!sel) return;
                        var specs = getCTMSpecs();
                        var cur = sel.value;
                        sel.innerHTML = '<option value="">-- Selecione --</option>';
                        specs.forEach(function(s){ var o = document.createElement('option'); o.value = s.ref; o.textContent = s.ref + ' (' + s.type + ')'; sel.appendChild(o); });
                        if(cur) sel.value = cur;
                    }
                    function populateTypeFilterCTM(){
                        var sel = document.getElementById('typeFilter');
                        if(!sel) return;
                        var specs = getCTMSpecs(), types = {};
                        specs.forEach(function(s){ types[s.type] = true; });
                        var cur = sel.value;
                        sel.innerHTML = '<option value="">Tipologias</option>';
                        Object.keys(types).sort().forEach(function(t){ var o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
                        if(cur) sel.value = cur;
                    }
                
                    // ---- REF CHANGE ----
                    window.onCTMRefChange = function(){
                        var ref = document.getElementById('refSelectCTM').value;
                        var specs = getCTMSpecs();
                        var spec = specs.find(function(s){ return s.ref === ref; });
                        if(spec){
                            document.getElementById('ctmProjectedInfo').innerHTML =
                                'Projeto: <b>' + spec.L + 'mm × ' + spec.H + 'mm</b> | Tipo: ' + escapeH(spec.type) +
                                ' | Qtd Total: ' + spec.qty + ' | Lib: ' + getReleasedQtyForRefCTM(ref) +
                                ' | Saldo: ' + (spec.qty - getReleasedQtyForRefCTM(ref)) +
                                ' | Estrutura: ' + (spec.hasBottom ? '4 lados' : '3 lados') +
                                ' | Modelo: <b style="color:#ff7b00;">[' + (spec.ctmProfile === 'estreito' ? 'ESTREITO' : 'LARGO') + ']</b>';
                            var mType = document.getElementById('measureType').value;
                            var pL = spec.L, pH = spec.H;
                            if(mType === 'fora'){ pL += 28; pH += 28; }
                            else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                            document.getElementById('realL').placeholder = pL;
                            document.getElementById('realH').placeholder = pH;
                
                            // Auto-fill from last ctmLogs entry for this ref
                            (function(){
                                var logs = getCTMLogs();
                                var lastLog = null;
                                for(var i = logs.length - 1; i >= 0; i--){
                                    if(logs[i].ref === ref){ lastLog = logs[i]; break; }
                                }
                                if(lastLog){
                                    document.getElementById('realL').value = lastLog.realL || '';
                                    document.getElementById('realH').value = lastLog.realH || '';
                                    document.getElementById('diag1').value = lastLog.diag1 || '';
                                    document.getElementById('diag2').value = lastLog.diag2 || '';
                                    if(lastLog.location) document.getElementById('location').value = lastLog.location;
                                    if(lastLog.inspector) document.getElementById('inspector').value = lastLog.inspector;
                                }
                            })();
                
                            drawCADCanvasCTM();
                        } else {
                            document.getElementById('ctmProjectedInfo').innerHTML = '';
                        }
                        checkCTMRelease();
                    };
                
                    // ---- CHECK RELEASE ----
                    window.checkCTMRelease = function(){
                        var ref = document.getElementById('refSelectCTM').value;
                        var specs = getCTMSpecs();
                        var spec = specs.find(function(s){ return s.ref === ref; });
                        if(!ref || !spec){ updateCTMStatus('AGUARDANDO MEDIÇÃO', '#999', ''); return; }
                        var rL = parseFloat(document.getElementById('realL').value);
                        var rH = parseFloat(document.getElementById('realH').value);
                        var d1 = parseFloat(document.getElementById('diag1').value);
                        var d2 = parseFloat(document.getElementById('diag2').value);
                        if(isNaN(rL) || isNaN(rH)){ updateCTMStatus('AGUARDANDO MEDIÇÃO', '#999', ''); return; }
                        var mType = document.getElementById('measureType').value;
                        var pL = spec.L, pH = spec.H;
                        if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                        var difL = Math.abs(rL - pL), difH = Math.abs(rH - pH);
                        var tol = parseFloat(document.getElementById('diagonalTolerance').value) || 3;
                        var diagDiff = (!isNaN(d1) && !isNaN(d2)) ? Math.abs(d1 - d2) : 0;
                        var okL = difL <= tol, okH = difH <= tol, okD = diagDiff <= tol;
                        var allOk = okL && okH && okD;
                        var status = allOk ? 'APROVADO' : 'REPROVADO';
                        var color = allOk ? '#27ae60' : '#e74c3c';
                        var details = 'ΔL=' + difL.toFixed(1) + 'mm' + (okL ? '✓' : '✗') + ' ΔH=' + difH.toFixed(1) + 'mm' + (okH ? '✓' : '✗');
                        if(!isNaN(d1) && !isNaN(d2)) details += ' ΔDiag=' + diagDiff.toFixed(1) + 'mm' + (okD ? '✓' : '✗');
                        updateCTMStatus(status, color, details);
                        drawCADCanvasCTM();
                    };
                    function updateCTMStatus(text, color, details){
                        var st = document.getElementById('ctmStatusText');
                        var sd = document.getElementById('ctmStatusDetails');
                        var box = document.getElementById('ctmStatusBox');
                        st.textContent = text; st.style.color = color;
                        sd.textContent = details || '';
                        box.style.border = '2px solid ' + color;
                    }
                
                    // ---- SAVE VERIFICATION ----
                    window.saveVerificationCTM = function(){
                        var ref = document.getElementById('refSelectCTM').value;
                        var specs = getCTMSpecs();
                        var spec = specs.find(function(s){ return s.ref === ref; });
                        if(!ref || !spec){ alert('Selecione uma referência.'); return; }
                        var rL = parseFloat(document.getElementById('realL').value);
                        var rH = parseFloat(document.getElementById('realH').value);
                        if(isNaN(rL) || isNaN(rH)){ alert('Insira medições.'); return; }
                        var mType = document.getElementById('measureType').value;
                        var pL = spec.L, pH = spec.H;
                        if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                        var difL = Math.abs(rL - pL), difH = Math.abs(rH - pH);
                        var tol = parseFloat(document.getElementById('diagonalTolerance').value) || 3;
                        var d1 = parseFloat(document.getElementById('diag1').value);
                        var d2 = parseFloat(document.getElementById('diag2').value);
                        var diagDiff = (!isNaN(d1) && !isNaN(d2)) ? Math.abs(d1 - d2) : 0;
                        var okL = difL <= tol, okH = difH <= tol, okD = diagDiff <= tol;
                        var status = (okL && okH && okD) ? 'APROVADO' : 'REPROVADO';
                        var qty = parseInt(document.getElementById('releaseQty').value) || 1;
                        var scope = document.getElementById('scopeSelect').value;
                        var released = getReleasedQtyForRefCTM(ref);
                        var remaining = spec.qty - released;
                        if(status === 'APROVADO' && qty > remaining){
                            if(!confirm('Qtd liberada (' + qty + ') excede saldo (' + remaining + '). Continuar?')) return;
                        }
                        var obra = getObraCTM();
                        if(!obra.ctmLogs) obra.ctmLogs = [];
                        obra.ctmLogs.push({
                            id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            date: new Date().toISOString(),
                            location: escapeH(document.getElementById('location').value),
                            ref: escapeH(ref),
                            scope: scope, qty: qty,
                            measureType: mType,
                            projectedL: pL, projectedH: pH,
                            realL: rL, realH: rH,
                            diag1: isNaN(d1) ? null : d1, diag2: isNaN(d2) ? null : d2,
                            difL: difL.toFixed(1), difH: difH.toFixed(1), difDiag: diagDiff.toFixed(1),
                            status: status,
                            inspector: escapeH(document.getElementById('inspector').value),
                            notes: escapeH(document.getElementById('ctmNotes').value),
                            hasBottom: spec.hasBottom, ctmProfile: spec.ctmProfile
                        });
                        salvarDB();
                        if(status === 'APROVADO') syncCTMToItemFem(ref);
                        resetCTMForm();
                        renderCTMDashboard();
                        alert('Liberação registrada: ' + status);
                    };
                
                    // ---- RESET ----
                    window.resetCTMForm = function(){
                        document.getElementById('refSelectCTM').value = '';
                        document.getElementById('measureType').value = 'base';
                        document.getElementById('realL').value = '';
                        document.getElementById('realH').value = '';
                        document.getElementById('diag1').value = '';
                        document.getElementById('diag2').value = '';
                        document.getElementById('releaseQty').value = '1';
                        document.getElementById('scopeSelect').value = 'full';
                        document.getElementById('location').value = '';
                        document.getElementById('inspector').value = '';
                        document.getElementById('ctmNotes').value = '';
                        document.getElementById('ctmProjectedInfo').innerHTML = '';
                        updateCTMStatus('AGUARDANDO MEDIÇÃO', '#999', '');
                        drawCADCanvasCTM();
                    };
                
                    // ---- SCOPE INPUTS TOGGLE ----
                    window.toggleScopeInputsCTM = function(){ drawCADCanvasCTM(); };
                
                    // ---- BULK LIBERATION ----
                    window.renderBulkItemsCTM = function(){
                        var specs = getCTMSpecs();
                        var container = document.getElementById('bulkItemsListCTM');
                        if(!container) return;
                        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">';
                        specs.forEach(function(s, i){
                            var released = getReleasedQtyForRefCTM(s.ref);
                            var remaining = s.qty - released;
                            var pct = s.qty > 0 ? Math.round((released / s.qty) * 100) : 0;
                            var statusColor = pct >= 100 ? '#27ae60' : pct > 0 ? '#ff7b00' : '#e74c3c';
                            html += '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px;">';
                            html += '<label style="display:flex;align-items:center;gap:6px;color:#fff;font-size:12px;">';
                            html += '<input type="checkbox" class="bulk-chk-ctm" data-ref="' + escapeH(s.ref) + '" data-idx="' + i + '"> ';
                            html += '<b>' + escapeH(s.ref) + '</b> (' + titleCase(s.type) + ')</label>';
                            html += '<div style="font-size:10px;color:#999;margin-top:4px;">L:' + s.L + ' H:' + s.H + ' | Lib:' + released + '/' + s.qty + ' | Saldo:' + remaining + '</div>';
                            html += '<div style="height:3px;background:#1a1a2e;border-radius:2px;margin-top:4px;"><div style="height:100%;background:' + statusColor + ';width:' + pct + '%;border-radius:2px;"></div></div>';
                            html += '</div>';
                        });
                        html += '</div>';
                        container.innerHTML = html;
                    };
                    window.toggleSelectAllBulkCTM = function(){
                        var chks = document.querySelectorAll('.bulk-chk-ctm');
                        var allChecked = true;
                        chks.forEach(function(c){ if(!c.checked) allChecked = false; });
                        chks.forEach(function(c){ c.checked = !allChecked; });
                    };
                    window.executeBulkReleaseCTM = function(){
                        var chks = document.querySelectorAll('.bulk-chk-ctm:checked');
                        if(chks.length === 0){ alert('Selecione itens.'); return; }
                        var loc = escapeH(document.getElementById('bulkLocation').value);
                        var insp = escapeH(document.getElementById('bulkInspector').value);
                        var mType = document.getElementById('bulkMeasureType').value;
                        var specs = getCTMSpecs();
                        var obra = getObraCTM();
                        if(!obra.ctmLogs) obra.ctmLogs = [];
                        var count = 0;
                        chks.forEach(function(chk){
                            var ref = chk.getAttribute('data-ref');
                            var spec = specs.find(function(s){ return s.ref === ref; });
                            if(!spec) return;
                            var pL = spec.L, pH = spec.H;
                            if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                            obra.ctmLogs.push({
                                id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                                date: new Date().toISOString(),
                                location: loc, ref: ref, scope: 'full',
                                qty: spec.qty - getReleasedQtyForRefCTM(ref),
                                measureType: mType,
                                projectedL: pL, projectedH: pH,
                                realL: pL, realH: pH, diag1: null, diag2: null,
                                difL: '0.0', difH: '0.0', difDiag: '0.0',
                                status: 'APROVADO', inspector: insp, notes: 'Liberação em lote',
                                hasBottom: spec.hasBottom, ctmProfile: spec.ctmProfile
                            });
                            syncCTMToItemFem(ref);
                            count++;
                        });
                        salvarDB();
                        renderCTMDashboard();
                        alert(count + ' referências liberadas em lote!');
                    };
                
                    // ---- SPECS TABLE ----
                    function renderCTMSpecsTable(){
                        var specs = getCTMSpecs();
                        var search = (document.getElementById('searchInput') || {}).value || '';
                        var typeF = (document.getElementById('typeFilter') || {}).value || '';
                        var statusF = (document.getElementById('statusFilter') || {}).value || '';
                        var tbody = document.getElementById('specTableBodyCTM');
                        if(!tbody) return;
                        var html = '';
                        specs.forEach(function(s, i){
                            if(search && !s.ref.toLowerCase().includes(search.toLowerCase())) return;
                            if(typeF && s.type !== typeF) return;
                            var released = getReleasedQtyForRefCTM(s.ref);
                            var remaining = s.qty - released;
                            var pct = s.qty > 0 ? Math.round((released / s.qty) * 100) : 0;
                            var statusText = pct >= 100 ? 'CONCLUÍDO' : pct > 0 ? 'EM ANDAMENTO' : 'PENDENTE';
                            if(statusF && statusText !== statusF) return;
                            var statusColor = pct >= 100 ? '#27ae60' : pct > 0 ? '#ff7b00' : '#e74c3c';
                            html += '<tr style="border-bottom:1px solid #222;">';
                            html += '<td style="padding:4px;"><input type="checkbox" class="spec-chk-ctm" data-ref="' + escapeH(s.ref) + '"></td>';
                            html += '<td style="padding:4px;color:#ff7b00;font-weight:600;">' + escapeH(s.ref) + '</td>';
                            html += '<td style="padding:4px;text-align:center;">' + escapeH(s.type) + '</td>';
                            html += '<td style="padding:4px;text-align:center;">' + s.L + '</td>';
                            html += '<td style="padding:4px;text-align:center;">' + s.H + '</td>';
                            html += '<td style="padding:4px;text-align:center;">' + (s.hasBottom ? '4' : '3') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;color:' + (s.ctmProfile === 'estreito' ? '#ff7b00' : '#27ae60') + ';font-weight:600;">' + (s.ctmProfile === 'estreito' ? 'ESTREITO' : 'LARGO') + '</td>';
                            html += '<td style="padding:4px;text-align:center;">' + s.qty + '</td>';
                            html += '<td style="padding:4px;text-align:center;color:#27ae60;">' + released + '</td>';
                            html += '<td style="padding:4px;text-align:center;color:#e74c3c;">' + remaining + '</td>';
                            html += '<td style="padding:4px;text-align:center;"><span style="color:' + statusColor + ';font-weight:600;font-size:10px;">' + statusText + '</span></td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">';
                            html += '<button onclick="editSpecCTM(' + i + ')" style="background:none;border:none;color:#ff7b00;cursor:pointer;margin-right:2px;">✏️</button>';
                            html += '<button onclick="deleteSpecCTM(\'' + escapeH(s.ref) + '\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;">🗑️</button>';
                            html += '</td></tr>';
                        });
                        tbody.innerHTML = html;
                    }
                
                    // ---- FILTERS ----
                    window.applyFiltersCTM = function(){ renderCTMSpecsTable(); };
                    window.toggleSelectAllSpecsCTM = function(){
                        var chks = document.querySelectorAll('.spec-chk-ctm');
                        var allOn = true;
                        chks.forEach(function(c){ if(!c.checked) allOn = false; });
                        chks.forEach(function(c){ c.checked = !allOn; });
                    };
                    window.deleteSelectedSpecsCTM = function(){
                        var chks = document.querySelectorAll('.spec-chk-ctm:checked');
                        if(chks.length === 0){ alert('Selecione itens.'); return; }
                        if(!confirm('Excluir ' + chks.length + ' especificações?')) return;
                        var obra = getObraCTM();
                        var toDelete = [];
                        chks.forEach(function(c){ toDelete.push(c.getAttribute('data-ref')); });
                        // Remove from ctmExtraSpecs
                        if(obra.ctmExtraSpecs){
                            obra.ctmExtraSpecs = obra.ctmExtraSpecs.filter(function(es){ return toDelete.indexOf(es.ref) === -1; });
                        }
                        // Remove ctmLogs for these refs
                        if(obra.ctmLogs){
                            obra.ctmLogs = obra.ctmLogs.filter(function(l){ return toDelete.indexOf(l.ref) === -1; });
                        }
                        salvarDB();
                        renderCTMDashboard();
                    };
                
                    // ---- SPECS TABLE ACTIONS ----
                    window.editSpecCTM = function(idx){
                        var specs = getCTMSpecs();
                        var spec = specs[idx];
                        if(!spec) return;
                        openEditModalCTM(spec);
                    };
                    window.deleteSpecCTM = function(ref){
                        if(!confirm('Excluir especificação e histórico de "' + ref + '"?')) return;
                        var obra = getObraCTM();
                        if(obra.ctmExtraSpecs){
                            obra.ctmExtraSpecs = obra.ctmExtraSpecs.filter(function(es){ return es.ref !== ref; });
                        }
                        if(obra.ctmLogs){
                            obra.ctmLogs = obra.ctmLogs.filter(function(l){ return l.ref !== ref; });
                        }
                        salvarDB();
                        renderCTMDashboard();
                    };
                
                    // ---- HISTORY ----
                    function renderCTMHistoryTable(){
                        var logs = getCTMLogs();
                        var tbody = document.getElementById('historyTableBodyCTM');
                        if(!tbody) return;
                        var html = '';
                        logs.forEach(function(l, i){
                            var statusColor = l.status === 'APROVADO' ? '#27ae60' : '#e74c3c';
                            html += '<tr style="border-bottom:1px solid #222;">';
                            html += '<td style="padding:4px;"><input type="checkbox" class="hist-chk-ctm" data-idx="' + i + '"></td>';
                            html += '<td style="padding:4px;font-size:10px;">' + fmtDate(l.date) + '</td>';
                            html += '<td style="padding:4px;font-size:10px;">' + escapeH(l.location || '') + '</td>';
                            html += '<td style="padding:4px;font-size:10px;color:#ff7b00;">' + escapeH(l.ref) + '</td>';
                            html += '<td style="padding:4px;font-size:10px;">' + escapeH(l.scope || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + l.qty + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.measureType || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.realL || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.realH || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.difL || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.difH || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;font-size:10px;">' + (l.difDiag || '') + '</td>';
                            html += '<td style="padding:4px;text-align:center;"><span style="color:' + statusColor + ';font-weight:600;font-size:10px;">' + l.status + '</span></td>';
                            html += '<td style="padding:4px;font-size:10px;">' + escapeH(l.inspector || '') + '</td>';
                            html += '<td style="padding:4px;"><button onclick="deleteHistoryEntryCTM(' + i + ')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:10px;">🗑️</button></td>';
                            html += '</tr>';
                        });
                        tbody.innerHTML = html;
                    }
                    window.deleteHistoryEntryCTM = function(idx){
                        if(!confirm('Excluir este registro?')) return;
                        var obra = getObraCTM();
                        if(!obra.ctmLogs || idx >= obra.ctmLogs.length) return;
                        var ref = obra.ctmLogs[idx].ref;
                        obra.ctmLogs.splice(idx, 1);
                        salvarDB();
                        syncCTMToItemFem(ref);
                        renderCTMDashboard();
                    };
                    window.toggleSelectAllHistoryCTM = function(){
                        var chks = document.querySelectorAll('.hist-chk-ctm');
                        var allOn = true;
                        chks.forEach(function(c){ if(!c.checked) allOn = false; });
                        chks.forEach(function(c){ c.checked = !allOn; });
                        var chk1 = document.getElementById('selectAllHistoryChk');
                        var chk2 = document.getElementById('selectAllHistoryChk2');
                        if(chk1) chk1.checked = !allOn;
                        if(chk2) chk2.checked = !allOn;
                    };
                    window.deleteSelectedHistoryCTM = function(){
                        var chks = document.querySelectorAll('.hist-chk-ctm:checked');
                        if(chks.length === 0){ alert('Selecione registros.'); return; }
                        if(!confirm('Excluir ' + chks.length + ' registros?')) return;
                        var obra = getObraCTM();
                        if(!obra.ctmLogs) return;
                        var indices = [];
                        chks.forEach(function(c){ indices.push(parseInt(c.getAttribute('data-idx'))); });
                        indices.sort(function(a, b){ return b - a; });
                        var affectedRefs = {};
                        indices.forEach(function(idx){
                            if(idx < obra.ctmLogs.length){
                                affectedRefs[obra.ctmLogs[idx].ref] = true;
                                obra.ctmLogs.splice(idx, 1);
                            }
                        });
                        salvarDB();
                        Object.keys(affectedRefs).forEach(function(ref){ syncCTMToItemFem(ref); });
                        renderCTMDashboard();
                    };
                
                    // ---- CAD CANVAS ----
                    window.drawCADCanvasCTM = function(){
                        var canvas = document.getElementById('cadCanvas');
                        if(!canvas) return;
                        var ctx = canvas.getContext('2d');
                        var W = canvas.width, H = canvas.height;
                        ctx.clearRect(0, 0, W, H);
                        ctx.fillStyle = '#121212';
                        ctx.fillRect(0, 0, W, H);
                        var ref = document.getElementById('refSelectCTM').value;
                        var specs = getCTMSpecs();
                        var spec = specs.find(function(s){ return s.ref === ref; });
                        if(!spec){
                            ctx.fillStyle = '#666';
                            ctx.font = '14px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('Selecione um item', W/2, H/2);
                            return;
                        }
                        var scope = document.getElementById('scopeSelect').value;
                        var mType = document.getElementById('measureType').value;
                        var pL = spec.L, pH = spec.H;
                        if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                        var hasBottom = spec.hasBottom;
                        var profile = spec.ctmProfile;
                        var scale = Math.min((W - 100) / pL, (H - 80) / pH);
                        var frameW = pL * scale, frameH = pH * scale;
                        var ox = (W - frameW) / 2, oy = (H - frameH) / 2;
                        var profW = profile === 'estreito' ? 20 : 33;
                        var profScale = profW * scale;
                        // Draw outer frame (contramarco)
                        ctx.strokeStyle = '#ff7b00';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(ox, oy, frameW, frameH);
                        // Draw profile sections
                        ctx.fillStyle = 'rgba(255,123,0,0.15)';
                        // Top
                        ctx.fillRect(ox, oy, frameW, profScale);
                        // Left
                        ctx.fillRect(ox, oy, profScale, frameH);
                        // Right
                        ctx.fillRect(ox + frameW - profScale, oy, profScale, frameH);
                        // Bottom (if has)
                        if(hasBottom && scope !== 'top'){
                            ctx.fillRect(ox, oy + frameH - profScale, frameW, profScale);
                        }
                        // Scope highlighting
                        if(scope === 'partial'){
                            ctx.fillStyle = 'rgba(255,123,0,0.3)';
                            ctx.fillRect(ox, oy, profScale, frameH);
                            ctx.fillRect(ox + frameW - profScale, oy, profScale, frameH);
                        } else if(scope === 'top'){
                            ctx.fillStyle = 'rgba(39,174,96,0.3)';
                            ctx.fillRect(ox, oy, frameW, profScale);
                        } else if(scope === 'bottom' && hasBottom){
                            ctx.fillStyle = 'rgba(39,174,96,0.3)';
                            ctx.fillRect(ox, oy + frameH - profScale, frameW, profScale);
                        }
                        // Draw inner frame (esquadria)
                        ctx.strokeStyle = '#4a9eff';
                        ctx.lineWidth = 1.5;
                        var innerOx = ox + profScale, innerOy = oy + profScale;
                        var innerW = frameW - 2 * profScale, innerH = frameH - 2 * profScale;
                        if(hasBottom) innerH -= profScale; else innerH -= profScale;
                        ctx.strokeRect(innerOx, innerOy, innerW, innerH);
                        // Dimensions
                        ctx.fillStyle = '#fff';
                        ctx.font = '12px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(pL + 'mm', ox + frameW / 2, oy - 8);
                        ctx.save();
                        ctx.translate(ox - 8, oy + frameH / 2);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText(pH + 'mm', 0, 0);
                        ctx.restore();
                        // Real measurements (if entered)
                        var rL = parseFloat(document.getElementById('realL').value);
                        var rH = parseFloat(document.getElementById('realH').value);
                        if(!isNaN(rL)){
                            ctx.fillStyle = '#27ae60';
                            ctx.font = '10px monospace';
                            ctx.fillText('R:' + rL + 'mm', ox + frameW / 2, oy + frameH + 16);
                        }
                        if(!isNaN(rH)){
                            ctx.fillStyle = '#27ae60';
                            ctx.font = '10px monospace';
                            ctx.save();
                            ctx.translate(ox + frameW + 10, oy + frameH / 2);
                            ctx.rotate(-Math.PI / 2);
                            ctx.fillText('R:' + rH + 'mm', 0, 0);
                            ctx.restore();
                        }
                        // Diagonals (if entered)
                        var d1 = parseFloat(document.getElementById('diag1').value);
                        var d2 = parseFloat(document.getElementById('diag2').value);
                        if(!isNaN(d1) && !isNaN(d2)){
                            ctx.strokeStyle = '#999';
                            ctx.lineWidth = 0.5;
                            ctx.setLineDash([4, 4]);
                            ctx.beginPath();
                            ctx.moveTo(ox + profScale, oy + profScale);
                            ctx.lineTo(ox + frameW - profScale, oy + frameH - profScale);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(ox + frameW - profScale, oy + profScale);
                            ctx.lineTo(ox + profScale, oy + frameH - profScale);
                            ctx.stroke();
                            ctx.setLineDash([]);
                        }
                        // Labels
                        ctx.fillStyle = '#ff7b00';
                        ctx.font = '11px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.fillText('CTM: ' + escapeH(ref) + ' | ' + tc(spec.type), 8, H - 8);
                        ctx.fillText('Escopo: ' + scope + ' | Modelo: ' + profile, 8, H - 22);
                    };
                
                    // ---- DXF EXPORT (SINGLE) ----
                    window.downloadDXFCTM = function(){
                        var ref = document.getElementById('refSelectCTM').value;
                        var specs = getCTMSpecs();
                        var spec = specs.find(function(s){ return s.ref === ref; });
                        if(!spec){ alert('Selecione um item.'); return; }
                        var scope = document.getElementById('scopeSelect').value;
                        var mType = document.getElementById('measureType').value;
                        var pL = spec.L, pH = spec.H;
                        if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                        var profW = spec.ctmProfile === 'estreito' ? 20 : 33;
                        var dxf = generateDXFContentCTM(ref, spec.type, pL, pH, profW, spec.hasBottom, scope);
                        var blob = new Blob([dxf], {type: 'application/dxf'});
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a'); a.href = url; a.download = 'CTM_' + ref + '.dxf'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    // ---- DXF ENTITIES-ONLY (with offset + TEXT metadata) ----
                    function generateDXFEntitiesCTM(ref, type, L, H, profW, hasBottom, scope, offsetX, offsetY){
                        var lines = [];
                        L = Number(L); H = Number(H); profW = Number(profW); offsetX = Number(offsetX) || 0; offsetY = Number(offsetY) || 0;
                        if(!Number.isFinite(L) || !Number.isFinite(H) || L <= 0 || H <= 0){ return lines; }
                        if(!Number.isFinite(profW) || profW <= 0){ profW = 33; }
                        var releasedQty = Number(arguments[10] || 0);
                        var GREEN = 3, RED = 1, BLACK = 7;
                        function line(layer, x1, y1, x2, y2, color){
                            lines.push('0','LINE','8',layer,'62',String(color),'10',String(x1),'20',String(y1),'11',String(x2),'21',String(y2));
                        }
                        function text(layer, value, x, y, height, color, center, rotation){
                            /* DXF R12: códigos em ordem compatível e texto sem quebras de linha. */
                            value = String(value == null ? '' : value).replace(/[\\r\\n]+/g, ' ');
                            x = Number(x) || 0; y = Number(y) || 0; height = Number(height) || 1;
                            lines.push('0','TEXT','8',layer,'62',String(color),'10',String(x),'20',String(y),'40',String(height));
                            if(center){ lines.push('72','1','11',String(x),'21',String(y),'73','0'); }
                            if(Number.isFinite(Number(rotation))){ lines.push('50',String(rotation)); }
                            lines.push('1',value);
                        }
                        function hdim(x1, x2, y, label){
                            var a = Math.max(H * 0.08, 80);
                            line('CTM_DIM', x1, offsetY, x1, y, RED); line('CTM_DIM', x2, offsetY, x2, y, RED); line('CTM_DIM', x1, y, x2, y, RED);
                            line('CTM_DIM', x1, y, x1+a, y+a*.35, RED); line('CTM_DIM', x1, y, x1+a, y-a*.35, RED);
                            line('CTM_DIM', x2, y, x2-a, y+a*.35, RED); line('CTM_DIM', x2, y, x2-a, y-a*.35, RED);
                            text('CTM_DIM', label, (x1+x2)/2, y+Math.max(H*.045,55), Math.max(H*.035,45), RED, true);
                        }
                        function vdim(y1, y2, x, label){
                            var a = Math.max(L * 0.08, 80);
                            line('CTM_DIM', offsetX, y1, x, y1, RED); line('CTM_DIM', offsetX, y2, x, y2, RED); line('CTM_DIM', x, y1, x, y2, RED);
                            line('CTM_DIM', x, y1, x+a*.35, y1+a, RED); line('CTM_DIM', x, y1, x-a*.35, y1+a, RED);
                            line('CTM_DIM', x, y2, x+a*.35, y2-a, RED); line('CTM_DIM', x, y2, x-a*.35, y2-a, RED);
                            text('CTM_DIM', label, x-Math.max(L*.04,45), (y1+y2)/2, Math.max(H*.035,45), RED, true, 90);
                        }
                        var pw = Number(profW) || 33;
                        var innerL = L - 2*pw, innerH = hasBottom ? H - 2*pw : H-pw;
                        line('CTM_GREEN', offsetX, offsetY, offsetX+L, offsetY, GREEN); line('CTM_GREEN', offsetX+L, offsetY, offsetX+L, offsetY+H, GREEN);
                        line('CTM_GREEN', offsetX+L, offsetY+H, offsetX, offsetY+H, GREEN); line('CTM_GREEN', offsetX, offsetY+H, offsetX, offsetY, GREEN);
                        if(innerL > 0 && innerH > 0){
                            line('CTM_GREEN', offsetX+pw, offsetY+pw, offsetX+pw+innerL, offsetY+pw, GREEN); line('CTM_GREEN', offsetX+pw+innerL, offsetY+pw, offsetX+pw+innerL, offsetY+pw+innerH, GREEN);
                            line('CTM_GREEN', offsetX+pw+innerL, offsetY+pw+innerH, offsetX+pw, offsetY+pw+innerH, GREEN); line('CTM_GREEN', offsetX+pw, offsetY+pw+innerH, offsetX+pw, offsetY+pw, GREEN);
                        }
                        var gap = Math.max(H*.18, 220), cx = offsetX+L/2, th = Math.max(H*.045,55);
                        hdim(offsetX, offsetX+L, offsetY-gap, 'L = '+L+' mm');
                        vdim(offsetY, offsetY+H, offsetX-gap, 'H = '+H+' mm');
                        text('CTM_LABELS', String(ref)+' - '+String(type), cx, offsetY+H+gap*.55, th, GREEN, true);
                        text('CTM_LABELS', 'LIBERADO: '+releasedQty+' un', cx, offsetY+H+gap*.55+th*1.35, th*.85, GREEN, true);
                        text('CTM_LABELS', hasBottom ? '4 LADOS' : '3 LADOS', cx, offsetY-gap*1.25, th*.72, GREEN, true);
                        text('CTM_LABELS', 'CTM '+(pw===20 ? 'ESTREITO (20mm)' : 'LARGO (33mm)'), cx, offsetY-gap*1.55, th*.65, GREEN, true);
                        return lines;
                    }
                    // ---- DXF FULL FILE (single item) ----
                    function generateDXFContentCTM(ref, type, L, H, profW, hasBottom, scope){
                        var headerLines = [];
                        headerLines.push('0'); headerLines.push('SECTION');
                        headerLines.push('2'); headerLines.push('HEADER');
                        /* DXF R12/AC1009: cabeçalho mínimo para máxima compatibilidade. */
                        headerLines.push('9'); headerLines.push('$ACADVER'); headerLines.push('1'); headerLines.push('AC1009');
                        headerLines.push('0'); headerLines.push('ENDSEC');
                        headerLines.push('0'); headerLines.push('SECTION');
                        headerLines.push('2'); headerLines.push('ENTITIES');
                        var entityLines = generateDXFEntitiesCTM(ref, type, L, H, profW, hasBottom, scope, 0, 0, getReleasedQtyForRefCTM(ref));
                        var footerLines = [];
                        footerLines.push('0'); footerLines.push('ENDSEC');
                        footerLines.push('0'); footerLines.push('EOF');
                        return headerLines.concat(entityLines, footerLines).join('\n');
                    }
                
                    // ---- DXF EXPORT (BATCH) - single valid DXF with merged entities ----
                    window.downloadBatchDXFCTM = function(){
                        var chks = document.querySelectorAll('.cad-batch-chk:checked');
                        if(chks.length === 0){ alert('Selecione itens.'); return; }
                        var specs = getCTMSpecs();
                        var mType = document.getElementById('batchCadMeasureType').value;
                        var allLines = [];
                        // Single HEADER section
                        allLines.push('0'); allLines.push('SECTION');
                        allLines.push('2'); allLines.push('HEADER');
                        /* DXF R12/AC1009: cabeçalho mínimo para máxima compatibilidade. */
                        allLines.push('9'); allLines.push('$ACADVER'); allLines.push('1'); allLines.push('AC1009');
                        allLines.push('0'); allLines.push('ENDSEC');
                        allLines.push('0'); allLines.push('SECTION');
                        allLines.push('2'); allLines.push('ENTITIES');
                        // Layout em grade: no máximo 5 linhas por coluna e colunas ilimitadas.
                        // O espaçamento de 1300 mm é aplicado tanto para baixo quanto para o lado.
                        var gapX = 1300;
                        var gapY = 1300;
                        var maxRows = 5;
                        var selectedBatch = [];
                        chks.forEach(function(chk){
                            var ref = chk.getAttribute('data-ref');
                            var spec = specs.find(function(s){ return s.ref === ref; });
                            if(!spec) return;
                            var pL = spec.L, pH = spec.H;
                            if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                            selectedBatch.push({ref: ref, spec: spec, pL: pL, pH: pH});
                        });
                        var rowHeights = [0, 0, 0, 0, 0];
                        var colWidths = [];
                        selectedBatch.forEach(function(item, idx){
                            var row = idx % maxRows;
                            var col = Math.floor(idx / maxRows);
                            rowHeights[row] = Math.max(rowHeights[row], item.pH);
                            colWidths[col] = Math.max(colWidths[col] || 0, item.pL);
                        });
                        var rowY = [];
                        for(var r = 0; r < maxRows; r++){
                            rowY[r] = -(r ? rowY[r - 1] + rowHeights[r - 1] + gapY : 0);
                        }
                        var colX = [];
                        for(var c = 0; c < colWidths.length; c++){
                            colX[c] = c ? colX[c - 1] + colWidths[c - 1] + gapX : 0;
                        }
                        selectedBatch.forEach(function(item, idx){
                            var row = idx % maxRows;
                            var col = Math.floor(idx / maxRows);
                            var profW = item.spec.ctmProfile === 'estreito' ? 20 : 33;
                            /* Comentários não são entidades válidas na seção ENTITIES de DXF; não os gravar. */
                            var entityLines = generateDXFEntitiesCTM(item.ref, item.spec.type, item.pL, item.pH, profW, item.spec.hasBottom, 'full', colX[col], rowY[row], getReleasedQtyForRefCTM(item.ref));
                            for(var e = 0; e < entityLines.length; e++) allLines.push(entityLines[e]);
                        });
                        // Single ENDSEC + EOF
                        allLines.push('0'); allLines.push('ENDSEC');
                        allLines.push('0'); allLines.push('EOF');
                        var dxfStr = allLines.join('\n');
                        var blob = new Blob([dxfStr], {type: 'application/dxf'});
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a'); a.href = url; a.download = 'CTM_Batch.dxf'; a.click();
                        URL.revokeObjectURL(url);
                    };
                
                    // ---- BATCH SUMMARY (Resumo em Lote) ----
                    window.generateBatchSummaryCTM = function(){
                        var chks = document.querySelectorAll('.cad-batch-chk:checked');
                        if(chks.length === 0){ alert('Selecione itens.'); return; }
                        var specs = getCTMSpecs();
                        var mType = document.getElementById('batchCadMeasureType').value;
                        var selectedRefs = [];
                        chks.forEach(function(chk){
                            var ref = chk.getAttribute('data-ref');
                            selectedRefs.push(ref);
                        });
                        var obra = getObraCTM();
                        var obraName = obra ? obra.nome : 'Obra';
                        // Build summary table
                        var html = '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:11px;">';
                        html += '<thead><tr style="background:#ff7b00;color:#fff;font-weight:bold;">';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;">REF</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;">Tipologia</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;">Estrutura</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;">Modelo CTM</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">L (mm)</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">H (mm)</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">Qtd</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">Liberado</th>';
                        html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">Saldo</th>';
                        html += '</tr></thead>';
                        html += '<tbody>';
                        var totalQty = 0, totalReleased = 0;
                        selectedRefs.forEach(function(ref){
                            var spec = specs.find(function(s){ return s.ref === ref; });
                            if(!spec) return;
                            var released = getReleasedQtyForRefCTM(spec.ref);
                            var estrutura = spec.hasBottom ? '4 LADOS' : '3 LADOS';
                            var modelo = spec.ctmProfile === 'estreito' ? 'Estreito (20mm)' : 'Largo (33mm)';
                            var pL = spec.L, pH = spec.H;
                            if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                            html += '<tr>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;"><b>' + spec.ref + '</b></td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;">' + spec.type + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;">' + estrutura + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;">' + modelo + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + pL + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + pH + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + spec.qty + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + released + '</td>';
                            html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + (spec.qty - released) + '</td>';
                            html += '</tr>';
                            totalQty += spec.qty;
                            totalReleased += released;
                        });
                        // Totals row
                        html += '<tr style="background:#f0f0f0;font-weight:bold;">';
                        html += '<td style="border:1px solid #ccc;padding:4px 8px;" colspan="6">TOTAL</td>';
                        html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + totalQty + '</td>';
                        html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + totalReleased + '</td>';
                        html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">' + (totalQty - totalReleased) + '</td>';
                        html += '</tr>';
                        html += '</tbody></table>';
                        var container = document.getElementById('resumoLoteContainer');
                        container.innerHTML = html;
                        document.getElementById('resumoLoteSubtitle').textContent = obraName + ' | Itens: ' + selectedRefs.length + ' | Medida: ' + mType;
                        var modalResumo = document.getElementById('batchCadModalCTM');
                        var displayResumoAnterior = modalResumo ? modalResumo.style.display : '';
                        if (modalResumo) { modalResumo.style.display = 'none'; }
                        document.body.classList.add('print-resumo-mode');
                        var restaurarResumoCTM = function () {
                            document.body.classList.remove('print-resumo-mode');
                            container.innerHTML = '';
                            if (modalResumo) { modalResumo.style.display = displayResumoAnterior || 'none'; }
                            window.removeEventListener('afterprint', restaurarResumoCTM);
                        };
                        window.addEventListener('afterprint', restaurarResumoCTM, { once: true });
                        try {
                            window.print();
                        } catch (erroResumo) {
                            restaurarResumoCTM();
                            alert('Não foi possível abrir a impressão do resumo CTM.');
                        }
                        setTimeout(function () {
                            if (document.body.classList.contains('print-resumo-mode')) { restaurarResumoCTM(); }
                        }, 120000);
                    };
                
                    // ---- EXCEL EXPORT ----
                    window.exportSpecsToExcelCTM = function(){
                        var specs = getCTMSpecs();
                        var data = [['Ref', 'Tipo', 'L(mm)', 'H(mm)', 'Lados', 'Modelo', 'Qtd', 'Liberado', 'Saldo', 'Status']];
                        specs.forEach(function(s){
                            var released = getReleasedQtyForRefCTM(s.ref);
                            var pct = s.qty > 0 ? Math.round((released / s.qty) * 100) : 0;
                            var statusText = pct >= 100 ? 'CONCLUÍDO' : pct > 0 ? 'EM ANDAMENTO' : 'PENDENTE';
                            data.push([s.ref, s.type, s.L, s.H, s.hasBottom ? 4 : 3, s.ctmProfile, s.qty, released, s.qty - released, statusText]);
                        });
                        var wb = XLSX.utils.book_new();
                        var ws = XLSX.utils.aoa_to_sheet(data);
                        XLSX.utils.book_append_sheet(wb, ws, 'Especificações CTM');
                        XLSX.writeFile(wb, 'CTM_Especificacoes.xlsx');
                    };
                    window.exportHistoryToExcelCTM = function(){
                        var logs = getCTMLogs();
                        var data = [['Data', 'Local', 'Ref', 'Escopo', 'Qtd', 'Medida', 'L Real', 'H Real', 'Dif L', 'Dif H', 'Dif Diag', 'Status', 'Conferente']];
                        logs.forEach(function(l){
                            data.push([l.date, l.location||'', l.ref, l.scope||'', l.qty, l.measureType||'', l.realL||'', l.realH||'', l.difL||'', l.difH||'', l.difDiag||'', l.status, l.inspector||'']);
                        });
                        var wb = XLSX.utils.book_new();
                        var ws = XLSX.utils.aoa_to_sheet(data);
                        XLSX.utils.book_append_sheet(wb, ws, 'Histórico CTM');
                        XLSX.writeFile(wb, 'CTM_Historico.xlsx');
                    };
                
                    // ---- EXCEL IMPORT ----
                    window.triggerExcelImportCTM = function(){
                        document.getElementById('excelFileInputCTM').click();
                    };
                    window.importExcelSpecsCTM = function(event){
                        var file = event.target.files[0];
                        if(!file) return;
                        var reader = new FileReader();
                        reader.onload = function(e){
                            try{
                                var data = new Uint8Array(e.target.result);
                                var workbook = XLSX.read(data, {type: 'array'});
                                var sheet = workbook.Sheets[workbook.SheetNames[0]];
                                var json = XLSX.utils.sheet_to_json(sheet);
                                var obra = getObraCTM();
                                if(!obra.ctmExtraSpecs) obra.ctmExtraSpecs = [];
                                var specs = getCTMSpecs();
                                var seenRefs = {};
                                specs.forEach(function(s){ seenRefs[s.ref] = true; });
                                var count = 0;
                                json.forEach(function(row){
                                    var ref = String(row['Ref'] || row['ref'] || row['Referência'] || '').trim();
                                    if(!ref) return;
                                    if(!seenRefs[ref]){
                                        seenRefs[ref] = true;
                                        obra.ctmExtraSpecs.push({
                                            ref: ref,
                                            type: String(row['Tipo'] || row['tipo'] || row['Tipologia'] || '').trim(),
                                            L: parseInt(row['L(mm)'] || row['L'] || row['Largura'] || 0) || 0,
                                            H: parseInt(row['H(mm)'] || row['H'] || row['Altura'] || 0) || 0,
                                            qty: parseInt(row['Qtd'] || row['qty'] || row['Quantidade'] || 0) || 0,
                                            hasBottom: String(row['Lados'] || row['Estrutura'] || '4') === '3' ? false : true,
                                            ctmProfile: String(row['Modelo'] || 'largo')
                                        });
                                        count++;
                                    }
                                });
                                salvarDB();
                                renderCTMDashboard();
                                alert(count + ' especificações importadas.');
                            } catch(err){
                                alert('Erro ao importar: ' + err.message);
                            }
                        };
                        reader.readAsArrayBuffer(file);
                        event.target.value = '';
                    };
                
                    // ---- WHATSAPP COPY ----
                    window.copyWhatsAppSummaryCTM = function(){
                        var specs = getCTMSpecs();
                        var logs = getCTMLogs();
                        var obra = getObraCTM();
                        var msg = '*📋 CTM - ' + escapeH(obra.nome || 'Obra') + '*\n\n';
                        var totalQty = 0, totalReleased = 0;
                        specs.forEach(function(s){ totalQty += s.qty; });
                        var refSet = {};
                        logs.forEach(function(l){ if(l.status === 'APROVADO' && !refSet[l.ref + l.scope]){ totalReleased += l.qty; refSet[l.ref + l.scope] = true; }});
                        msg += '✅ Liberado: ' + totalReleased + '/' + totalQty + ' peças\n';
                        msg += '📊 Progresso: ' + (totalQty > 0 ? Math.round((totalReleased / totalQty) * 100) : 0) + '%\n\n';
                        specs.forEach(function(s){
                            var released = getReleasedQtyForRefCTM(s.ref);
                            var pct = s.qty > 0 ? Math.round((released / s.qty) * 100) : 0;
                            var icon = pct >= 100 ? '✅' : pct > 0 ? '🔄' : '⏳';
                            msg += icon + ' ' + s.ref + ' (' + s.type + '): ' + released + '/' + s.qty + '\n';
                        });
                        msg += '\n_Enviado via Sistema CTM_';
                        navigator.clipboard.writeText(msg).then(function(){ alert('Resumo copiado! Cole no WhatsApp.'); });
                    };
                
                    // ---- PRINT FUNCTIONS ----
                    window.printHistoryOnlyCTM = function(){
                        document.body.classList.add('print-history-mode');
                        var obra = getObraCTM();
                        var header = document.getElementById('ctmPrintHeader');
                        if(header){
                            header.style.display = 'block';
                            document.getElementById('ctmPrintTitle').textContent = 'Histórico CTM - ' + titleCase(obra.nome || 'Obra');
                            document.getElementById('ctmPrintSubtitle').textContent = 'Gerado em ' + new Date().toLocaleDateString('pt-BR');
                        }
                        imprimirPagina();
                        document.body.classList.remove('print-history-mode');
                        if(header) header.style.display = 'none';
                    };
                    window.printSpecsOnlyCTM = function(){
                        document.body.classList.add('print-specs-mode');
                        var obra = getObraCTM();
                        var header = document.getElementById('ctmPrintHeader');
                        if(header){
                            header.style.display = 'block';
                            document.getElementById('ctmPrintTitle').textContent = 'Especificações CTM - ' + titleCase(obra.nome || 'Obra');
                            document.getElementById('ctmPrintSubtitle').textContent = 'Gerado em ' + new Date().toLocaleDateString('pt-BR');
                        }
                        imprimirPagina();
                        document.body.classList.remove('print-specs-mode');
                        if(header) header.style.display = 'none';
                    };
                    window.generatePDFReportCTM = function(){
                        // Uses browser print with full CTM section
                        var obra = getObraCTM();
                        var header = document.getElementById('ctmPrintHeader');
                        if(header){
                            header.style.display = 'block';
                            document.getElementById('ctmPrintTitle').textContent = 'Relatório CTM - ' + titleCase(obra.nome || 'Obra');
                            document.getElementById('ctmPrintSubtitle').textContent = 'Gerado em ' + new Date().toLocaleDateString('pt-BR');
                        }
                        imprimirPagina();
                        if(header) header.style.display = 'none';
                    };
                
                    // ---- BATCH CAD PRINT ----
                    window.openBatchCadModalCTM = function(){
                        var modal = document.getElementById('batchCadModalCTM');
                        if(modal){ modal.style.display = 'flex'; renderBatchCadListCTM(); }
                    };
                    window.closeBatchCadModalCTM = function(){
                        var modal = document.getElementById('batchCadModalCTM');
                        if(modal) modal.style.display = 'none';
                    };
                    function renderBatchCadListCTM(){
                        var specs = getCTMSpecs();
                        var container = document.getElementById('batchCadListContainer');
                        if(!container) return;
                        var html = '<div style="max-height:300px;overflow:auto;">';
                        specs.forEach(function(s, i){
                            html += '<label style="display:flex;align-items:center;gap:6px;color:#fff;font-size:12px;padding:4px 0;border-bottom:1px solid #222;">';
                            html += '<input type="checkbox" class="cad-batch-chk" data-ref="' + escapeH(s.ref) + '"> ';
                            html += '<b>' + escapeH(s.ref) + '</b> (' + titleCase(s.type) + ') ' + s.L + '×' + s.H + 'mm</label>';
                        });
                        html += '</div>';
                        container.innerHTML = html;
                        var indicador = document.getElementById('ctmDfxQtd');
                        if (indicador) { indicador.textContent = specs.length + ' disponíveis · selecione para exportar'; }
                    }
                    window.toggleSelectAllCadBatchCTM = function(){
                        var chks = document.querySelectorAll('.cad-batch-chk');
                        var allOn = true;
                        chks.forEach(function(c){ if(!c.checked) allOn = false; });
                        chks.forEach(function(c){ c.checked = !allOn; });
                    };
                    window.executeBatchCadPrintCTM = function(){
                        var chks = document.querySelectorAll('.cad-batch-chk:checked');
                        if(chks.length === 0){ alert('Selecione itens.'); return; }
                        var specs = getCTMSpecs();
                        var mType = document.getElementById('batchCadMeasureType').value;
                        var container = document.getElementById('cadBatchPrintContainer');
                        container.innerHTML = '';
                        /* O botão Imprimir agora leva o resumo junto, como primeira página. */
                        var resumo = document.createElement('section');
                        resumo.className = 'ctm-print-summary';
                        var tituloResumo = document.createElement('h1');
                        tituloResumo.textContent = 'RESUMO DO LOTE CAD';
                        resumo.appendChild(tituloResumo);
                        var tabelaResumo = document.createElement('table');
                        tabelaResumo.innerHTML = '<thead><tr><th>REF</th><th>TIPO</th><th>MODELO CTM</th><th>L (mm)</th><th>H (mm)</th><th>QTD</th><th>LIBERADO</th><th>SALDO</th></tr></thead><tbody></tbody>';
                        var corpoResumo = tabelaResumo.querySelector('tbody');
                        var totalQtdResumo = 0, totalLibResumo = 0;
                        chks.forEach(function(chk){
                            var refResumo = chk.getAttribute('data-ref');
                            var specResumo = specs.find(function(s){ return s.ref === refResumo; });
                            if(!specResumo) return;
                            var lResumo = specResumo.L, hResumo = specResumo.H;
                            if(mType === 'fora'){ lResumo += 28; hResumo += 28; } else if(mType === 'dentro'){ lResumo -= 4; hResumo -= 4; }
                            var liberadoResumo = getReleasedQtyForRefCTM(refResumo);
                            totalQtdResumo += Number(specResumo.qty) || 0;
                            totalLibResumo += Number(liberadoResumo) || 0;
                            var trResumo = document.createElement('tr');
                            [refResumo, specResumo.type, specResumo.ctmProfile, lResumo, hResumo, specResumo.qty, liberadoResumo, (Number(specResumo.qty) || 0) - (Number(liberadoResumo) || 0)].forEach(function(valor){
                                var td = document.createElement('td'); td.textContent = String(valor == null ? '' : valor); trResumo.appendChild(td);
                            });
                            corpoResumo.appendChild(trResumo);
                        });
                        var trTotalResumo = document.createElement('tr');
                        trTotalResumo.className = 'ctm-print-summary-total';
                        trTotalResumo.innerHTML = '<td colspan="5">TOTAL</td><td>' + totalQtdResumo + '</td><td>' + totalLibResumo + '</td><td>' + (totalQtdResumo - totalLibResumo) + '</td>';
                        corpoResumo.appendChild(trTotalResumo);
                        resumo.appendChild(tabelaResumo);
                        container.appendChild(resumo);
                        chks.forEach(function(chk){
                            var ref = chk.getAttribute('data-ref');
                            var spec = specs.find(function(s){ return s.ref === ref; });
                            if(!spec) return;
                            var pL = spec.L, pH = spec.H;
                            if(mType === 'fora'){ pL += 28; pH += 28; } else if(mType === 'dentro'){ pL -= 4; pH -= 4; }
                            var div = document.createElement('div');
                            div.className = 'cad-sheet-print';
                            var canvas = document.createElement('canvas');
                            canvas.width = 550; canvas.height = 320;
                            div.appendChild(canvas);
                            div.appendChild(document.createElement('br'));
                            var label = document.createElement('div');
                            label.style.cssText = 'text-align:center;font-size:12px;';
                            label.textContent = 'CTM: ' + ref + ' | ' + spec.type + ' | ' + pL + '×' + pH + 'mm | ' + spec.ctmProfile;
                            div.appendChild(label);
                            container.appendChild(div);
                            renderPrintCanvasCTM(canvas, spec, pL, pH, mType);
                        });
                        var modalLote = document.getElementById('batchCadModalCTM');
                        var modalAnterior = modalLote ? modalLote.style.display : '';
                        if (modalLote) { modalLote.style.display = 'none'; }
                        document.body.classList.add('print-cad-mode');
                        var restaurarImpressaoCTM = function () {
                            document.body.classList.remove('print-cad-mode');
                            container.innerHTML = '';
                            if (modalLote) { modalLote.style.display = modalAnterior || 'none'; }
                            window.removeEventListener('afterprint', restaurarImpressaoCTM);
                        };
                        window.addEventListener('afterprint', restaurarImpressaoCTM, { once: true });
                        try {
                            window.print();
                        } catch (erroImpressao) {
                            restaurarImpressaoCTM();
                            alert('Não foi possível abrir a impressão das pranchas CTM.');
                        }
                        /* Alguns navegadores não disparam afterprint em todos os casos. */
                        setTimeout(function () {
                            if (document.body.classList.contains('print-cad-mode')) { restaurarImpressaoCTM(); }
                        }, 120000);
                    };
                    function renderPrintCanvasCTM(canvas, spec, L, H, mType){
                        var ctx = canvas.getContext('2d');
                        var W = canvas.width, cH = canvas.height;
                        ctx.clearRect(0, 0, W, cH);
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, W, cH);
                        var profW = spec.ctmProfile === 'estreito' ? 20 : 33;
                        var scale = Math.min((W - 100) / L, (cH - 80) / H);
                        var frameW = L * scale, frameH = H * scale;
                        var ox = (W - frameW) / 2, oy = (cH - frameH) / 2;
                        var profScale = profW * scale;
                        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                        ctx.strokeRect(ox, oy, frameW, frameH);
                        ctx.fillStyle = '#eee';
                        ctx.fillRect(ox, oy, frameW, profScale);
                        ctx.fillRect(ox, oy, profScale, frameH);
                        ctx.fillRect(ox + frameW - profScale, oy, profScale, frameH);
                        if(spec.hasBottom) ctx.fillRect(ox, oy + frameH - profScale, frameW, profScale);
                        ctx.strokeStyle = '#0066cc'; ctx.lineWidth = 1.5;
                        var innerOx = ox + profScale, innerOy = oy + profScale;
                        var innerW = frameW - 2 * profScale, innerH = spec.hasBottom ? frameH - 2 * profScale : frameH - profScale;
                        ctx.strokeRect(innerOx, innerOy, innerW, innerH);
                        ctx.fillStyle = '#000'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
                        ctx.fillText(L + 'mm', ox + frameW / 2, oy - 6);
                        ctx.save(); ctx.translate(ox - 6, oy + frameH / 2); ctx.rotate(-Math.PI / 2);
                        ctx.fillText(H + 'mm', 0, 0); ctx.restore();
                    }
                
                    // ---- MODAL: NEW/EDIT ----
                    window.openNewModalCTM = function(){
                        document.getElementById('editIndexCTM').value = '-1';
                        document.getElementById('modalTitleCTM').textContent = 'Novo Contramarco';
                        document.getElementById('newRef').value = '';
                        document.getElementById('newType').value = '';
                        document.getElementById('newL').value = '';
                        document.getElementById('newH').value = '';
                        document.getElementById('newQty').value = '1';
                        document.getElementById('newHasBottom').value = 'true';
                        document.getElementById('newCtmProfile').value = 'largo';
                        populateNewTypeOptionsCTM();
                        document.getElementById('newModalCTM').style.display = 'flex';
                    };
                    window.openEditModalCTM = function(spec){
                        document.getElementById('editIndexCTM').value = spec.ref;
                        document.getElementById('modalTitleCTM').textContent = 'Editar Contramarco';
                        document.getElementById('newRef').value = spec.ref;
                        document.getElementById('newType').value = spec.type;
                        document.getElementById('newL').value = spec.L;
                        document.getElementById('newH').value = spec.H;
                        document.getElementById('newQty').value = spec.qty;
                        document.getElementById('newHasBottom').value = spec.hasBottom ? 'true' : 'false';
                        document.getElementById('newCtmProfile').value = spec.ctmProfile || 'largo';
                        populateNewTypeOptionsCTM();
                        document.getElementById('newModalCTM').style.display = 'flex';
                    };
                    window.closeNewModalCTM = function(){
                        document.getElementById('newModalCTM').style.display = 'none';
                    };
                    function populateNewTypeOptionsCTM(){
                        var sel = document.getElementById('newType');
                        var customTypes = getCustomTypesCTM();
                        var specs = getCTMSpecs();
                        var types = {};
                        specs.forEach(function(s){ types[s.type] = true; });
                        customTypes.forEach(function(t){ types[t] = true; });
                        sel.innerHTML = '';
                        Object.keys(types).sort().forEach(function(t){
                            var o = document.createElement('option'); o.value = t; o.textContent = t;
                            if(sel.value === t) o.selected = true;
                            sel.appendChild(o);
                        });
                        // Add custom option
                        var co = document.createElement('option'); co.value = '__custom__'; co.textContent = '+ Personalizado...'; sel.appendChild(co);
                    }
                    window.saveItemModalCTM = function(){
                        var editRef = document.getElementById('editIndexCTM').value;
                        var ref = escapeH(document.getElementById('newRef').value.trim());
                        var type = document.getElementById('newType').value;
                        if(type === '__custom__'){
                            type = prompt('Nome da tipologia:');
                            if(!type) return;
                            type = escapeH(type.trim());
                            addCustomTypeCTM(type);
                        }
                        var L = parseInt(document.getElementById('newL').value) || 0;
                        var H = parseInt(document.getElementById('newH').value) || 0;
                        var qty = parseInt(document.getElementById('newQty').value) || 1;
                        var hasBottom = document.getElementById('newHasBottom').value === 'true';
                        var ctmProfile = document.getElementById('newCtmProfile').value;
                        if(!ref){ alert('Informe a referência.'); return; }
                        var obra = getObraCTM();
                        if(!obra.ctmExtraSpecs) obra.ctmExtraSpecs = [];
                        if(editRef === '-1'){
                            // New spec
                            var specs = getCTMSpecs();
                            var existing = specs.find(function(s){ return s.ref === ref; });
                            if(existing){ alert('Referência já existe.'); return; }
                            obra.ctmExtraSpecs.push({
                                ref: ref, type: type, L: L, H: H, qty: qty,
                                hasBottom: hasBottom, ctmProfile: ctmProfile
                            });
                        } else {
                            // Edit existing in ctmExtraSpecs
                            var found = obra.ctmExtraSpecs.find(function(es){ return es.ref === editRef; });
                            if(found){
                                found.ref = ref; found.type = type; found.L = L; found.H = H;
                                found.qty = qty; found.hasBottom = hasBottom; found.ctmProfile = ctmProfile;
                                // Update ctmLogs ref if changed
                                if(ref !== editRef && obra.ctmLogs){
                                    obra.ctmLogs.forEach(function(l){ if(l.ref === editRef) l.ref = ref; });
                                }
                            } else {
                                // It might be a panel item — cannot edit from here
                                alert('Este item pertence à obra. Edite pela aba Itens.');
                                closeNewModalCTM();
                                return;
                            }
                        }
                        salvarDB();
                        closeNewModalCTM();
                        renderCTMDashboard();
                    };
                
                    // ---- CUSTOM TYPOLOGIES ----
                    function getCustomTypesCTM(){
                        try{ return JSON.parse(localStorage.getItem('ctm_custom_types_v2') || '[]'); }
                        catch(e){ return []; }
                    }
                    function saveCustomTypesCTM(types){
                        localStorage.setItem('ctm_custom_types_v2', JSON.stringify(types));
                    }
                    function addCustomTypeCTM(name){
                        var types = getCustomTypesCTM();
                        if(types.indexOf(name) === -1){ types.push(name); saveCustomTypesCTM(types); }
                    }
                    window.openCustomTypeModalCTM = function(){
                        renderCustomTypesListCTM();
                        document.getElementById('customTypeModalCTM').style.display = 'flex';
                    };
                    window.closeCustomTypeModalCTM = function(){
                        document.getElementById('customTypeModalCTM').style.display = 'none';
                    };
                    window.saveCustomTypeCTM = function(){
                        var name = escapeH(document.getElementById('customTypeName').value.trim());
                        if(!name){ alert('Informe o nome.'); return; }
                        addCustomTypeCTM(name);
                        document.getElementById('customTypeName').value = '';
                        renderCustomTypesListCTM();
                        populateNewTypeOptionsCTM();
                        populateTypeFilterCTM();
                    };
                    window.deleteCustomTypeCTM = function(name){
                        if(!confirm('Excluir tipologia "' + name + '"?')) return;
                        var types = getCustomTypesCTM();
                        types = types.filter(function(t){ return t !== name; });
                        saveCustomTypesCTM(types);
                        renderCustomTypesListCTM();
                        populateNewTypeOptionsCTM();
                        populateTypeFilterCTM();
                    };
                    function renderCustomTypesListCTM(){
                        var container = document.getElementById('customTypesListCTM');
                        if(!container) return;
                        var types = getCustomTypesCTM();
                        var html = '';
                        if(types.length === 0){
                            html = '<div style="color:#666;font-size:11px;">Nenhuma tipologia personalizada.</div>';
                        } else {
                            html = '<div style="max-height:150px;overflow:auto;">';
                            types.forEach(function(t){
                                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #222;">';
                                html += '<span style="color:#fff;font-size:12px;">' + escapeH(t) + '</span>';
                                html += '<button onclick="deleteCustomTypeCTM(\'' + escapeH(t) + '\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:12px;">🗑️</button>';
                                html += '</div>';
                            });
                            html += '</div>';
                        }
                        container.innerHTML = html;
                    }
                
                
                
                // ========== CENTRO DE CUSTOS ==========
                var CUSTO_CATEGORIAS = ["Salários","Produção","Insumos","Materiais","Equipamentos","Aluguel Alojamento","Mobilidade","Passagens Rodoviárias/Aéreas","Outros"];
                var CUSTO_COLORS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#34495e","#95a5a6"];
                
                function initCustoTab(){
                  popularCustoObraSelect();
                  // PATCH 32: popular filtro de categoria
                  try { popularCustoCategoriaFiltro(); } catch(e){ console.error("popularCustoCategoriaFiltro:", e); }
                  renderCustoDashboard();
                  // Sincronizar mes com Pagamento de Producao
                  var mesKey = getChaveMesPgto();
                  var mesInput = document.getElementById("custoFilterMes");
                  if(mesInput && mesKey) mesInput.value = mesKey;
                  // Sincronizar periodo com mes selecionado
                  var mesInput2 = document.getElementById("custoFilterMes");
                  var deInput = document.getElementById("custoFilterPeriodoDe");
                  var ateInput = document.getElementById("custoFilterPeriodoAte");
                  if(mesInput2 && mesInput2.value && deInput && ateInput){
                    deInput.value = mesInput2.value + "-01";
                    var parts = mesInput2.value.split("-");
                    var yr = parseInt(parts[0],10);
                    var mo = parseInt(parts[1],10);
                    var lastDay = new Date(yr, mo, 0).getDate();
                    ateInput.value = mesInput2.value + "-" + (lastDay < 10 ? "0" : "") + lastDay;
                  }
                }
                
                function popularCustoObraSelect(){
                  var sel = document.getElementById("custoFilterObra");
                  if(!sel) return;
                  var html = "<option value=''>Todas as Obras</option>";
                  db.obras.forEach(function(o){
                    html += "<option value='" + o.id + "'>" + escaparHTML(o.nome || "Obra sem nome") + "</option>";
                  });
                  sel.innerHTML = html;
                }
                
                function getCustosFiltered(){
                  // PATCH 32: filtros de categoria e periodo
                  function _custoVal(id){ var el = document.getElementById(id); return el ? (el.value || "") : ""; }
                  var obraId = _custoVal("custoFilterObra");
                  var regiao = _custoVal("custoFilterRegiao").trim().toLowerCase();
                  var mes = _custoVal("custoFilterMes");
                  var catFiltro = _custoVal("custoFilterCategoria");
                  var dataDe = _custoVal("custoFilterDataDe");
                  var dataAte = _custoVal("custoFilterDataAte");
                  var colabFiltro = _custoVal("custoFilterColaborador"); // PATCH 38
                  var empresaFiltro = _custoVal("custoFilterEmpresa").toUpperCase();
                  var empresasPorColab = {};
                  (db.obras || []).forEach(function(o){
                    (o.colaboradores || []).forEach(function(c){ if(c && c.nome) empresasPorColab[String(c.nome).trim().toLowerCase()] = String(c.empresa || '').toUpperCase(); });
                    (o.colaboradoresPgto || []).forEach(function(c){ if(c && c.nome && !empresasPorColab[String(c.nome).trim().toLowerCase()]) empresasPorColab[String(c.nome).trim().toLowerCase()] = String(c.empresa || '').toUpperCase(); });
                  });
                  var periodoDe = document.getElementById("custoFilterPeriodoDe") ? document.getElementById("custoFilterPeriodoDe").value : "";
                  var periodoAte = document.getElementById("custoFilterPeriodoAte") ? document.getElementById("custoFilterPeriodoAte").value : "";
                  var result = [];
                  db.obras.forEach(function(o){
                    (o.centrosCusto || []).forEach(function(c){
                      if(obraId && c.obraId !== obraId) return;
                      if(regiao && (!c.regiao || c.regiao.toLowerCase().indexOf(regiao) === -1)) return;
                      if(catFiltro && c.categoria !== catFiltro) return;
                      var dRef = c.data || "";
                      if(mes){
                        if(dRef.substring(0, 7) !== mes) return;
                      }
                      if(dataDe && (!dRef || dRef < dataDe)) return;
                      if(dataAte && (!dRef || dRef > dataAte)) return;
                      // PATCH 38: filtro por colaborador
                      if(colabFiltro && (c.colaborador || "") !== colabFiltro) return;
                      if(empresaFiltro){
                        var empresaCusto = String(c.empresa || empresasPorColab[String(c.colaborador || '').trim().toLowerCase()] || '').toUpperCase();
                        if(empresaCusto !== empresaFiltro) return;
                      }
                      if(periodoDe){
                        var d = c.data || "";
                        if(d < periodoDe) return;
                      }
                      if(periodoAte){
                        var d2 = c.data || "";
                        if(d2 > periodoAte) return;
                      }
                      result.push(c);
                    });
                  });
                  return result;
                }
                
                window.salvarCusto = function(){
                  var obraId = document.getElementById('custoFilterObra').value;
                  var obra = null;
                  if(obraId) {
                    obra = db.obras.find(function(o){ return o.id === obraId; });
                  }
                  if(!obra) {
                    // Se "Todas as Obras" selecionado, pedir ao usuÃ¡rio para selecionar uma obra
                    // ou usar obraAtual como fallback
                    obra = getObraAtual();
                    if(obra) obraId = obra.id;
                  }
                  if(!obra) {
                    alert('Nenhuma obra disponÃ­vel para vincular o centro de custo.');
                    return;
                  }
                  var categoria = document.getElementById("custoInputCategoria").value;
                  var descricao = document.getElementById("custoInputDescricao").value.trim();
                  var valor = parseFloat(document.getElementById("custoInputValor").value);
                  var regiao = document.getElementById("custoInputRegiao").value.trim();
                  var data = document.getElementById("custoInputData").value;
                  if(!descricao){ alert("Informe a descrição da despesa."); return; }
                  if(isNaN(valor) || valor <= 0){ alert("Informe um valor válido."); return; }
                  if(!obra.centrosCusto) obra.centrosCusto = [];
                  obra.centrosCusto.push({
                    id: "custo_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                    obraId: obra.id,
                    data: data || new Date().toISOString().split("T")[0],
                    categoria: categoria,
                    descricao: descricao,
                    valor: valor,
                    regiao: regiao || "Geral"
                  });
                  salvarDB();
                  document.getElementById("custoInputDescricao").value = "";
                  document.getElementById("custoInputValor").value = "";
                  document.getElementById("custoInputRegiao").value = "";
                  renderCustoDashboard();
                };
                
                // PATCH 32: edicao via modal
                function _buscarCusto(id){
                  var found = null;
                  db.obras.forEach(function(o){
                    (o.centrosCusto || []).forEach(function(c){
                      if(c.id === id) found = c;
                    });
                  });
                  return found;
                }

                window.editarCusto = function(id){
                  var entry = _buscarCusto(id);
                  if(!entry){ alert("Despesa nao encontrada."); return; }
                  var modal = document.getElementById("modalEditarCusto");
                  if(!modal){ alert("Modal de edicao indisponivel."); return; }
                  var selCat = document.getElementById("custoEditCategoria");
                  if(selCat){
                    var htmlCat = "";
                    var listaCat = CUSTO_CATEGORIAS.slice();
                    if(entry.categoria && listaCat.indexOf(entry.categoria) === -1) listaCat.push(entry.categoria);
                    listaCat.forEach(function(cat){
                      htmlCat += '<option value="' + escaparHTML(cat) + '">' + escaparHTML(cat) + '</option>';
                    });
                    selCat.innerHTML = htmlCat;
                    selCat.value = entry.categoria || "";
                  }
                  document.getElementById("custoEditId").value = entry.id;
                  document.getElementById("custoEditData").value = entry.data || "";
                  document.getElementById("custoEditDescricao").value = entry.descricao || "";
                  document.getElementById("custoEditValor").value = entry.valor;
                  document.getElementById("custoEditRegiao").value = entry.regiao || "";
                  modal.style.display = "flex";
                };

                window.fecharModalCusto = function(){
                  var modal = document.getElementById("modalEditarCusto");
                  if(modal) modal.style.display = "none";
                };

                window.salvarEdicaoCusto = function(){
                  var id = document.getElementById("custoEditId").value;
                  var entry = _buscarCusto(id);
                  if(!entry){ alert("Despesa nao encontrada."); return; }
                  var desc = document.getElementById("custoEditDescricao").value.trim();
                  var valor = parseFloat(document.getElementById("custoEditValor").value);
                  if(!desc){ alert("Informe a descrição da despesa."); return; }
                  if(isNaN(valor) || valor <= 0){ alert("Informe um valor válido."); return; }
                  var selCat = document.getElementById("custoEditCategoria");
                  entry.descricao = desc;
                  entry.valor = valor;
                  entry.data = document.getElementById("custoEditData").value || entry.data;
                  entry.regiao = document.getElementById("custoEditRegiao").value.trim() || "Geral";
                  if(selCat && selCat.value) entry.categoria = selCat.value;
                  salvarDB();
                  fecharModalCusto();
                  renderCustoDashboard();
                };
                
                window.excluirCusto = function(id){
                  if(!confirm("Excluir esta despesa?")) return;
                  db.obras.forEach(function(o){
                    if(o.centrosCusto){
                      o.centrosCusto = o.centrosCusto.filter(function(c){ return c.id !== id; });
                    }
                  });
                  salvarDB();
                  renderCustoDashboard();
                };

                window.duplicarCusto = function(id){
                  var entry = null, parentObra = null;
                  db.obras.forEach(function(o){
                    if(o.centrosCusto){
                      o.centrosCusto.forEach(function(c){
                        if(c.id === id){ entry = c; parentObra = o; }
                      });
                    }
                  });
                  if(!entry || !parentObra){ alert("Despesa nao encontrada."); return; }
                  if(!confirm("Duplicar esta despesa?")) return;
                  var clone = {
                    id: "custo_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                    obraId: entry.obraId,
                    data: entry.data || new Date().toISOString().split("T")[0],
                    categoria: entry.categoria,
                    descricao: entry.descricao + " (copia)",
                    valor: entry.valor,
                    regiao: entry.regiao
                  };
                  if(!parentObra.centrosCusto) parentObra.centrosCusto = [];
                  parentObra.centrosCusto.push(clone);
                  salvarDB();
                  renderCustoDashboard();
                };
                

                window.getCustosFiltered = getCustosFiltered;
                window.renderCustoDashboard = function(){
                  var custos = getCustosFiltered();
                  renderCustoTable(custos);
                  renderCustoBarChart(custos);
                  renderCustoPieChart(custos);
                  renderCustoTotal(custos);
                  // PATCH 32: chamadas extras no dashboard
                  try { renderCustoResumoObra(custos); } catch(e){ console.error("renderCustoResumoObra:", e); }
                  try { renderCustoPorRegiao(custos); } catch(e){ console.error("renderCustoPorRegiao:", e); }
                };
                
                function renderCustoTable(custos){
                  var container = document.getElementById("containerCustoTable");
                  if(!container) return;
                  if(custos.length === 0){
                    container.innerHTML = '<div style="color:#999;font-size:13px;padding:8px;">Nenhuma despesa registrada.</div>';
                    return;
                  }
                  var groups = {};
                  custos.forEach(function(c){
                    var obra = db.obras.find(function(o){ return o.id === c.obraId; });
                    var obraNome = obra ? (obra.nome || "Obra sem nome") : "Obra não encontrada";
                    if(!groups[obraNome]) groups[obraNome] = [];
                    groups[obraNome].push(c);
                  });
                  var html = "";
                  Object.keys(groups).sort().forEach(function(obraNome){
                    html += '<div class="lanc-obra-group"><div class="lanc-obra-header">' + escaparHTML(obraNome) + '</div><table class="lanc-table"><thead><tr>';
                    html += '<th>Data</th><th>Categoria</th><th>Descrição</th><th>Região</th><th>Colaborador</th><th>Valor</th><th style="width:120px;">Ações</th></tr></thead><tbody>';
                    var gTotal = 0;
                    groups[obraNome].forEach(function(c){
                      gTotal += c.valor;
                      var vStr = c.valor.toLocaleString("pt-BR", {minimumFractionDigits:2});
                      var dataFmt = c.data ? c.data.split("-").reverse().join("/") : "-";
                      html += '<tr><td>' + dataFmt + '</td><td>' + escaparHTML(c.categoria) + '</td><td>' + escaparHTML(c.descricao) + '</td><td>' + escaparHTML(c.regiao||"-") + '</td>';
                      /* PATCH 39: celula do colaborador na linha da tabela */
                      html += '<td>' + escaparHTML(c.colaborador || "-") + '</td>';
                      html += '<td>R$ ' + vStr + '</td>';
                      html += '<td class="lanc-actions"><button class="btn-icon-sm" onclick="editarCusto(\'' + c.id + '\')" title="Editar">✏️</button><button class="btn-icon-sm" onclick="duplicarCusto(\'' + c.id + '\')" title="Duplicar">📋</button><button class="btn-icon-sm" onclick="excluirCusto(\'' + c.id + '\')" title="Excluir">🗑️</button></td></tr>';
                    });
                    var gTotalStr = gTotal.toLocaleString("pt-BR", {minimumFractionDigits:2});
                    html += '</tbody><tfoot><tr class="lanc-totals-row"><td colspan="5"><strong>Total</strong></td><td><strong>R$ ' + gTotalStr + '</strong></td><td></td></tr></tfoot></table></div>';
                  });
                  container.innerHTML = html;
                }
                
                function renderCustoTotal(custos){
                  var container = document.getElementById("containerCustoTotal");
                  if(!container) return;
                  var total = 0;
                  custos.forEach(function(c){ total += c.valor; });
                  var totalStr = total.toLocaleString("pt-BR", {minimumFractionDigits:2});
                  container.innerHTML = '<div style="display:flex;justify-content:flex-end;padding:8px 12px;background:#1e3a5f;color:#fff;border-radius:8px;font-weight:700;font-size:1rem;">Total Geral: R$ ' + totalStr + '</div>';
                }
                
                function renderCustoBarChart(custos){
                  var canvas = document.getElementById("custoBarChart");
                  if(!canvas) return;
                  var ctx = canvas.getContext("2d");
                  var w = canvas.width, h = canvas.height;
                  ctx.clearRect(0, 0, w, h);
                  // Aggregate by category
                  var byCat = {};
                  custos.forEach(function(c){
                    if(!byCat[c.categoria]) byCat[c.categoria] = 0;
                    byCat[c.categoria] += c.valor;
                  });
                  var cats = Object.keys(byCat).sort(function(a,b){ return byCat[b] - byCat[a]; });
                  var maxVal = 0;
                  cats.forEach(function(cat){ if(byCat[cat] > maxVal) maxVal = byCat[cat]; });
                  if(maxVal === 0) maxVal = 1;
                  var barW = Math.max(20, (w - 60) / cats.length - 8);
                  var chartH = h - 50;
                  var startX = 50;
                  // Y axis
                  ctx.strokeStyle = "#999";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(startX, 10);
                  ctx.lineTo(startX, chartH);
                  ctx.lineTo(w - 10, chartH);
                  ctx.stroke();
                  // Bars
                  cats.forEach(function(cat, i){
                    var color = CUSTO_COLORS[CUSTO_CATEGORIAS.indexOf(cat)] || "#888";
                    var barH = (byCat[cat] / maxVal) * (chartH - 20);
                    var x = startX + 10 + i * (barW + 8);
                    var y = chartH - barH;
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, barW, barH);
                    // Value on top
                    ctx.fillStyle = "#333";
                    ctx.font = "10px sans-serif";
                    ctx.textAlign = "center";
                    var valStr = "R$" + byCat[cat].toLocaleString("pt-BR", {minimumFractionDigits:0});
                    ctx.fillText(valStr, x + barW/2, y - 4);
                    // Label below
                    ctx.save();
                    ctx.translate(x + barW/2, chartH + 6);
                    ctx.rotate(-Math.PI/6);
                    ctx.fillStyle = "#555";
                    ctx.font = "9px sans-serif";
                    ctx.textAlign = "right";
                    ctx.fillText(cat.length > 12 ? cat.substring(0,11) + "." : cat, 0, 0);
                    ctx.restore();
                  });
                }
                
                function renderCustoPieChart(custos){
                  var canvas = document.getElementById("custoPieChart");
                  if(!canvas) return;
                  var ctx = canvas.getContext("2d");
                  var w = canvas.width, h = canvas.height;
                  ctx.clearRect(0, 0, w, h);
                  // Aggregate by category
                  var byCat = {};
                  custos.forEach(function(c){
                    if(!byCat[c.categoria]) byCat[c.categoria] = 0;
                    byCat[c.categoria] += c.valor;
                  });
                  var cats = Object.keys(byCat).sort(function(a,b){ return byCat[b] - byCat[a]; });
                  var total = 0;
                  cats.forEach(function(cat){ total += byCat[cat]; });
                  if(total === 0) return;
                  var cx = w/2, cy = h/2 - 10;
                  var r = Math.min(w, h) / 2 - 40;
                  var angle = -Math.PI/2;
                  cats.forEach(function(cat, i){
                    var color = CUSTO_COLORS[CUSTO_CATEGORIAS.indexOf(cat)] || "#888";
                    var sliceAngle = (byCat[cat] / total) * 2 * Math.PI;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, r, angle, angle + sliceAngle);
                    ctx.closePath();
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    // Label
                    var midAngle = angle + sliceAngle / 2;
                    var labelR = r + 18;
                    var lx = cx + Math.cos(midAngle) * labelR;
                    var ly = cy + Math.sin(midAngle) * labelR;
                    var pct = Math.round((byCat[cat] / total) * 100);
                    if(pct >= 5){
                      ctx.fillStyle = "#333";
                      ctx.font = "10px sans-serif";
                      ctx.textAlign = "center";
                      ctx.fillText(cat.length > 10 ? cat.substring(0,9) + "." : cat, lx, ly);
                      ctx.fillText(pct + "%", lx, ly + 12);
                    }
                    angle += sliceAngle;
                  });
                  // Legend
                  var legendY = h - 20;
                  var legendX = 10;
                  ctx.font = "9px sans-serif";
                  cats.forEach(function(cat, i){
                    if(i >= 6) return;
                    var color = CUSTO_COLORS[CUSTO_CATEGORIAS.indexOf(cat)] || "#888";
                    ctx.fillStyle = color;
                    ctx.fillRect(legendX, legendY - 8, 10, 10);
                    ctx.fillStyle = "#555";
                    ctx.textAlign = "left";
                    ctx.fillText(cat, legendX + 14, legendY);
                    legendX += ctx.measureText(cat).width + 24;
                  });
                }
                
                // PATCH 32: funcoes adicionais do Centro de Custos
                function popularCustoCategoriaFiltro(){
                  var sel = document.getElementById("custoFilterCategoria");
                  if(!sel) return;
                  var atual = sel.value;
                  var html = "<option value=''>Todas as Categorias</option>";
                  CUSTO_CATEGORIAS.forEach(function(cat){
                    html += '<option value="' + escaparHTML(cat) + '">' + escaparHTML(cat) + '</option>';
                  });
                  sel.innerHTML = html;
                  if(atual) sel.value = atual;
                }

                window.limparFiltrosCusto = function(){
                  ["custoFilterRegiao","custoFilterMes","custoFilterCategoria","custoFilterDataDe","custoFilterDataAte","custoFilterColaborador","custoFilterEmpresa"].forEach(function(id){
                    var el = document.getElementById(id);
                    if(el) el.value = "";
                  });
                  renderCustoDashboard();
                };

                function _fmtBRL(v){
                  return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
                }

                // MELHORIA 5: comparativo Custo x Receita da obra
                function renderCustoResumoObra(custos){
                  var container = document.getElementById("containerCustoResumoObra");
                  if(!container) return;
                  var elObra = document.getElementById("custoFilterObra");
                  var obraId = elObra ? elObra.value : "";
                  var receita = 0, nomeRef = "Todas as Obras";
                  if(obraId){
                    var o = db.obras.find(function(x){ return x.id === obraId; });
                    if(o){
                      nomeRef = o.nome || "Obra sem nome";
                      receita = (Number(o.valorContrato) || 0) * ((o.pctServico !== undefined ? Number(o.pctServico) : 20) / 100);
                    }
                  } else {
                    db.obras.forEach(function(o){
                      receita += (Number(o.valorContrato) || 0) * ((o.pctServico !== undefined ? Number(o.pctServico) : 20) / 100);
                    });
                  }
                  var custoTotal = 0;
                  custos.forEach(function(c){ custoTotal += (Number(c.valor) || 0); });
                  var margem = receita - custoTotal;
                  var pctMargem = receita > 0 ? (margem / receita) * 100 : 0;
                  var pctConsumido = receita > 0 ? (custoTotal / receita) * 100 : 0;
                  var corMargem = margem >= 0 ? "#2ecc71" : "#e74c3c";
                  var barraPct = Math.min(100, Math.max(0, pctConsumido));
                  var corBarra = pctConsumido > 100 ? "#e74c3c" : (pctConsumido > 80 ? "#f39c12" : "#2ecc71");
                  var h = '<div style="background:var(--card-bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;">';
                  h += '<h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--text,#fff);">💰 Custo x Receita - ' + escaparHTML(nomeRef) + '</h4>';
                  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
                  h += '<div style="padding:10px;border-radius:8px;background:#1e3a5f;color:#fff;"><div style="font-size:0.72rem;opacity:.85;">Receita de Serviço</div><div style="font-size:1rem;font-weight:700;">' + _fmtBRL(receita) + '</div></div>';
                  h += '<div style="padding:10px;border-radius:8px;background:#7f2d2d;color:#fff;"><div style="font-size:0.72rem;opacity:.85;">Custo Total (filtrado)</div><div style="font-size:1rem;font-weight:700;">' + _fmtBRL(custoTotal) + '</div></div>';
                  h += '<div style="padding:10px;border-radius:8px;background:' + corMargem + ';color:#fff;"><div style="font-size:0.72rem;opacity:.9;">Margem</div><div style="font-size:1rem;font-weight:700;">' + _fmtBRL(margem) + '</div></div>';
                  h += '<div style="padding:10px;border-radius:8px;background:#334155;color:#fff;"><div style="font-size:0.72rem;opacity:.85;">Margem %</div><div style="font-size:1rem;font-weight:700;">' + pctMargem.toFixed(1) + '%</div></div>';
                  h += '</div>';
                  h += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-light,#94a3b8);">Receita consumida pelos custos: <strong>' + pctConsumido.toFixed(1) + '%</strong></div>';
                  h += '<div style="margin-top:5px;height:10px;border-radius:6px;background:#e2e8f0;overflow:hidden;"><div style="height:100%;width:' + barraPct.toFixed(1) + '%;background:' + corBarra + ';"></div></div>';
                  h += '<div style="margin-top:8px;font-size:0.7rem;color:var(--text-light,#94a3b8);">Receita = Valor do Contrato x % destinada ao serviço de instalação. O custo considera os filtros ativos.</div>';
                  h += '</div>';
                  container.innerHTML = h;
                }

                // MELHORIA 6: totais por regiao
                function renderCustoPorRegiao(custos){
                  var container = document.getElementById("containerCustoPorRegiao");
                  if(!container) return;
                  if(!custos || custos.length === 0){ container.innerHTML = ""; return; }
                  var byReg = {}, total = 0;
                  custos.forEach(function(c){
                    var r = c.regiao || "Geral";
                    if(!byReg[r]) byReg[r] = { valor: 0, qtd: 0 };
                    byReg[r].valor += (Number(c.valor) || 0);
                    byReg[r].qtd += 1;
                    total += (Number(c.valor) || 0);
                  });
                  var regs = Object.keys(byReg).sort(function(a,b){ return byReg[b].valor - byReg[a].valor; });
                  var h = '<div style="background:var(--card-bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;">';
                  h += '<h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--text,#fff);">📍 Totais por Região</h4>';
                  h += '<table class="lanc-table"><thead><tr><th>Região / Local</th><th style="width:110px;">Lançamentos</th><th style="width:150px;">Valor</th><th style="width:90px;">% do Total</th></tr></thead><tbody>';
                  regs.forEach(function(r){
                    var pct = total > 0 ? (byReg[r].valor / total) * 100 : 0;
                    h += '<tr><td>' + escaparHTML(r) + '</td><td>' + byReg[r].qtd + '</td><td>' + _fmtBRL(byReg[r].valor) + '</td><td>' + pct.toFixed(1) + '%</td></tr>';
                  });
                  h += '</tbody><tfoot><tr class="lanc-totals-row"><td><strong>Total</strong></td><td><strong>' + custos.length + '</strong></td><td><strong>' + _fmtBRL(total) + '</strong></td><td><strong>100%</strong></td></tr></tfoot></table>';
                  h += '</div>';
                  container.innerHTML = h;
                }

                // MELHORIA 2: exportacao para XLSX
                window.exportarCustosXLSX = function(){
                  if(typeof XLSX === "undefined"){
                    alert("Biblioteca de Excel (XLSX) nao carregada nesta pagina.");
                    return;
                  }
                  var custos = getCustosFiltered();
                  if(!custos.length){ alert("Nenhuma despesa para exportar com os filtros atuais."); return; }
                  var linhas = [["Obra", "Data", "Categoria", "Descrição", "Região / Local", "Colaborador", "Valor (R$)"]];
                  var total = 0;
                  custos.slice().sort(function(a,b){ return (a.data||"").localeCompare(b.data||""); }).forEach(function(c){
                    var o = db.obras.find(function(x){ return x.id === c.obraId; });
                    var v = Number(c.valor) || 0;
                    total += v;
                    linhas.push([o ? (o.nome || "Obra sem nome") : "Obra nao encontrada", c.data || "", c.categoria || "", c.descricao || "", c.regiao || "Geral", c.colaborador || "", v]);
                  });
                  linhas.push(["", "", "", "", "", "TOTAL", total]);
                  var byCat = {};
                  custos.forEach(function(c){
                    var k = c.categoria || "Sem categoria";
                    byCat[k] = (byCat[k] || 0) + (Number(c.valor) || 0);
                  });
                  var resumo = [["Categoria", "Valor (R$)", "% do Total"]];
                  Object.keys(byCat).sort(function(a,b){ return byCat[b] - byCat[a]; }).forEach(function(k){
                    resumo.push([k, byCat[k], total > 0 ? Number(((byCat[k] / total) * 100).toFixed(1)) : 0]);
                  });
                  resumo.push(["TOTAL", total, 100]);
                  var byReg = {};
                  custos.forEach(function(c){
                    var k = c.regiao || "Geral";
                    byReg[k] = (byReg[k] || 0) + (Number(c.valor) || 0);
                  });
                  var regiaoAoa = [["Região / Local", "Valor (R$)", "% do Total"]];
                  Object.keys(byReg).sort(function(a,b){ return byReg[b] - byReg[a]; }).forEach(function(k){
                    regiaoAoa.push([k, byReg[k], total > 0 ? Number(((byReg[k] / total) * 100).toFixed(1)) : 0]);
                  });
                  regiaoAoa.push(["TOTAL", total, 100]);
                  var wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), "Despesas");
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Por Categoria");
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(regiaoAoa), "Por Regiao");
                  /* PATCH 38: aba com os totais por colaborador */
                  var byColab38 = {};
                  custos.forEach(function(c){
                    var k = c.colaborador || "Sem colaborador";
                    byColab38[k] = (byColab38[k] || 0) + (Number(c.valor) || 0);
                  });
                  var colabAoa38 = [["Colaborador", "Valor (R$)", "% do Total"]];
                  Object.keys(byColab38).sort(function(a,b){ return byColab38[b] - byColab38[a]; }).forEach(function(k){
                    colabAoa38.push([k, byColab38[k], total > 0 ? Number(((byColab38[k] / total) * 100).toFixed(1)) : 0]);
                  });
                  colabAoa38.push(["TOTAL", total, 100]);
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(colabAoa38), "Por Colaborador");
                  var hoje = new Date().toISOString().split("T")[0];
                  XLSX.writeFile(wb, "Centro_de_Custos_" + hoje + ".xlsx");
                };

                /* ==================================================================
                   PATCH 38: campo Colaborador no Centro de Custos
                   ================================================================== */
                function p38ListaColaboradores(obraId){
                  var nomes = [];
                  var _p38db = (typeof db !== "undefined") ? db : {obras: window.dbObras || []};
                  try {
                    (_p38db.obras || []).forEach(function(o){
                      if(obraId && o.id !== obraId) return;
                      (o.colaboradores || []).forEach(function(c){
                        var n = (c && c.nome) ? String(c.nome).trim() : "";
                        if(n && nomes.indexOf(n) === -1) nomes.push(n);
                      });
                    });
                  } catch(e){ console.error("p38ListaColaboradores:", e); }
                  nomes.sort(function(a,b){ return a.localeCompare(b, "pt-BR"); });
                  return nomes;
                }

                function p38PopularSelect(selId, labelVazio, obraId, extra){
                  var sel = document.getElementById(selId);
                  if(!sel) return;
                  var atual = sel.value;
                  var nomes = p38ListaColaboradores(obraId);
                  if(extra && nomes.indexOf(extra) === -1) nomes.push(extra);
                  var html = '<option value="">' + labelVazio + '</option>';
                  nomes.forEach(function(n){
                    html += '<option value="' + escaparHTML(n) + '">' + escaparHTML(n) + '</option>';
                  });
                  sel.innerHTML = html;
                  if(atual && nomes.indexOf(atual) !== -1) sel.value = atual;
                  else if(extra) sel.value = extra;
                  else sel.value = "";
                }

                function p38SincronizarSelects(){
                  var elObra = document.getElementById("custoFilterObra");
                  var obraId = elObra ? elObra.value : "";
                  p38PopularSelect("custoFilterColaborador", "Todos os Colaboradores", obraId, null);
                  p38PopularSelect("custoInputColaborador", "\u2014 Sem colaborador \u2014", obraId, null);
                }

                /* painel: totais por colaborador */
                function p38RenderPorColaborador(custos){
                  var container = document.getElementById("containerCustoPorColaborador");
                  if(!container) return;
                  if(!custos || custos.length === 0){ container.innerHTML = ""; return; }
                  var byColab = {}, total = 0, algum = false;
                  custos.forEach(function(c){
                    var k = c.colaborador || "Sem colaborador";
                    if(c.colaborador) algum = true;
                    if(!byColab[k]) byColab[k] = { valor: 0, qtd: 0 };
                    byColab[k].valor += (Number(c.valor) || 0);
                    byColab[k].qtd += 1;
                    total += (Number(c.valor) || 0);
                  });
                  if(!algum){ container.innerHTML = ""; return; }
                  var keys = Object.keys(byColab).sort(function(a,b){ return byColab[b].valor - byColab[a].valor; });
                  var h = '<div style="background:var(--card-bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;">';
                  h += '<h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--text,#fff);">\uD83D\uDC64 Totais por Colaborador</h4>';
                  h += '<table class="lanc-table"><thead><tr><th>Colaborador</th><th style="width:110px;">Lan\u00e7amentos</th><th style="width:150px;">Valor</th><th style="width:90px;">% do Total</th></tr></thead><tbody>';
                  keys.forEach(function(k){
                    var pct = total > 0 ? (byColab[k].valor / total) * 100 : 0;
                    h += '<tr><td>' + escaparHTML(k) + '</td><td>' + byColab[k].qtd + '</td><td>' + _fmtBRL(byColab[k].valor) + '</td><td>' + pct.toFixed(1) + '%</td></tr>';
                  });
                  h += '</tbody><tfoot><tr class="lanc-totals-row"><td><strong>Total</strong></td><td><strong>' + custos.length + '</strong></td><td><strong>' + _fmtBRL(total) + '</strong></td><td><strong>100%</strong></td></tr></tfoot></table>';
                  h += '</div>';
                  container.innerHTML = h;
                }

                /* dashboard: sincroniza as listas e desenha o painel novo */
                if(typeof window.renderCustoDashboard === "function"){
                  window.renderCustoDashboard = (function(orig){
                    return function(){
                      try { p38SincronizarSelects(); } catch(e){ console.error("p38SincronizarSelects:", e); }
                      var r = orig.apply(this, arguments);
                      try { p38RenderPorColaborador(getCustosFiltered()); } catch(e){ console.error("p38RenderPorColaborador:", e); }
                      return r;
                    };
                  })(window.renderCustoDashboard);
                }

                /* novo lancamento: grava o colaborador escolhido */
                if(typeof window.salvarCusto === "function"){
                  window.salvarCusto = (function(orig){
                    return function(){
                      var selColab = document.getElementById("custoInputColaborador");
                      var nomeColab = selColab ? (selColab.value || "") : "";
                      var antes = {};
                      (db.obras || []).forEach(function(o){
                        (o.centrosCusto || []).forEach(function(c){ antes[c.id] = true; });
                      });
                      var r = orig.apply(this, arguments);
                      var novo = null;
                      (db.obras || []).forEach(function(o){
                        (o.centrosCusto || []).forEach(function(c){ if(!antes[c.id]) novo = c; });
                      });
                      if(novo){
                        novo.colaborador = nomeColab;
                        salvarDB();
                        if(selColab) selColab.value = "";
                        try { window.renderCustoDashboard(); } catch(e){ /* ignora */ }
                      }
                      return r;
                    };
                  })(window.salvarCusto);
                }

                /* modal de edicao: carrega o colaborador atual */
                if(typeof window.editarCusto === "function"){
                  window.editarCusto = (function(orig){
                    return function(id){
                      var r = orig.apply(this, arguments);
                      try {
                        var entry = _buscarCusto(id);
                        var elObra = document.getElementById("custoFilterObra");
                        var obraId = entry ? entry.obraId : (elObra ? elObra.value : "");
                        p38PopularSelect("custoEditColaborador", "\u2014 Sem colaborador \u2014", obraId,
                                         entry && entry.colaborador ? entry.colaborador : null);
                        var selEd = document.getElementById("custoEditColaborador");
                        if(selEd) selEd.value = (entry && entry.colaborador) ? entry.colaborador : "";
                      } catch(e){ console.error("PATCH 38 editarCusto:", e); }
                      return r;
                    };
                  })(window.editarCusto);
                }

                /* salvar edicao: persiste o colaborador */
                if(typeof window.salvarEdicaoCusto === "function"){
                  window.salvarEdicaoCusto = (function(orig){
                    return function(){
                      var elId = document.getElementById("custoEditId");
                      var id = elId ? elId.value : "";
                      var selEd = document.getElementById("custoEditColaborador");
                      var nomeColab = selEd ? (selEd.value || "") : "";
                      var r = orig.apply(this, arguments);
                      var modal = document.getElementById("modalEditarCusto");
                      var salvou = modal && modal.style.display === "none";
                      if(salvou && id){
                        var entry = _buscarCusto(id);
                        if(entry){
                          entry.colaborador = nomeColab;
                          salvarDB();
                          try { window.renderCustoDashboard(); } catch(e){ /* ignora */ }
                        }
                      }
                      return r;
                    };
                  })(window.salvarEdicaoCusto);
                }

                /* primeira carga das listas */
                try { p38SincronizarSelects(); } catch(e){ /* ignora */ }

                // Populate custo category select
                (function(){
                    var sel = document.getElementById('custoInputCategoria');
                    if(!sel) return;
                    sel.innerHTML = '';
                    CUSTO_CATEGORIAS.forEach(function(cat){
                        sel.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
                    });
                })();
                
                })();
                // CORREÇÃO: Cria a função faltante para não travar a renderização das tabelas
                if (typeof window.popularCustoObraSelect !== 'function') {
                    window.popularCustoObraSelect = function() {
                        // Função auxiliar para evitar o erro ReferenceError no render()
                    };
                }
                // Função para abrir/fechar o menu
                function alternarMenu() {
                    const menu = document.getElementById('menu-abas');
                    if (menu) {
                        menu.classList.toggle('visivel');
                    }
                }
                
                // Garanta que ao trocar de aba o menu feche automaticamente
                const funcaoAbaAntiga = window.trocarAba;
                window.trocarAba = function(nomeAba) {
                    // Executa a troca de aba normal do seu sistema
                    if (typeof funcaoAbaAntiga === 'function') {
                        funcaoAbaAntiga(nomeAba);
                    }
                    
                    // Fecha o menu após clicar na aba
                    const menu = document.getElementById('menu-abas');
                    if (menu) {
                        menu.classList.remove('visivel');
                    }
                };

                // Fecha o menu ao clicar em qualquer lugar fora dele ou ao clicar em uma aba
        document.addEventListener('click', function(event) {
    const menuDetails = document.getElementById('meu-menu-abas');
    
    if (menuDetails && menuDetails.hasAttribute('open')) {
        // Se o clique NAO foi dentro do menu de abas, fecha ele
        if (!menuDetails.contains(event.target)) {
            menuDetails.removeAttribute('open');
        }
    }
    });
            
