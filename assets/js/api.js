// ============================================================
//  api.js — Komunikasi dengan Google Apps Script REST API
//  Version 1.0
// ============================================================

/**
 * KONFIGURASI
 * Ganti URL_API dengan URL Web App Anda dari Google Apps Script
 */
const CONFIG_API = {
    // 🔥 GANTI DENGAN URL WEB APP ANDA
    BASE_URL: 'https://script.google.com/macros/s/AKfycbyqkYLjJHhNdmCzz0waflIjyFFwYvt2K5wSVlWRsiCR1ASvnjieml5AMtJKQCUR_xqPNA/exec',
    TIMEOUT: 15000, // 15 detik
    RETRY_COUNT: 3,
};

/**
 * Generic fetch dengan timeout dan retry
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${CONFIG_API.BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_API.TIMEOUT);

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
    };

    const finalOptions = { ...defaultOptions, ...options };

    let lastError = null;
    for (let attempt = 1; attempt <= CONFIG_API.RETRY_COUNT; attempt++) {
        try {
            const response = await fetch(url, finalOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            // Cek apakah ada error dari server
            if (data && data.error) {
                throw new Error(data.error);
            }

            // Cek status code dari server (jika ada)
            if (data && data._status && data._status >= 400) {
                throw new Error(data.error || `Server error ${data._status}`);
            }

            return data;
        } catch (error) {
            lastError = error;
            if (attempt < CONFIG_API.RETRY_COUNT) {
                console.warn(`[API] Attempt ${attempt} failed, retrying...`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    clearTimeout(timeoutId);
    throw new Error(`Gagal terhubung ke server setelah ${CONFIG_API.RETRY_COUNT} kali percobaan: ${lastError?.message || 'Unknown error'}`);
}

/**
 * GET semua unit
 * @returns {Promise<Array>} Array unit
 */
async function apiGetUnits() {
    const response = await apiFetch('?action=units');
    if (response && response.units) {
        return response.units;
    }
    throw new Error('Response tidak valid: units tidak ditemukan');
}

/**
 * GET satu unit berdasarkan ID
 * @param {string} id - Kode unit (contoh: 'A1', 'G1')
 * @returns {Promise<Object>} Data unit
 */
async function apiGetUnit(id) {
    const response = await apiFetch(`?action=unit&id=${encodeURIComponent(id)}`);
    if (response && response.unit) {
        return response.unit;
    }
    throw new Error(`Unit ${id} tidak ditemukan`);
}

/**
 * GET statistik status
 * @returns {Promise<Object>} { total, tersedia, booking, terjual }
 */
async function apiGetStatus() {
    const response = await apiFetch('?action=status');
    return response;
}

/**
 * POST waiting list
 * @param {Object} data - { nama, noWA, email, kodeUnit, pesan }
 * @returns {Promise<Object>} Response
 */
async function apiPostWaitingList(data) {
    const response = await apiFetch('?action=waitinglist', {
        method: 'POST',
        body: JSON.stringify({
            action: 'waitinglist',
            nama: data.nama,
            noWA: data.noWA,
            email: data.email,
            kodeUnit: data.kodeUnit,
            pesan: data.pesan || '',
        }),
    });
    return response;
}

/**
 * POST update status unit
 * @param {string} kodeUnit - Kode unit
 * @param {string} status - 'tersedia' | 'booking' | 'terjual'
 * @returns {Promise<Object>} Response
 */
async function apiUpdateStatus(kodeUnit, status) {
    const response = await apiFetch('?action=updateStatus', {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateStatus',
            kodeUnit: kodeUnit,
            status: status,
        }),
    });
    return response;
}

/**
 * POST update harga unit
 * @param {string} kodeUnit - Kode unit
 * @param {number} harga - Harga baru dalam Rupiah
 * @returns {Promise<Object>} Response
 */
async function apiUpdateHarga(kodeUnit, harga) {
    const response = await apiFetch('?action=updateHarga', {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateHarga',
            kodeUnit: kodeUnit,
            harga: harga,
        }),
    });
    return response;
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.apiGetUnits = apiGetUnits;
window.apiGetUnit = apiGetUnit;
window.apiGetStatus = apiGetStatus;
window.apiPostWaitingList = apiPostWaitingList;
window.apiUpdateStatus = apiUpdateStatus;
window.apiUpdateHarga = apiUpdateHarga;
