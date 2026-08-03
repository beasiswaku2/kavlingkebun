// ============================================================
//  table.js — Render Tabel Harga Unit
//  Version 1.0 (Data dari API)
// ============================================================

/**
 * Render tabel harga dari data API
 */
function renderTable() {
    const tbody = document.getElementById('dataTanahBody');
    if (!tbody) return;

    const data = window.unitsData || [];

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-6 text-center text-gray-500">Belum ada data unit</td>
            </tr>
        `;
        return;
    }

    let html = '';
    data.forEach((item) => {
        const statusColor = item.status === 'Tersedia' ? 'text-green-500' :
            (item.status === 'Booking' ? 'text-yellow-500' : 'text-red-500');

        let btn = '';
        if (item.status === 'Tersedia') {
            btn = `<button onclick="openSimulationModal('${item.id}','${item.harga}')" 
                        class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1 rounded text-xs font-bold transition">
                        Simulasi
                   </button>`;
        } else if (item.status === 'Booking') {
            btn = `<button onclick="openWaitingListModal('${item.id}','${item.harga}')" 
                        class="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white px-3 py-1 rounded text-xs font-bold transition">
                        Waiting
                   </button>`;
        } else {
            btn = `<button disabled class="bg-gray-600/20 text-gray-500 px-3 py-1 rounded text-xs font-bold">Terjual</button>`;
        }

        let dimensiStr = 'Khusus';
        if (item.p && item.l && item.p !== 0 && item.l !== 0) {
            dimensiStr = `${item.l}m x ${item.p}m`;
        } else if (item.p && item.p !== 0 && item.p !== 'Khusus ') {
            dimensiStr = `${item.p} m`;
        } else if (item.l && item.l !== 0 && item.l !== 'Khusus ') {
            dimensiStr = `${item.l} m`;
        }

        html += `
            <tr class="border-b border-white/10 hover:bg-white/5 transition">
                <td class="p-3 font-bold">UNIT ${item.id}</td>
                <td class="p-3">${item.luas} m²</td>
                <td class="p-3">${dimensiStr}</td>
                <td class="p-3 ${statusColor} font-bold">${item.status}</td>
                <td class="p-3">${item.harga}</td>
                <td class="p-3 text-center">${btn}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Re-inisialisasi Lucide untuk ikon di tombol
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Filter tabel berdasarkan input pencarian
 */
function filterTable() {
    const filter = document.getElementById('searchUnit')?.value?.toUpperCase() || '';
    const rows = document.querySelectorAll('#dataTanahBody tr');
    rows.forEach(row => {
        const td = row.querySelector('td');
        if (td) {
            const text = td.textContent.toUpperCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        }
    });
}

/**
 * Download PDF daftar harga
 */
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('Library PDF tidak tersedia. Silakan refresh halaman.');
        return;
    }

    const data = window.unitsData || [];
    if (data.length === 0) {
        alert('Belum ada data unit untuk di-download.');
        return;
    }

    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric' }) + ', ' +
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    doc.setFontSize(16);
    doc.text('Daftar Harga & Unit Kavling Maoslor', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${dateStr}`, 14, 28);

    const rows = data.map(d => {
        let dimensi = 'Khusus';
        if (d.p && d.l && d.p !== 0 && d.l !== 0) {
            dimensi = `${d.l} m x ${d.p} m`;
        }
        return [`UNIT ${d.id}`, `${d.luas} m²`, dimensi, d.status, d.harga];
    });

    doc.autoTable({
        startY: 35,
        head: [
            ['ID Unit', 'Luas Tanah', 'Dimensi', 'Status', 'Harga Jual']
        ],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }
    });

    doc.save(
        `Daftar_Harga_KavlingKebunMaoslor_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.pdf`
    );
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.renderTable = renderTable;
window.filterTable = filterTable;
window.downloadPDF = downloadPDF;