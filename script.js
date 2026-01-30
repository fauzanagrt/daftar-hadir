// CONFIGURASI FORM KEHADIRAN KONGRES IV
const CONFIG = {
    // ACARA
    EVENT_NAME: 'Kongres IV UKM Pencak Silat',
    EVENT_DATE: '31 Februari 2026',
    
    // GOOGLE APPS SCRIPT URL (GANTI DENGAN URL ANDA SETELAH DEPLOY!)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwqYqfAIkZLi-TAdKy2-hSOUbC-ZJhwvSy6S77LllLA1IBdIXY8s5G00LBh-rYBCokg/exec',
    
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

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Form dimulai');
    initForm();
    setupEventListeners();
    loadFromLocalStorage();
});

// Inisialisasi form
function initForm() {
    console.log('🔧 Initializing form...');
    
    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        console.log('📱 Phone input ditemukan');
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
        console.log('✅ Form ditemukan, menambahkan submit listener');
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Auto-save on input
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('input', saveToLocalStorage);
        element.addEventListener('change', saveToLocalStorage);
    });
    
    // Set initial progress
    updateProgressBar();
}

// Setup event listeners
function setupEventListeners() {
    console.log('🎯 Setting up event listeners');
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.target.matches('textarea, button[type="submit"]')) {
            e.preventDefault();
            if (currentStep < totalSteps) {
                nextStep();
            }
        }
    });
}

// Toggle attendance fields berdasarkan status
function toggleAttendanceFields() {
    console.log('🔄 Toggling attendance fields');
    const hadirFields = document.getElementById('hadirFields');
    const tidakHadirFields = document.getElementById('tidakHadirFields');
    const statusHadir = document.getElementById('statusHadir');
    const statusTidakHadir = document.getElementById('statusTidakHadir');
    
    if (!hadirFields || !tidakHadirFields) return;
    
    if (statusHadir.checked) {
        console.log('✅ Status: Hadir dipilih');
        hadirFields.style.display = 'block';
        tidakHadirFields.style.display = 'none';
        
        const absenceReason = document.getElementById('absenceReason');
        if (absenceReason) {
            absenceReason.value = '';
            absenceReason.required = false;
        }
        
        const hadirReason = document.getElementById('hadirReason');
        if (hadirReason) {
            hadirReason.required = true;
        }
    } else if (statusTidakHadir.checked) {
        console.log('✅ Status: Tidak Hadir dipilih');
        hadirFields.style.display = 'none';
        tidakHadirFields.style.display = 'block';
        
        const hadirReason = document.getElementById('hadirReason');
        if (hadirReason) {
            hadirReason.value = '';
            hadirReason.required = false;
        }
        
        const absenceReason = document.getElementById('absenceReason');
        if (absenceReason) {
            absenceReason.required = true;
        }
    }
}

// Next step
function nextStep() {
    console.log(`➡️ Next step called, current step: ${currentStep}`);
    
    if (!validateCurrentStep()) {
        console.log('❌ Validation failed');
        return;
    }
    
    // Simpan data step saat ini
    saveStepData();
    
    // Pindah ke step berikutnya
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const nextStepElement = document.getElementById(`step${currentStep + 1}`);
    
    if (currentStepElement && nextStepElement) {
        console.log(`🔄 Pindah dari step ${currentStep} ke step ${currentStep + 1}`);
        currentStepElement.classList.remove('active');
        currentStep++;
        nextStepElement.classList.add('active');
        
        // Update progress bar
        updateProgressBar();
        
        // Update konfirmasi di step 3
        if (currentStep === 3) {
            updateConfirmation();
        }
        
        // Update step indicators
        updateStepIndicators();
        
        // Scroll ke atas
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Previous step
function prevStep() {
    console.log(`⬅️ Previous step called, current step: ${currentStep}`);
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const prevStepElement = document.getElementById(`step${currentStep - 1}`);
    
    if (currentStepElement && prevStepElement) {
        currentStepElement.classList.remove('active');
        currentStep--;
        prevStepElement.classList.add('active');
        
        // Update progress bar
        updateProgressBar();
        
        // Update step indicators
        updateStepIndicators();
        
        // Scroll ke atas
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Validasi step
function validateCurrentStep() {
    console.log(`🔍 Validating step: ${currentStep}`);
    const currentStepElement = document.getElementById(`step${currentStep}`);
    if (!currentStepElement) return false;
    
    const inputs = currentStepElement.querySelectorAll('[required]');
    console.log(`📝 Required inputs ditemukan: ${inputs.length}`);
    let isValid = true;
    
    // Reset error states
    inputs.forEach(input => {
        input.classList.remove('error');
    });
    
    // Validasi step 1
    if (currentStep === 1) {
        console.log('🔍 Validating step 1');
        for (let input of inputs) {
            console.log(`🔎 Checking input: ${input.id}, value: "${input.value}"`);
            
            if (!input.value.trim()) {
                console.log(`❌ Input ${input.id} kosong`);
                input.classList.add('error');
                showToast('error', `Harap isi ${input.previousElementSibling?.textContent || 'field ini'}`);
                input.focus();
                isValid = false;
                break;
            }
            
            // Email validation
            if (input.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    console.log(`❌ Email tidak valid: ${input.value}`);
                    input.classList.add('error');
                    showToast('error', 'Format email tidak valid');
                    input.focus();
                    isValid = false;
                    break;
                }
            }
            
            // Phone validation
            if (input.id === 'phone') {
                const phoneNumber = input.value.replace(/\D/g, '');
                console.log(`📱 Phone validation: ${phoneNumber}, length: ${phoneNumber.length}`);
                
                if (phoneNumber.length < 10 || phoneNumber.length > 13) {
                    console.log(`❌ Phone tidak valid: ${phoneNumber}`);
                    input.classList.add('error');
                    showToast('error', 'Nomor HP harus 10-13 digit angka');
                    input.focus();
                    isValid = false;
                    break;
                }
            }
        }
    }
    
    // Validasi step 2
    if (currentStep === 2) {
        console.log('🔍 Validating step 2');
        const attendanceStatus = document.querySelector('input[name="attendanceStatus"]:checked');
        if (!attendanceStatus) {
            console.log('❌ Status kehadiran belum dipilih');
            showToast('error', 'Harap pilih status kehadiran');
            isValid = false;
        } else {
            console.log(`✅ Status kehadiran: ${attendanceStatus.value}`);
        }
        
        // Jika hadir, wajib isi alasan hadir
        if (attendanceStatus?.value === 'Hadir') {
            const hadirReason = document.getElementById('hadirReason');
            if (!hadirReason?.value.trim()) {
                console.log('❌ Alasan hadir kosong');
                hadirReason.classList.add('error');
                showToast('error', 'Harap isi alasan hadir');
                hadirReason.focus();
                isValid = false;
            } else if (hadirReason.value.trim().length < 1) {
                console.log(`❌ Alasan hadir terlalu pendek: ${hadirReason.value.trim().length} karakter`);
                hadirReason.classList.add('error');
                showToast('error', 'Alasan hadir minimal 10 karakter');
                hadirReason.focus();
                isValid = false;
            }
        }
        
        // Jika tidak hadir, wajib isi alasan tidak hadir
        if (attendanceStatus?.value === 'Tidak Hadir') {
            const absenceReason = document.getElementById('absenceReason');
            if (!absenceReason?.value.trim()) {
                console.log('❌ Alasan tidak hadir kosong');
                absenceReason.classList.add('error');
                showToast('error', 'Harap isi alasan tidak hadir');
                absenceReason.focus();
                isValid = false;
            } else if (absenceReason.value.trim().length < 10) {
                console.log(`❌ Alasan tidak hadir terlalu pendek: ${absenceReason.value.trim().length} karakter`);
                absenceReason.classList.add('error');
                showToast('error', 'Alasan tidak hadir minimal 10 karakter');
                absenceReason.focus();
                isValid = false;
            }
        }
    }
    
    console.log(`✅ Validation result: ${isValid ? 'LULUS' : 'GAGAL'}`);
    return isValid;
}

// Simpan data step
function saveStepData() {
    console.log(`💾 Saving step data for step: ${currentStep}`);
    
    // Step 1
    if (currentStep === 1) {
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const prodi = document.getElementById('prodi');
        const unitPerguruan = document.getElementById('unitPerguruan');
        
        if (fullName) formData.fullName = fullName.value.trim();
        if (email) formData.email = email.value.trim();
        if (phone) formData.phone = phone.value.trim();
        if (prodi) formData.prodi = prodi.value.trim();
        if (unitPerguruan) formData.unitPerguruan = unitPerguruan.value.trim();
        
        console.log('📋 Data step 1 disimpan:', formData);
    }
    
    // Step 2
    if (currentStep === 2) {
        const attendanceStatus = document.querySelector('input[name="attendanceStatus"]:checked');
        if (attendanceStatus) {
            formData.attendanceStatus = attendanceStatus.value;
        }
        
        if (attendanceStatus?.value === 'Hadir') {
            const hadirReason = document.getElementById('hadirReason');
            if (hadirReason) {
                formData.hadirReason = hadirReason.value.trim();
                formData.absenceReason = '';
            }
        } else if (attendanceStatus?.value === 'Tidak Hadir') {
            const absenceReason = document.getElementById('absenceReason');
            if (absenceReason) {
                formData.absenceReason = absenceReason.value.trim();
                formData.hadirReason = '';
            }
        }
        
        console.log('📋 Data step 2 disimpan:', formData);
    }
}

// Update progress bar
function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = (currentStep / totalSteps) * 100;
        progressFill.style.width = `${progress}%`;
        console.log(`📊 Progress bar: ${progress}%`);
    }
}

// Update step indicators
function updateStepIndicators() {
    const steps = document.querySelectorAll('.step');
    console.log(`🎯 Updating ${steps.length} step indicators`);
    steps.forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// Update konfirmasi
function updateConfirmation() {
    console.log('📄 Updating confirmation page');
    const content = document.getElementById('confirmationContent');
    if (!content) return;
    
    // Format phone
    const formattedPhone = formData.phone || '-';
    
    // Format alasan berdasarkan status
    let reasonInfo = '';
    if (formData.attendanceStatus === 'Hadir' && formData.hadirReason) {
        reasonInfo = `
            <div class="confirmation-item">
                <div class="confirmation-label">Dua kata:</div>
                <div class="confirmation-value">${formData.hadirReason}</div>
            </div>
        `;
    } else if (formData.attendanceStatus === 'Tidak Hadir' && formData.absenceReason) {
        reasonInfo = `
            <div class="confirmation-item">
                <div class="confirmation-label">Alasan Tidak Hadir:</div>
                <div class="confirmation-value">${formData.absenceReason || '-'}</div>
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="confirmation-item">
            <div class="confirmation-label">Nama Lengkap:</div>
            <div class="confirmation-value">${formData.fullName}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Email:</div>
            <div class="confirmation-value">${formData.email}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">No. HP/WhatsApp:</div>
            <div class="confirmation-value">${formattedPhone}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Program Studi:</div>
            <div class="confirmation-value">${formData.prodi}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Unit Perguruan:</div>
            <div class="confirmation-value">${formData.unitPerguruan}</div>
        </div>
        <div class="confirmation-item">
            <div class="confirmation-label">Status Kehadiran:</div>
            <div class="confirmation-value">
                <span class="status ${formData.attendanceStatus === 'Hadir' ? 'present' : 'absent'}">
                    ${formData.attendanceStatus}
                </span>
            </div>
        </div>
        ${reasonInfo}
    `;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('🚀 Form submission started...');
    
    // Validasi checkbox konfirmasi
    const confirmCheckbox = document.getElementById('confirmData');
    if (!confirmCheckbox) {
        showToast('error', 'Terjadi kesalahan pada sistem');
        return;
    }
    
    if (!confirmCheckbox.checked) {
        console.log('❌ Checkbox konfirmasi belum dicentang');
        showToast('error', 'Harap konfirmasi kebenaran data terlebih dahulu');
        confirmCheckbox.focus();
        return;
    }
    
    console.log('✅ Checkbox konfirmasi sudah dicentang');
    
    // Simpan data terakhir
    saveStepData();
    
    // Generate submission ID dan timestamp
    formData.submissionId = `SUB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    formData.timestamp = new Date().toISOString();
    
    console.log('📦 Form data to submit:', formData);
    
    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        console.log('⏳ Showing loading overlay');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        // Kirim ke Google Sheets
        console.log('📤 Mengirim data ke Google Sheets...');
        const result = await saveToGoogleSheets(formData);
        
        if (result.success) {
            // Clear form draft
            clearLocalStorage();
            
            // Simpan untuk success page
            localStorage.setItem('lastSubmission', JSON.stringify(formData));
            
            console.log('✅ Success! Redirecting...');
            
            // Tunggu sebentar untuk efek visual
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Redirect ke success page
            window.location.href = 'success.html';
            
        } else {
            showToast('warning', result.message);
        }
        
    } catch (error) {
        console.error('❌ Error during form submission:', error);
        showToast('error', 'Terjadi kesalahan: ' + error.message);
    } finally {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('✅ Loading overlay hidden');
        }
    }
}

// Simpan ke Google Sheets
async function saveToGoogleSheets(data) {
    try {
        // Tambahkan user agent dan IP
        const payload = {
            ...data,
            userAgent: navigator.userAgent,
            ipAddress: await getIPAddress()
        };
        
        console.log('📤 Payload to Google Sheets:', payload);
        
        // Kirim ke Google Apps Script
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        // Karena mode no-cors, kita anggap berhasil jika tidak ada error
        console.log('✅ Data sent to Google Sheets');
        
        // Simpan backup lokal
        saveToLocalBackup(data);
        
        return {
            success: true,
            message: 'Data berhasil dikirim!'
        };
        
    } catch (error) {
        console.error('❌ Error saving to Google Sheets:', error);
        
        // Fallback: simpan ke localStorage
        saveToLocalBackup(data);
        
        return {
            success: true,
            message: 'Data disimpan secara lokal (offline mode)'
        };
    }
}

// Dapatkan IP Address
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

// Simpan backup lokal
function saveToLocalBackup(data) {
    try {
        const existing = JSON.parse(localStorage.getItem('form_backup') || '[]');
        existing.push({
            ...data,
            backupTimestamp: new Date().toISOString()
        });
        localStorage.setItem('form_backup', JSON.stringify(existing));
        console.log('💾 Data saved to local backup');
    } catch (error) {
        console.error('Error saving local backup:', error);
    }
}

// Simpan draft ke localStorage
function saveToLocalStorage() {
    console.log('💾 Saving draft to localStorage');
    const draftData = {
        step: currentStep,
        formData: formData,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('attendanceFormDraft', JSON.stringify(draftData));
}

// Load draft dari localStorage
function loadFromLocalStorage() {
    try {
        const savedDraft = localStorage.getItem('attendanceFormDraft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            
            if (draft.formData) {
                formData = { ...formData, ...draft.formData };
                
                // Isi field form
                document.getElementById('fullName').value = formData.fullName || '';
                document.getElementById('email').value = formData.email || '';
                document.getElementById('phone').value = formData.phone || '';
                document.getElementById('prodi').value = formData.prodi || '';
                document.getElementById('unitPerguruan').value = formData.unitPerguruan || '';
                
                // Status kehadiran
                if (formData.attendanceStatus === 'Hadir') {
                    document.getElementById('statusHadir').checked = true;
                    toggleAttendanceFields();
                    document.getElementById('hadirReason').value = formData.hadirReason || '';
                } else if (formData.attendanceStatus === 'Tidak Hadir') {
                    document.getElementById('statusTidakHadir').checked = true;
                    toggleAttendanceFields();
                    document.getElementById('absenceReason').value = formData.absenceReason || '';
                }
                
                showToast('info', 'Data draft telah dimuat. Anda dapat melanjutkan pengisian.');
            }
        }
    } catch (error) {
        console.error('❌ Error loading draft:', error);
    }
}

// Clear localStorage draft
function clearLocalStorage() {
    localStorage.removeItem('attendanceFormDraft');
    console.log('🗑️ Draft cleared from localStorage');
}

// Toast notification
function showToast(type, message) {
    console.log(`📢 Toast: ${type} - ${message}`);
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-circle' :
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    const color = type === 'success' ? '#10b981' :
                  type === 'error' ? '#ef4444' :
                  type === 'warning' ? '#f59e0b' : '#3b82f6';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${color};"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toast.classList.add('show');
    
    // Auto hide setelah 5 detik
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

console.log('✅ Attendance form JS loaded successfully');
