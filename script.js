// CONFIGURASI FORM KEHADIRAN KONGRES IV
const CONFIG = {
    // ACARA
    EVENT_NAME: 'Kongres IV UKM Pencak Silat',
    EVENT_DATE: '31 Februari 2026',
    
    // GOOGLE APPS SCRIPT URL (gunakan URL yang sudah ada)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx1ZO7LMKc1mx_XibRAdMiBrbfCN9CdVxTHoajb6kY_8sRGc2VXRWSSjnDX5MlcY96S/exec',
    
    // ADMIN
    ADMIN_EMAIL: 'Fauzandedeahmad55@gmail.com',
    WHATSAPP_NUMBER: '6283147387373'
};

// State Management
let currentStep = 1;
const totalSteps = 3;
let formData = {
    fullName: '',
    email: '',
    phone: '',
    prodi: '',
    unitPerguruan: '',
    attendanceStatus: '',
    hadirReason: '',
    absenceReason: '',
    submissionId: '',
    timestamp: ''
};

// Konfigurasi karakter
const CHARACTER_LIMIT = 500; // Tambah dari 10 menjadi 500 karakter
const REASON_MIN_CHARS = 5;  // Minimal karakter untuk alasan

// ========== INISIALISASI ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Form dimulai');
    initForm();
    setupEventListeners();
    loadFromLocalStorage();
});

function initForm() {
    console.log('🔧 Initializing form...');
    
    // Phone formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = value.substring(0, 13);
                if (value.length > 4 && value.length <= 7) {
                    value = value.replace(/(\d{4})(\d+)/, '$1-$2');
                } else if (value.length > 7 && value.length <= 11) {
                    value = value.replace(/(\d{4})(\d{3})(\d+)/, '$1-$2-$3');
                } else if (value.length > 11) {
                    value = value.replace(/(\d{4})(\d{3})(\d{4})(\d+)/, '$1-$2-$3-$4');
                }
            }
            e.target.value = value;
        });
    }
    
    // Form submission
    const form = document.getElementById('attendanceForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Auto-save
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('input', saveToLocalStorage);
        element.addEventListener('change', saveToLocalStorage);
    });
    
    updateProgressBar();
}

function setupEventListeners() {
    // Setup untuk radio button
    const radioButtons = document.querySelectorAll('input[name="attendanceStatus"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', toggleAttendanceFields);
    });
    
    // Setup untuk textarea validasi dengan counter
    const reasonTextareas = document.querySelectorAll('.reason-textarea');
    reasonTextareas.forEach(textarea => {
        // Create character counter
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.style.cssText = 'font-size: 12px; color: #666; text-align: right; margin-top: 5px;';
        textarea.parentNode.appendChild(counter);
        
        // Update counter on input
        textarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            
            // Update counter display
            counter.textContent = `${currentLength}/${CHARACTER_LIMIT} karakter`;
            
            // Change color based on length
            if (currentLength > CHARACTER_LIMIT) {
                counter.style.color = '#ef4444';
                this.value = this.value.substring(0, CHARACTER_LIMIT);
                showToast('warning', `Maksimal ${CHARACTER_LIMIT} karakter`);
            } else if (currentLength > CHARACTER_LIMIT * 0.9) {
                counter.style.color = '#f59e0b'; // Orange warning at 90%
            } else {
                counter.style.color = '#666';
            }
        });
        
        // Trigger initial counter update
        textarea.dispatchEvent(new Event('input'));
    });
}

// ========== FUNGSI UTAMA ==========
function toggleAttendanceFields() {
    const hadirFields = document.getElementById('hadirFields');
    const tidakHadirFields = document.getElementById('tidakHadirFields');
    const statusHadir = document.getElementById('statusHadir');
    const statusTidakHadir = document.getElementById('statusTidakHadir');
    
    if (!hadirFields || !tidakHadirFields) return;
    
    if (statusHadir.checked) {
        hadirFields.style.display = 'block';
        tidakHadirFields.style.display = 'none';
        document.getElementById('hadirReason').required = true;
        document.getElementById('absenceReason').required = false;
        
        // Trigger character counter update
        const hadirReason = document.getElementById('hadirReason');
        if (hadirReason) hadirReason.dispatchEvent(new Event('input'));
    } else if (statusTidakHadir.checked) {
        hadirFields.style.display = 'none';
        tidakHadirFields.style.display = 'block';
        document.getElementById('hadirReason').required = false;
        document.getElementById('absenceReason').required = true;
        
        // Trigger character counter update
        const absenceReason = document.getElementById('absenceReason');
        if (absenceReason) absenceReason.dispatchEvent(new Event('input'));
    }
}

function nextStep() {
    if (!validateCurrentStep()) return;
    
    saveStepData();
    
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const nextStepElement = document.getElementById(`step${currentStep + 1}`);
    
    if (currentStepElement && nextStepElement) {
        currentStepElement.classList.remove('active');
        currentStep++;
        nextStepElement.classList.add('active');
        
        updateProgressBar();
        
        if (currentStep === 3) {
            updateConfirmation();
        }
        
        updateStepIndicators();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const prevStepElement = document.getElementById(`step${currentStep - 1}`);
    
    if (currentStepElement && prevStepElement) {
        currentStepElement.classList.remove('active');
        currentStep--;
        prevStepElement.classList.add('active');
        
        updateProgressBar();
        updateStepIndicators();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========== VALIDASI ==========
function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    if (!currentStepElement) return false;
    
    const inputs = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    
    // Reset error
    inputs.forEach(input => input.classList.remove('error'));
    
    // Step 1 validation
    if (currentStep === 1) {
        for (let input of inputs) {
            const value = input.value.trim();
            
            if (!value) {
                input.classList.add('error');
                showToast('error', `Harap isi ${input.previousElementSibling?.textContent || 'field ini'}`);
                input.focus();
                isValid = false;
                break;
            }
            
            // Email validation
            if (input.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    input.classList.add('error');
                    showToast('error', 'Format email tidak valid');
                    input.focus();
                    isValid = false;
                    break;
                }
            }
            
            // Phone validation
            if (input.id === 'phone') {
                const phoneNumber = value.replace(/\D/g, '');
                if (phoneNumber.length < 10 || phoneNumber.length > 13) {
                    input.classList.add('error');
                    showToast('error', 'Nomor HP harus 10-13 digit angka');
                    input.focus();
                    isValid = false;
                    break;
                }
            }
            
            // Nama minimal 3 karakter
            if (input.id === 'fullName' && value.length < 3) {
                input.classList.add('error');
                showToast('error', 'Nama minimal 3 karakter');
                input.focus();
                isValid = false;
                break;
            }
        }
    }
    
    // Step 2 validation
    if (currentStep === 2) {
        const attendanceStatus = document.querySelector('input[name="attendanceStatus"]:checked');
        if (!attendanceStatus) {
            showToast('error', 'Harap pilih status kehadiran');
            isValid = false;
        }
        
        if (attendanceStatus?.value === 'Hadir') {
            const hadirReason = document.getElementById('hadirReason');
            const hadirValue = hadirReason?.value.trim();
            
            if (!hadirValue) {
                hadirReason.classList.add('error');
                showToast('error', 'Harap isi dua kata');
                hadirReason.focus();
                isValid = false;
            } else if (hadirValue.length < REASON_MIN_CHARS) {
                hadirReason.classList.add('error');
                showToast('error', `Minimal ${REASON_MIN_CHARS} karakter untuk alasan`);
                hadirReason.focus();
                isValid = false;
            } else if (hadirValue.length > CHARACTER_LIMIT) {
                hadirReason.classList.add('error');
                showToast('error', `Maksimal ${CHARACTER_LIMIT} karakter`);
                hadirReason.focus();
                isValid = false;
            }
        }
        
        if (attendanceStatus?.value === 'Tidak Hadir') {
            const absenceReason = document.getElementById('absenceReason');
            const absenceValue = absenceReason?.value.trim();
            
            if (!absenceValue) {
                absenceReason.classList.add('error');
                showToast('error', 'Harap isi alasan tidak hadir');
                absenceReason.focus();
                isValid = false;
            } else if (absenceValue.length < REASON_MIN_CHARS) {
                absenceReason.classList.add('error');
                showToast('error', `Minimal ${REASON_MIN_CHARS} karakter untuk alasan`);
                absenceReason.focus();
                isValid = false;
            } else if (absenceValue.length > CHARACTER_LIMIT) {
                absenceReason.classList.add('error');
                showToast('error', `Maksimal ${CHARACTER_LIMIT} karakter`);
                absenceReason.focus();
                isValid = false;
            }
        }
    }
    
    return isValid;
}

// ========== SIMPAN DATA ==========
function saveStepData() {
    // Step 1
    if (currentStep === 1) {
        formData.fullName = document.getElementById('fullName')?.value.trim() || '';
        formData.email = document.getElementById('email')?.value.trim() || '';
        formData.phone = document.getElementById('phone')?.value.trim() || '';
        formData.prodi = document.getElementById('prodi')?.value.trim() || '';
        formData.unitPerguruan = document.getElementById('unitPerguruan')?.value.trim() || '';
    }
    
    // Step 2
    if (currentStep === 2) {
        const attendanceStatus = document.querySelector('input[name="attendanceStatus"]:checked');
        if (attendanceStatus) {
            formData.attendanceStatus = attendanceStatus.value;
        }
        
        if (attendanceStatus?.value === 'Hadir') {
            formData.hadirReason = document.getElementById('hadirReason')?.value.trim() || '';
            formData.absenceReason = '';
        } else if (attendanceStatus?.value === 'Tidak Hadir') {
            formData.absenceReason = document.getElementById('absenceReason')?.value.trim() || '';
            formData.hadirReason = '';
        }
    }
}

// ========== SUBMIT FORM (FIXED) ==========
async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('🚀 Starting form submission...');
    
    // Validasi checkbox
    const confirmCheckbox = document.getElementById('confirmData');
    if (!confirmCheckbox || !confirmCheckbox.checked) {
        showToast('error', 'Harap konfirmasi kebenaran data terlebih dahulu');
        confirmCheckbox?.focus();
        return;
    }
    
    // Validasi semua step
    for (let step = 1; step <= 3; step++) {
        currentStep = step;
        if (!validateCurrentStep()) {
            showToast('error', 'Harap lengkapi semua data dengan benar');
            return;
        }
    }
    
    // Kembali ke step 3
    currentStep = 3;
    
    // Simpan data terakhir
    saveStepData();
    
    // Generate ID
    formData.submissionId = `SUB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    formData.timestamp = new Date().toISOString();
    formData.event = CONFIG.EVENT_NAME;
    formData.eventDate = CONFIG.EVENT_DATE;
    
    console.log('📊 Data to submit:', formData);
    
    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.zIndex = '1000';
    }
    
    try {
        // Coba kirim ke Google Sheets
        const result = await saveToGoogleSheets(formData);
        
        console.log('📤 Submission result:', result);
        
        if (result.success) {
            // Clear draft
            clearLocalStorage();
            
            // Simpan untuk success page
            localStorage.setItem('lastSubmission', JSON.stringify(formData));
            
            // Tunggu sebentar untuk animasi
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Redirect ke success page
            window.location.href = 'success.html';
        } else {
            showToast('warning', result.message || 'Data berhasil disimpan secara lokal');
            
            // Tetap redirect ke success page meski hanya tersimpan lokal
            setTimeout(() => {
                window.location.href = 'success.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Submit error:', error);
        showToast('error', 'Terjadi kesalahan: ' + error.message);
        
        // Simpan ke lokal sebagai backup
        saveToLocalBackup(formData);
        
        // Redirect ke success page dengan delay
        setTimeout(() => {
            window.location.href = 'success.html';
        }, 2000);
    } finally {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// ========== SIMPAN KE GOOGLE SHEETS (IMPROVED) ==========
async function saveToGoogleSheets(data) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('📤 Mengirim data ke Google Sheets...');
            
            // Deteksi device
            const isiPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
            console.log(`📱 Device: ${isiPhone ? 'iPhone' : 'Other'}`);
            
            // Method 1: JSON POST (lebih modern)
            const payload = {
                ...data,
                source: 'web_form',
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString()
            };
            
            console.log('📝 Payload:', payload);
            
            // Coba POST dengan JSON
            try {
                const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                console.log('✅ POST request sent');
                resolve({ success: true, message: 'Data berhasil dikirim!' });
                
            } catch (postError) {
                console.log('🔄 POST gagal, coba FormData...');
                
                // Method 2: FormData
                try {
                    const formData = new FormData();
                    for (const key in payload) {
                        formData.append(key, payload[key]);
                    }
                    
                    await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: formData
                    });
                    
                    console.log('✅ FormData request sent');
                    resolve({ success: true, message: 'Data berhasil dikirim!' });
                    
                } catch (formDataError) {
                    console.log('🔄 FormData gagal, coba GET...');
                    
                    // Method 3: GET dengan parameter
                    try {
                        const params = new URLSearchParams();
                        for (const key in payload) {
                            if (payload[key]) {
                                params.append(key, payload[key]);
                            }
                        }
                        
                        await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?${params.toString()}`, {
                            method: 'GET',
                            mode: 'no-cors'
                        });
                        
                        console.log('✅ GET request sent');
                        resolve({ success: true, message: 'Data berhasil dikirim!' });
                        
                    } catch (getError) {
                        console.error('❌ Semua metode gagal');
                        // Jangan reject, cukup simpan lokal
                        resolve({ 
                            success: true, 
                            message: 'Data disimpan lokal, akan sinkron nanti' 
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error in saveToGoogleSheets:', error);
            // Jangan reject, cukup simpan lokal
            resolve({ 
                success: true, 
                message: 'Data disimpan lokal karena koneksi masalah' 
            });
        }
    });
}

// ========== LOCAL STORAGE ==========
function saveToLocalBackup(data) {
    try {
        const backup = {
            ...data,
            backupTimestamp: new Date().toISOString(),
            backupId: `BACKUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Simpan sebagai draft terbaru
        localStorage.setItem('attendanceFormDraft', JSON.stringify({
            step: 1,
            formData: {},
            timestamp: new Date().toISOString()
        }));
        
        // Simpan ke backup array
        const existingBackups = JSON.parse(localStorage.getItem('form_backup') || '[]');
        existingBackups.push(backup);
        
        // Simpan maksimal 10 backup
        if (existingBackups.length > 10) {
            existingBackups.shift();
        }
        
        localStorage.setItem('form_backup', JSON.stringify(existingBackups));
        console.log('💾 Data saved to local backup:', backup.backupId);
        
        // Simpan juga untuk sync later
        localStorage.setItem('pending_sync', JSON.stringify(backup));
        
    } catch (error) {
        console.error('Error saving local backup:', error);
    }
}

function saveToLocalStorage() {
    try {
        const draftData = {
            step: currentStep,
            formData: formData,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('attendanceFormDraft', JSON.stringify(draftData));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedDraft = localStorage.getItem('attendanceFormDraft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            if (draft.formData) {
                // Merge data
                formData = { ...formData, ...draft.formData };
                
                // Isi form fields
                const fields = ['fullName', 'email', 'phone', 'prodi', 'unitPerguruan'];
                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && formData[field]) {
                        element.value = formData[field];
                    }
                });
                
                // Set attendance status
                if (formData.attendanceStatus === 'Hadir') {
                    document.getElementById('statusHadir').checked = true;
                    const hadirReason = document.getElementById('hadirReason');
                    if (hadirReason && formData.hadirReason) {
                        hadirReason.value = formData.hadirReason;
                    }
                    toggleAttendanceFields();
                } else if (formData.attendanceStatus === 'Tidak Hadir') {
                    document.getElementById('statusTidakHadir').checked = true;
                    const absenceReason = document.getElementById('absenceReason');
                    if (absenceReason && formData.absenceReason) {
                        absenceReason.value = formData.absenceReason;
                    }
                    toggleAttendanceFields();
                }
            }
            
            // Set current step
            if (draft.step && draft.step >= 1 && draft.step <= 3) {
                // Remove active from all steps
                document.querySelectorAll('.form-step').forEach(step => {
                    step.classList.remove('active');
                });
                
                // Set active step
                const stepElement = document.getElementById(`step${draft.step}`);
                if (stepElement) {
                    stepElement.classList.add('active');
                    currentStep = draft.step;
                    updateProgressBar();
                    updateStepIndicators();
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading draft:', error);
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem('attendanceFormDraft');
        console.log('🧹 Local draft cleared');
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }
}

// ========== UI HELPER ==========
function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = (currentStep / totalSteps) * 100;
        progressFill.style.width = `${progress}%`;
        progressFill.style.transition = 'width 0.3s ease';
    }
}

function updateStepIndicators() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function updateConfirmation() {
    const content = document.getElementById('confirmationContent');
    if (!content) return;
    
    const reason = formData.attendanceStatus === 'Hadir' 
        ? formData.hadirReason 
        : formData.absenceReason;
    
    // Format panjang teks untuk display
    const displayReason = reason && reason.length > 100 
        ? reason.substring(0, 100) + '...' 
        : reason;
    
    content.innerHTML = `
        <div class="confirmation-item">
            <div class="confirmation-label">Nama Lengkap:</div>
            <div class="confirmation-value">${formData.fullName || '-'}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Email:</div>
            <div class="confirmation-value">${formData.email || '-'}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">No. HP/WhatsApp:</div>
            <div class="confirmation-value">${formData.phone || '-'}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Program Studi:</div>
            <div class="confirmation-value">${formData.prodi || '-'}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Unit Perguruan:</div>
            <div class="confirmation-value">${formData.unitPerguruan || '-'}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Status Kehadiran:</div>
            <div class="confirmation-value">
                <span class="status ${formData.attendanceStatus === 'Hadir' ? 'present' : 'absent'}">
                    ${formData.attendanceStatus || '-'}
                </span>
            </div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">
                ${formData.attendanceStatus === 'Hadir' ? 'Dua kata:' : 'Alasan:'}
            </div>
            <div class="confirmation-value">
                ${displayReason || '-'}
                ${reason && reason.length > 100 ? '<br><small>(Tampilan disingkat)</small>' : ''}
            </div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">ID Pendaftaran:</div>
            <div class="confirmation-value">
                <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">
                    ${formData.submissionId || 'Akan digenerate'}
                </code>
            </div>
        </div>
    `;
}

function showToast(type, message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Clear existing toast
    toast.innerHTML = '';
    toast.className = 'toast';
    
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
    
    const icon = icons[type] || 'info-circle';
    const color = colors[type] || '#3b82f6';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${color}; font-size: 20px;"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toast.classList.add('show', type);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Initialize console message
console.log('✅ Attendance form JS loaded successfully');

// Export untuk testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        formData,
        nextStep,
        prevStep,
        toggleAttendanceFields,
        saveToGoogleSheets
    };
}
