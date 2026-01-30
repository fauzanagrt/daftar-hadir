// CONFIGURASI FORM KEHADIRAN KONGRES IV
const CONFIG = {
    EVENT_DATE: '31 Februari 2026',
    EVENT_NAME: 'Kongres IV UKM Pencak Silat',
    ADMIN_EMAIL: 'Fauzandedeahmad55@gmail.com',
    WHATSAPP_NUMBER: '623147387373'
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
    submittedAt: '',
    submissionId: ''
};

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Form dimulai');
    console.log('📁 File script.js berjalan');
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
    } else {
        console.error('❌ Phone input TIDAK ditemukan!');
    }
    
    // Form submission
    const form = document.getElementById('attendanceForm');
    if (form) {
        console.log('✅ Form ditemukan, menambahkan submit listener');
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('❌ Form element TIDAK ditemukan!');
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
    // Enter key untuk next step
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
    
    if (!hadirFields || !tidakHadirFields) {
        console.error('❌ Attendance fields not found');
        return;
    }
    
    if (statusHadir.checked) {
        console.log('✅ Status: Hadir dipilih');
        hadirFields.style.display = 'block';
        tidakHadirFields.style.display = 'none';
        
        // Reset fields tidak hadir
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
        
        // Reset fields hadir
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
    } else {
        console.error('❌ Step elements not found');
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
    if (!currentStepElement) {
        console.error('❌ Current step element not found');
        return false;
    }
    
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
            
            // Phone validation - HANYA VALIDASI PANJANG, BUKAN PATTERN
            if (input.id === 'phone') {
                const phoneNumber = input.value.replace(/\D/g, '');
                console.log(`📱 Phone validation: ${phoneNumber}, length: ${phoneNumber.length}`);
                
                // Hapus validasi pattern, cukup validasi panjang
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
    
    // Validasi khusus step 2
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
            } else {
                console.log(`✅ Alasan hadir valid: ${hadirReason.value.trim().length} karakter`);
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
            } else {
                console.log(`✅ Alasan tidak hadir valid: ${absenceReason.value.trim().length} karakter`);
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
                formData.absenceReason = ''; // Reset alasan tidak hadir
            }
        } else if (attendanceStatus?.value === 'Tidak Hadir') {
            const absenceReason = document.getElementById('absenceReason');
            if (absenceReason) {
                formData.absenceReason = absenceReason.value.trim();
                formData.hadirReason = ''; // Reset alasan hadir
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
    if (!content) {
        console.error('❌ Confirmation content element not found');
        return;
    }
    
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
        console.error('❌ Confirm checkbox not found');
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
    
    // Generate submission ID
    const submissionId = `SUB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    formData.submissionId = submissionId;
    formData.submittedAt = new Date().toISOString();
    
    console.log('📦 Form data to submit:', formData);
    
    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        console.log('⏳ Showing loading overlay');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        // Simpan ke localStorage
        console.log('💾 Saving to database...');
        saveToDatabase(formData);
        
        // Clear form draft
        clearLocalStorage();
        
        // Simpan untuk success page
        localStorage.setItem('lastSubmission', JSON.stringify({
            ...formData,
            submissionId: submissionId
        }));
        
        console.log('✅ Data saved to localStorage');
        
        // Simpan untuk admin
        saveToAdminDatabase(formData);
        
        // Tunggu sebentar untuk efek visual
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('🌐 Redirecting to success page...');
        
        // Redirect ke success page
        window.location.href = 'success.html';
        
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

// Simpan ke database lokal
function saveToDatabase(data) {
    try {
        // Ambil data existing
        const existingData = JSON.parse(localStorage.getItem('attendanceSubmissions') || '[]');
        
        // Tambah data baru
        existingData.push(data);
        
        // Simpan kembali
        localStorage.setItem('attendanceSubmissions', JSON.stringify(existingData));
        
        console.log('💾 Data saved to database. Total entries:', existingData.length);
        return true;
    } catch (error) {
        console.error('❌ Error saving to database:', error);
        throw error;
    }
}

// Simpan ke admin database terpisah
function saveToAdminDatabase(data) {
    try {
        const adminData = JSON.parse(localStorage.getItem('adminAttendanceData') || '[]');
        adminData.push(data);
        localStorage.setItem('adminAttendanceData', JSON.stringify(adminData));
        console.log('💾 Data saved to admin database');
    } catch (error) {
        console.error('❌ Error saving to admin database:', error);
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
            
            // Isi form dengan data yang tersimpan
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
                
                // Tampilkan toast info
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
    if (!toast) {
        console.error('❌ Toast element not found');
        return;
    }
    
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

