// ============================================================
//  api.js — Komunikasi dengan Google Apps Script REST API
//  Version 2.0 (JSONP untuk GET, fetch untuk POST)
// ============================================================

/**
 * KONFIGURASI
 * Ganti BASE_URL dengan URL Web App Anda dari Google Apps Script
 */
const CONFIG_API = {
    // 🔥 GANTI DENGAN URL WEB APP ANDA
    BASE_URL: 'https://script.google.com/macros/s/AKfycbwJEiDXo0tGAp-7JCTzD1PYQsfPtHiysX_ZodpNGkcYzFomb6D2nSDfWlK6csxGYVMnAA/exec',
    TIMEOUT: 15000,
    RETRY_COUNT: 3,
};

/**
 * FETCH menggunakan JSONP (untuk GET request)
 * Ini menghindari CORS completely
 */
function apiFetchJSONP(endpoint) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const url = CONFIG_API.BASE_URL + endpoint + '&callback=' + callbackName;
        
        // Buat script element
        const script = document.createElement('script');
        script.src = url;
        
        // Definisi callback global
        window[callbackName] = function(data) {
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            clearTimeout(timeoutId);
            resolve(data);
        };
        
        // Handle error
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            clearTimeout(timeoutId);
            reject(new Error('JSONP request failed'));
        };
        
        // Timeout
        const timeoutId = setTimeout(function() {
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            reject(new Error('JSONP request timeout'));
        }, CONFIG_API.TIMEOUT);
        
        document.body.appendChild(script);
    });
}

/**
 * FETCH biasa untuk POST (dengan no-cors)
 */
async function apiFetchPost(endpoint, data) {
    const url = CONFIG_API.BASE_URL + endpoint;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_API.TIMEOUT);

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Dengan no-cors, response tidak bisa dibaca
        // Tapi request tetap terkirim
        return { success: true, message: 'Data terkirim' };
        
    } catch (error) {
        clearTimeout(timeoutId);
        throw new Error('Gagal mengirim data: ' + error.message);
    }
}

// ============================================================
//  API FUNCTIONS
// ============================================================

/**
 * GET semua unit
 */
async function apiGetUnits() {
    const response = await apiFetchJSONP('?action=units');
    if (response && response.units) {
        return response.units;
    }
    if (response && response.error) {
        throw new Error(response.error);
    }
    throw new Error('Response tidak valid: units tidak ditemukan');
}

/**
 * GET satu unit berdasarkan ID
 */
async function apiGetUnit(id) {
    const response = await apiFetchJSONP(`?action=unit&id=${encodeURIComponent(id)}`);
    if (response && response.unit) {
        return response.unit;
    }
    if (response && response.error) {
        throw new Error(response.error);
    }
    throw new Error(`Unit ${id} tidak ditemukan`);
}

/**
 * GET statistik status
 */
async function apiGetStatus() {
    const response = await apiFetchJSONP('?action=status');
    if (response && response.error) {
        throw new Error(response.error);
    }
    return response;
}

/**
 * POST waiting list
 */
async function apiPostWaitingList(data) {
    return await apiFetchPost('?action=waitinglist', {
        action: 'waitinglist',
        nama: data.nama,
        noWA: data.noWA,
        email: data.email,
        kodeUnit: data.kodeUnit,
        pesan: data.pesan || '',
    });
}

/**
 * POST update status unit
 */
async function apiUpdateStatus(kodeUnit, status) {
    return await apiFetchPost('?action=updateStatus', {
        action: 'updateStatus',
        kodeUnit: kodeUnit,
        status: status,
    });
}

/**
 * POST update harga unit
 */
async function apiUpdateHarga(kodeUnit, harga) {
    return await apiFetchPost('?action=updateHarga', {
        action: 'updateHarga',
        kodeUnit: kodeUnit,
        harga: harga,
    });
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
