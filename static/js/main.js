// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const detectBtn = document.getElementById('detectBtn');
const loading = document.getElementById('loading');
const resultsContainer = document.getElementById('resultsContainer');

let selectedFile = null;

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle file selection
function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        alert('Format file tidak valid! Gunakan JPG, JPEG, atau PNG.');
        return;
    }
    
    // Validate file size (16MB)
    if (file.size > 16 * 1024 * 1024) {
        alert('Ukuran file terlalu besar! Maksimal 16MB.');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadContent.style.display = 'none';
        previewContainer.style.display = 'block';
        detectBtn.style.display = 'block';
        resultsContainer.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Remove image
function removeImage() {
    selectedFile = null;
    fileInput.value = '';
    uploadContent.style.display = 'block';
    previewContainer.style.display = 'none';
    detectBtn.style.display = 'none';
    resultsContainer.style.display = 'none';
}

// Detect button click
detectBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Pilih gambar terlebih dahulu!');
        return;
    }
    
    // Show loading
    detectBtn.style.display = 'none';
    loading.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        // Send to backend
        const response = await fetch('/detect', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Detection failed');
        }
        
        console.log('Response data:', data); // Debug log
        
        // Hide loading
        loading.style.display = 'none';
        
        // Show results
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        loading.style.display = 'none';
        alert('Terjadi kesalahan saat mendeteksi: ' + error.message);
        detectBtn.style.display = 'block';
    }
});

// Display results
function displayResults(data) {
    console.log('Data received:', data); // Debug log
    
    // Show results container first to make elements accessible
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Get elements after container is visible
        const resultImage = document.getElementById('resultImage');
        const totalWounds = document.getElementById('totalWounds');
        const detectionsList = document.getElementById('detectionsList');
        
        console.log('Elements check:', {
            resultImage: !!resultImage,
            totalWounds: !!totalWounds,
            detectionsList: !!detectionsList
        });
        
        if (!resultImage || !totalWounds || !detectionsList) {
            console.error('Required elements not found');
            console.log('resultImage:', resultImage);
            console.log('totalWounds:', totalWounds);
            console.log('detectionsList:', detectionsList);
            alert('Terjadi kesalahan pada tampilan. Silakan refresh halaman.');
            return;
        }
        
        // Set result image
        if (data.image_url) {
            resultImage.src = data.image_url;
        }
        
        // Set total wounds
        totalWounds.textContent = data.total_wounds || 0;
        
        // Clear previous detections
        detectionsList.innerHTML = '';
        
        // Create detections list - fix typo 'detection' vs 'detections'
        const detections = data.detections || data.detection || [];
        
        if (detections.length > 0) {
            detections.forEach((detection, index) => {
                const item = document.createElement('div');
                item.className = 'detection-item';
                
                const confidence = Math.round((detection.confidence || 0) * 100);
                const bbox = detection.bbox ? detection.bbox.join(', ') : 'N/A';
                
                item.innerHTML = `
                    <div class="detection-header">
                        <span class="detection-class">${detection.class || 'Unknown'}</span>
                        <span class="confidence-badge">${confidence}%</span>
                    </div>
                    <div class="detection-details">
                        Detection #${index + 1} - Position: [${bbox}]
                    </div>
                `;
                
                detectionsList.appendChild(item);
            });
        } else {
            detectionsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 1rem;">Pasien disarankan segera mendapatkan pemeriksaan dan penanganan lebih lanjut di fasilitas pelayanan kesehatan oleh tenaga medis yang berkompeten.</p>';
        }
        
        // Scroll to results
        setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
    }, 50); // Small delay to ensure DOM update
}

// Reset detection
function resetDetection() {
    removeImage();
    resultsContainer.style.display = 'none';
    uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
    }
    
    lastScroll = currentScroll;
});

// Load wound information data
let woundInfoData = {};

// Load wound info JSON
fetch('/static/info/wound_info.json')
    .then(response => response.json())
    .then(data => {
        woundInfoData = data;
        console.log('Wound info data loaded:', woundInfoData);
    })
    .catch(error => {
        console.error('Error loading wound info:', error);
    });

// Display results - UPDATED VERSION
function displayResults(data) {
    console.log('Data received:', data);
    
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }
    
    setTimeout(() => {
        const resultImage = document.getElementById('resultImage');
        const totalWounds = document.getElementById('totalWounds');
        const detectionsList = document.getElementById('detectionsList');
        
        if (!resultImage || !totalWounds || !detectionsList) {
            console.error('Required elements not found');
            alert('Terjadi kesalahan pada tampilan. Silakan refresh halaman.');
            return;
        }
        
        // Set result image
        if (data.image_url) {
            resultImage.src = data.image_url;
        }
        
        // Set total wounds
        totalWounds.textContent = data.total_wounds || 0;
        
        // Clear previous detections
        detectionsList.innerHTML = '';
        
        // Create detections list
        const detections = data.detections || data.detection || [];
        
        if (detections.length > 0) {
            detections.forEach((detection, index) => {
                const item = document.createElement('div');
                item.className = 'detection-item';
                
                const confidence = Math.round((detection.confidence || 0) * 100);
                const bbox = detection.bbox ? detection.bbox.join(', ') : 'N/A';
                const woundClass = detection.class || 'Unknown';
                
                item.innerHTML = `
                    <div class="detection-header">
                        <span class="detection-class">${woundClass}</span>
                        <span class="confidence-badge">${confidence}%</span>
                    </div>
                    <div class="detection-details">
                        Detection #${index + 1} - Position: [${bbox}]
                    </div>
                    <button class="btn-detail" onclick="showWoundDetail('${woundClass}')">
                        <i class="fas fa-info-circle"></i> Lihat Detail Penanganan
                    </button>
                `;
                
                detectionsList.appendChild(item);
            });
        } else {
            detectionsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 1rem;">Pasien disarankan segera mendapatkan pemeriksaan dan penanganan lebih lanjut di fasilitas pelayanan kesehatan oleh tenaga medis yang berkompeten.</p>';
        }
        
        setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
    }, 50);
}

// Show wound detail modal
function showWoundDetail(woundType) {
  const woundInfo = woundInfoData[woundType];
  if (!woundInfo) {
    alert('Pasien disarankan segera mendapatkan pemeriksaan dan penanganan lebih lanjut di fasilitas pelayanan kesehatan oleh tenaga medis yang berkompeten.');
    return;
  }

  // Ambil elemen modal
  const modal = document.getElementById('woundModal');
  const woundNameElement = document.getElementById('modalWoundName');
  const timeHealSection = document.querySelector('.modal-info p');
  const timeHealElement = document.getElementById('modalPenyembuhan');
  const treatmentElement = document.getElementById('modalTreatment');
  const avoidSection = document.querySelector('.modal-section h3 i.fa-ban')?.parentElement?.parentElement;
  const avoidElement = document.getElementById('modalAvoid');
  const tipsElement = document.getElementById('modalTips');
  const symptomsSection = modal.querySelector('.modal-section h3 i.fa-stethoscope')?.parentElement?.parentElement;
  const symptomsList = document.getElementById('modalSymptoms');
  const penangananSection = document.querySelector('.modal-info h3 i.fa-stethoscope')?.parentElement?.parentElement;
  const penangananList = document.getElementById('modal-penangan');

  if (!modal || !woundNameElement) {
    console.error('Modal elements not found!');
    return;
  }

  // Set isi dasar
  woundNameElement.textContent = woundInfo.name || 'Tidak diketahui';

  // Kosongkan semua list sebelumnya
  [timeHealElement, treatmentElement, avoidElement, symptomsList].forEach(el => el.innerHTML = '');
  tipsElement.innerHTML = '';

  // === CIRI-CIRI LUKA ===
  if (Array.isArray(woundInfo.ciri_ciri) && woundInfo.ciri_ciri.length > 0) {
    symptomsSection.style.display = 'block';
    woundInfo.ciri_ciri.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      symptomsList.appendChild(li);
    });
  } else {
    // Kalau ga ada, sembunyikan seluruh section
    if (symptomsSection) symptomsSection.style.display = 'none';
  }

  // === PENANGANAN ===
  if (Array.isArray(woundInfo.penanganan) && woundInfo.penanganan.length > 0) {
    woundInfo.penanganan.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="penanganan-step"><strong>${index + 1}. ${item.step}</strong></td>
        <td class="penanganan-penjelasan">${item.penjelasan}</td>
      `;
      treatmentElement.appendChild(row);
    });
  } else {
    treatmentElement.innerHTML = `<tr><td colspan="2" style="text-align:center;">Tidak ada data penanganan</td></tr>`;
  }

  // === Kapan Harus Mencari Pertolongan Medis ===
  if (Array.isArray(woundInfo.pencarian_medis) && woundInfo.pencarian_medis.length > 0) {
    penangananSection.style.display = 'block';
    woundInfo.pencarian_medis.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        penangananList.appendChild(li);
    });
  } else {
    if (penangananSection) penangananSection.style.display = 'none';
  }

  // === WAKTU PENYEMBUHAN ===
  if (Array.isArray(woundInfo.waktu_penyembuhan)) {
    timeHealSection.style.display = 'block';
    woundInfo.waktu_penyembuhan.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      timeHealElement.appendChild(li);
    });
  } else {
    if (timeHealSection) timeHealSection.style.display = 'none';
  }

  // === HAL YANG DIHINDARI ===
  if (Array.isArray(woundInfo.hindari)) {
    avoidSection.style.display = 'block';
    woundInfo.hindari.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      avoidElement.appendChild(li);
    });
  } else {
    if (avoidSection) avoidSection.style.display = 'none';
  }

  // === TIPS ===
  if (Array.isArray(woundInfo.tips) && woundInfo.tips.length > 0) {
    woundInfo.tips.forEach(tip => {
      const tipItem = document.createElement('div');
      tipItem.innerHTML = `
        <p><strong>${tip.penanganan}</strong></p>
        <p>${tip.penjelasan}</p>
      `;
      tipsElement.appendChild(tipItem);
    });
  } else if (typeof woundInfo.tips === 'string') {
    tipsElement.textContent = woundInfo.tips;
  } else {
    tipsElement.textContent = 'Tidak ada tips khusus.';
  }

  // === Tampilkan modal ===
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('woundModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('woundModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
});

// Close modal with ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});