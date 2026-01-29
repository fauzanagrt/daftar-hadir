// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.config = {
            adminCredentials: {
                username: 'fauzan',
                password: 'fauzan123' // Ganti dengan password yang lebih aman!
            },
            itemsPerPage: 10,
            currentPage: 1,
            totalPages: 1,
            selectedRows: new Set(),
            allData: [],
            filteredData: [],
            currentDeleteId: null,
            currentDeleteIds: null
        };
        
        this.init();
    }
    
    // Initialize Admin Panel
    init() {
        this.checkLoginStatus();
        this.setupLoginForm();
        this.setupEventListeners();
    }
    
    // Check if user is logged in
    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        const username = localStorage.getItem('adminUsername');
        
        if (isLoggedIn && username) {
            this.showDashboard(username);
        }
    }
    
    // Setup login form
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }
    
    // Handle login
    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (username === this.config.adminCredentials.username && 
            password === this.config.adminCredentials.password) {
            
            // Save login status
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminUsername', username);
            
            this.showDashboard(username);
            this.showNotification('success', 'Login berhasil!');
        } else {
            this.showNotification('error', 'Username atau password salah!');
        }
    }
    
    // Show admin dashboard
    showDashboard(username) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.getElementById('adminName').textContent = username;
        
        // Load data
        this.loadData();
        this.updateLastUpdate();
        
        // Start auto-refresh timer (every 30 seconds)
        this.autoRefresh = setInterval(() => {
            this.loadData();
        }, 30000);
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDeleteModal();
            }
        });
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
                this.closeDeleteModal();
            }
        });
    }
    
    // Load data from localStorage
    loadData() {
        try {
            // Load from main storage
            const mainData = JSON.parse(localStorage.getItem('attendanceSubmissions') || '[]');
            
            // Load from admin backup storage
            const adminData = JSON.parse(localStorage.getItem('adminAttendanceData') || '[]');
            
            // Merge data (remove duplicates by ID)
            const allData = [...mainData, ...adminData];
            const uniqueData = this.removeDuplicates(allData);
            
            // Sort by date (newest first)
            this.config.allData = uniqueData.sort((a, b) => 
                new Date(b.submittedAt || b.timestamp) - new Date(a.submittedAt || a.timestamp)
            );
            
            // Update statistics
            this.updateStatistics();
            
            // Filter and render
            this.filterData();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('error', 'Gagal memuat data: ' + error.message);
        }
    }
    
    // Remove duplicate entries
    removeDuplicates(data) {
        const seen = new Set();
        return data.filter(item => {
            const id = item.submissionId || item.id || 
                      `${item.email}_${item.submittedAt || item.timestamp}`;
            if (seen.has(id)) {
                return false;
            }
            seen.add(id);
            return true;
        });
    }
    
    // Update statistics
    updateStatistics() {
        const data = this.config.allData;
        
        // Total registrations
        document.getElementById('totalRegistrations').textContent = data.length;
        
        // Present count
        const presentCount = data.filter(item => 
            item.attendanceStatus === 'Hadir'
        ).length;
        document.getElementById('presentCount').textContent = presentCount;
        
        // Absent count
        const absentCount = data.filter(item => 
            item.attendanceStatus === 'Tidak Hadir'
        ).length;
        document.getElementById('absentCount').textContent = absentCount;
        
        // Unique units
        const uniqueUnits = [...new Set(data.map(item => item.unitPerguruan))].length;
        document.getElementById('uniqueUnits').textContent = uniqueUnits;
        
        // Total data count
        document.getElementById('totalDataCount').textContent = data.length;
        
        // Update unit filter options
        this.updateUnitFilter();
    }
    
    // Update unit filter dropdown
    updateUnitFilter() {
        const unitFilter = document.getElementById('unitFilter');
        if (!unitFilter) return;
        
        // Get unique units
        const units = [...new Set(this.config.allData.map(item => item.unitPerguruan))].sort();
        
        // Clear existing options except the first one
        while (unitFilter.options.length > 1) {
            unitFilter.remove(1);
        }
        
        // Add new options
        units.forEach(unit => {
            if (unit) {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                unitFilter.appendChild(option);
            }
        });
    }
    
    // Filter data based on search and filters
    filterData() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const unitFilter = document.getElementById('unitFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        let filtered = [...this.config.allData];
        
        // Search filter
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filtered = filtered.filter(item => 
                (item.fullName && item.fullName.toLowerCase().includes(searchTerm)) ||
                (item.email && item.email.toLowerCase().includes(searchTerm)) ||
                (item.phone && item.phone.includes(searchTerm)) ||
                (item.submissionId && item.submissionId.toLowerCase().includes(searchTerm)) ||
                (item.prodi && item.prodi.toLowerCase().includes(searchTerm)) ||
                (item.unitPerguruan && item.unitPerguruan.toLowerCase().includes(searchTerm))
            );
        }
        
        // Status filter
        if (statusFilter && statusFilter.value) {
            filtered = filtered.filter(item => 
                item.attendanceStatus === statusFilter.value
            );
        }
        
        // Unit filter
        if (unitFilter && unitFilter.value) {
            filtered = filtered.filter(item => 
                item.unitPerguruan === unitFilter.value
            );
        }
        
        // Date filter
        if (dateFilter && dateFilter.value) {
            const filterDate = new Date(dateFilter.value);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.submittedAt || item.timestamp);
                return itemDate.toDateString() === filterDate.toDateString();
            });
        }
        
        this.config.filteredData = filtered;
        this.config.currentPage = 1;
        this.renderTable();
    }
    
    // Render data table
    renderTable() {
        const tableBody = document.getElementById('tableBody');
        const pagination = document.getElementById('pagination');
        const emptyState = document.getElementById('emptyState');
        
        if (!tableBody || !pagination || !emptyState) return;
        
        // Calculate pagination
        const totalItems = this.config.filteredData.length;
        this.config.totalPages = Math.ceil(totalItems / this.config.itemsPerPage);
        const startIndex = (this.config.currentPage - 1) * this.config.itemsPerPage;
        const endIndex = startIndex + this.config.itemsPerPage;
        const pageData = this.config.filteredData.slice(startIndex, endIndex);
        
        // Clear table
        tableBody.innerHTML = '';
        
        // Show empty state if no data
        if (pageData.length === 0) {
            tableBody.style.display = 'none';
            emptyState.style.display = 'block';
            pagination.innerHTML = '';
            
            // Update showing data count
            document.getElementById('showingData').textContent = '0';
            
            return;
        }
        
        tableBody.style.display = 'table-row-group';
        emptyState.style.display = 'none';
        
        // Populate table rows
        pageData.forEach((item, index) => {
            const actualIndex = startIndex + index + 1;
            const row = this.createTableRow(item, actualIndex);
            tableBody.appendChild(row);
        });
        
        // Update showing data count
        document.getElementById('showingData').textContent = `${startIndex + 1}-${Math.min(endIndex, totalItems)} dari ${totalItems}`;
        
        // Render pagination
        this.renderPagination();
    }
    
    // Create table row
    createTableRow(item, index) {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(item.submittedAt || item.timestamp);
        const formattedDate = date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format additional info
        let additionalInfo = '';
        if (item.attendanceStatus === 'Hadir') {
            additionalInfo = `Transport: ${item.transportation || '-'}`;
            if (item.needCertificate) additionalInfo += ', Sertifikat';
            if (item.needAccommodation) additionalInfo += ', Akomodasi';
        } else {
            additionalInfo = item.absenceReason || '-';
        }
        
        // Status badge
        const statusClass = item.attendanceStatus === 'Hadir' ? 'status-present' : 
                          item.attendanceStatus === 'Tidak Hadir' ? 'status-absent' : 'status-pending';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" 
                       class="row-checkbox" 
                       value="${item.submissionId || index}"
                       onchange="admin.toggleRowSelection(this)">
            </td>
            <td>${index}</td>
            <td><small>${item.submissionId || '-'}</small></td>
            <td><small>${formattedDate}</small></td>
            <td>${item.fullName || '-'}</td>
            <td><small>${item.email || '-'}</small></td>
            <td>${item.phone || '-'}</td>
            <td>${item.prodi || '-'}</td>
            <td><small>${item.unitPerguruan || '-'}</small></td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${item.attendanceStatus || '-'}
                </span>
            </td>
            <td><small>${additionalInfo}</small></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view" 
                            onclick="admin.viewDetail('${item.submissionId || index}')"
                            title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-delete" 
                            onclick="admin.confirmDeleteSingle('${item.submissionId || index}')"
                            title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Highlight selected rows
        const rowId = item.submissionId || index;
        if (this.config.selectedRows.has(rowId)) {
            row.classList.add('selected');
            row.querySelector('.row-checkbox').checked = true;
        }
        
        return row;
    }
    
    // Render pagination
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        if (this.config.totalPages <= 1) return;
        
        // Previous button
        const prevBtn = this.createPaginationButton(
            '<i class="fas fa-chevron-left"></i>',
            this.config.currentPage === 1,
            () => {
                if (this.config.currentPage > 1) {
                    this.config.currentPage--;
                    this.renderTable();
                }
            }
        );
        pagination.appendChild(prevBtn);
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, this.config.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(this.config.totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPaginationButton(
                i,
                i === this.config.currentPage,
                () => {
                    this.config.currentPage = i;
                    this.renderTable();
                }
            );
            pagination.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = this.createPaginationButton(
            '<i class="fas fa-chevron-right"></i>',
            this.config.currentPage === this.config.totalPages,
            () => {
                if (this.config.currentPage < this.config.totalPages) {
                    this.config.currentPage++;
                    this.renderTable();
                }
            }
        );
        pagination.appendChild(nextBtn);
    }
    
    // Create pagination button
    createPaginationButton(text, isActive, onClick) {
        const button = document.createElement('button');
        button.className = `page-btn ${isActive ? 'active' : ''}`;
        button.innerHTML = text;
        button.onclick = onClick;
        button.disabled = isActive && typeof text === 'string' && text.includes('chevron');
        return button;
    }
    
    // Toggle row selection
    toggleRowSelection(checkbox) {
        const rowId = checkbox.value;
        
        if (checkbox.checked) {
            this.config.selectedRows.add(rowId);
            checkbox.closest('tr').classList.add('selected');
        } else {
            this.config.selectedRows.delete(rowId);
            checkbox.closest('tr').classList.remove('selected');
        }
        
        // Update select all checkbox
        this.updateSelectAllCheckbox();
    }
    
    // Toggle select all
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const selectAllHeader = document.getElementById('selectAllHeader');
        const checkboxes = document.querySelectorAll('.row-checkbox');
        
        const isChecked = selectAll.checked || selectAllHeader.checked;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            this.toggleRowSelection(checkbox);
        });
    }
    
    // Update select all checkbox
    updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const selectAll = document.getElementById('selectAll');
        const selectAllHeader = document.getElementById('selectAllHeader');
        
        if (checkboxes.length === 0) {
            selectAll.checked = false;
            selectAllHeader.checked = false;
            return;
        }
        
        const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
        const allChecked = checkedCount === checkboxes.length && checkboxes.length > 0;
        
        selectAll.checked = allChecked;
        selectAllHeader.checked = allChecked;
    }
    
    // Delete selected rows
    deleteSelected() {
        const selectedIds = Array.from(this.config.selectedRows);
        
        if (selectedIds.length === 0) {
            this.showNotification('warning', 'Tidak ada data yang dipilih');
            return;
        }
        
        this.config.currentDeleteIds = selectedIds;
        this.showDeleteModal(
            `Apakah Anda yakin ingin menghapus ${selectedIds.length} data terpilih?`,
            'confirmDeleteSelected'
        );
    }
    
    // Confirm delete single
    confirmDeleteSingle(id) {
        this.config.currentDeleteId = id;
        this.showDeleteModal(
            'Apakah Anda yakin ingin menghapus data ini?',
            'confirmDeleteSingle'
        );
    }
    
    // Show delete confirmation modal
    showDeleteModal(message, callback) {
        document.getElementById('deleteMessage').textContent = message;
        document.getElementById('deleteModal').classList.add('active');
        window.currentDeleteCallback = callback;
    }
    
    // Close delete modal
    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        this.config.currentDeleteId = null;
        this.config.currentDeleteIds = null;
        window.currentDeleteCallback = null;
    }
    
    // Confirm delete
    confirmDelete() {
        const callback = window.currentDeleteCallback;
        
        if (callback === 'confirmDeleteSingle') {
            this.deleteSingleRecord();
        } else if (callback === 'confirmDeleteSelected') {
            this.deleteMultipleRecords();
        }
        
        this.closeDeleteModal();
    }
    
    // Delete single record
    deleteSingleRecord() {
        if (!this.config.currentDeleteId) return;
        
        // Find and remove from allData
        const index = this.config.allData.findIndex(item => 
            item.submissionId === this.config.currentDeleteId || 
            item.submissionId?.toString() === this.config.currentDeleteId
        );
        
        if (index !== -1) {
            this.config.allData.splice(index, 1);
            this.saveData();
            this.loadData();
            this.showNotification('success', 'Data berhasil dihapus');
        }
    }
    
    // Delete multiple records
    deleteMultipleRecords() {
        if (!this.config.currentDeleteIds || this.config.currentDeleteIds.length === 0) return;
        
        // Filter out selected items
        this.config.allData = this.config.allData.filter(item => 
            !this.config.currentDeleteIds.includes(item.submissionId) &&
            !this.config.currentDeleteIds.includes(item.submissionId?.toString())
        );
        
        this.saveData();
        this.loadData();
        this.config.selectedRows.clear();
        this.showNotification('success', `${this.config.currentDeleteIds.length} data berhasil dihapus`);
    }
    
    // View detail
    viewDetail(id) {
        const item = this.config.allData.find(item => 
            item.submissionId === id || item.submissionId?.toString() === id
        );
        
        if (!item) {
            this.showNotification('error', 'Data tidak ditemukan');
            return;
        }
        
        this.showDetailModal(item);
    }
    
    // Show detail modal
    showDetailModal(item) {
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        
        // Format date
        const date = new Date(item.submittedAt || item.timestamp);
        const formattedDate = date.toLocaleString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Format additional info
        let additionalInfo = '';
        if (item.attendanceStatus === 'Hadir') {
            additionalInfo = `
                <div class="detail-item">
                    <div class="detail-label">Transportasi</div>
                    <div class="detail-value">${item.transportation || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Butuh Sertifikat</div>
                    <div class="detail-value">${item.needCertificate ? 'Ya' : 'Tidak'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Butuh Akomodasi</div>
                    <div class="detail-value">${item.needAccommodation ? 'Ya' : 'Tidak'}</div>
                </div>
            `;
        } else {
            additionalInfo = `
                <div class="detail-item">
                    <div class="detail-label">Alasan Tidak Hadir</div>
                    <div class="detail-value">${item.absenceReason || '-'}</div>
                </div>
            `;
        }
        
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">ID Pendaftaran</div>
                    <div class="detail-value">${item.submissionId || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Tanggal Submit</div>
                    <div class="detail-value">${formattedDate}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Nama Lengkap</div>
                    <div class="detail-value">${item.fullName || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${item.email || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">No. HP/WhatsApp</div>
                    <div class="detail-value">${item.phone || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Program Studi</div>
                    <div class="detail-value">${item.prodi || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Unit Perguruan</div>
                    <div class="detail-value">${item.unitPerguruan || '-'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Status Kehadiran</div>
                    <div class="detail-value">
                        <span class="status-badge ${item.attendanceStatus === 'Hadir' ? 'status-present' : 'status-absent'}">
                            ${item.attendanceStatus || '-'}
                        </span>
                    </div>
                </div>
                
                ${additionalInfo}
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    // Close modal
    closeModal() {
        document.getElementById('detailModal').classList.remove('active');
    }
    
    // Print detail
    printDetail() {
        const printContent = document.getElementById('detailContent').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Detail Pendaftaran</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .print-header { 
                        text-align: center; 
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .detail-item { margin-bottom: 15px; }
                    .detail-label { font-weight: bold; color: #333; }
                    .detail-value { 
                        color: #666; 
                        padding: 8px;
                        background: #f5f5f5;
                        border-radius: 4px;
                        margin-top: 5px;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                    }
                    .status-present { background: #d1fae5; color: #065f46; }
                    .status-absent { background: #fee2e2; color: #991b1b; }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Detail Pendaftaran</h1>
                    <h3>Kongres IV UKM XYZ - 31 Januari 2024</h3>
                </div>
                ${printContent}
                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-print"></i> Cetak
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                </div>
            </body>
            </html>
        `;
        
        window.print();
        
        // Restore original content
        setTimeout(() => {
            document.body.innerHTML = originalContent;
            this.renderTable(); // Re-render table
        }, 100);
    }
    
    // Save data to localStorage
    saveData() {
        try {
            localStorage.setItem('attendanceSubmissions', JSON.stringify(this.config.allData));
            localStorage.setItem('adminAttendanceData', JSON.stringify(this.config.allData));
            this.updateLastUpdate();
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('error', 'Gagal menyimpan data: ' + error.message);
        }
    }
    
    // Export data
    exportData(format) {
        if (this.config.allData.length === 0) {
            this.showNotification('warning', 'Tidak ada data untuk di-export');
            return;
        }
        
        if (format === 'csv') {
            this.exportToCSV();
        } else if (format === 'json') {
            this.exportToJSON();
        }
    }
    
    // Export to CSV
    exportToCSV() {
        const headers = [
            'No',
            'ID Pendaftaran',
            'Tanggal',
            'Nama Lengkap',
            'Email',
            'No. HP',
            'Program Studi',
            'Unit Perguruan',
            'Status Kehadiran',
            'Alasan/Keterangan',
            'Transportasi',
            'Butuh Sertifikat',
            'Butuh Akomodasi',
            'Waktu Submit'
        ];
        
        const csvRows = [
            headers.join(','),
            ...this.config.allData.map((row, index) => {
                const values = [
                    index + 1,
                    `"${row.submissionId || ''}"`,
                    `"${new Date(row.submittedAt || row.timestamp).toLocaleString('id-ID')}"`,
                    `"${row.fullName || ''}"`,
                    `"${row.email || ''}"`,
                    `"${row.phone || ''}"`,
                    `"${row.prodi || ''}"`,
                    `"${row.unitPerguruan || ''}"`,
                    `"${row.attendanceStatus || ''}"`,
                    `"${row.attendanceStatus === 'Hadir' ? 
                        `Transportasi: ${row.transportation || '-'}, Sertifikat: ${row.needCertificate ? 'Ya' : 'Tidak'}, Akomodasi: ${row.needAccommodation ? 'Ya' : 'Tidak'}` : 
                        row.absenceReason || ''}"`,
                    `"${row.transportation || ''}"`,
                    `"${row.needCertificate ? 'Ya' : 'Tidak'}"`,
                    `"${row.needAccommodation ? 'Ya' : 'Tidak'}"`,
                    `"${row.submittedAt || row.timestamp || ''}"`
                ];
                return values.join(',');
            })
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `daftar-hadir-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Data berhasil di-export ke CSV');
    }
    
    // Export to JSON
    exportToJSON() {
        const jsonString = JSON.stringify(this.config.allData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `daftar-hadir-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Data berhasil di-export ke JSON');
    }
    
    // Clear all data
    clearAllData() {
        if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data pendaftaran! Apakah Anda yakin?')) {
            return;
        }
        
        if (!confirm('SERIUS? Semua data akan hilang permanen! Tekan OK untuk melanjutkan.')) {
            return;
        }
        
        localStorage.removeItem('attendanceSubmissions');
        localStorage.removeItem('adminAttendanceData');
        localStorage.removeItem('attendanceFormDraft');
        localStorage.removeItem('lastSubmission');
        
        this.config.allData = [];
        this.config.filteredData = [];
        this.config.selectedRows.clear();
        
        this.loadData();
        this.showNotification('success', 'Semua data berhasil dihapus');
    }
    
    // Refresh data
    refreshData() {
        this.loadData();
        this.showNotification('info', 'Data berhasil di-refresh');
    }
    
    // Update last update timestamp
    updateLastUpdate() {
        const now = new Date();
        const formattedTime = now.toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = formattedTime;
    }
    
    // Logout
    logout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            clearInterval(this.autoRefresh);
            
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminUsername');
            
            document.getElementById('adminDashboard').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
            
            // Reset login form
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            this.showNotification('info', 'Anda telah logout');
        }
    }
    
    // Show notification
    showNotification(type, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${
                type === 'success' ? '#10b981' :
                type === 'error' ? '#ef4444' :
                type === 'warning' ? '#f59e0b' : '#3b82f6'
            };
            border-radius: 8px;
            padding: 16px 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.querySelector('i').style.cssText = `
            color: ${
                type === 'success' ? '#10b981' :
                type === 'error' ? '#ef4444' :
                type === 'warning' ? '#f59e0b' : '#3b82f6'
            };
            font-size: 1.2em;
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add CSS for animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        document.head.appendChild(style);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Initialize Admin Panel
const admin = new AdminPanel();

// Make admin instance available globally for inline event handlers
window.admin = admin;

// Global functions for inline event handlers
window.refreshData = () => admin.refreshData();
window.exportData = (format) => admin.exportData(format);
window.clearAllData = () => admin.clearAllData();
window.logout = () => admin.logout();
window.filterData = () => admin.filterData();
window.toggleSelectAll = () => admin.toggleSelectAll();
window.deleteSelected = () => admin.deleteSelected();
window.closeModal = () => admin.closeModal();
window.closeDeleteModal = () => admin.closeDeleteModal();
window.confirmDelete = () => admin.confirmDelete();
window.printDetail = () => admin.printDetail();