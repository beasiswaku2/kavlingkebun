// ============================================================
//  app.js — Aplikasi Utama Kavling Kebun Maoslor
//  Version 1.0
// ============================================================

// State global
window.unitsData = [];
window.unitsLoaded = false;
window.unitsLoading = false;

/**
 * Muat semua data unit dari API
 */
async function loadAllData() {
    if (window.unitsLoading) return;
    if (window.unitsLoaded && window.unitsData.length > 0) {
        console.log('[APP] Data sudah dimuat, skip loading');
        return;
    }

    window.unitsLoading = true;
    console.log('[APP] Memuat data unit dari API...');

    try {
        const units = await apiGetUnits();

        if (!Array.isArray(units) || units.length === 0) {
            throw new Error('Tidak ada data unit yang diterima dari server');
        }

        // Transformasi data untuk kompatibilitas dengan kode lama
        window.unitsData = units.map(u => ({
            id: u.Kode_Unit || u.kode_unit || '',
            luas: u.Luas || 0,
            p: u.Panjang || 0,
            l: u.Lebar || 0,
            status: normalizeStatus(u.Status || 'tersedia'),
            harga: formatHarga(u.Harga || 0),
            hargaRaw: u.Harga || 0,
            keterangan: u.Keterangan || '',
            urutan: u.Urutan || 0,
            // Simpan data mentah untuk kebutuhan lain
            _raw: u,
        }));

        // Urutkan berdasarkan urutan
        window.unitsData.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

        window.unitsLoaded = true;
        console.log(`[APP] Berhasil memuat ${window.unitsData.length} unit`);

        // Render tabel
        if (typeof window.renderTable === 'function') {
            window.renderTable();
        }

        // Update tooltip reference
        if (typeof window.updateDenahData === 'function') {
            window.updateDenahData(window.unitsData);
        }

        // Trigger event
        document.dispatchEvent(new CustomEvent('unitsLoaded', { detail: { units: window.unitsData } }));

        return window.unitsData;

    } catch (error) {
        console.error('[APP] Gagal memuat data:', error);
        throw error;
    } finally {
        window.unitsLoading = false;
    }
}

/**
 * Normalisasi status ke format yang konsisten
 */
function normalizeStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'tersedia' || s === 'available' || s === '') return 'Tersedia';
    if (s === 'booking' || s === 'booked' || s === 'reserved') return 'Booking';
    if (s === 'terjual' || s === 'sold' || s === 'sold out') return 'Terjual';
    return 'Tersedia';
}

/**
 * Format harga dari number ke string Rupiah
 */
function formatHarga(harga) {
    if (typeof harga === 'number') {
        return 'Rp ' + harga.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    if (typeof harga === 'string' && harga.startsWith('Rp')) {
        return harga;
    }
    if (typeof harga === 'string' && !isNaN(parseInt(harga))) {
        const num = parseInt(harga);
        return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    return 'Rp 0';
}

/**
 * Parse harga dari string ke number
 */
function parseHarga(hargaStr) {
    if (typeof hargaStr === 'number') return hargaStr;
    if (typeof hargaStr === 'string') {
        const cleaned = hargaStr.replace(/[^0-9]/g, '');
        const num = parseInt(cleaned);
        if (!isNaN(num)) return num;
    }
    return 0;
}

/**
 * Cari unit berdasarkan kode
 */
function findUnitById(id) {
    if (!window.unitsData || window.unitsData.length === 0) return null;
    return window.unitsData.find(u => u.id.toUpperCase() === String(id).toUpperCase()) || null;
}

/**
 * Dapatkan statistik status
 */
function getUnitStats() {
    if (!window.unitsData || window.unitsData.length === 0) {
        return { total: 0, tersedia: 0, booking: 0, terjual: 0 };
    }
    let tersedia = 0,
        booking = 0,
        terjual = 0;
    window.unitsData.forEach(u => {
        if (u.status === 'Tersedia') tersedia++;
        else if (u.status === 'Booking') booking++;
        else if (u.status === 'Terjual') terjual++;
    });
    return {
        total: window.unitsData.length,
        tersedia,
        booking,
        terjual,
    };
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.loadAllData = loadAllData;
window.findUnitById = findUnitById;
window.getUnitStats = getUnitStats;
window.normalizeStatus = normalizeStatus;
window.formatHarga = formatHarga;
window.parseHarga = parseHarga;