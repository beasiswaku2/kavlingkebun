// ============================================================
//  waitinglist.js — Waiting List / Daftar Tunggu
//  Version 1.0 (Data dikirim ke API)
// ============================================================

let wlCurrentUnit = null;

/**
 * Buka modal waiting list
 */
function openWaitingListModal(unitId, unitPrice) {
    const unit = findUnitById(unitId);
    if (!unit) {
        alert('Unit tidak ditemukan');
        return;
    }

    wlCurrentUnit = unit;

    const modal = document.getElementById('waitingListModal');
    if (!modal) return;

    document.getElementById('waitingUnitInfo').textContent =
        `Unit ${unit.id} | Luas ${unit.luas}m² | Harga ${unit.harga} | Status ${unit.status}`;
    document.getElementById('wlUnit').value = `UNIT ${unit.id}`;

    // Reset form
    document.getElementById('wlNama').value = '';
    document.getElementById('wlEmail').value = '';
    document.getElementById('wlWhatsApp').value = '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Tutup modal waiting list
 */
function closeWaitingListModal() {
    const modal = document.getElementById('waitingListModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    wlCurrentUnit = null;
}

/**
 * Submit waiting list ke API
 */
async function submitWaitingList() {
    if (!wlCurrentUnit) {
        alert('Tidak ada unit yang dipilih');
        return;
    }

    const nama = document.getElementById('wlNama').value.trim();
    const email = document.getElementById('wlEmail').value.trim();
    const noWA = document.getElementById('wlWhatsApp').value.trim();

    // Validasi
    if (!nama) {
        alert('Mohon isi Nama Lengkap');
        document.getElementById('wlNama').focus();
        return;
    }
    if (!email) {
        alert('Mohon isi Email Aktif');
        document.getElementById('wlEmail').focus();
        return;
    }
    if (!noWA) {
        alert('Mohon isi Nomor WhatsApp');
        document.getElementById('wlWhatsApp').focus();
        return;
    }

    // Validasi email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Mohon isi email yang valid (contoh: nama@domain.com)');
        document.getElementById('wlEmail').focus();
        return;
    }

    // Validasi no WA (minimal 10 digit)
    const waClean = noWA.replace(/\D/g, '');
    if (waClean.length < 10) {
        alert('Mohon isi nomor WhatsApp yang valid (minimal 10 digit)');
        document.getElementById('wlWhatsApp').focus();
        return;
    }

    // Siapkan data
    const data = {
        nama: nama,
        noWA: noWA,
        email: email,
        kodeUnit: wlCurrentUnit.id,
        pesan: `Daftar tunggu unit ${wlCurrentUnit.id}`,
    };

    // Tampilkan loading
    const btn = document.querySelector('#waitingListModal .bg-emerald-600');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Mengirim...';
    btn.disabled = true;

    try {
        const response = await apiPostWaitingList(data);

        if (response && response.success) {
            alert(`✅ Pendaftaran waiting list unit ${wlCurrentUnit.id} berhasil!\n\nKami akan menghubungi Anda jika unit tersedia kembali.`);
            closeWaitingListModal();
            // Kirim ke WhatsApp juga sebagai konfirmasi
            const waMessage =
                `Halo Admin, saya ingin daftar waiting list unit ${wlCurrentUnit.id}. Nama: ${nama}, Email: ${email}, WA: ${noWA}`;
            window.open(`https://wa.me/6287788526410?text=${encodeURIComponent(waMessage)}`, '_blank');
        } else {
            const errorMsg = response?.error || 'Gagal menyimpan data';
            alert(`❌ ${errorMsg}\n\nSilakan coba lagi atau hubungi marketing langsung.`);
        }
    } catch (error) {
        console.error('[WAITINGLIST] Error:', error);
        alert(`❌ Terjadi kesalahan: ${error.message}\n\nSilakan coba lagi atau hubungi marketing langsung.`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.openWaitingListModal = openWaitingListModal;
window.closeWaitingListModal = closeWaitingListModal;
window.submitWaitingList = submitWaitingList;