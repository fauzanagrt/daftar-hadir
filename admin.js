// Admin Panel JavaScript untuk Kongres IV UKM Pencak Silat
class AdminPanel {
    constructor() {
        this.config = {
            // URL Google Apps Script (SAMA DENGAN DI SCRIPT.JS)
            GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwqYqfAIkZLi-TAdKy2-hSOUbC-ZJhwvSy6S77LllLA1IBdIXY8s5G00LBh-rYBCokg/exec',
            
            // Login credentials
            ADMIN_USERNAME: 'admin',
            ADMIN_PASSWORD: 'fauzan123',
            
            // Data management
            itemsPerPage: 20,
            currentPage: 1,
            totalPages: 1,
            allData: [],
            filteredData: [],
            statistics: {
                total: 0,
                present: 0,
                absent: 0,
                units: new Set()
            },
            
            // UI state
            selectedRows: new Set(),
            isLoading: false
        };
        
        this.init();
    }
    
    // Initialize Admin Panel
    init() {
        console.log('🚀 Admin Panel Initializing...');
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
            this.loadData();
        } else {
            console.log('🔒 User not logged in');
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
        
        if (username === this.config.ADMIN_USERNAME && 
            password === this.config.ADMIN_PASSWORD) {
            
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
        document.getElementById('adminGreeting').textContent = ` - Logged in as ${username}`;
        
        this.loadData();
        
        // Auto-refresh every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            if (!this.config.isLoading) {
                this.loadData();
            }
        }, 30000);
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
    }
    
    // Load data from Google Sheets
    async loadData() {
        try {
            this.config.isLoading = true;
            this.showLoading(true);
            
            console.log('📥 Loading data from Google Sheets...');
            
            // Coba ambil dari Google Sheets
            const response = await fetch(`${this.config.GOOGLE_SCRIPT_URL}?action=getData`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.config.allData = result.data;
                console.log(`✅ Loaded ${this.config.allData.length} records from Google Sheets`);
            } else {
                // Fallback ke localStorage
                await this.loadLocalBackup();
                throw new Error('Gagal mengambil data dari Google Sheets');
            }
            
        } catch (error) {
            console.error('❌ Error loading from Google Sheets:', error);
            
            // Fallback ke localStorage backup
            await this.loadLocalBackup();
            
            this.showNotification('warning', 
                'Menggunakan data lokal. ' + 
                'Pastikan koneksi internet tersedia untuk sinkronisasi.'
            );
            
        } finally {
            this.config.isLoading = false;
            this.showLoading(false);
            
            // Update statistics dan tampilkan data
            this.updateStatistics();
            this.filterData();
            this.updateLastUpdate();
        }
    }
    
    // Load data from local backup
    async loadLocalBackup() {
        try {
            const backupData = JSON.parse(localStorage.getItem('form_backup') || '[]');
            const sheetData = JSON.parse(localStorage.getItem('adminAttendanceData') || '[]');
            const lastSub = JSON.parse(localStorage.getItem('lastSubmission') || '[]');
            
            // Gabungkan semua data lokal
            let allLocalData = [...backupData, ...sheetData];
            if (lastSub && lastSub.submissionId) {
                allLocalData.push(lastSub);
            }
            
            // Hapus duplikat berdasarkan submissionId
            const uniqueData = [];
            const seenIds = new Set();
            
            allLocalData.forEach(item => {
                if (item.submissionId && !seenIds.has(item.submissionId)) {
                    seenIds.add(item.submissionId);
                    uniqueData.push(item);
                }
            });
            
            this.config.allData = uniqueData.sort((a, b) => 
                new Date(b.timestamp || b.backupTimestamp || 0) - 
                new Date(a.timestamp || a.backupTimestamp || 0)
            );
            
            console.log(`📂 Loaded ${this.config.allData.length} records from local backup`);
            
        } catch (error) {
            console.error('❌ Error loading local backup:', error);
            this.config.allData = [];
        }
    }
    
    // Sinkronisasi data lokal ke Google Sheets
    async syncLocalData() {
        try {
            const backupData = JSON.parse(localStorage.getItem('form_backup') || '[]');
            
            if (backupData.length === 0) {
                this.showNotification('info', 'Tidak ada data lokal yang perlu disinkronisasi');
                return;
            }
            
            this.showNotification('info', `Menyinkronisasi ${backupData.length} data lokal...`);
            
            // Kirim satu per satu ke Google Sheets
            let successCount = 0;
            let errorCount = 0;
            
            for (const data of backupData) {
                try {
                    await this.saveToGoogleSheets(data);
                    successCount++;
                    
                    // Tunggu sebentar agar tidak rate limit
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error('Error syncing data:', error);
                    errorCount++;
                }
            }
            
            // Clear backup jika semua berhasil
            if (errorCount === 0) {
                localStorage.removeItem('form_backup');
                this.showNotification('success', 
                    `${successCount} data berhasil disinkronisasi!`
                );
            } else {
                this.showNotification('warning', 
                    `${successCount} data berhasil, ${errorCount} gagal`
                );
            }
            
            // Reload data
            await this.loadData();
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.showNotification('error', 'Gagal sinkronisasi: ' + error.message);
        }
    }
    
    // Save data to Google Sheets (untuk sync)
    async saveToGoogleSheets(data) {
        try {
            const response = await fetch(this.config.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            return true;
            
        } catch (error) {
            throw error;
        }
    }
    
    // Update statistics
    updateStatistics() {
        const data = this.config.allData;
        const stats = {
            total: data.length,
            present: data.filter(item => item.attendanceStatus === 'Hadir').length,
            absent: data.filter(item => item.attendanceStatus === 'Tidak Hadir').length,
            units: new Set(data.map(item => item.unitPerguruan).filter(Boolean))
        };
        
        this.config.statistics = stats;
        this.displayStatistics();
    }
    
    // Display statistics
    displayStatistics() {
        const stats = this.config.statistics;
        const container = document.getElementById('statsContainer');
        
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-card total">
                <i class="fas fa-database"></i>
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">Total Peserta</div>
            </div>
            <div class="stat-card present">
                <i class="fas fa-user-check"></i>
                <div class="stat-number">${stats.present}</div>
                <div class="stat-label">Akan Hadir</div>
            </div>
            <div class="stat-card absent">
                <i class="fas fa-user-times"></i>
                <div class="stat-number">${stats.absent}</div>
                <div class="stat-label">Tidak Hadir</div>
            </div>
            <div class="stat-card units">
                <i class="fas fa-university"></i>
                <div class="stat-number">${stats.units.size}</div>
                <div class="stat-label">Unit Perguruan</div>
            </div>
        `;
    }
    
    // Filter data
    filterData() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const unitFilter = document.getElementById('unitFilter')?.value || '';
        
        let filtered = [...this.config.allData];
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(item => 
                (item.fullName && item.fullName.toLowerCase().includes(searchTerm)) ||
                (item.email && item.email.toLowerCase().includes(searchTerm)) ||
                (item.phone && item.phone.includes(searchTerm)) ||
                (item.unitPerguruan && item.unitPerguruan.toLowerCase().includes(searchTerm)) ||
                (item.prodi && item.prodi.toLowerCase().includes(searchTerm)) ||
                (item.submissionId && item.submissionId.toLowerCase().includes(searchTerm))
            );
        }
        
        // Status filter
        if (statusFilter) {
            filtered = filtered.filter(item => 
                item.attendanceStatus === statusFilter
            );
        }
        
        // Unit filter
        if (unitFilter) {
            filtered = filtered.filter(item => 
                item.unitPerguruan === unitFilter
            );
        }
        
        this.config.filteredData = filtered;
        this.displayData();
    }
    
    // Display data in table
    displayData() {
        const container = document.getElementById('dataContainer');
        if (!container) return;
        
        const data = this.config.filteredData;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: var(--radius);">
                    <i class="fas fa-database" style="font-size: 3rem; color: var(--gray); margin-bottom: 20px;"></i>
                    <h3>Tidak Ada Data</h3>
                    <p>Tidak ada data yang sesuai dengan filter yang dipilih.</p>
                    <button class="btn btn-primary" onclick="admin.syncLocalData()" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> Coba Sinkronisasi Data
                    </button>
                </div>
            `;
            return;
        }
        
        // Update unit filter options
        this.updateUnitFilter();
        
        let html = `
            <div class="data-table-container">
                <div class="table-header">
                    <div>
                        <strong>Menampilkan ${data.length} dari ${this.config.allData.length} data</strong>
                    </div>
                    <div style="color: var(--gray); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Klik alasan untuk melihat lengkap
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">No</th>
                                <th>Nama Peserta</th>
                                <th>Kontak</th>
                                <th>Prodi & Unit</th>
                                <th style="width: 100px;">Status</th>
                                <th>Alasan</th>
                                <th style="width: 150px;">Waktu Submit</th>
                                <th style="width: 80px;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.forEach((item, index) => {
            // Format tanggal
            const date = item.timestamp || item.submittedAt || item.backupTimestamp;
            const formattedDate = date ? 
                new Date(date).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '-';
            
            // Alasan (hadir atau tidak hadir)
            const reason = item.hadirReason || item.absenceReason || '-';
            const reasonType = item.attendanceStatus === 'Hadir' ? 'Alasan Hadir' : 'Alasan Tidak Hadir';
            
            // Format alasan untuk preview
            const reasonPreview = reason.length > 100 ? 
                reason.substring(0, 100) + '...' : reason;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${item.fullName || '-'}</strong>
                        <div style="font-size: 0.85rem; color: var(--gray);">
                            ID: ${item.submissionId || '-'}
                        </div>
                    </td>
                    <td>
                        <div>${item.email || '-'}</div>
                        <div style="font-size: 0.85rem;">${item.phone || '-'}</div>
                    </td>
                    <td>
                        <div><strong>${item.prodi || '-'}</strong></div>
                        <div style="font-size: 0.85rem; color: var(--gray);">
                            ${item.unitPerguruan || '-'}
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${item.attendanceStatus === 'Hadir' ? 'status-hadir' : 'status-tidak-hadir'}">
                            ${item.attendanceStatus || '-'}
                        </span>
                    </td>
                    <td class="reason-cell">
                        <div class="reason-preview">
                            <strong>${reasonType}:</strong> ${reasonPreview}
                        </div>
                        ${reason.length > 100 ? `
                            <button class="show-reason-btn" onclick="admin.showReason('${item.submissionId}')">
                                <i class="fas fa-expand-alt"></i> Lihat Selengkapnya
                            </button>
                        ` : ''}
                    </td>
                    <td>
                        <small>${formattedDate}</small>
                    </td>
                    <td>
                        <button class="show-reason-btn" onclick="admin.showDetail('${item.submissionId}')" 
                                title="Lihat Detail">
                            <i class="fas fa-eye"></i> Detail
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    // Update unit filter options
    updateUnitFilter() {
        const unitFilter = document.getElementById('unitFilter');
        if (!unitFilter) return;
        
        const units = [...this.config.statistics.units].sort();
        
        // Simpan nilai yang dipilih
        const currentValue = unitFilter.value;
        
        // Clear options except first one
        while (unitFilter.options.length > 1) {
            unitFilter.remove(1);
        }
        
        // Add new options
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitFilter.appendChild(option);
        });
        
        // Restore selected value
        unitFilter.value = currentValue;
    }
    
    // Show reason in modal
    showReason(submissionId) {
        const item = this.config.allData.find(item => item.submissionId === submissionId);
        if (!item) return;
        
        const reason = item.hadirReason || item.absenceReason || '-';
        const reasonType = item.attendanceStatus === 'Hadir' ? 'Alasan Hadir' : 'Alasan Tidak Hadir';
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('modalContent');
        
        content.innerHTML = `
            <div class="modal-detail">
                <label>Nama Peserta</label>
                <div class="value">${item.fullName || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Status Kehadiran</label>
                <div class="value">
                    <span class="status-badge ${item.attendanceStatus === 'Hadir' ? 'status-hadir' : 'status-tidak-hadir'}">
                        ${item.attendanceStatus || '-'}
                    </span>
                </div>
            </div>
            <div class="modal-detail">
                <label>${reasonType}</label>
                <div class="modal-reason">
                    ${reason.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    // Show full detail
    showDetail(submissionId) {
        const item = this.config.allData.find(item => item.submissionId === submissionId);
        if (!item) return;
        
        const reason = item.hadirReason || item.absenceReason || '-';
        const reasonType = item.attendanceStatus === 'Hadir' ? 'Alasan Hadir' : 'Alasan Tidak Hadir';
        
        // Format tanggal
        const date = item.timestamp || item.submittedAt || item.backupTimestamp;
        const formattedDate = date ? 
            new Date(date).toLocaleString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '-';
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('modalContent');
        
        content.innerHTML = `
            <div class="modal-detail">
                <label>ID Pendaftaran</label>
                <div class="value">${item.submissionId || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Nama Lengkap</label>
                <div class="value">${item.fullName || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Email</label>
                <div class="value">${item.email || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Nomor HP/WhatsApp</label>
                <div class="value">${item.phone || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Program Studi</label>
                <div class="value">${item.prodi || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Unit Perguruan</label>
                <div class="value">${item.unitPerguruan || '-'}</div>
            </div>
            <div class="modal-detail">
                <label>Status Kehadiran</label>
                <div class="value">
                    <span class="status-badge ${item.attendanceStatus === 'Hadir' ? 'status-hadir' : 'status-tidak-hadir'}">
                        ${item.attendanceStatus || '-'}
                    </span>
                </div>
            </div>
            <div class="modal-detail">
                <label>${reasonType}</label>
                <div class="modal-reason">
                    ${reason.replace(/\n/g, '<br>')}
                </div>
            </div>
            <div class="modal-detail">
                <label>Waktu Submit</label>
                <div class="value">${formattedDate}</div>
            </div>
            ${item.ipAddress ? `
                <div class="modal-detail">
                    <label>IP Address</label>
                    <div class="value">${item.ipAddress || '-'}</div>
                </div>
            ` : ''}
        `;
        
        modal.classList.add('active');
    }
    
    // Close modal
    closeModal() {
        document.getElementById('detailModal').classList.remove('active');
    }
    
    // Show loading state
    showLoading(show) {
        const dataContainer = document.getElementById('dataContainer');
        if (!dataContainer) return;
        
        if (show) {
            dataContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: var(--radius);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--gray); margin-bottom: 20px;"></i>
                    <h3>Memuat Data...</h3>
                    <p>Silakan tunggu sebentar</p>
                </div>
            `;
        }
    }
    
    // Update last update time
    updateLastUpdate() {
        const now = new Date();
        const formattedTime = now.toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = formattedTime;
        }
    }
    
    // Refresh data
    async refreshData() {
        await this.loadData();
        this.showNotification('success', 'Data berhasil di-refresh');
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
            'Nama Lengkap',
            'Email',
            'No. HP',
            'Program Studi',
            'Unit Perguruan',
            'Status Kehadiran',
            'Alasan/Keterangan',
            'Waktu Submit'
        ];
        
        const csvRows = [
            headers.join(','),
            ...this.config.allData.map((row, index) => {
                const values = [
                    index + 1,
                    `"${row.submissionId || ''}"`,
                    `"${row.fullName || ''}"`,
                    `"${row.email || ''}"`,
                    `"${row.phone || ''}"`,
                    `"${row.prodi || ''}"`,
                    `"${row.unitPerguruan || ''}"`,
                    `"${row.attendanceStatus || ''}"`,
                    `"${(row.hadirReason || row.absenceReason || '').replace(/"/g, '""')}"`,
                    `"${new Date(row.timestamp || row.submittedAt || Date.now()).toLocaleString('id-ID')}"`
                ];
                return values.join(',');
            })
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `data-kehadiran-kongres-${new Date().toISOString().split('T')[0]}.csv`;
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
        link.download = `data-kehadiran-kongres-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Data berhasil di-export ke JSON');
    }
    
    // Print data
    printData() {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Data Kehadiran Kongres IV UKM Pencak Silat</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
                    td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
                    .reason { max-width: 300px; word-wrap: break-word; }
                    @media print {
                        @page { margin: 0.5in; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Data Kehadiran Kongres IV UKM Pencak Silat</h1>
                <p>Total Data: ${this.config.allData.length} | Dicetak: ${new Date().toLocaleString('id-ID')}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama</th>
                            <th>Prodi</th>
                            <th>Unit</th>
                            <th>Status</th>
                            <th class="reason">Alasan</th>
                            <th>Waktu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.config.allData.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.fullName || '-'}</td>
                                <td>${item.prodi || '-'}</td>
                                <td>${item.unitPerguruan || '-'}</td>
                                <td>${item.attendanceStatus || '-'}</td>
                                <td class="reason">${item.hadirReason || item.absenceReason || '-'}</td>
                                <td>${new Date(item.timestamp || item.submittedAt || Date.now()).toLocaleDateString('id-ID')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-print"></i> Cetak
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    // Clear all data
    clearAllData() {
        if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data peserta! Apakah Anda yakin?')) {
            return;
        }
        
        if (!confirm('SERIUS? Semua data akan hilang permanen! Tekan OK untuk melanjutkan.')) {
            return;
        }
        
        // Clear all storage
        localStorage.removeItem('form_backup');
        localStorage.removeItem('adminAttendanceData');
        localStorage.removeItem('lastSubmission');
        
        this.config.allData = [];
        this.config.filteredData = [];
        this.updateStatistics();
        this.displayData();
        
        this.showNotification('success', 'Semua data berhasil dihapus');
    }
    
    // Logout
    logout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            // Clear auto-refresh interval
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
            
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminUsername');
            
            document.getElementById('adminDashboard').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
            
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            this.showNotification('info', 'Anda telah logout');
        }
    }
    
    // Show notification
    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${colors[type]};
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
        
        notification.querySelector('i').style.color = colors[type];
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
        
        // Add CSS for animation
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
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
        }
    }
}

// Initialize Admin Panel
const admin = new AdminPanel();

// Make admin available globally
window.admin = admin;
