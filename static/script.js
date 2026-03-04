// Global state
let currentImageData = null;

// ====== LUXURY INTERACTIONS ======

// Smooth scroll for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Add scroll effect to navbar
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    }
    
    // Smooth scroll for anchor links
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
    
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards, step cards, etc.
    document.querySelectorAll('.feature-card-new, .step-card, .pricing-card-new, .showcase-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});

// Page navigation with browser history support
function showLanding() {
    hideAllPages();
    document.getElementById('landing-page').classList.add('active');
    window.history.pushState({ page: 'landing' }, '', '#landing');
}

function showMainApp() {
    hideAllPages();
    document.getElementById('main-app').classList.add('active');
    window.history.pushState({ page: 'editor' }, '', '#editor');
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Handle browser back/forward navigation
function handlePopState() {
    const hash = window.location.hash;
    if (hash === '#editor') {
        hideAllPages();
        document.getElementById('main-app').classList.add('active');
    } else {
        hideAllPages();
        document.getElementById('landing-page').classList.add('active');
    }
}

// Mobile navigation toggle
function toggleMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    }
}

// Close mobile nav when clicking on a link
function closeMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// API calls
async function apiCall(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...options.headers,
        }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Get selected style
function getSelectedStyle() {
    const styleRadio = document.querySelector('input[name="style"]:checked');
    return styleRadio ? styleRadio.value : 'cartoon';
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (PNG, JPG, JPEG)', 'error');
        return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    // Show file name
    const fileNameSpan = document.getElementById('file-name');
    if (fileNameSpan) {
        fileNameSpan.textContent = file.name;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // Hide empty state, show image preview
        const emptyState = document.getElementById('empty-state');
        const imagePreview = document.getElementById('image-preview');
        const originalImage = document.getElementById('original-image');
        const resultImage = document.getElementById('result-image');
        const resultSection = document.getElementById('result-section');
        const filterParameters = document.getElementById('filter-parameters');
        const parametersPanel = document.getElementById('parameters-panel');
        
        if (emptyState) emptyState.style.display = 'none';
        if (imagePreview) imagePreview.style.display = 'block';
        
        if (originalImage) {
            originalImage.src = e.target.result;
            originalImage.style.display = 'block';
        }
        
        // Hide result and controls initially
        if (resultImage) resultImage.style.display = 'none';
        if (resultSection) resultSection.style.display = 'none';
        if (filterParameters) filterParameters.style.display = 'none';
        if (parametersPanel) parametersPanel.style.display = 'none';

        showToast(`Image loaded: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);

    currentImageData = file;
}

// Transform image
async function transformImage() {
    if (!currentImageData) {
        showToast('Please select an image first', 'error');
        return;
    }

    const style = getSelectedStyle();

    // Show loading state
    const transformBtn = document.querySelector('.transform-btn');
    const transformText = document.getElementById('transform-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (transformBtn) {
        transformBtn.disabled = true;
    }
    if (transformText) {
        transformText.textContent = `Applying ${style}...`;
    }
    if (loadingSpinner) {
        loadingSpinner.style.display = 'inline-block';
    }

    try {
        const formData = new FormData();
        formData.append('file', currentImageData);
        formData.append('style', style);

        const data = await apiCall('/transform', {
            method: 'POST',
            body: formData
        });

        if (data.success) {
            // Hide original image, show result
            const originalImage = document.getElementById('original-image');
            const resultImage = document.getElementById('result-image');
            const resultSection = document.getElementById('result-section');
            const filterParameters = document.getElementById('filter-parameters');
            const parametersPanel = document.getElementById('parameters-panel');
            
            if (originalImage) originalImage.style.display = 'none';
            
            // Display result image
            if (resultImage) {
                resultImage.src = `data:image/png;base64,${data.image}`;
                resultImage.dataset.imageData = data.image;
                resultImage.style.display = 'block';
            }

            // Show result section
            if (resultSection) resultSection.style.display = 'block';

            // Show variants if available
            const variantsSection = document.getElementById('variants-section');
            if (data.variants && Object.keys(data.variants).length > 0) {
                displayVariants(data.variants, style);
                if (variantsSection) variantsSection.style.display = 'block';
            } else {
                if (variantsSection) variantsSection.style.display = 'none';
            }

            // Show filter parameters after first transformation
            if (filterParameters) filterParameters.style.display = 'block';
            if (parametersPanel) parametersPanel.style.display = 'block';

            const processingMethod = 'OpenCV';
            showToast(`🎨 ${style.charAt(0).toUpperCase() + style.slice(1)} transformation completed with ${processingMethod}!`, 'success');
        }

    } catch (error) {
        showToast('❌ Transformation failed: ' + error.message, 'error');
    } finally {
        // Reset loading state
        if (transformBtn) transformBtn.disabled = false;
        if (transformText) transformText.textContent = 'Apply';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// Enhanced variant display with individual download buttons
function displayVariants(variants, style) {
    const variantsContainer = document.getElementById('variants-container');
    if (!variantsContainer) return;
    
    variantsContainer.innerHTML = '';

    Object.entries(variants).forEach(([variantName, imageData]) => {
        const variantItem = document.createElement('div');
        variantItem.className = 'variant-item';
        variantItem.setAttribute('role', 'gridcell');

        variantItem.innerHTML = `
            <div class="variant-header">
                <h4>${variantName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                <div class="variant-actions">
                    <button class="action-btn" onclick="maximizeVariant('${variantName}', '${imageData}')" 
                            aria-label="View ${variantName} in fullscreen" title="Fullscreen">
                        <span class="material-symbols-rounded" aria-hidden="true">fullscreen</span>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadVariant('${variantName}', '${imageData}')" 
                            aria-label="Download ${variantName}" title="Download">
                        <span class="material-symbols-rounded" aria-hidden="true">download</span>
                    </button>
                </div>
            </div>
            <div class="variant-wrapper">
                <img src="data:image/png;base64,${imageData}" 
                     alt="${variantName} variant" 
                     onclick="maximizeVariant('${variantName}', '${imageData}')"
                     loading="lazy">
            </div>
        `;

        variantsContainer.appendChild(variantItem);
    });
}

function maximizeVariant(variantName, imageData) {
    const modal = document.getElementById('fullscreen-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDownload = document.getElementById('modal-download');

    modalImage.src = `data:image/png;base64,${imageData}`;
    modalImage.alt = `${variantName} variant`;
    modalTitle.textContent = `${variantName.replace(/([A-Z])/g, ' $1').trim()} Variant`;

    modalDownload.onclick = () => downloadVariant(variantName, imageData);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleModalKeydown);
}

function downloadVariant(variantName, imageData) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const style = getSelectedStyle() || 'style';
    const filename = `reframe_${style}_${variantName}_${timestamp}.png`;
    downloadImageData(imageData, filename);
}

// Fullscreen image viewing
function maximizeImage(imageId, title) {
    const image = document.getElementById(imageId);
    if (!image || !image.src) return;

    const modal = document.getElementById('fullscreen-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDownload = document.getElementById('modal-download');

    modalImage.src = image.src;
    modalImage.alt = image.alt || title;
    modalTitle.textContent = title;

    // Set up download functionality for modal
    modalDownload.onclick = () => {
        if (image.dataset.imageData) {
            downloadImageData(image.dataset.imageData, getDownloadFilename(imageId));
        } else {
            downloadImageFromSrc(image.src, getDownloadFilename(imageId));
        }
    };

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Add keyboard support
    document.addEventListener('keydown', handleModalKeydown);
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreen-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.removeEventListener('keydown', handleModalKeydown);
}

function handleModalKeydown(event) {
    if (event.key === 'Escape') {
        closeFullscreen();
    }
}

// Enhanced download functionality
function downloadImage(imageId, prefix = 'image') {
    const image = document.getElementById(imageId);
    if (!image) return;

    if (image.dataset.imageData) {
        downloadImageData(image.dataset.imageData, getDownloadFilename(imageId, prefix));
    } else {
        downloadImageFromSrc(image.src, getDownloadFilename(imageId, prefix));
    }
}

function downloadImageData(base64Data, filename) {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Image downloaded successfully!', 'success');
}

function downloadImageFromSrc(src, filename) {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Image downloaded successfully!', 'success');
}

function getDownloadFilename(imageId, prefix = 'image') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const style = getSelectedStyle() || 'transformed';

    if (imageId === 'original-image') {
        return `original_${timestamp}.png`;
    } else if (imageId === 'result-image') {
        return `reframe_${style}_${timestamp}.png`;
    } else {
        return `${prefix}_${style}_${timestamp}.png`;
    }
}

function downloadCurrentImage() {
    const modalImage = document.getElementById('modal-image');
    if (modalImage.src.includes('base64')) {
        const base64Data = modalImage.src.split(',')[1];
        downloadImageData(base64Data, getDownloadFilename('modal-image'));
    } else {
        downloadImageFromSrc(modalImage.src, getDownloadFilename('modal-image'));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    // Handle initial URL hash
    handlePopState();
    
    // Handle browser back/forward button
    window.addEventListener('popstate', handlePopState);
    
    // Close modal when clicking outside
    document.getElementById('fullscreen-modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            closeFullscreen();
        }
    });
});
