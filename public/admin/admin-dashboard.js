/* Admin Dashboard JS - basic skeleton and API integration patterns */
(function(){
  const API_BASE = '/api'; // adjust as needed

  const adminDashboard = {
    adminName: 'Admin',
    authToken: localStorage.getItem('authToken') || '',
    init(){
      this.cache();
      this.bind();
      this.setAdminName();
      this.navigateTo('overview');
      this.loadOverview();
      this.startRealTimeClock();
      this.startLiveDataUpdates();
    },
    cache(){
      this.el = {
        panels: document.querySelectorAll('.panel'),
        sidebarItems: document.querySelectorAll('.sidebar li[data-section]'),
        adminName: document.getElementById('adminName'),
        recentFeed: document.getElementById('recentFeed'),
        pendingList: document.getElementById('pendingList'),
        auditSnapshot: document.querySelector('#auditSnapshot tbody'),
        sessionsPanel: document.getElementById('sessionsPanel'),
        recentExports: document.getElementById('recentExports'),
        profileMenu: document.getElementById('profileMenu'),
        profileDropdown: document.getElementById('profileDropdown')
      };
    },
    bind(){
      // sidebar navigation
      this.el.sidebarItems.forEach(item=>{
        item.addEventListener('click', ()=>this.navigateTo(item.dataset.section));
      });

      // profile dropdown
      const profile = document.querySelector('.profile');
      profile.addEventListener('click', ()=>{
        this.el.profileDropdown.hidden = !this.el.profileDropdown.hidden;
      });

      document.getElementById('pendingCategoryFilter').addEventListener('change', (e)=>this.loadPending(e.target.value));
      document.getElementById('pendingSearch').addEventListener('input', (e)=>this.filterPending(e.target.value));

      document.getElementById('btnNewExport').addEventListener('click', ()=>this.openExportDialog());

      const importForm = document.getElementById('importForm');
      if(importForm) importForm.addEventListener('submit', (e)=>{e.preventDefault(); this.handleImport();});

      // Export form handlers
      const exportForm = document.getElementById('exportForm');
      if(exportForm) {
        exportForm.addEventListener('submit', (e)=>{e.preventDefault(); this.handleExportSubmit();});
      }

      const exportSearch = document.getElementById('exportSearch');
      if(exportSearch) exportSearch.addEventListener('input', (e)=>this.filterExports(e.target.value));

      const exportStatusFilter = document.getElementById('exportStatusFilter');
      if(exportStatusFilter) exportStatusFilter.addEventListener('change', (e)=>this.filterExportsByStatus(e.target.value));

      // Document management handlers
      const docSearch = document.getElementById('docSearch');
      if(docSearch) {
        docSearch.addEventListener('input', (e)=>{
          const statusFilter = document.getElementById('docStatusFilter').value;
          const typeFilter = document.getElementById('docTypeFilter').value;
          this.filterDocuments(e.target.value, statusFilter, typeFilter);
        });
      }

      const docStatusFilter = document.getElementById('docStatusFilter');
      if(docStatusFilter) {
        docStatusFilter.addEventListener('change', (e)=>{
          const query = document.getElementById('docSearch').value;
          const typeFilter = document.getElementById('docTypeFilter').value;
          this.filterDocuments(query, e.target.value, typeFilter);
        });
      }

      const docTypeFilter = document.getElementById('docTypeFilter');
      if(docTypeFilter) {
        docTypeFilter.addEventListener('change', (e)=>{
          const query = document.getElementById('docSearch').value;
          const statusFilter = document.getElementById('docStatusFilter').value;
          this.filterDocuments(query, statusFilter, e.target.value);
        });
      }

      // sign out
      const signOut = document.getElementById('signOut');
      if(signOut) signOut.addEventListener('click', ()=>this.handleSignOut());
    },
    setAdminName(){
      const name = localStorage.getItem('adminName') || this.adminName;
      this.el.adminName.textContent = name;
    },
    navigateTo(section){
      // hide all
      this.el.panels.forEach(p=>p.hidden=true);
      // remove active
      this.el.sidebarItems.forEach(i=>i.classList.remove('active'));
      // show target
      const target = document.getElementById(section);
      if(target){ target.hidden=false; document.querySelector(`.sidebar li[data-section=\"${section}\"]`).classList.add('active'); }
      // lazy-load data for section
      switch(section){
        case 'overview': this.loadOverview(); break;
        case 'pending': this.loadPending(); break;
        case 'audit': this.loadAudit(); break;
        case 'sessions': this.loadSessions(); break;
        case 'exports': this.loadExports(); break;
        case 'residents': this.loadResidents(); break;
        case 'events': this.loadEvents(); break;
        case 'announcements': this.loadAnnouncements(); break;
        case 'users': this.loadUsers(); break;
        case 'officials': this.loadOfficials(); break;
        case 'complaints': this.loadComplaints(); break;
        case 'auditlogs': this.loadAuditLogs(); break;
        case 'imports': this.loadImports(); break;
      }
    },

    /* ========== Data loaders ========== */
    async loadOverview(){
      // recent activity
      const recent = await this.makeAPIRequest('/admin/recent-activity');
      this.renderFeed(recent || []);

      // pending snapshot
      this.loadPending('all');

      // audit snapshot
      const audit = await this.makeAPIRequest('/admin/audit-snapshot');
      this.renderAuditSnapshot(audit || []);

      // sessions
      const sessions = await this.makeAPIRequest('/admin/active-sessions');
      this.renderSessions(sessions || []);

      // recent exports
      const exports = await this.makeAPIRequest('/admin/exports/recent');
      this.renderRecentExports(exports || []);
    },

    async loadPending(category='all'){
      const pending = await this.makeAPIRequest(`/admin/pending?category=${encodeURIComponent(category)}`);
      this.renderPending(pending || []);
    },
    async loadAudit(){
      const logs = await this.makeAPIRequest('/admin/audit');
      this.renderAuditTable(logs || []);
    },
    async loadSessions(){
      const sessions = await this.makeAPIRequest('/admin/sessions');
      this.renderSessionsTable(sessions || []);
    },
    async loadExports(){
      const ex = await this.makeAPIRequest('/admin/exports');
      this.renderExportTable(ex || []);
    },
    async loadResidents(){
      const list = await this.makeAPIRequest('/residents');
      this.renderResidents(list || []);
    },
    async loadEvents(){
      const list = await this.makeAPIRequest('/events');
      this.renderEvents(list || []);
    },
    async loadAnnouncements(){
      const list = await this.makeAPIRequest('/announcements');
      this.renderAnnouncements(list || []);
    },
    async loadUsers(){
      const list = await this.makeAPIRequest('/users');
      this.renderUsers(list || []);
    },
    async loadOfficials(){
      const list = await this.makeAPIRequest('/officials');
      this.renderOfficials(list || []);
    },
    async loadComplaints(){
      const list = await this.makeAPIRequest('/complaints');
      this.renderComplaints(list || []);
    },
    async loadAuditLogs(){
      const list = await this.makeAPIRequest('/audit-logs');
      this.renderAuditLogs(list || []);
    },
    async loadImports(){
      // show recent imports
      const list = await this.makeAPIRequest('/admin/imports/recent');
      this.renderImportList(list || []);
    },

    /* ========== Renderers ========== */
    renderFeed(items){
      const el = this.el.recentFeed; el.innerHTML='';
      items.forEach(it=>{
        const div = document.createElement('div'); div.className='feed-item';
        div.innerHTML = `<div class="dot" style="width:10px;height:10px;border-radius:6px;background:${it.color||'#3b82f6'}"></div><div><div class="meta">${it.actor} • ${it.action}</div><div class="meta">${new Date(it.timestamp).toLocaleString()}</div><a href='${it.link||"#"}' data-deeplink>Open</a></div>`;
        el.appendChild(div);
      });
    },
    renderPending(items){
      const el = this.el.pendingList; el.innerHTML='';
      items.forEach(row=>{
        const r = document.createElement('div'); r.className='pending-row';
        r.innerHTML = `<div class="row-main"><strong>${row.type}</strong> — ${row.ref||row.name||''} <div class='meta'>${row.actor||''} • ${new Date(row.date).toLocaleString()}</div></div><div class="row-actions"><button class='btn primary' data-action='approve' data-id='${row.id}'>Approve</button><button class='btn' data-action='reject' data-id='${row.id}'>Reject</button><button class='btn' data-action='view' data-id='${row.id}'>View</button></div>`;
        // attach action handlers
        r.querySelectorAll('button').forEach(b=>b.addEventListener('click', (e)=>this.handlePendingAction(e)));
        el.appendChild(r);
      });
    },
    renderAuditSnapshot(items){
      const tbody = this.el.auditSnapshot; tbody.innerHTML='';
      items.forEach(it=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${it.actor}</td><td>${it.action}</td><td>${it.target}</td><td>${new Date(it.time).toLocaleString()}</td>`;
        tbody.appendChild(tr);
      });
    },
    renderSessions(items){
      const el = this.el.sessionsPanel; el.innerHTML='';
      items.forEach(s=>{
        const d = document.createElement('div'); d.className='session-row';
        d.innerHTML=`<div><strong>${s.admin}</strong> • ${s.ip} • ${s.agent}</div><div><button class='btn' data-action='signout' data-session='${s.sessionId}'>Sign out</button></div>`;
        d.querySelector('button').addEventListener('click', ()=>this.remoteSignOut(s.sessionId));
        el.appendChild(d);
      });
    },
    renderRecentExports(items){
      const el = this.el.recentExports; el.innerHTML='';
      items.forEach(ex=>{
        const d = document.createElement('div'); d.className='export-item';
        d.innerHTML = `<div>${ex.dataset} • ${ex.format} • ${ex.count} records • <span class='badge-status'>${ex.status}</span></div><div><a href='${ex.url||"#"}' ${ex.status==='Ready'?'':'aria-disabled="true"'}>Download</a></div>`;
        el.appendChild(d);
      });
    },

    /* ========== Actions ========== */
    async handlePendingAction(e){
      const btn = e.currentTarget; const action=btn.dataset.action; const id=btn.dataset.id;
      if(action==='approve'){
        const res = await this.makeAPIRequest(`/admin/pending/${id}/approve`, 'POST');
        this.showNotification(res? 'Approved':'Failed to approve', res? 'success':'error');
        this.loadPending();
      } else if(action==='reject'){
        const note = prompt('Provide rejection reason (required)');
        if(!note) return this.showNotification('Rejection reason required','warning');
        const res = await this.makeAPIRequest(`/admin/pending/${id}/reject`, 'POST', {reason:note});
        this.showNotification(res? 'Rejected':'Failed to reject', res? 'success':'error');
        this.loadPending();
      } else if(action==='view'){
        // deep link to the item
        window.location.hash = `pending:${id}`;
      }
    },

    async remoteSignOut(sessionId){
      const r = confirm('Sign out this session remotely?'); if(!r) return;
      const res = await this.makeAPIRequest(`/admin/sessions/${sessionId}/signout`, 'POST');
      this.showNotification(res? 'Signed out':'Failed to sign out', res? 'success':'error');
      this.loadSessions();
    },

    openExportDialog(){
      // simple prompt flow for now
      const dataset = prompt('Dataset to export (residents,events,complaints,audit):','residents');
      const format = prompt('Format (CSV,XLSX,JSON,PDF):','CSV');
      if(!dataset||!format) return;
      this.requestExport({dataset,format});
    },
    async requestExport(opts){
      const payload = {dataset:opts.dataset, format:opts.format};
      const res = await this.makeAPIRequest('/admin/exports', 'POST', payload);
      if(res) this.showNotification('Export queued','success');
      this.loadExports();
    },

    async handleImport(){
      const fileInput = document.getElementById('importFile');
      const dataset = document.getElementById('importDataset').value;
      if(!fileInput.files.length) return this.showNotification('Select a file','warning');
      const fd = new FormData(); fd.append('file', fileInput.files[0]); fd.append('dataset', dataset);
      // upload and validate
      const resp = await fetch('/admin/imports/validate',{method:'POST',body:fd,headers:{'Authorization':'Bearer '+this.authToken}}).then(r=>r.json()).catch(()=>null);
      if(!resp) return this.showNotification('Failed to upload','error');
      // show preview and allow start
      const preview = document.getElementById('importPreview'); preview.innerHTML = `<div>Preview: ${resp.sampleCount} rows, ${resp.errors?.length||0} errors</div><button id='startImport' class='btn primary'>Start Import</button>`;
      document.getElementById('startImport').addEventListener('click', async ()=>{
        const p = await this.makeAPIRequest('/admin/imports/start','POST',{importId:resp.importId});
        if(p) this.showNotification('Import started','success');
        this.loadImports();
      });
    },

    async handleSignOut(){
      localStorage.removeItem('authToken'); localStorage.removeItem('adminName');
      window.location.href = '/login.html';
    },

    /* ========== Utility / API ========== */
    async makeAPIRequest(endpoint, method='GET', data=null){
      try{
        const headers = {};
        if(this.authToken) headers['Authorization'] = 'Bearer '+this.authToken;
        if(data && !(data instanceof FormData)) headers['Content-Type'] = 'application/json';
        const res = await fetch(API_BASE+endpoint, {method, headers, body: data && !(data instanceof FormData) ? JSON.stringify(data) : data});
        if(res.status===401){ this.showNotification('Unauthorized — please sign in again','error'); return null; }
        if(!res.ok) { console.error('API error', res.status); return null; }
        const json = await res.json().catch(()=>null);
        return json;
      }catch(err){console.error(err); return null}
    },

    showNotification(msg, type='info'){
      // simple toast
      const t = document.createElement('div'); t.className='toast'; t.textContent = msg; t.style.position='fixed'; t.style.right='16px'; t.style.bottom='16px'; t.style.padding='10px 14px'; t.style.borderRadius='8px'; t.style.background = type==='success'? 'linear-gradient(90deg,#10b981,#34d399)': type==='error'? 'linear-gradient(90deg,#ef4444,#f97316)': 'linear-gradient(90deg,#3b82f6,#60a5fa)'; t.style.color='#021'; document.body.appendChild(t); setTimeout(()=>t.remove(),5000);
    },

    filterPending(q){
      const els = document.querySelectorAll('.pending-row');
      els.forEach(r=>{ r.style.display = (q.length===0 || r.textContent.toLowerCase().includes(q.toLowerCase()))? 'flex':'none'});
    },

    renderAuditTable(items){
      const t = document.querySelector('#auditTable tbody'); t.innerHTML='';
      items.forEach(it=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${new Date(it.timestamp).toLocaleString()}</td><td>${it.actor}</td><td>${it.type}</td><td>${it.target}</td><td><button class='btn' data-id='${it.logId}' data-action='viewLog'>View</button></td>`; t.appendChild(tr); });
    },

    // simple renderers for other tables (placeholders)
    renderExportTable(items){ const t=document.querySelector('#exportTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(i=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${i.exportId}</td><td>${i.dataset}</td><td>${i.format}</td><td>${i.records}</td><td>${i.status}</td><td>${new Date(i.requestedAt).toLocaleString()}</td><td><a href='${i.downloadUrl||"#"}'>Download</a></td>`; t.appendChild(tr); }); },
    renderResidents(items){ const t=document.querySelector('#residentsTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.residentId}</td><td>${r.firstName} ${r.lastName}</td><td>${r.age||''}</td><td>${r.sex}</td><td>${r.purok}</td><td>${r.contact}</td><td>${r.status}</td><td>${new Date(r.registeredAt).toLocaleDateString()}</td><td><button class='btn' data-id='${r.residentId}'>View</button></td>`; t.appendChild(tr); }); },
    renderEvents(items){ const t=document.querySelector('#eventsTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(e=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${e.eventId}</td><td>${e.title}</td><td>${e.organizer}</td><td>${new Date(e.start).toLocaleString()}</td><td>${e.venue}</td><td>${e.status}</td><td><button class='btn'>View</button></td>`; t.appendChild(tr); }); },
    renderAnnouncements(items){ const t=document.querySelector('#annTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(a=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${a.id}</td><td>${a.title}</td><td>${a.audience}</td><td>${new Date(a.start).toLocaleString()}</td><td>${new Date(a.end).toLocaleString()}</td><td>${a.status}</td><td><button class='btn'>Edit</button></td>`; t.appendChild(tr); }); },
    renderUsers(items){ const t=document.querySelector('#usersTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(u=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${u.userId}</td><td>${u.username}</td><td>${u.fullName}</td><td>${(u.roles||[]).join(', ')}</td><td>${u.status}</td><td>${u.lastLoginAt||''}</td><td><button class='btn'>Impersonate</button></td>`; t.appendChild(tr); }); },
    renderOfficials(items){ const t=document.querySelector('#officialsTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(o=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${o.officialId}</td><td>${o.fullName}</td><td>${o.position}</td><td>${o.termStart} - ${o.termEnd}</td><td>${o.status}</td><td><button class='btn'>Assign</button></td>`; t.appendChild(tr); }); },
    renderComplaints(items){ const t=document.querySelector('#complaintsTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(c=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${c.ref}</td><td>${c.complainantName}</td><td>${c.category}</td><td>${new Date(c.dateReported).toLocaleString()}</td><td>${c.status}</td><td>${c.priority||''}</td><td><button class='btn'>View</button></td>`; t.appendChild(tr); }); },
    
    renderDocuments(items){ 
      const t=document.querySelector('#documentsTable tbody'); 
      if(!t) return; 
      t.innerHTML=''; 
      items.forEach(d=>{ 
        const tr=document.createElement('tr'); 
        const statusColor = d.status === 'approved' ? '#4ade80' : d.status === 'rejected' ? '#ff6b6b' : d.status === 'ready' ? '#2196F3' : '#ffa500';
        tr.innerHTML=`
          <td>${d.refId}</td>
          <td>${d.residentName}</td>
          <td>${this.formatDocType(d.documentType)}</td>
          <td>${new Date(d.requestedDate).toLocaleDateString()}</td>
          <td><span style="color: ${statusColor}; font-weight: 600;">${d.status.toUpperCase()}</span></td>
          <td>${d.requestedBy}</td>
          <td>${d.approvedBy || '-'}</td>
          <td>${d.notes || '-'}</td>
          <td>
            <button class="btn" onclick="adminDashboard.viewDocumentDetail('${d.refId}')">View</button>
            ${d.status === 'pending' ? `<button class="btn" onclick="adminDashboard.approveDocument('${d.refId}')">Approve</button>` : ''}
            ${d.status === 'pending' ? `<button class="btn warn" onclick="adminDashboard.rejectDocument('${d.refId}')">Reject</button>` : ''}
            ${d.status === 'approved' ? `<button class="btn" onclick="adminDashboard.markReady('${d.refId}')">Mark Ready</button>` : ''}
          </td>
        `; 
        t.appendChild(tr); 
      }); 
    },

    formatDocType(type){
      const types = {
        'barangay_clearance': 'Barangay Clearance',
        'residency': 'Residency Certificate',
        'business_permit': 'Business Permit',
        'indigent': 'Indigent Certificate',
        'solo_parent': 'Solo Parent ID',
        'certif_good_moral': 'Certificate of Good Moral',
        'other': 'Other'
      };
      return types[type] || type;
    },

    filterDocuments(query, statusFilter = '', typeFilter = ''){
      // In production, this would call API with filters
      console.log('Filtering documents:', {query, statusFilter, typeFilter});
      // Simulate API call
      const mockDocs = [
        {refId: 'DOC-2025-001', residentName: 'Juan Dela Cruz', documentType: 'barangay_clearance', requestedDate: '2025-11-10', status: 'pending', requestedBy: 'Juan DC', approvedBy: null, notes: ''},
        {refId: 'DOC-2025-002', residentName: 'Maria Santos', documentType: 'residency', requestedDate: '2025-11-12', status: 'approved', requestedBy: 'Maria S', approvedBy: 'Admin', notes: 'Verified'},
        {refId: 'DOC-2025-003', residentName: 'Pedro Reyes', documentType: 'business_permit', requestedDate: '2025-11-08', status: 'ready', requestedBy: 'Pedro R', approvedBy: 'Clerk', notes: 'Ready for pickup at barangay'},
      ];
      
      let filtered = mockDocs;
      if(query) filtered = filtered.filter(d => d.residentName.toLowerCase().includes(query.toLowerCase()) || d.refId.toLowerCase().includes(query.toLowerCase()));
      if(statusFilter) filtered = filtered.filter(d => d.status === statusFilter);
      if(typeFilter) filtered = filtered.filter(d => d.documentType === typeFilter);
      
      this.renderDocuments(filtered);
    },

    viewDocumentDetail(refId){
      alert(`Viewing document: ${refId}\n\nFull details and history would be shown in a modal.`);
    },

    approveDocument(refId){
      if(confirm(`Approve document ${refId}?`)){
        alert(`Document ${refId} has been APPROVED.\nResident will be notified.`);
        // In production: call API to update status
      }
    },

    rejectDocument(refId){
      const reason = prompt('Enter rejection reason:');
      if(reason !== null){
        alert(`Document ${refId} has been REJECTED.\nReason: ${reason}\nResident has been notified.`);
        // In production: call API to update status with reason
      }
    },

    markReady(refId){
      if(confirm(`Mark document ${refId} as ready for pickup?`)){
        alert(`Document ${refId} is now READY FOR PICKUP.\nResident has been notified.`);
        // In production: call API to update status
      }
    },

    renderAuditLogs(items){ const t=document.querySelector('#auditLogsTable tbody'); if(!t) return; t.innerHTML=''; items.forEach(l=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${l.logId}</td><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.actor}</td><td>${l.actionType}</td><td>${l.target}</td><td>${l.ip}</td><td><button class='btn'>Details</button></td>`; t.appendChild(tr); }); },
    renderImportList(items){ const el=document.getElementById('importPreview'); if(!el) return; el.innerHTML=''; items.forEach(it=>{ const d=document.createElement('div'); d.innerHTML=`<strong>${it.importId}</strong> • ${it.dataset} • ${it.status} • ${it.recordsImported}/${it.recordsTotal} <button class='btn'>View</button>`; el.appendChild(d); }); },

    /* ============================================================
       EXPORT DATA FUNCTIONALITY
    ============================================================ */
    
    handleExportSubmit(){
      const dataset = document.getElementById('exportDataset').value;
      const format = document.getElementById('exportFormat').value;
      const startDate = document.getElementById('exportStartDate').value;
      const endDate = document.getElementById('exportEndDate').value;
      const includeArchived = document.getElementById('exportIncludeArchived').checked;
      const encrypt = document.getElementById('exportEncrypt').checked;

      if(!dataset){
        alert('Please select a dataset to export');
        return;
      }

      this.generateExport({
        dataset,
        format,
        startDate,
        endDate,
        includeArchived,
        encrypt,
        createdBy: this.adminName,
        createdAt: new Date().toISOString()
      });
    },

    generateExport(config){
      // Show loading state
      const btn = document.getElementById('btnExport');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Generating Export...';

      // Simulate API call to generate export
      setTimeout(()=>{
        const exportId = 'EXP-' + Date.now();
        const recordCount = Math.floor(Math.random() * 5000) + 100;
        const fileSize = (recordCount * 0.05).toFixed(2) + ' MB';

        // Add to export history
        const exportRecord = {
          exportId,
          dataset: config.dataset,
          format: config.format,
          records: recordCount,
          size: fileSize,
          createdBy: config.createdBy,
          createdAt: config.createdAt,
          status: 'completed',
          downloadUrl: `/exports/${exportId}.${config.format}`
        };

        this.addExportToHistory(exportRecord);

        // Trigger download
        this.downloadExport(exportRecord);

        // Reset button
        btn.disabled = false;
        btn.textContent = originalText;

        alert(`✅ Export "${exportId}" generated successfully!\nFormat: ${config.format.toUpperCase()}\nRecords: ${recordCount}\nSize: ${fileSize}`);
      }, 2000);
    },

    addExportToHistory(exportRecord){
      const tbody = document.getElementById('exportHistoryBody');
      if(!tbody) return;

      // Remove "no exports" message if present
      const noDataRow = tbody.querySelector('tr[colspan]');
      if(noDataRow) noDataRow.remove();

      // Create new row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exportRecord.exportId}</td>
        <td>${this.formatDatasetName(exportRecord.dataset)}</td>
        <td>${exportRecord.format.toUpperCase()}</td>
        <td>${exportRecord.records.toLocaleString()}</td>
        <td>${exportRecord.size}</td>
        <td>${exportRecord.createdBy}</td>
        <td>${new Date(exportRecord.createdAt).toLocaleString()}</td>
        <td><span style="color: #4ade80;">✓ Completed</span></td>
        <td>
          <button class="btn" onclick="adminDashboard.downloadExport('${exportRecord.exportId}')">Download</button>
          <button class="btn" onclick="adminDashboard.deleteExport('${exportRecord.exportId}')">Delete</button>
        </td>
      `;
      tbody.insertBefore(tr, tbody.firstChild);
    },

    formatDatasetName(dataset){
      const names = {
        'residents': 'Residents',
        'events': 'Events',
        'announcements': 'Announcements',
        'officials': 'Officials',
        'complaints': 'Complaints',
        'documents': 'Documents',
        'audit_logs': 'Audit Logs',
        'users': 'Users',
        'all': 'All Data (Complete Backup)'
      };
      return names[dataset] || dataset;
    },

    downloadExport(exportRecord){
      // In a real implementation, this would fetch the file from the server
      console.log('Downloading export:', exportRecord);
      
      // Create a mock CSV download for demo
      const mockData = `Export ID,Dataset,Format,Records,Created By,Date\n${exportRecord.exportId},${exportRecord.dataset},${exportRecord.format},${exportRecord.records},${exportRecord.createdBy},${new Date(exportRecord.createdAt).toLocaleString()}`;
      
      const blob = new Blob([mockData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportRecord.exportId}.${exportRecord.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },

    deleteExport(exportId){
      if(confirm(`Delete export "${exportId}"? This action cannot be undone.`)){
        const tbody = document.getElementById('exportHistoryBody');
        if(tbody){
          const row = tbody.querySelector(`tr:has(td:first-child:contains("${exportId}"))`) || 
                      Array.from(tbody.querySelectorAll('tr')).find(r => r.firstChild.textContent === exportId);
          if(row) row.remove();
        }
        alert(`Export "${exportId}" deleted successfully.`);
      }
    },

    filterExports(query){
      const rows = document.querySelectorAll('#exportHistoryBody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = query.length === 0 || text.includes(query.toLowerCase()) ? '' : 'none';
      });
    },

    filterExportsByStatus(status){
      const rows = document.querySelectorAll('#exportHistoryBody tr');
      rows.forEach(row => {
        if(status === ''){
          row.style.display = '';
        } else {
          const statusCell = row.querySelector('td:nth-child(8)');
          row.style.display = statusCell && statusCell.textContent.toLowerCase().includes(status) ? '' : 'none';
        }
      });
    }
  };

  // expose to global for debugging
  window.adminDashboard = adminDashboard;
  
  // Real-Time Clock Updates
  function startRealTimeClock() {
    updateClockDisplay();
    setInterval(updateClockDisplay, 1000);
  }
  
  function updateClockDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const dateString = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const clockElements = document.querySelectorAll('[data-clock]');
    clockElements.forEach(el => {
      el.textContent = timeString;
    });
    
    const dateElements = document.querySelectorAll('[data-date]');
    dateElements.forEach(el => {
      el.textContent = dateString;
    });
  }
  
  // Live Data Updates
  function startLiveDataUpdates() {
    setInterval(() => {
      // Refresh current section data every 30 seconds
      if(adminDashboard.loadOverview) adminDashboard.loadOverview();
      if(adminDashboard.loadPending) adminDashboard.loadPending();
      updateLiveCalendar();
    }, 30000);
  }
  
  // Update Live Calendar
  function updateLiveCalendar() {
    const today = new Date();
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    calendarDays.forEach(day => {
      day.classList.remove('today');
      const dayNum = parseInt(day.textContent);
      if (dayNum === today.getDate() && !day.classList.contains('empty')) {
        day.classList.add('today');
        day.style.backgroundColor = '#667eea';
        day.style.color = 'white';
        day.style.fontWeight = 'bold';
      }
    });
  }
  
  // Attach to adminDashboard object
  adminDashboard.startRealTimeClock = startRealTimeClock;
  adminDashboard.startLiveDataUpdates = startLiveDataUpdates;
  adminDashboard.updateClockDisplay = updateClockDisplay;
  adminDashboard.updateLiveCalendar = updateLiveCalendar;
  
  document.addEventListener('DOMContentLoaded', ()=>adminDashboard.init());
})();