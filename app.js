/**
 * Frontend Logic - Aplikasi Portal Satpam
 */

// ==========================================
// CONFIGURATION
// ==========================================
// TODO: Ganti URL di bawah dengan Web App URL dari deployment Google Apps Script Anda!
const GAS_URL = 'https://script.google.com/macros/s/AKfycbydBbeu68g8CsFACybHrzQv750fG-AqiYOTsvR0XxYGpwkCcrNuxtlR3o6K1qI24tNi/exec'; 

// ==========================================
// DOM ELEMENTS
// ==========================================
const pageLogin = document.getElementById('page-login');
const pageDashboard = document.getElementById('page-dashboard');
const pagePatroli = document.getElementById('page-patroli'); // Halaman Patroli

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginErrorText = document.getElementById('loginErrorText');
const loader = document.getElementById('loader');
const greetName = document.getElementById('greetName');
const btnLogOut = document.getElementById('btnLogOut');
const btnBackFromPatroli = document.getElementById('btnBackFromPatroli');

let html5QrcodeScanner = null; // Objek global scanner

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
});

// ==========================================
// NAVIGATION (SPA ROUTING)
// ==========================================
function showPage(pageId) {
    // Sembunyikan semua halaman terlebih dahulu
    const allPages = [pageLogin, pageDashboard, pagePatroli];
    allPages.forEach(page => {
        if(page) {
            page.classList.remove('page-active');
            page.classList.add('page-hidden-left');
        }
    });
    
    // Tampilkan halaman yang dituju dengan sedikit jeda agar transisi terlihat
    setTimeout(() => {
        let targetPage;
        if (pageId === 'dashboard') targetPage = pageDashboard;
        else if (pageId === 'login') targetPage = pageLogin;
        else if (pageId === 'patroli') targetPage = pagePatroli;

        if(targetPage) {
            targetPage.classList.remove('page-hidden-left', 'page-hidden-right');
            targetPage.classList.add('page-active');
        }
    }, 50);
}

// ==========================================
// STATE MANAGEMENT
// ==========================================
function checkLoginState() {
    const namaPetugas = localStorage.getItem('nama_petugas');
    
    if (namaPetugas) {
        // User is logged in
        greetName.textContent = namaPetugas;
        // Tunggu sejenak agar CSS siap sebelum trigger transisi
        setTimeout(() => showPage('dashboard'), 50); 
    } else {
        // User not logged in
        setTimeout(() => showPage('login'), 50);
    }
}

function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
        // setTimeout for opacity transition
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    } else {
        loader.classList.add('opacity-0');
        setTimeout(() => loader.classList.add('hidden'), 300);
    }
}

function showError(msg) {
    if (msg) {
        loginErrorText.textContent = msg;
        loginError.classList.remove('hidden');
    } else {
        loginError.classList.add('hidden');
        loginErrorText.textContent = '';
    }
}

// ==========================================
// EVENTS
// ==========================================

// Handle Form Submission (Login)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(false); // reset error message
    
    const username = document.getElementById('username').value.trim();
    const pin = document.getElementById('pin').value.trim();
    
    if (!username || !pin) {
        showError("Username dan PIN harus diisi.");
        return;
    }
    
    if(GAS_URL === 'URL_DISINI') {
        showError("Developer: Variabel GAS_URL belum diganti di app.js!");
        return;
    }
    
    showLoader(true);
    
    try {
        // Fetch to Google Apps Script Web App
        // Menggunakan URLSearchParams agar formatnya x-www-form-urlencoded
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'login',
                username: username,
                pin: pin
            })
        });
        
        // Membaca JSON response dari server (doPost Code.gs)
        const result = await response.json();
        
        if (result.status === 'success') {
            // Save data to localStorage
            localStorage.setItem('nama_petugas', result.nama_petugas);
            
            // Update UI Name
            greetName.textContent = result.nama_petugas;
            
            // Clear input fields
            loginForm.reset();
            
            // Navigate to dashboard
            showPage('dashboard');
        } else {
            showError(result.message || "Login gagal, silakan periksa kredensial.");
        }
    } catch (error) {
        console.error("Login Error:", error);
        showError("Terjadi kesalahan koneksi atau URL GAS tidak valid.");
    } finally {
        showLoader(false);
    }
});

// Handle Log Out
btnLogOut.addEventListener('click', () => {
    // Clear Local Storage
    localStorage.removeItem('nama_petugas');
    
    // Animate back to login page
    showPage('login');
});

// Handle Menu Interactions & Scanner Logic
document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('click', function() {
        const title = this.querySelector('h4').textContent;
        
        if (title === "Patroli QR") {
            startQRScanner();
        } else {
            alert(`Membuka Form: ${title}\n\n(Halaman form bisa Anda tambahkan menggunakan logika SPA yang sama dengan app.js)`);
        }
    });
});

// ==========================================
// QR SCANNER LOGIC
// ==========================================
function startQRScanner() {
    showPage('patroli');
    
    if (html5QrcodeScanner) {
        // Jika scanner sedang aktif, abaikan
        return;
    }
    
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
        // Ketika berhasil memindai QR Code
        
        // Hentikan kamera segera setelah berhasil
        try {
            await html5QrcodeScanner.stop();
        } catch(e) {
            console.error("Gagal menghentikan scanner", e);
        }
        
        html5QrcodeScanner = null; // Reset
        document.getElementById('qr-reader').innerHTML = ''; // Bersihkan container UI
        
        // Proses hasil scan
        processPatroliScan(decodedText);
    };
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Mulai dengan kamera belakang (environment)
    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        config, 
        qrCodeSuccessCallback
    ).catch(err => {
        console.error("Error starting scanner", err);
        alert("Gagal mengakses kamera. Pastikan browser Anda memiliki izin kamera yang diaktifkan.");
        showPage('dashboard');
    });
}

// Tombol Kembali dari halaman Patroli (batal scan)
btnBackFromPatroli?.addEventListener('click', async () => {
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
        } catch(e) { console.error(e) }
        html5QrcodeScanner = null;
        document.getElementById('qr-reader').innerHTML = '';
    }
    showPage('dashboard');
});

// ==========================================
// API REQUEST: SEND PATROLI
// ==========================================
async function processPatroliScan(lokasiQR) {
    const namaPetugas = localStorage.getItem('nama_petugas');
    
    if (!namaPetugas) {
        alert("Sesi Anda telah habis. Silakan login kembali.");
        showPage('login');
        return;
    }
    
    showLoader(true);
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'patroli',
                nama_petugas: namaPetugas,
                lokasi_qr: lokasiQR,
                // Kita kirim default Aman karena pada Code.gs Anda sebelumnya
                // kita menetapkan field kondisi_lokasi sebagai parameter wajib.
                kondisi_lokasi: 'Aman', 
                foto_kondisi: '' 
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Tampilkan Notifikasi Sukses
            alert(`Patroli Berhasil Dicatat!\nLokasi: ${lokasiQR}`);
            showPage('dashboard');
        } else {
            alert(`Gagal: ${result.message}`);
            showPage('dashboard');
        }
    } catch (error) {
        console.error("Patroli Error:", error);
        alert("Terjadi kesalahan koneksi saat mengirim data patroli.");
        showPage('dashboard');
    } finally {
        showLoader(false);
    }
}
