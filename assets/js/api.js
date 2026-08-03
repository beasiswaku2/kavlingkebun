// ============================================================
//  api.js — Komunikasi dengan Google Apps Script REST API
//  Version 2.0 (JSONP untuk GET, no-cors untuk POST)
// ============================================================

/**
 * KONFIGURASI
 * Ganti BASE_URL dengan URL Web App Anda dari Google Apps Script
 */
const CONFIG_API = {
    BASE_URL: 'https://script.google.com/macros/s/AKfycbyuC5s5IesmftApCw2RWTKl5MzL-8P8kIUrOSJ5deyyQLJtOwDtmWeaSwEZeFBO0lPtoQ/exec',
    TIMEOUT: 15000,
    RETRY_COUNT: 3,
};

/**
 * Helper untuk membuat URL dengan parameter
 */
function buildUrl(endpoint, params) {
    const url = new URL(CONFIG_API.BASE_URL + endpoint);
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
    }
    return url.toString();
}

/**
 * JSONP fetch untuk GET requests (bypass CORS)
 */
function jsonpFetch(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const fullUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callbackName;
        
        const script = document.createElement('script');
        script.src = fullUrl;
        
        // Timeout
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP request timeout'));
        }, CONFIG_API.TIMEOUT);
        
        // Define callback globally
        window[callbackName] = function(data) {
            cleanup();
            resolve(data);
        };
        
        function cleanup() {
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }
        
        script.onerror = function() {
            cleanup();
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
    });
}

/**
 * Generic fetch dengan timeout dan retry (untuk POST)
 * Menggunakan mode no-cors untuk menghindari CORS
 */
async function postFetch(endpoint, options = {}) {
    const url = CONFIG_API.BASE_URL + endpoint;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_API.TIMEOUT);

    const defaultOptions = {
        method: 'POST',
        mode: 'no-cors', // Bypass CORS
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
            // With no-cors, response is opaque, we can't read status or body
            // but the request was sent
            return { success: true, message: 'Data terkirim' };
        } catch (error) {
            lastError = error;
            if (attempt < CONFIG_API.RETRY_COUNT) {
                console.warn(`[API] POST attempt ${attempt} failed, retrying...`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    clearTimeout(timeoutId);
    throw new Error(`Gagal mengirim data setelah ${CONFIG_API.RETRY_COUNT} kali percobaan: ${lastError?.message || 'Unknown error'}`);
}

// ============================================================
//  PUBLIC API FUNCTIONS
// ============================================================

/**
 * GET semua unit (JSONP)
 * @returns {Promise<Array>} Array unit
 */
async function apiGetUnits() {
    try {
        const url = buildUrl('?action=units');
        const response = await jsonpFetch(url);
        if (response && response.units) {
            return response.units;
        }
        throw new Error('Response tidak valid: units tidak ditemukan');
    } catch (error) {
        console.error('[apiGetUnits] Error:', error);
        throw error;
    }
}

/**
 * GET satu unit (JSONP)
 * @param {string} id - Kode unit (contoh: 'A1', 'G1')
 * @returns {Promise<Object>} Data unit
 */
async function apiGetUnit(id) {
    try {
        const url = buildUrl('?action=unit', { id: id });
        const response = await jsonpFetch(url);
        if (response && response.unit) {
            return response.unit;
        }
        throw new Error(`Unit ${id} tidak ditemukan`);
    } catch (error) {
        console.error('[apiGetUnit] Error:', error);
        throw error;
    }
}

/**
 * GET statistik status (JSONP)
 * @returns {Promise<Object>} { total, tersedia, booking, terjual }
 */
async function apiGetStatus() {
    try {
        const url = buildUrl('?action=status');
        const response = await jsonpFetch(url);
        return response;
    } catch (error) {
        console.error('[apiGetStatus] Error:', error);
        throw error;
    }
}

/**
 * POST waiting list (menggunakan mode no-cors)
 * @param {Object} data - { nama, noWA, email, kodeUnit, pesan }
 * @returns {Promise<Object>} Response (hanya indikasi sukses)
 */
async function apiPostWaitingList(data) {
    try {
        const payload = {
            action: 'waitinglist',
            nama: data.nama,
            noWA: data.noWA,
            email: data.email,
            kodeUnit: data.kodeUnit,
            pesan: data.pesan || '',
        };
        const response = await postFetch('', {
            body: JSON.stringify(payload),
        });
        // Karena no-cors, kita tidak bisa baca response, tapi request terkirim
        return { success: true, message: 'Data waiting list terkirim' };
    } catch (error) {
        console.error('[apiPostWaitingList] Error:', error);
        throw error;
    }
}

/**
 * POST update status unit (mode no-cors)
 * @param {string} kodeUnit - Kode unit
 * @param {string} status - 'tersedia' | 'booking' | 'terjual'
 * @returns {Promise<Object>} Response (hanya indikasi sukses)
 */
async function apiUpdateStatus(kodeUnit, status) {
    try {
        const payload = {
            action: 'updateStatus',
            kodeUnit: kodeUnit,
            status: status,
        };
        await postFetch('', {
            body: JSON.stringify(payload),
        });
        return { success: true, message: 'Status berhasil diubah' };
    } catch (error) {
        console.error('[apiUpdateStatus] Error:', error);
        throw error;
    }
}

/**
 * POST update harga unit (mode no-cors)
 * @param {string} kodeUnit - Kode unit
 * @param {number} harga - Harga baru dalam Rupiah
 * @returns {Promise<Object>} Response (hanya indikasi sukses)
 */
async function apiUpdateHarga(kodeUnit, harga) {
    try {
        const payload = {
            action: 'updateHarga',
            kodeUnit: kodeUnit,
            harga: harga,
        };
        await postFetch('', {
            body: JSON.stringify(payload),
        });
        return { success: true, message: 'Harga berhasil diubah' };
    } catch (error) {
        console.error('[apiUpdateHarga] Error:', error);
        throw error;
    }
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
