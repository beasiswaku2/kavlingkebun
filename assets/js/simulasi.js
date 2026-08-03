// ============================================================
//  simulasi.js — Simulasi Cicilan Kavling
//  Version 1.0 (Data dari API)
// ============================================================

const SIM_CONFIG = {
    dpPercent: 20,
    interestRate: 12, // 12% flat per tahun
    bookingFeePercent: 3, // 3% dari harga
};

let simCurrentUnit = null;
let simCurrentData = null;

/**
 * Hitung simulasi cicilan
 */
function calculateSimulation(unitPrice) {
    const price = typeof unitPrice === 'number' ? unitPrice : parseHarga(unitPrice);
    if (isNaN(price) || price <= 0) {
        throw new Error('Harga tidak valid');
    }

    const dp = Math.round(price * (SIM_CONFIG.dpPercent / 100));
    const principal = price - dp;
    const bookingFee = Math.round(price * (SIM_CONFIG.bookingFeePercent / 100));

    // 2 tahun (24 bulan)
    const bunga2tahun = Math.round(principal * (SIM_CONFIG.interestRate / 100) * 2);
    const total2tahun = principal + bunga2tahun;
    const cicilan2tahun = Math.round(total2tahun / 24);

    // 3 tahun (36 bulan)
    const bunga3tahun = Math.round(principal * (SIM_CONFIG.interestRate / 100) * 3);
    const total3tahun = principal + bunga3tahun;
    const cicilan3tahun = Math.round(total3tahun / 36);

    return {
        price,
        bookingFee,
        dp,
        principal,
        year2: { cicilan: cicilan2tahun },
        year3: { cicilan: cicilan3tahun },
    };
}

/**
 * Buka modal simulasi
 */
function openSimulationModal(unitId, unitPrice) {
    const unit = findUnitById(unitId);
    if (!unit) {
        alert('Unit tidak ditemukan');
        return;
    }

    simCurrentUnit = unit;

    let calc;
    try {
        calc = calculateSimulation(unit.hargaRaw || unit.harga);
    } catch (e) {
        alert('Gagal menghitung simulasi: ' + e.message);
        return;
    }
    simCurrentData = calc;

    const modal = document.getElementById('simulationModal');
    if (!modal) return;

    document.getElementById('modalUnitInfo').textContent =
        `Unit ${unit.id} | Luas ${unit.luas}m² | Status ${unit.status}`;
    document.getElementById('simBookingFee').textContent = formatCurrency(calc.bookingFee);

    document.getElementById('col1Harga').textContent = formatCurrency(calc.price);
    document.getElementById('col1DP').textContent = formatCurrency(calc.dp);
    document.getElementById('col1Pinjaman').textContent = formatCurrency(calc.principal);
    document.getElementById('col1Cicilan').textContent = formatCurrency(calc.year2.cicilan);

    document.getElementById('col2Harga').textContent = formatCurrency(calc.price);
    document.getElementById('col2DP').textContent = formatCurrency(calc.dp);
    document.getElementById('col2Pinjaman').textContent = formatCurrency(calc.principal);
    document.getElementById('col2Cicilan').textContent = formatCurrency(calc.year3.cicilan);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Tutup modal simulasi
 */
function closeSimulationModal() {
    const modal = document.getElementById('simulationModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    simCurrentUnit = null;
    simCurrentData = null;
}

/**
 * Download PDF simulasi
 */
function downloadSimulationPDF() {
    if (!simCurrentUnit || !simCurrentData) {
        alert('Tidak ada data simulasi');
        return;
    }

    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('Library PDF tidak tersedia');
        return;
    }

    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric' }) + ', ' +
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const unit = simCurrentUnit;
    const calc = simCurrentData;

    doc.setFontSize(16);
    doc.text('Simulasi Pembayaran Kavling Kebun Maoslor', 14, 20);
    doc.setFontSize(10);
    doc.text(`Unit: ${unit.id} | Luas: ${unit.luas}m² | Status: ${unit.status}`, 14, 28);
    doc.text(`Generated: ${dateStr}`, 14, 34);
    doc.text(`*Administrasi: ${formatCurrency(calc.bookingFee)} (dibayar diawal)`, 14, 42);

    const body = [
        ['Harga', formatCurrency(calc.price), formatCurrency(calc.price)],
        ['DP 20% (dibayar di Awal)', formatCurrency(calc.dp), formatCurrency(calc.dp)],
        ['Pokok Cicilan', formatCurrency(calc.principal), formatCurrency(calc.principal)],
        ['Cicilan/Bulan (cicilan pertama dibayar di Awal)',
            formatCurrency(calc.year2.cicilan),
            formatCurrency(calc.year3.cicilan)
        ]
    ];

    doc.autoTable({
        startY: 48,
        head: [
            ['Komponen', '2 Tahun', '3 Tahun']
        ],
        body: body,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text('Catatan:', 14, finalY);
    doc.setFontSize(8);
    doc.text('• Disarankan pengambilan jangka waktu Cicilan 3 tahun agar cicilan bulanan lebih ringan', 14, finalY + 6);
    doc.text('• Administrasi dibayar sekali diawal sebagai tanda jadi', 14, finalY + 12);
    doc.text('• Angka dapat berubah sesuai ketentuan marketing terbaru', 14, finalY + 18);

    doc.save(
        `Simulasi_Unit_${unit.id}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.pdf`
    );
}

/**
 * Hubungi marketing dari modal simulasi
 */
function contactMarketingSimulation() {
    if (!simCurrentUnit) return;
    window.open(
        `https://wa.me/6287788526410?text=Saya%20tertarik%20dengan%20unit%20${simCurrentUnit.id}`,
        '_blank'
    );
}

// ============================================================
//  UTILITY
// ============================================================
function formatCurrency(num) {
    if (typeof num !== 'number') num = 0;
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.openSimulationModal = openSimulationModal;
window.closeSimulationModal = closeSimulationModal;
window.downloadSimulationPDF = downloadSimulationPDF;
window.contactMarketingSimulation = contactMarketingSimulation;
window.calculateSimulation = calculateSimulation;
window.formatCurrency = formatCurrency;