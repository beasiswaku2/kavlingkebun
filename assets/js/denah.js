// ============================================================
//  denah.js — Three.js 3D Denah Interaktif
//  Version 1.0 (Data dimuat dari API)
// ============================================================

let denahScene = null;
let denahCamera = null;
let denahRenderer = null;
let denahControls = null;
let denahPlots = [];
let denahHoveredObject = null;
let denahInitialized = false;
let denahData = [];

/**
 * Inisialisasi denah 3D
 */
function initDenah() {
    const container = document.getElementById('denah-canvas-container');
    if (!container) {
        console.warn('[DENAH] Container tidak ditemukan');
        return;
    }

    // Jika sudah diinisialisasi, bersihkan dulu
    if (denahInitialized) {
        cleanupDenah();
    }

    // Gunakan data dari window.unitsData
    if (!window.unitsData || window.unitsData.length === 0) {
        console.warn('[DENAH] Data unit belum tersedia, menunggu...');
        // Tunggu event unitsLoaded
        document.addEventListener('unitsLoaded', function handler(e) {
            document.removeEventListener('unitsLoaded', handler);
            denahData = window.unitsData;
            initDenahInternal(container);
        });
        return;
    }

    denahData = window.unitsData;
    initDenahInternal(container);
}

/**
 * Internal inisialisasi Three.js
 */
function initDenahInternal(container) {
    const isMobile = window.innerWidth < 768;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    denahScene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, isMobile ? 45 : 35, isMobile ? 20 : 16);
    denahCamera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    denahRenderer = renderer;

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    denahControls = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    // Buat denah
    createDenah(scene);

    // Event handlers
    const tooltip = document.getElementById('tooltip-denah');

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        if (tooltip) {
            tooltip.style.left = (e.clientX + 20) + 'px';
            tooltip.style.top = (e.clientY + 20) + 'px';
        }

        updateHover(mouse, scene, camera, container);
    });

    let touchTimeout;
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((touch.clientX - rect.left) / container.clientWidth) * 2 - 1;
            mouse.y = -((touch.clientY - rect.top) / container.clientHeight) * 2 + 1;

            if (tooltip) {
                tooltip.style.left = (touch.clientX + 20) + 'px';
                tooltip.style.top = (touch.clientY + 20) + 'px';
            }

            clearTimeout(touchTimeout);
            touchTimeout = setTimeout(() => {
                if (tooltip) tooltip.style.display = 'none';
            }, 3000);

            updateHover(mouse, scene, camera, container);
        }
    });

    container.addEventListener('click', (e) => {
        if (denahHoveredObject) {
            const d = denahHoveredObject.userData;
            if (tooltip) tooltip.style.display = 'none';
            denahHoveredObject.scale.set(1, 1, 1);
            denahHoveredObject = null;
            container.style.cursor = 'default';

            // Buka action unit
            if (d && d.id) {
                const unitData = findUnitById(d.id);
                if (unitData) {
                    if (unitData.status === 'Tersedia') {
                        if (typeof window.openSimulationModal === 'function') {
                            window.openSimulationModal(unitData.id, unitData.harga);
                        }
                    } else if (unitData.status === 'Booking') {
                        if (typeof window.openWaitingListModal === 'function') {
                            window.openWaitingListModal(unitData.id, unitData.harga);
                        }
                    } else {
                        alert(`Maaf, Unit ${unitData.id} sudah terjual.`);
                    }
                }
            }
        }
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isMobile = window.innerWidth < 768;
            camera.position.set(0, isMobile ? 45 : 35, isMobile ? 20 : 16);
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }, 250);
    });

    denahInitialized = true;
    console.log('[DENAH] Denah 3D berhasil diinisialisasi');
}

/**
 * Membuat denah 3D dari data unit
 */
function createDenah(scene) {
    const statusColors = {
        'Tersedia': '#22c55e',
        'Booking': '#eab308',
        'Terjual': '#ef4444',
    };

    // Bersihkan plot sebelumnya
    denahPlots.forEach(plot => {
        scene.remove(plot);
    });
    denahPlots = [];

    // Gunakan data yang sudah diurutkan
    const data = denahData.length > 0 ? denahData : window.unitsData || [];

    if (data.length === 0) {
        console.warn('[DENAH] Tidak ada data untuk ditampilkan');
        return;
    }

    // Buat jalan
    createRoads(scene);

    // Buat kompas
    createCompass(scene);

    // Buat plot untuk setiap unit
    data.forEach((item, index) => {
        // Tentukan posisi berdasarkan index (kompatibel dengan file asli)
        let x, z, w, d;
        if (index < 15) {
            x = -8.5 + (index * 1.3);
            z = -7.5;
            w = 1.1;
            d = 2.2;
        } else if (index < 30) {
            x = -8.5 + ((index - 15) * 1.3);
            z = -4;
            w = 1.1;
            d = 2.2;
        } else if (index < 36) {
            x = -8.5 + ((index - 30) * 1.3);
            z = -1.5;
            w = 1.1;
            d = 2.2;
        } else {
            x = -6 + ((index - 35) * 2);
            z = 2.2;
            w = 1.8;
            d = 2.8;
        }

        const color = statusColors[item.status] || '#22c55e';
        const tex = makeUnitLabel(item.id, color);
        const geo = new THREE.BoxGeometry(w, 0.5, d);
        const matTop = new THREE.MeshStandardMaterial({ map: tex });
        const matSide = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, [matSide, matSide, matTop, matSide, matSide, matSide]);
        mesh.position.set(x, 0.25, z);
        mesh.userData = {
            id: item.id,
            status: item.status,
            harga: item.harga,
            luas: item.luas,
            p: item.p,
            l: item.l,
            index: index,
        };
        scene.add(mesh);
        denahPlots.push(mesh);
    });

    console.log(`[DENAH] ${denahPlots.length} plot berhasil dibuat`);
}

/**
 * Membuat label untuk unit
 */
function makeUnitLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 90px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

/**
 * Membuat jalan
 */
function createRoads(scene) {
    // Cek apakah jalan sudah ada
    const existingRoads = scene.children.filter(c => c.type === 'Mesh' && c.userData && c.userData.isRoad);
    existingRoads.forEach(r => scene.remove(r));

    function addRoad(x, z, w, d, rot, name) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(0, 0, 512, 64);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name, 256, 42);
        const tex = new THREE.CanvasTexture(canvas);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, side: 2 }));
        mesh.position.set(x, 0.05, z);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = rot;
        mesh.userData = { isRoad: true };
        scene.add(mesh);
    }

    addRoad(-11, -3, 16, 1.8, Math.PI / 2, 'J A L A N   D E S A');
    addRoad(-5, 5, 16, 1.8, -Math.PI / 12, 'J A L A N   D E S A');
}

/**
 * Membuat kompas
 */
function createCompass(scene) {
    // Cek apakah kompas sudah ada
    const existingCompass = scene.children.filter(c => c.type === 'Group' && c.userData && c.userData.isCompass);
    existingCompass.forEach(c => scene.remove(c));

    function makeCompassLabel(text, pos) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 64, 90);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
        sprite.position.copy(pos);
        sprite.scale.set(1.5, 1.5, 1);
        return sprite;
    }

    const group = new THREE.Group();
    group.userData = { isCompass: true };

    const matRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coneGeo = new THREE.ConeGeometry(0.5, 2, 8);

    const n = new THREE.Mesh(coneGeo, matRed);
    n.position.z = -1.2;
    n.rotation.x = -Math.PI / 2;
    group.add(n);

    const s = new THREE.Mesh(coneGeo, matWhite);
    s.position.z = 1.2;
    s.rotation.x = Math.PI / 2;
    group.add(s);

    const e = new THREE.Mesh(coneGeo, matWhite);
    e.position.x = 1.2;
    e.rotation.z = -Math.PI / 2;
    group.add(e);

    const w = new THREE.Mesh(coneGeo, matWhite);
    w.position.x = -1.2;
    w.rotation.z = Math.PI / 2;
    group.add(w);

    group.add(makeCompassLabel('U', new THREE.Vector3(0, 0, -3.5)));
    group.add(makeCompassLabel('S', new THREE.Vector3(0, 0, 3.5)));
    group.add(makeCompassLabel('T', new THREE.Vector3(3.5, 0, 0)));
    group.add(makeCompassLabel('B', new THREE.Vector3(-3.5, 0, 0)));

    group.position.set(13, 0.2, -14);
    group.rotation.y = Math.PI;
    scene.add(group);
}

/**
 * Update hover detection
 */
function updateHover(mouse, scene, camera, container) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(denahPlots);
    const tooltip = document.getElementById('tooltip-denah');

    if (hits.length > 0) {
        const obj = hits[0].object;
        if (denahHoveredObject !== obj) {
            if (denahHoveredObject) denahHoveredObject.scale.set(1, 1, 1);
            denahHoveredObject = obj;
            const d = obj.userData;
            const statusColors = {
                'Tersedia': '#22c55e',
                'Booking': '#eab308',
                'Terjual': '#ef4444',
            };

            document.getElementById('t-unit').innerHTML =
                `UNIT ${d.id} <span style="color: ${statusColors[d.status] || '#22c55e'}; font-size: 1em; font-weight: 800; margin-left: 10px;">${d.status.toUpperCase()}</span>`;

            let dimensiText = `${d.luas || 0}m²`;
            if (d.p && d.l && d.p !== 0 && d.l !== 0) {
                dimensiText += ` | ${d.l}m x ${d.p}m`;
            }
            document.getElementById('t-luas-dimensi').innerText = dimensiText;
            document.getElementById('t-harga').innerText = d.harga || 'Rp 0';

            if (tooltip) tooltip.style.display = 'block';
            obj.scale.set(1.05, 5, 1.05);
            container.style.cursor = (d.status === 'Tersedia' || d.status === 'Booking') ? 'pointer' : 'default';
        }
    } else {
        if (denahHoveredObject) {
            denahHoveredObject.scale.set(1, 1, 1);
            container.style.cursor = 'default';
        }
        denahHoveredObject = null;
        if (tooltip) tooltip.style.display = 'none';
    }
}

/**
 * Update data denah (dipanggil saat data berubah)
 */
function updateDenahData(data) {
    denahData = data;
    if (denahInitialized && denahScene) {
        // Rebuild denah
        createDenah(denahScene);
    }
}

/**
 * Cleanup denah
 */
function cleanupDenah() {
    if (denahRenderer) {
        const container = document.getElementById('denah-canvas-container');
        if (container) {
            const canvas = denahRenderer.domElement;
            if (canvas && canvas.parentNode) {
                container.removeChild(canvas);
            }
        }
        denahRenderer.dispose();
        denahRenderer = null;
    }
    denahScene = null;
    denahCamera = null;
    denahControls = null;
    denahPlots = [];
    denahHoveredObject = null;
    denahInitialized = false;
}

// ============================================================
//  EXPOSE KE GLOBAL
// ============================================================
window.initDenah = initDenah;
window.updateDenahData = updateDenahData;