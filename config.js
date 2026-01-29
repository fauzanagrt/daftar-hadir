// CONFIGURASI FORM KEHADIRAN KONGRES IV
const CONFIG = {
    // ACARA
    EVENT_NAME: 'Kongres IV UKM Pencak Silat',
    EVENT_DATE: '31 Februari 2026',
    EVENT_TIME: '08:00 - Selesai',
    EVENT_LOCATION: 'Auditorium Utama',
    
    // LOGIN ADMIN (GANTI PASSWORD INI!)
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'fauzan432',
    
    // KONTAK PANITIA
    PANITIA_EMAIL: 'Fauzandedeahmad55@gmail.com',
    PANITIA_PHONE: '6281234567890',
    PANITIA_WHATSAPP: '6281234567890',
    
    // PENGATURAN FORM
    FORM_MAX_CHARS: {
        NAME: 100,
        EMAIL: 100,
        PRODI: 100,
        UNIT: 100,
        REASON: 500
    },
    
    // STORAGE KEYS
    STORAGE: {
        SUBMISSIONS: 'attendanceSubmissions',
        ADMIN_BACKUP: 'adminAttendanceData',
        FORM_DRAFT: 'attendanceFormDraft',
        LAST_SUBMISSION: 'lastSubmission'
    },
    
    // WARNING MESSAGES
    WARNINGS: {
        CLEAR_DATA: 'PERINGATAN: Ini akan menghapus SEMUA data!',
        LOGOUT: 'Apakah Anda yakin ingin logout?'
    }
};

// Export ke global scope
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}