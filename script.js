// ============================================================
//  SCRIPT.JS – KAVLING MAOSLOR DASHBOARD + CHATBOT
//  Menggunakan JSONP untuk menghindari CORS
// ============================================================

// ========== KONFIGURASI API ==========
const API_BASE = 'https://script.google.com/macros/s/AKfycbz_jCi9eJDsJnMtPD4qfP4nTXB9JwAP40wu_Rl70Ruac0eJug-o4XOzu_6ijqpPReNz5Q/exec';

// ========== VARIABEL GLOBAL ==========
let dataTanahTable = [];
let currentSimulationData = null;
let currentUnitData = null;
let currentWaitingUnitData = null;

// ========== FUNGSI JSONP ==========

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const timeoutId = setTimeout(() => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP request timeout'));
    }, 15000);

    window[callbackName] = function(data) {
      clearTimeout(timeoutId);
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = function() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP request failed'));
    };
    document.body.appendChild(script);
  });
}

// ========== FUNGSI API ==========

async function loadUnits() {
  try {
    const data = await jsonpRequest(`${API_BASE}?action=list&sheet=units`);
    if (data.error) throw new Error(data.error);
    dataTanahTable = data;
    console.log('✅ Data unit dimuat:', dataTanahTable.length, 'unit');
    window.dataTanahTable = dataTanahTable;
    renderTable();
    if (typeof window.rebuildDenah === 'function') {
      window.rebuildDenah();
    }
    return data;
  } catch (err) {
    console.error('❌ Gagal memuat unit:', err);
    const body = document.getElementById('dataTanahBody');
    if (body) {
      body.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Gagal memuat data. Periksa koneksi atau refresh.</td></tr>';
    }
    return [];
  }
}

async function sendJsonpRequest(action, params) {
  try {
    let url = `${API_BASE}?action=${action}`;
    for (const [key, value] of Object.entries(params)) {
      url += `&${key}=${encodeURIComponent(value)}`;
    }
    const data = await jsonpRequest(url);
    return data;
  } catch (err) {
    console.error('JSONP request error:', err);
    return { error: err.message };
  }
}

async function logChat(sender, text, isFromMe = false, source = 'web') {
  try {
    await sendJsonpRequest('chat_log', {
      sender: sender,
      text: text,
      isFromMe: isFromMe ? 'Yes' : 'No',
      source: source
    });
  } catch (err) {
    console.error('Gagal log chat:', err);
  }
}

async function submitBooking(unitId, nama, email, wa, status = 'waiting') {
  try {
    const result = await sendJsonpRequest('booking', {
      unit_id: unitId,
      nama: nama,
      email: email,
      wa: wa,
      status: status
    });
    return result;
  } catch (err) {
    console.error('Gagal submit booking:', err);
    return { error: err.message };
  }
}

async function askAI(prompt) {
  try {
    const data = await sendJsonpRequest('ai', { prompt: prompt });
    return data.answer || data.error || 'Maaf, saya tidak bisa menjawab.';
  } catch (err) {
    console.error('AI error:', err);
    return 'Terjadi kesalahan saat menghubungi AI.';
  }
}

// ========== RENDER TABEL HARGA ==========

function renderTable() {
  const body = document.getElementById('dataTanahBody');
  if (!body) {
    console.warn('Element #dataTanahBody tidak ditemukan.');
    return;
  }
  
  if (!dataTanahTable || dataTanahTable.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Belum ada data unit.</td></tr>';
    return;
  }

  body.innerHTML = dataTanahTable.map(d => {
    const statusColor = d.status === "Tersedia" ? "text-green-500" : 
                       (d.status === "Booking" ? "text-yellow-500" : "text-red-500");
    let btn = '';
    if (d.status === "Tersedia") {
      btn = `<button onclick="openSimulationModal('${d.id}','${d.harga}')" 
                     class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1 rounded text-xs font-bold transition">Simulasi</button>`;
    } else if (d.status === "Booking") {
      btn = `<button onclick="openWaitingListModal('${d.id}','${d.harga}')" 
                     class="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white px-3 py-1 rounded text-xs font-bold transition">Waiting</button>`;
    } else {
      btn = `<button disabled class="bg-gray-600/20 text-gray-500 px-3 py-1 rounded text-xs font-bold">Terjual</button>`;
    }
    const dimensiStr = (d.p === "Khusus" || d.l === "Khusus") ? "Khusus" : `${d.l}m x ${d.p}m`;
    return `<tr class="border-b border-white/10 hover:bg-white/5 transition">
                <td class="p-3 font-bold">UNIT ${d.id}</td>
                <td class="p-3">${d.luas} m²</td>
                <td class="p-3">${dimensiStr}</td>
                <td class="p-3 ${statusColor} font-bold">${d.status}</td>
                <td class="p-3">${d.harga}</td>
                <td class="p-3 text-center">${btn}</td>
            </tr>`;
  }).join('');
}

// ========== FUNGSI UTILITY ==========

function findUnit(id) {
  return dataTanahTable.find(u => u.id.toUpperCase() === id.toUpperCase());
}

function parsePrice(priceStr) {
  return parseInt(priceStr.replace(/[^0-9]/g, ''));
}

function formatCurrency(num) {
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getBookingFee(price) {
  return Math.round(price * 0.03);
}

function calculateBothSimulations(unitPrice) {
  const price = parsePrice(unitPrice);
  const dpPercent = 20;
  const dp = Math.round(price * (dpPercent / 100));
  const principal = price - dp;
  const bookingFee = getBookingFee(price);
  const interestRate = 12;

  const bunga2tahun = Math.round(principal * (interestRate / 100) * 2);
  const total2tahun = principal + bunga2tahun;
  const cicilan2tahun = Math.round(total2tahun / 24);

  const bunga3tahun = Math.round(principal * (interestRate / 100) * 3);
  const total3tahun = principal + bunga3tahun;
  const cicilan3tahun = Math.round(total3tahun / 36);

  return { price, bookingFee, dp, principal, year2: { cicilan: cicilan2tahun }, year3: { cicilan: cicilan3tahun } };
}

// ========== MODAL CONTROLS ==========

window.openSimulationModal = function(unitId, unitPrice) {
  const unit = findUnit(unitId);
  if (!unit) return;
  currentUnitData = unit;
  const calc = calculateBothSimulations(unit.harga);
  currentSimulationData = calc;
  
  document.getElementById('modalUnitInfo').textContent = `Unit ${unit.id} | Luas ${unit.luas}m² | Status ${unit.status}`;
  document.getElementById('simBookingFee').textContent = formatCurrency(calc.bookingFee);
  document.getElementById('col1Harga').textContent = formatCurrency(calc.price);
  document.getElementById('col1DP').textContent = formatCurrency(calc.dp);
  document.getElementById('col1Pinjaman').textContent = formatCurrency(calc.principal);
  document.getElementById('col1Cicilan').textContent = formatCurrency(calc.year2.cicilan);
  document.getElementById('col2Harga').textContent = formatCurrency(calc.price);
  document.getElementById('col2DP').textContent = formatCurrency(calc.dp);
  document.getElementById('col2Pinjaman').textContent = formatCurrency(calc.principal);
  document.getElementById('col2Cicilan').textContent = formatCurrency(calc.year3.cicilan);
  
  document.getElementById('simulationModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openWaitingListModal = function(unitId, unitPrice) {
  const unit = findUnit(unitId);
  if (!unit) return;
  currentWaitingUnitData = unit;
  document.getElementById('waitingUnitInfo').textContent = `Unit ${unit.id} | Luas ${unit.luas}m² | Harga ${unit.harga} | Status ${unit.status}`;
  document.getElementById('wlUnit').value = `UNIT ${unit.id}`;
  document.getElementById('waitingListModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

function closeSimulationModal() {
  document.getElementById('simulationModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

function closeWaitingListModal() {
  document.getElementById('waitingListModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

window.submitWaitingList = async function() {
  if (!currentWaitingUnitData) return;
  const nama = document.getElementById('wlNama').value.trim();
  const email = document.getElementById('wlEmail').value.trim();
  const wa = document.getElementById('wlWhatsApp').value.trim();
  if (!nama || !email || !wa) {
    alert('Mohon lengkapi data');
    return;
  }
  const result = await submitBooking(currentWaitingUnitData.id, nama, email, wa, 'waiting');
  if (result.success) {
    alert('✅ Pendaftaran waiting list berhasil!');
    closeWaitingListModal();
    const message = `Halo Admin, ada pendaftar waiting list unit ${currentWaitingUnitData.id}. Nama: ${nama}, WA: ${wa}`;
    window.open(`https://wa.me/6287788526410?text=${encodeURIComponent(message)}`, '_blank');
  } else {
    alert('❌ Gagal mendaftar: ' + (result.error || 'Unknown error'));
  }
};

window.downloadSimulationPDF = function() {
  if (!currentSimulationData || !currentUnitData) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric' }) + ', ' + 
                  now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  doc.setFontSize(16);
  doc.text("Simulasi Pembayaran Kavling Kebun Maoslor", 14, 20);
  doc.setFontSize(10);
  doc.text(`Unit: ${currentUnitData.id} | Luas: ${currentUnitData.luas}m² | Status: ${currentUnitData.status}`, 14, 28);
  doc.text(`Generated: ${dateStr}`, 14, 34);
  doc.text(`*Administrasi: ${formatCurrency(currentSimulationData.bookingFee)} (dibayar diawal)`, 14, 42);

  const body = [
    ['Harga', formatCurrency(currentSimulationData.price), formatCurrency(currentSimulationData.price)],
    ['DP 20% (dibayar di Awal)', formatCurrency(currentSimulationData.dp), formatCurrency(currentSimulationData.dp)],
    ['Pokok Cicilan', formatCurrency(currentSimulationData.principal), formatCurrency(currentSimulationData.principal)],
    ['Cicilan/Bulan', formatCurrency(currentSimulationData.year2.cicilan), formatCurrency(currentSimulationData.year3.cicilan)]
  ];
  doc.autoTable({
    startY: 48,
    head: [['Komponen', '2 Tahun', '3 Tahun']],
    body: body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.text("Catatan:", 14, finalY);
  doc.setFontSize(8);
  doc.text("• Disarankan pengambilan jangka waktu Cicilan 3 tahun agar cicilan bulanan lebih ringan", 14, finalY + 6);
  doc.text("• Administrasi dibayar sekali diawal sebagai tanda jadi", 14, finalY + 12);
  doc.text("• Angka dapat berubah sesuai ketentuan marketing terbaru", 14, finalY + 18);

  doc.save(`Simulasi_Unit_${currentUnitData.id}_${now.getFullYear()}${now.getMonth()+1}${now.getDate()}_${now.getHours()}${now.getMinutes()}.pdf`);
};

window.contactMarketingSimulation = function() {
  if (!currentUnitData) return;
  window.open(`https://wa.me/6287788526410?text=Saya%20tertarik%20dengan%20unit%20${currentUnitData.id}`, '_blank');
};

window.downloadPDF = function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric' }) + ', ' + 
                  now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  doc.setFontSize(16);
  doc.text("Daftar Harga & Unit Kavling Maoslor", 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated on: ${dateStr}`, 14, 28);

  const rows = dataTanahTable.map(d => {
    let dimensi = (d.p === "Khusus" || d.l === "Khusus") ? "Khusus" : `${d.l} m x ${d.p} m`;
    return [`UNIT ${d.id}`, `${d.luas} m²`, dimensi, d.status, d.harga];
  });
  doc.autoTable({
    startY: 35,
    head: [['ID Unit', 'Luas Tanah', 'Dimensi', 'Status', 'Harga Jual']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }
  });
  doc.save(`Daftar_Harga_KavlingKebunMaoslor_${now.getFullYear()}${now.getMonth()+1}${now.getDate()}_${now.getHours()}${now.getMinutes()}.pdf`);
};

window.filterTable = function() {
  const filter = document.getElementById('searchUnit')?.value.toUpperCase() || '';
  const rows = document.querySelectorAll('#dataTanahBody tr');
  rows.forEach(row => {
    const td = row.querySelector('td');
    row.style.display = td && td.textContent.toUpperCase().includes(filter) ? '' : 'none';
  });
};

// ========== CHATBOT CORE ==========

const chatState = {
  currentMenu: 'main',
  currentUnitId: null,
  waitingForUnit: false
};

function setWelcomeTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const elem = document.getElementById('welcomeTime2');
  if (elem) elem.textContent = timeStr;
}

function addChatMessage(text, sender) {
  const messagesDiv = document.getElementById('chatbotMessages');
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messageDiv.innerHTML = `<div class="message-bubble">${text}</div><div class="message-time">${time}</div>`;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTypingIndicator() {
  const messagesDiv = document.getElementById('chatbotMessages');
  const old = document.getElementById('chatTypingIndicator');
  if (old) old.remove();
  const indicator = document.createElement('div');
  indicator.className = 'message bot';
  indicator.id = 'chatTypingIndicator';
  indicator.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  messagesDiv.appendChild(indicator);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('chatTypingIndicator');
  if (indicator) indicator.remove();
}

function renderMainMenu() {
  return `
    <strong>📋 Menu Utama — Kavling Maoslor</strong><br/><br/>
    Pilih opsi di bawah ini:<br/><br/>
    1️⃣ 📋 <strong>Lihat Unit Tersedia</strong><br/>
    2️⃣ 🔍 <strong>Cari Unit</strong> (contoh: G1, K1, A1)<br/>
    3️⃣ 💰 <strong>Simulasi Cicilan</strong><br/>
    4️⃣ 📍 <strong>Lokasi & Akses</strong><br/>
    5️⃣ 📞 <strong>Hubungi Marketing</strong><br/>
    6️⃣ ❓ <strong>Bantuan / FAQ</strong><br/><br/>
    <em>Ketik nomor atau kata kunci, atau klik tombol cepat di bawah.</em>
  `;
}

function renderUnitDetail(unit) {
  const statusEmoji = unit.status === 'Tersedia' ? '✅' : (unit.status === 'Booking' ? '⏳' : '❌');
  const statusBadge = unit.status === 'Tersedia' ? 'badge-tersedia' : (unit.status === 'Booking' ? 'badge-booking' : 'badge-terjual');
  let msg = `<strong>📦 Unit ${unit.id}</strong><br/><br/>`;
  msg += `💰 <strong>Harga:</strong> ${unit.harga}<br/>`;
  msg += `📏 <strong>Luas:</strong> ${unit.luas}m² (${unit.l}m x ${unit.p}m)<br/>`;
  msg += `📌 <strong>Status:</strong> ${statusEmoji} <span class="badge-status ${statusBadge}">${unit.status}</span><br/><br/>`;
  msg += `<strong>📋 Sub-Menu:</strong><br/>`;
  let btns = '';
  if (unit.status === 'Tersedia') {
    btns += `<span class="chat-action-btn primary" onclick="window.quickAsk('simulasi ${unit.id}')">💳 Simulasi</span>`;
    btns += `<span class="chat-action-btn" onclick="window.quickAsk('booking ${unit.id}')">📋 Booking</span>`;
  } else if (unit.status === 'Booking') {
    btns += `<span class="chat-action-btn warning" onclick="window.quickAsk('waiting ${unit.id}')">⏳ Daftar Tunggu</span>`;
  } else {
    btns += `<span class="chat-action-btn" style="opacity:0.5;cursor:default;">❌ Terjual</span>`;
  }
  btns += `<span class="chat-action-btn" onclick="window.quickAsk('denah ${unit.id}')">🗺️ Denah</span>`;
  btns += `<span class="back-btn" onclick="window.quickAsk('menu')">🔙 Kembali</span>`;
  msg += `<div class="chat-actions">${btns}</div>`;
  return msg;
}

function renderAvailableUnits() {
  const avail = dataTanahTable.filter(u => u.status === 'Tersedia');
  if (avail.length === 0) return 'Maaf, saat ini tidak ada unit tersedia. 😔';
  let msg = `<strong>📋 Unit Tersedia (${avail.length} unit)</strong><br/><br/>`;
  msg += avail.map(u => `• <strong>${u.id}</strong> — ${u.harga} (${u.luas}m²) <span class="badge-status badge-tersedia">Tersedia</span>`).join('<br/>');
  msg += `<br/><br/>💡 <em>Ketik kode unit (contoh: G1) untuk detail lengkap.</em>`;
  return msg;
}

function renderSimulation(unitId) {
  const unit = findUnit(unitId);
  if (!unit) return `❌ Unit ${unitId} tidak ditemukan.`;
  if (unit.status !== 'Tersedia') {
    return `❌ Unit ${unitId} saat ini berstatus <strong>${unit.status}</strong>, tidak bisa disimulasikan.`;
  }
  const calc = calculateBothSimulations(unit.harga);
  setTimeout(() => {
    if (typeof window.openSimulationModal === 'function') {
      window.openSimulationModal(unit.id, unit.harga);
    }
  }, 400);
  return `
    <strong>💳 Simulasi Cicilan — Unit ${unit.id}</strong><br/><br/>
    💰 Harga: ${unit.harga}<br/>
    📏 Luas: ${unit.luas}m²<br/>
    📌 Status: <span class="badge-status badge-tersedia">Tersedia</span><br/><br/>
    <strong>📊 Skema:</strong><br/>
    • Administrasi: ${formatCurrency(calc.bookingFee)} (dibayar awal)<br/>
    • DP 20%: ${formatCurrency(calc.dp)} (dibayar awal)<br/>
    • Pokok: ${formatCurrency(calc.principal)}<br/><br/>
    <strong>🔹 2 Tahun (24 bulan):</strong> ${formatCurrency(calc.year2.cicilan)}/bulan<br/>
    <strong>🔹 3 Tahun (36 bulan):</strong> ${formatCurrency(calc.year3.cicilan)}/bulan<br/><br/>
    💡 <em>Disarankan tenor 3 tahun agar cicilan lebih ringan.</em>
  `;
}

function renderBookingInfo(unitId) {
  const unit = findUnit(unitId);
  if (!unit) return `❌ Unit ${unitId} tidak ditemukan.`;
  if (unit.status === 'Terjual') return `❌ Unit ${unit.id} sudah <strong>TERJUAL</strong>.`;
  if (unit.status === 'Booking') {
    return `
      <strong>⏳ Unit ${unit.id} Sedang Booking</strong><br/><br/>
      Unit ini sedang dalam proses booking oleh calon pembeli lain.<br/>
      Namun Anda bisa mendaftar <strong>Daftar Tunggu Prioritas</strong>.<br/><br/>
      <div class="chat-actions">
        <span class="chat-action-btn warning" onclick="window.quickAsk('waiting ${unit.id}')">📋 Daftar Tunggu</span>
        <span class="chat-action-btn" onclick="window.quickAsk('unit ${unit.id}')">🔍 Detail</span>
        <span class="back-btn" onclick="window.quickAsk('menu')">🔙 Kembali</span>
      </div>
    `;
  }
  return `
    <strong>📋 Cara Booking — Unit ${unit.id}</strong><br/><br/>
    ✅ Unit ini <strong>TERSEDIA</strong>!<br/><br/>
    <strong>Langkah Booking:</strong><br/>
    1️⃣ Hubungi marketing kami via WhatsApp.<br/>
    2️⃣ Sampaikan kode unit: <strong>${unit.id}</strong><br/>
    3️⃣ Lakukan pembayaran DP 20% + administrasi.<br/>
    4️⃣ Tanda jadi dan cicilan pertama dibayar di awal.<br/><br/>
    📞 <strong>Kontak:</strong> 0877-8852-6410 (Ribut Nurdiansyah)<br/><br/>
    <div class="chat-actions">
      <span class="chat-action-btn primary" onclick="window.quickAsk('simulasi ${unit.id}')">💳 Simulasi</span>
      <span class="chat-action-btn" onclick="window.quickAsk('kontak')">📞 Hubungi Marketing</span>
      <span class="back-btn" onclick="window.quickAsk('menu')">🔙 Kembali</span>
    </div>
  `;
}

function renderWaitingList(unitId) {
  const unit = findUnit(unitId);
  if (!unit) return `❌ Unit ${unitId} tidak ditemukan.`;
  if (unit.status === 'Tersedia') {
    return `✅ Unit ${unit.id} masih <strong>TERSEDIA</strong>, tidak perlu daftar tunggu. Silakan booking langsung!`;
  }
  if (unit.status === 'Terjual') return `❌ Unit ${unit.id} sudah <strong>TERJUAL</strong>.`;
  setTimeout(() => {
    if (typeof window.openWaitingListModal === 'function') {
      window.openWaitingListModal(unit.id, unit.harga);
    }
  }, 400);
  return `
    <strong>⏳ Daftar Tunggu — Unit ${unit.id}</strong><br/><br/>
    Unit ini sedang <strong>BOOKING</strong>.<br/>
    Saya sudah bukakan formulir pendaftaran untuk Anda.<br/>
    Isi data Anda, dan kami akan hubungi jika unit tersedia kembali.
  `;
}

function renderLocation() {
  return `
    <strong>📍 Lokasi & Akses</strong><br/><br/>
    Kavling Kebun Maoslor berlokasi di:<br/>
    <strong>Desa Maoslor, Kecamatan Maos, Kabupaten Cilacap, Jawa Tengah 53272</strong><br/><br/>
    <strong>✨ Keunggulan:</strong><br/>
    • Akses jalan desa (lebar 3-4m)<br/>
    • Dekat SD, SMP, dan Pasar Maos<br/>
    • 15 menit ke pusat kota Cilacap<br/>
    • Udara sejuk, cocok untuk hidroponik
  `;
}

function renderContact() {
  return `
    <strong>📞 Hubungi Marketing</strong><br/><br/>
    👤 <strong>Ribut Nurdiansyah</strong><br/>
    💬 WhatsApp: <strong>0877-8852-6410</strong><br/><br/>
    Saya siap bantu kapan saja. 😊<br/>
    Klik tombol di bawah untuk chat langsung.<br/><br/>
    <div class="chat-actions">
      <span class="chat-action-btn primary" onclick="window.quickAsk('chatwa')">💬 Chat WhatsApp</span>
      <span class="back-btn" onclick="window.quickAsk('menu')">🔙 Kembali</span>
    </div>
  `;
}

function renderHelp() {
  return `
    <strong>❓ Bantuan & FAQ</strong><br/><br/>
    <strong>Pertanyaan umum:</strong><br/>
    • <strong>Cicilan:</strong> DP 20%, tenor 1-3 tahun, bunga 12%/thn flat.<br/>
    • <strong>Booking:</strong> Hubungi marketing, bayar DP + administrasi.<br/>
    • <strong>Dokumen:</strong> Diberikan setelah lunas.<br/>
    • <strong>Survey:</strong> Gratis, hubungi marketing.<br/><br/>
    <strong>📋 Perintah cepat:</strong><br/>
    • <strong>unit G1</strong> — detail unit G1<br/>
    • <strong>simulasi G1</strong> — simulasi cicilan<br/>
    • <strong>booking G1</strong> — cara booking<br/>
    • <strong>waiting G1</strong> — daftar tunggu<br/>
    • <strong>denah G1</strong> — lihat denah
  `;
}

function navigateToDenah(unitId) {
  const section = document.getElementById('denah');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    section.classList.add('section-highlight');
    setTimeout(() => section.classList.remove('section-highlight'), 2000);
  }
  if (unitId) {
    setTimeout(() => {
      const searchInput = document.getElementById('searchUnit');
      if (searchInput) {
        searchInput.value = unitId;
        searchInput.dispatchEvent(new Event('keyup'));
      }
      const rows = document.querySelectorAll('#dataTanahBody tr');
      for (let row of rows) {
        if (row.textContent.includes(`UNIT ${unitId}`)) {
          row.classList.add('unit-highlight');
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => row.classList.remove('unit-highlight'), 3000);
          break;
        }
      }
    }, 600);
  }
}

// ========== PROSES CHAT QUERY ==========

window.processChatQuery = async function(query) {
  showTypingIndicator();
  const lower = query.trim().toLowerCase();
  const unitRegex = /\b([a-z]\d+)\b/i;
  const unitMatch = lower.match(unitRegex);
  const detectedUnitId = unitMatch ? unitMatch[1].toUpperCase() : null;

  const isMenu = /^(menu|main|kembali|back|0)$/.test(lower) || lower === 'menu utama';
  const isAvailable = /^(1|unit tersedia|daftar unit|lihat unit|tersedia|unit apa saja)$/.test(lower);
  const isSearch = /^(2|cari unit|cari|search)$/.test(lower);
  const isSimulasiCmd = /^(3|simulasi|simulasi cicilan|cicilan)$/.test(lower) || lower.startsWith('simulasi ');
  const isLocation = /^(4|lokasi|akses|alamat|dimana|letak|peta)$/.test(lower);
  const isContact = /^(5|kontak|marketing|hubungi|wa|whatsapp|telepon|phone)$/.test(lower);
  const isHelp = /^(6|bantuan|faq|help|tolong|bantu)$/.test(lower);
  const isBookingCmd = lower.startsWith('booking ') || lower === 'booking';
  const isWaitingCmd = lower.startsWith('waiting ') || lower === 'waiting';
  const isDenahCmd = lower.startsWith('denah ') || lower === 'denah';
  const isChatWA = /^(chatwa|chat whatsapp|wa sekarang)$/.test(lower);
  const isUnitDetail = detectedUnitId && !lower.startsWith('simulasi ') && !lower.startsWith('booking ') && !lower.startsWith('waiting ') && !lower.startsWith('denah ');

  if (isMenu) {
    chatState.currentMenu = 'main';
    chatState.currentUnitId = null;
    chatState.waitingForUnit = false;
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderMainMenu(), 'bot');
    }, 300);
    return;
  }

  if (isChatWA) {
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage('💬 <strong>Hubungi Marketing via WhatsApp</strong><br/><br/>Klik link ini:<br/><a href="https://wa.me/6287788526410" target="_blank" style="color:#22c55e;font-weight:bold;">0877-8852-6410</a>', 'bot');
      setTimeout(() => window.open('https://wa.me/6287788526410', '_blank'), 500);
    }, 300);
    return;
  }

  if (isAvailable) {
    chatState.currentMenu = 'main';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderAvailableUnits(), 'bot');
    }, 300);
    return;
  }

  if (isSearch) {
    chatState.waitingForUnit = true;
    chatState.currentMenu = 'search';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage('🔍 <strong>Cari Unit</strong><br/><br/>Silakan ketik kode unit yang ingin dicari.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>', 'bot');
    }, 300);
    return;
  }

  if (isSimulasiCmd) {
    if (detectedUnitId) {
      chatState.currentMenu = 'simulation';
      chatState.currentUnitId = detectedUnitId;
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage(renderSimulation(detectedUnitId), 'bot');
      }, 300);
      return;
    }
    chatState.waitingForUnit = true;
    chatState.currentMenu = 'simulation';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage('💰 <strong>Simulasi Cicilan</strong><br/><br/>Silakan ketik kode unit yang ingin disimulasikan.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>', 'bot');
    }, 300);
    return;
  }

  if (isLocation) {
    chatState.currentMenu = 'main';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderLocation(), 'bot');
      navigateToDenah(null);
    }, 300);
    return;
  }

  if (isContact) {
    chatState.currentMenu = 'main';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderContact(), 'bot');
      document.getElementById('kontak')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return;
  }

  if (isHelp) {
    chatState.currentMenu = 'main';
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderHelp(), 'bot');
    }, 300);
    return;
  }

  if (isBookingCmd) {
    let unitId = detectedUnitId;
    if (!unitId && chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
      unitId = chatState.currentUnitId;
    }
    if (!unitId) {
      chatState.waitingForUnit = true;
      chatState.currentMenu = 'booking';
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage('📋 <strong>Cara Booking</strong><br/><br/>Silakan ketik kode unit yang ingin di-booking.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>', 'bot');
      }, 300);
      return;
    }
    chatState.currentMenu = 'booking';
    chatState.currentUnitId = unitId;
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderBookingInfo(unitId), 'bot');
    }, 300);
    return;
  }

  if (isWaitingCmd) {
    let unitId = detectedUnitId;
    if (!unitId && chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
      unitId = chatState.currentUnitId;
    }
    if (!unitId) {
      chatState.waitingForUnit = true;
      chatState.currentMenu = 'waiting';
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage('⏳ <strong>Daftar Tunggu</strong><br/><br/>Silakan ketik kode unit yang ingin didaftarkan ke waiting list.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>', 'bot');
      }, 300);
      return;
    }
    chatState.currentMenu = 'waiting';
    chatState.currentUnitId = unitId;
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(renderWaitingList(unitId), 'bot');
    }, 300);
    return;
  }

  if (isDenahCmd) {
    let unitId = detectedUnitId;
    if (!unitId && chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
      unitId = chatState.currentUnitId;
    }
    if (unitId) {
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage(`🗺️ Saya arahkan ke Denah dan menampilkan Unit <strong>${unitId}</strong>.`, 'bot');
        navigateToDenah(unitId);
      }, 300);
    } else {
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage('🗺️ Saya arahkan ke Denah 3D interaktif.', 'bot');
        navigateToDenah(null);
      }, 300);
    }
    return;
  }

  if (isUnitDetail) {
    const unit = findUnit(detectedUnitId);
    if (unit) {
      chatState.currentMenu = 'unit_detail';
      chatState.currentUnitId = unit.id;
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage(renderUnitDetail(unit), 'bot');
        navigateToDenah(unit.id);
      }, 300);
      return;
    }
  }

  if (chatState.waitingForUnit) {
    const possibleUnit = findUnit(query);
    if (possibleUnit) {
      chatState.waitingForUnit = false;
      const prevMenu = chatState.currentMenu;
      if (prevMenu === 'simulation') {
        chatState.currentMenu = 'simulation';
        chatState.currentUnitId = possibleUnit.id;
        setTimeout(() => {
          removeTypingIndicator();
          addChatMessage(renderSimulation(possibleUnit.id), 'bot');
        }, 300);
        return;
      } else if (prevMenu === 'booking') {
        chatState.currentMenu = 'booking';
        chatState.currentUnitId = possibleUnit.id;
        setTimeout(() => {
          removeTypingIndicator();
          addChatMessage(renderBookingInfo(possibleUnit.id), 'bot');
        }, 300);
        return;
      } else if (prevMenu === 'waiting') {
        chatState.currentMenu = 'waiting';
        chatState.currentUnitId = possibleUnit.id;
        setTimeout(() => {
          removeTypingIndicator();
          addChatMessage(renderWaitingList(possibleUnit.id), 'bot');
        }, 300);
        return;
      } else {
        chatState.currentMenu = 'unit_detail';
        chatState.currentUnitId = possibleUnit.id;
        chatState.waitingForUnit = false;
        setTimeout(() => {
          removeTypingIndicator();
          addChatMessage(renderUnitDetail(possibleUnit), 'bot');
          navigateToDenah(possibleUnit.id);
        }, 300);
        return;
      }
    } else {
      chatState.waitingForUnit = false;
      setTimeout(() => {
        removeTypingIndicator();
        addChatMessage(`❌ Saya tidak menemukan unit dengan kode "<strong>${query}</strong>".<br/><br/>Coba ketik kode yang benar, misal: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>.<br/><br/>Atau ketik <strong>menu</strong> untuk kembali.`, 'bot');
      }, 300);
      return;
    }
  }

  // Fallback AI
  try {
    const answer = await askAI(query);
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage(answer, 'bot');
    }, 300);
    await logChat('web-user', query, false, 'web');
    await logChat('web-user', answer, true, 'web');
  } catch (err) {
    setTimeout(() => {
      removeTypingIndicator();
      addChatMessage('Maaf, terjadi kesalahan. Silakan coba lagi.', 'bot');
    }, 300);
  }
};

// ========== CHATBOT UI ==========

window.toggleChatbot = function() {
  const panel = document.getElementById('chatbotNavPanel');
  const btn = document.getElementById('chatbotFloatingBtn');
  panel.classList.toggle('active');
  if (panel.classList.contains('active')) {
    btn.innerHTML = '<i data-lucide="x" style="width: 32px; height: 32px; color: white;"></i>';
    setWelcomeTime();
    if (chatState.currentMenu !== 'main') {
      chatState.currentMenu = 'main';
      chatState.currentUnitId = null;
      chatState.waitingForUnit = false;
    }
  } else {
    btn.innerHTML = '<i data-lucide="message-circle" style="width: 32px; height: 32px; color: white;"></i>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.sendChatMessage = function() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim();
  if (text) {
    addChatMessage(text, 'user');
    logChat('web-user', text, false, 'web');
    processChatQuery(text);
    input.value = '';
  }
};

window.quickAsk = function(query) {
  addChatMessage(query, 'user');
  logChat('web-user', query, false, 'web');
  processChatQuery(query);
};

// ========== INISIALISASI ==========

document.addEventListener('DOMContentLoaded', async function() {
  await loadUnits();
  setWelcomeTime();
  chatState.currentMenu = 'main';
  chatState.currentUnitId = null;
  chatState.waitingForUnit = false;
  renderTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
