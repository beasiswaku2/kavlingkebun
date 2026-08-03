// ============================================================
//  chatbot.js — Sari, Agent Properti Maoslor
//  Version 1.0 (Data dari API)
// ============================================================

// State chatbot
const chatState = {
    currentMenu: 'main',
    currentUnitId: null,
    waitingForUnit: false,
    lastQuery: '',
};

let chatHistory = [];

/**
 * Set welcome time di chat
 */
function setWelcomeTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const welcomeElem = document.getElementById('welcomeTime2');
    if (welcomeElem) welcomeElem.textContent = timeStr;
}

/**
 * Toggle chatbot panel
 */
function toggleChatbot() {
    const panel = document.getElementById('chatbotNavPanel');
    const btn = document.getElementById('chatbotFloatingBtn');
    panel.classList.toggle('active');

    if (panel.classList.contains('active')) {
        btn.innerHTML = '<i data-lucide="x" style="width: 32px; height: 32px; color: white;"></i>';
        setWelcomeTime();
        // Reset state ke main menu jika baru buka
        if (chatState.currentMenu !== 'main') {
            chatState.currentMenu = 'main';
            chatState.currentUnitId = null;
            chatState.waitingForUnit = false;
        }
    } else {
        btn.innerHTML = '<i data-lucide="message-circle" style="width: 32px; height: 32px; color: white;"></i>';
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Tambah pesan ke chat
 */
function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chatbotMessages');
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `<div class="message-bubble">${text}</div><div class="message-time">${time}</div>`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    chatHistory.push({ text, sender, time });
}

/**
 * Tampilkan typing indicator
 */
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

/**
 * Hapus typing indicator
 */
function removeTypingIndicator() {
    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) indicator.remove();
}

/**
 * Kirim pesan dari input
 */
function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const text = input.value.trim();
    if (text) {
        addChatMessage(text, 'user');
        processChatQuery(text);
        input.value = '';
    }
}

/**
 * Quick ask dari tombol
 */
function quickAsk(query) {
    addChatMessage(query, 'user');
    processChatQuery(query);
}

// ============================================================
//  CORE CHATBOT LOGIC
// ============================================================

function processChatQuery(query) {
    showTypingIndicator();

    const lower = query.trim().toLowerCase();
    const words = lower.split(/\s+/);

    // Deteksi kode unit (huruf + angka)
    const unitRegex = /\b([a-z]\d+)\b/i;
    const unitMatch = lower.match(unitRegex);
    const detectedUnitId = unitMatch ? unitMatch[1].toUpperCase() : null;

    // Deteksi perintah
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

    // --- 1. MENU UTAMA ---
    if (isMenu) {
        chatState.currentMenu = 'main';
        chatState.currentUnitId = null;
        chatState.waitingForUnit = false;
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(renderMainMenu(), 'bot');
        }, 400);
        return;
    }

    // --- 2. CHAT WHATSAPP ---
    if (isChatWA) {
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(
                '💬 <strong>Hubungi Marketing via WhatsApp</strong><br/><br/>Klik link ini untuk chat langsung:<br/><a href="https://wa.me/6287788526410" target="_blank" style="color:#22c55e;font-weight:bold;">0877-8852-6410</a><br/><br/>Atau klik tombol di bawah.',
                'bot'
            );
            setTimeout(() => {
                window.open('https://wa.me/6287788526410', '_blank');
            }, 600);
        }, 400);
        return;
    }

    // --- 3. UNIT TERSEDIA ---
    if (isAvailable) {
        chatState.currentMenu = 'main';
        chatState.currentUnitId = null;
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(renderAvailableUnits(), 'bot');
        }, 400);
        return;
    }

    // --- 4. CARI UNIT ---
    if (isSearch) {
        chatState.waitingForUnit = true;
        chatState.currentMenu = 'search';
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(
                '🔍 <strong>Cari Unit</strong><br/><br/>Silakan ketik kode unit yang ingin dicari.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>',
                'bot'
            );
        }, 400);
        return;
    }

    // --- 5. SIMULASI ---
    if (isSimulasiCmd) {
        if (detectedUnitId) {
            chatState.currentMenu = 'simulation';
            chatState.currentUnitId = detectedUnitId;
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(renderSimulation(detectedUnitId), 'bot');
            }, 400);
            return;
        }
        chatState.waitingForUnit = true;
        chatState.currentMenu = 'simulation';
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(
                '💰 <strong>Simulasi Cicilan</strong><br/><br/>Silakan ketik kode unit yang ingin disimulasikan.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>',
                'bot'
            );
        }, 400);
        return;
    }

    // --- 6. LOKASI ---
    if (isLocation) {
        chatState.currentMenu = 'main';
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(renderLocation(), 'bot');
            highlightSection('video');
        }, 400);
        return;
    }

    // --- 7. KONTAK ---
    if (isContact) {
        chatState.currentMenu = 'main';
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(renderContact(), 'bot');
            highlightSection('kontak');
        }, 400);
        return;
    }

    // --- 8. BANTUAN ---
    if (isHelp) {
        chatState.currentMenu = 'main';
        setTimeout(() => {
            removeTypingIndicator();
            addChatMessage(renderHelp(), 'bot');
        }, 400);
        return;
    }

    // --- 9. BOOKING ---
    if (isBookingCmd) {
        let unitId = detectedUnitId;
        if (!unitId) {
            if (chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
                unitId = chatState.currentUnitId;
            } else {
                chatState.waitingForUnit = true;
                chatState.currentMenu = 'booking';
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(
                        '📋 <strong>Cara Booking</strong><br/><br/>Silakan ketik kode unit yang ingin di-booking.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>',
                        'bot'
                    );
                }, 400);
                return;
            }
        }
        if (unitId) {
            chatState.currentMenu = 'booking';
            chatState.currentUnitId = unitId;
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(renderBookingInfo(unitId), 'bot');
            }, 400);
        }
        return;
    }

    // --- 10. WAITING ---
    if (isWaitingCmd) {
        let unitId = detectedUnitId;
        if (!unitId) {
            if (chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
                unitId = chatState.currentUnitId;
            } else {
                chatState.waitingForUnit = true;
                chatState.currentMenu = 'waiting';
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(
                        '⏳ <strong>Daftar Tunggu</strong><br/><br/>Silakan ketik kode unit yang ingin didaftarkan ke waiting list.<br/>Contoh: <strong>G1</strong>, <strong>K1</strong>',
                        'bot'
                    );
                }, 400);
                return;
            }
        }
        if (unitId) {
            chatState.currentMenu = 'waiting';
            chatState.currentUnitId = unitId;
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(renderWaitingList(unitId), 'bot');
            }, 400);
        }
        return;
    }

    // --- 11. DENAH ---
    if (isDenahCmd) {
        let unitId = detectedUnitId;
        if (!unitId) {
            if (chatState.currentUnitId && chatState.currentMenu === 'unit_detail') {
                unitId = chatState.currentUnitId;
            } else {
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage('🗺️ Saya arahkan ke Denah 3D interaktif.', 'bot');
                    highlightSection('denah');
                }, 400);
                return;
            }
        }
        if (unitId) {
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(`🗺️ Saya arahkan ke Denah dan menampilkan Unit <strong>${unitId}</strong>.`, 'bot');
                navigateToDenah(unitId);
            }, 400);
        }
        return;
    }

    // --- 12. DETEKSI UNIT (kode saja) ---
    if (detectedUnitId) {
        const unit = findUnitById(detectedUnitId);
        if (unit) {
            chatState.currentMenu = 'unit_detail';
            chatState.currentUnitId = unit.id;
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(renderUnitDetail(unit), 'bot');
                navigateToDenah(unit.id);
            }, 400);
            return;
        }
    }

    // --- 13. FALLBACK: menunggu input unit ---
    if (chatState.waitingForUnit) {
        const possibleUnit = findUnitById(query);
        if (possibleUnit) {
            chatState.waitingForUnit = false;
            const prevMenu = chatState.currentMenu;
            if (prevMenu === 'simulation') {
                chatState.currentMenu = 'simulation';
                chatState.currentUnitId = possibleUnit.id;
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(renderSimulation(possibleUnit.id), 'bot');
                }, 400);
                return;
            } else if (prevMenu === 'booking') {
                chatState.currentMenu = 'booking';
                chatState.currentUnitId = possibleUnit.id;
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(renderBookingInfo(possibleUnit.id), 'bot');
                }, 400);
                return;
            } else if (prevMenu === 'waiting') {
                chatState.currentMenu = 'waiting';
                chatState.currentUnitId = possibleUnit.id;
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(renderWaitingList(possibleUnit.id), 'bot');
                }, 400);
                return;
            } else {
                chatState.currentMenu = 'unit_detail';
                chatState.currentUnitId = possibleUnit.id;
                chatState.waitingForUnit = false;
                setTimeout(() => {
                    removeTypingIndicator();
                    addChatMessage(renderUnitDetail(possibleUnit), 'bot');
                    navigateToDenah(possibleUnit.id);
                }, 400);
                return;
            }
        } else {
            chatState.waitingForUnit = false;
            setTimeout(() => {
                removeTypingIndicator();
                addChatMessage(
                    `❌ Saya tidak menemukan unit dengan kode "<strong>${query}</strong>".<br/><br/>Coba ketik kode yang benar, misal: <strong>G1</strong>, <strong>K1</strong>, <strong>A1</strong>.<br/><br/>Atau ketik <strong>menu</strong> untuk kembali ke menu utama.`,
                    'bot'
                );
            }, 400);
            return;
        }
    }

    // --- 14. FALLBACK UMUM ---
    setTimeout(() => {
        removeTypingIndicator();
        addChatMessage(
            `Maaf, saya kurang paham dengan pertanyaan Anda. 😊<br/><br/>` +
            `Coba gunakan perintah ini:<br/>` +
            `• <strong>menu</strong> — lihat menu utama<br/>` +
            `• <strong>unit G1</strong> — detail unit G1<br/>` +
            `• <strong>simulasi G1</strong> — simulasi cicilan<br/>` +
            `• <strong>booking G1</strong> — cara booking<br/>` +
            `• <strong>waiting G1</strong> — daftar tunggu<br/>` +
            `• <strong>denah G1</strong> — lihat denah<br/>` +
            `• <strong>lokasi</strong> — info alamat<br/>` +
            `• <strong>kontak</strong> — hubungi marketing<br/><br/>` +
            `Atau klik tombol cepat di bawah.`,
            'bot'
        );
    }, 400);
}

// ============================================================
//  RENDER FUNCTIONS
// ============================================================

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

function renderAvailableUnits() {
    const data = window.unitsData || [];
    const avail = data.filter(u => u.status === 'Tersedia');

    if (avail.length === 0) return 'Maaf, saat ini tidak ada unit tersedia. 😔';

    let msg = `<strong>📋 Unit Tersedia (${avail.length} unit)</strong><br/><br/>`;
    msg += avail.map(u =>
        `• <strong>${u.id}</strong> — ${u.harga} (${u.luas}m²) ${statusBadge(u.status)}`
    ).join('<br/>');
    msg += `<br/><br/>💡 <em>Ketik kode unit (contoh: G1) untuk detail lengkap.</em>`;
    return msg;
}

function renderUnitDetail(unit) {
    const statusEmoji = unit.status === 'Tersedia' ? '✅' : (unit.status === 'Booking' ? '⏳' : '❌');
    let msg = `<strong>📦 Unit ${unit.id}</strong><br/><br/>`;
    msg += `💰 <strong>Harga:</strong> ${unit.harga}<br/>`;
    msg += `📏 <strong>Luas:</strong> ${unit.luas}m²`;
    if (unit.p && unit.l && unit.p !== 0 && unit.l !== 0) {
        msg += ` (${unit.l}m x ${unit.p}m)`;
    }
    msg += `<br/>`;
    msg += `📌 <strong>Status:</strong> ${statusEmoji} ${statusBadge(unit.status)}<br/><br/>`;
    msg += `<strong>📋 Sub-Menu:</strong><br/>`;
    msg += `<div class="chat-actions">${unitActionButtons(unit)}</div>`;
    return msg;
}

function renderSimulation(unitId) {
    const unit = findUnitById(unitId);
    if (!unit) return `❌ Unit ${unitId} tidak ditemukan. Coba cek daftar unit tersedia.`;

    if (unit.status === 'Terjual') {
        return `❌ Unit ${unitId} sudah <strong>TERJUAL</strong>, tidak bisa disimulasikan.`;
    }

    let calc;
    try {
        calc = calculateSimulation(unit.hargaRaw || unit.harga);
    } catch (e) {
        return `❌ Gagal menghitung simulasi: ${e.message}`;
    }

    const msg = `
        <strong>💳 Simulasi Cicilan — Unit ${unit.id}</strong><br/><br/>
        💰 Harga: ${unit.harga}<br/>
        📏 Luas: ${unit.luas}m²<br/>
        📌 Status: ${statusBadge(unit.status)}<br/><br/>
        <strong>📊 Skema:</strong><br/>
        • Administrasi: ${formatCurrency(calc.bookingFee)} (dibayar awal)<br/>
        • DP 20%: ${formatCurrency(calc.dp)} (dibayar awal)<br/>
        • Pokok: ${formatCurrency(calc.principal)}<br/><br/>
        <strong>🔹 2 Tahun (24 bulan):</strong> ${formatCurrency(calc.year2.cicilan)}/bulan<br/>
        <strong>🔹 3 Tahun (36 bulan):</strong> ${formatCurrency(calc.year3.cicilan)}/bulan<br/><br/>
        💡 <em>Disarankan tenor 3 tahun agar cicilan lebih ringan.</em><br/><br/>
        <div class="chat-actions">
            <span class="chat-action-btn primary" onclick="quickAsk('booking ${unit.id}')">📋 Cara Booking</span>
            <span class="chat-action-btn" onclick="quickAsk('denah ${unit.id}')">🗺️ Lihat Denah</span>
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
        </div>
    `;

    // Buka modal simulasi
    setTimeout(() => {
        if (typeof window.openSimulationModal === 'function') {
            window.openSimulationModal(unit.id, unit.harga);
        }
    }, 400);

    return msg;
}

function renderBookingInfo(unitId) {
    const unit = findUnitById(unitId);
    if (!unit) return `❌ Unit ${unitId} tidak ditemukan.`;

    if (unit.status === 'Terjual') {
        return `❌ Unit ${unit.id} sudah <strong>TERJUAL</strong>. Silakan cek unit lain yang tersedia.`;
    }

    if (unit.status === 'Booking') {
        return `
            <strong>⏳ Unit ${unit.id} Sedang Booking</strong><br/><br/>
            Unit ini sedang dalam proses booking oleh calon pembeli lain.<br/>
            Namun Anda bisa mendaftar <strong>Daftar Tunggu Prioritas</strong>.<br/><br/>
            <div class="chat-actions">
                <span class="chat-action-btn warning" onclick="quickAsk('waiting ${unit.id}')">📋 Daftar Tunggu</span>
                <span class="chat-action-btn" onclick="quickAsk('unit ${unit.id}')">🔍 Lihat Detail</span>
                <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
            </div>
        `;
    }

    // Tersedia
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
            <span class="chat-action-btn primary" onclick="quickAsk('simulasi ${unit.id}')">💳 Simulasi</span>
            <span class="chat-action-btn" onclick="quickAsk('kontak')">📞 Hubungi Marketing</span>
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
        </div>
    `;
}

function renderWaitingList(unitId) {
    const unit = findUnitById(unitId);
    if (!unit) return `❌ Unit ${unitId} tidak ditemukan.`;

    if (unit.status === 'Tersedia') {
        return `✅ Unit ${unit.id} masih <strong>TERSEDIA</strong>, tidak perlu daftar tunggu. Silakan booking langsung!`;
    }

    if (unit.status === 'Terjual') {
        return `❌ Unit ${unit.id} sudah <strong>TERJUAL</strong>.`;
    }

    // Booking
    setTimeout(() => {
        if (typeof window.openWaitingListModal === 'function') {
            window.openWaitingListModal(unit.id, unit.harga);
        }
    }, 400);

    return `
        <strong>⏳ Daftar Tunggu — Unit ${unit.id}</strong><br/><br/>
        Unit ini sedang <strong>BOOKING</strong>.<br/>
        Saya sudah bukakan formulir pendaftaran untuk Anda.<br/>
        Isi data Anda, dan kami akan hubungi jika unit tersedia kembali.<br/><br/>
        <div class="chat-actions">
            <span class="chat-action-btn warning" onclick="quickAsk('unit ${unit.id}')">🔍 Detail Unit</span>
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
        </div>
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
        • Udara sejuk, cocok untuk hidroponik<br/><br/>
        <div class="chat-actions">
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
        </div>
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
            <span class="chat-action-btn primary" onclick="quickAsk('chatwa')">💬 Chat WhatsApp</span>
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
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
        • <strong>denah G1</strong> — lihat denah<br/><br/>
        <div class="chat-actions">
            <span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>
        </div>
    `;
}

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

function statusBadge(status) {
    const cls = status === 'Tersedia' ? 'badge-tersedia' :
        (status === 'Booking' ? 'badge-booking' : 'badge-terjual');
    return `<span class="badge-status ${cls}">${status}</span>`;
}

function unitActionButtons(unit) {
    let btns = '';
    if (unit.status === 'Tersedia') {
        btns += `<span class="chat-action-btn primary" onclick="quickAsk('simulasi ${unit.id}')">💳 Simulasi Cicilan</span>`;
        btns += `<span class="chat-action-btn" onclick="quickAsk('booking ${unit.id}')">📋 Cara Booking</span>`;
    } else if (unit.status === 'Booking') {
        btns += `<span class="chat-action-btn warning" onclick="quickAsk('waiting ${unit.id}')">⏳ Daftar Tunggu</span>`;
    } else {
        btns += `<span class="chat-action-btn" style="opacity:0.5;cursor:default;">❌ Terjual</span>`;
    }
    btns += `<span class="chat-action-btn" onclick="quickAsk('denah ${unit.id}')">🗺️ Lihat Denah</span>`;
    btns += `<span class="back-btn" onclick="quickAsk('menu')">🔙 Kembali</span>`;
    return btns;
}

function navigateToDenah(unitId) {
    highlightSection('denah');
    if (unitId) {
        setTimeout(() => {
            const searchInput = document.getElementById('searchUnit');
            if (searchInput) {
                searchInput.value = unitId;
                if (typeof window.filterTable === 'function') {
                    window.filterTable();
                }
            }
            highlightUnitInTable(unitId);
        }, 600);
    }
}

function highlightSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.classList.add('section-highlight');
        setTimeout(() => section.classList.remove('section-highlight'), 2000);
    }
}

function highlightUnitInTable(unitId) {
    const rows = document.querySelectorAll('#dataTanahBody tr');
    for (let row of rows) {
        if (row.textContent.includes(`UNIT ${unitId}`)) {
            row.classList.add('unit-highlight');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => row.classList.remove('unit-highlight'), 3000);
            return true;
        }
    }
    return false;
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.toggleChatbot = toggleChatbot;
window.sendChatMessage = sendChatMessage;
window.quickAsk = quickAsk;
window.setWelcomeTime = setWelcomeTime;
window.addChatMessage = addChatMessage;
window.processChatQuery = processChatQuery;