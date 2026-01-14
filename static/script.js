// Global state
let currentUser = null;
let authToken = null;
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

// Page navigation
function showLanding() {
    hideAllPages();
    document.getElementById('landing-page').classList.add('active');
}

function showAuth() {
    hideAllPages();
    document.getElementById('auth-page').classList.add('active');
}

function showMainApp() {
    hideAllPages();
    document.getElementById('main-app').classList.add('active');
    document.getElementById('username-display').textContent = currentUser;
    applyUserPreferences();
}

function showDashboard() {
    hideAllPages();
    document.getElementById('user-dashboard').classList.add('active');
    document.getElementById('dashboard-username-display').textContent = currentUser;
    document.getElementById('profile-username').textContent = currentUser;
    loadDashboardData();
}

function showPayment() {
    window.location.href = '/payment';
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Auth tab switching
function showLogin() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    document.querySelector('.tab-btn:first-child').classList.add('active');
    document.getElementById('login-form').classList.add('active');
}

function showRegister() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    document.querySelector('.tab-btn:last-child').classList.add('active');
    document.getElementById('register-form').classList.add('active');
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

    if (authToken && !options.skipAuth) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, config);
        // Handle rate limit redirects to payment page
        if (response.status === 429) {
            try {
                const data = await response.json();
                showToast(data.detail || 'Rate limit exceeded', 'warning');
            } catch (_) {}
            window.location.href = '/payment';
            return Promise.reject(new Error('Rate limit exceeded'));
        }
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

// Authentication
async function login(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const data = await apiCall('/login', {
            method: 'POST',
            body: formData,
            skipAuth: true
        });

        authToken = data.access_token;
        currentUser = data.username;

        showToast('Login successful!', 'success');
        showMainApp();

        // Clear form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';

    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function register(event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        await apiCall('/register', {
            method: 'POST',
            body: formData,
            skipAuth: true
        });

        showToast('Registration successful! Please login.', 'success');
        showLogin();

        // Clear form
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('confirm-password').value = '';

    } catch (error) {
        showToast(error.message, 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    currentImageData = null;

    // Clear any displayed images and reset UI
    const imageSection = document.getElementById('image-section');
    const resultImage = document.getElementById('result-image');
    const resultActions = document.getElementById('result-actions');
    const variantsSection = document.getElementById('variants-section');
    const filterParameters = document.getElementById('filter-parameters');
    
    if (imageSection) imageSection.style.display = 'none';
    if (resultImage) resultImage.style.display = 'none';
    if (resultActions) resultActions.style.display = 'none';
    if (variantsSection) variantsSection.style.display = 'none';
    if (filterParameters) filterParameters.style.display = 'none';

    // Clear form inputs
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = '';

    showToast('Logged out successfully', 'success');
    showAuth(); // Show auth page instead of landing
}

// Get selected style and processing method
function getSelectedStyle() {
    const styleRadio = document.querySelector('input[name="style"]:checked');
    return styleRadio ? styleRadio.value : 'cartoon';
}

function getSelectedProcessing() {
    const processingRadio = document.querySelector('input[name="processing"]:checked');
    return processingRadio ? processingRadio.value === 'ai' : false;
}

// File handling
// (removed outdated handleFileSelect; enhanced version exists below)

// Image transformation
// (removed outdated transformImage; enhanced version exists below)

// Display variants
// (removed outdated displayVariants; enhanced version exists below)

// Select variant as main result
// (removed outdated selectVariant; enhanced variant handlers exist below)

// Download image
// (removed outdated downloadImage; enhanced versions exist below)

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    // Check if user is already logged in (you could implement localStorage persistence)
    showLanding();
});

// Modern UX Functions

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

// Enhanced variant display with individual download buttons
function displayVariants(variants, style) {
    const variantsContainer = document.getElementById('variants-container');
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

    document.getElementById('variants-section').style.display = 'block';
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

// Enhanced file upload with drag and drop
function initializeFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadLabel = document.querySelector('.file-upload-label');

    if (!fileInput) return;
    if (!uploadLabel) return;

    // Drag and drop functionality
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.classList.add('drag-over');
    });

    uploadLabel.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadLabel.classList.remove('drag-over');
    });

    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: { files } });
        }
    });

    // Keyboard support for upload label
    uploadLabel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
}

// Enhanced handleFileSelect with better UX
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
        const originalImg = document.getElementById('original-image');
        originalImg.src = e.target.result;
        originalImg.dataset.imageData = '';

        // Show image section and hide previous results
        const imageSection = document.getElementById('results-section') || document.querySelector('.results-section');
        if (imageSection) imageSection.style.display = 'block';

        const resultImage = document.getElementById('result-image');
        const resultActions = document.getElementById('result-actions');
        const variantsSection = document.getElementById('variants-section');
        const filterParameters = document.getElementById('filter-parameters');

        if (resultImage) resultImage.style.display = 'none';
        if (resultActions) resultActions.style.display = 'none';
        if (variantsSection) variantsSection.style.display = 'none';
        if (filterParameters) filterParameters.style.display = 'none';

        // Show result placeholder
        const placeholder = document.querySelector('.result-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }

        showToast(`Image loaded: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);

    currentImageData = file;
}

// Enhanced transform function with better UX
async function transformImage() {
    if (!currentImageData) {
        showToast('Please select an image first', 'error');
        return;
    }

    const style = getSelectedStyle();
    const useAI = getSelectedProcessing();

    // Show loading state
    const transformBtn = document.querySelector('.transform-btn');
    const transformText = document.getElementById('transform-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (transformBtn) {
        transformBtn.disabled = true;
    }
    if (transformText) {
        transformText.textContent = `Applying ${style} style...`;
    }
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }

    // Hide result placeholder
    const placeholder = document.querySelector('.result-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('file', currentImageData);
        formData.append('style', style);
        formData.append('use_ai', useAI);

        const data = await apiCall('/transform', {
            method: 'POST',
            body: formData
        });

        if (data.success) {
            // Display result image
            const resultImg = document.getElementById('result-image');
            resultImg.src = `data:image/png;base64,${data.image}`;
            resultImg.dataset.imageData = data.image;
            resultImg.style.display = 'block';

            // Show result actions
            document.getElementById('result-actions').style.display = 'flex';

            // Show variants if available
            if (data.variants && Object.keys(data.variants).length > 0) {
                displayVariants(data.variants, style);
            } else {
                document.getElementById('variants-section').style.display = 'none';
            }

            // Show filter parameters after first transformation
            document.getElementById('filter-parameters').style.display = 'block';
            initializeParameterSliders();

            const processingMethod = data.ai_used ? 'AI' : 'OpenCV';
            showToast(`🎨 ${style.charAt(0).toUpperCase() + style.slice(1)} transformation completed with ${processingMethod}!`, 'success');
            
            // Update user statistics
            updateUserStats(style, data.ai_used);
        }

    } catch (error) {
        showToast('❌ Transformation failed: ' + error.message, 'error');
        const placeholder = document.querySelector('.result-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
    } finally {
        // Reset loading state
        if (transformBtn) transformBtn.disabled = false;
        if (transformText) transformText.textContent = 'Apply';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// Initialize enhanced features when page loads
document.addEventListener('DOMContentLoaded', function () {
    initializeFileUpload();

    // Close modal when clicking outside
    document.getElementById('fullscreen-modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            closeFullscreen();
        }
    });
});

// Parameter adjustment functions
function initializeParameterSliders() {
    const sliders = ['intensity-slider', 'blur-slider', 'edge-slider'];

    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId.replace('-slider', '-value'));

        if (slider && valueDisplay) {
            slider.addEventListener('input', function () {
                valueDisplay.textContent = this.value;
            });
        }
    });
}

async function applyParameterChanges() {
    if (!currentImageData) {
        showToast('No image to apply changes to', 'error');
        return;
    }

    const intensity = document.getElementById('intensity-slider').value;
    const blur = document.getElementById('blur-slider').value;
    const edgeThreshold = document.getElementById('edge-slider').value;
    const style = getSelectedStyle();
    const useAI = getSelectedProcessing();

    // Show loading state
    const applyBtn = document.querySelector('.filter-parameters .btn');
    const originalText = applyBtn.textContent;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying...';

    try {
        const formData = new FormData();
        formData.append('file', currentImageData);
        formData.append('style', style);
        formData.append('use_ai', useAI);
        formData.append('intensity', intensity);
        formData.append('blur', blur);
        formData.append('edge_threshold', edgeThreshold);

        const data = await apiCall('/transform', {
            method: 'POST',
            body: formData
        });

        if (data.success) {
            // Update result image
            const resultImg = document.getElementById('result-image');
            resultImg.src = `data:image/png;base64,${data.image}`;
            resultImg.dataset.imageData = data.image;

            showToast('Parameters applied successfully!', 'success');
        }

    } catch (error) {
        showToast('Failed to apply parameters: ' + error.message, 'error');
    } finally {
        // Reset button state
        applyBtn.disabled = false;
        applyBtn.textContent = originalText;
    }
}
// Dashboard Functions
function loadDashboardData() {
    // Load user statistics from localStorage or set defaults
    const stats = JSON.parse(localStorage.getItem(`userStats_${currentUser}`)) || {
        cartoon: 0,
        sketch: 0,
        watercolor: 0,
        oilpaint: 0,
        aiTransformations: 0,
        totalTransformations: 0
    };
    
    // Update category-specific counters
    document.getElementById('cartoon-count').textContent = stats.cartoon || 0;
    document.getElementById('sketch-count').textContent = stats.sketch || 0;
    document.getElementById('watercolor-count').textContent = stats.watercolor || 0;
    document.getElementById('oilpaint-count').textContent = stats.oilpaint || 0;
    document.getElementById('ai-transformations').textContent = stats.aiTransformations || 0;
    document.getElementById('total-transformations').textContent = stats.totalTransformations || 0;
    
    // Load security question if exists
    const security = JSON.parse(localStorage.getItem(`userSecurity_${currentUser}`)) || {};
    if (security.question) {
        document.getElementById('username-security-question').textContent = security.question;
        document.getElementById('password-security-question').textContent = security.question;
    }
}

function savePreferences() {
    const preferences = {
        defaultProcessing: document.getElementById('default-processing').value,
        defaultStyle: document.getElementById('default-style').value
    };
    
    localStorage.setItem(`userPrefs_${currentUser}`, JSON.stringify(preferences));
    showToast('Preferences saved successfully!', 'success');
}

function clearUserData() {
    if (confirm('Are you sure you want to clear all your data? This action cannot be undone.')) {
        localStorage.removeItem(`userStats_${currentUser}`);
        localStorage.removeItem(`userPrefs_${currentUser}`);
        localStorage.removeItem(`userSecurity_${currentUser}`);
        loadDashboardData(); // Reload with defaults
        showToast('User data cleared successfully', 'success');
    }
}

async function testAIConnection() {
    try {
        const data = await apiCall('/test-ai');
        if (data.ready) {
            showToast('AI connection is working perfectly!', 'success');
        } else {
            showToast(`AI connection issue: ${data.message}`, 'warning');
        }
    } catch (error) {
        showToast('Failed to test AI connection: ' + error.message, 'error');
    }
}

// Update statistics when transformations are completed
function updateUserStats(style, aiUsed) {
    if (!currentUser) return;
    
    const stats = JSON.parse(localStorage.getItem(`userStats_${currentUser}`)) || {
        cartoon: 0,
        sketch: 0,
        watercolor: 0,
        oilpaint: 0,
        aiTransformations: 0,
        totalTransformations: 0
    };
    
    // Update category-specific counter
    if (stats[style] !== undefined) {
        stats[style]++;
    }
    
    // Update total transformations
    stats.totalTransformations++;
    
    // Update AI transformations counter
    if (aiUsed) {
        stats.aiTransformations++;
    }
    
    localStorage.setItem(`userStats_${currentUser}`, JSON.stringify(stats));
}

// Apply user preferences when loading the main app
function applyUserPreferences() {
    if (!currentUser) return;
    
    const preferences = JSON.parse(localStorage.getItem(`userPrefs_${currentUser}`));
    if (!preferences) return;
    
    // Set default processing method
    const processingRadios = document.querySelectorAll('input[name="processing"]');
    processingRadios.forEach(radio => {
        if ((preferences.defaultProcessing === 'ai' && radio.value === 'ai') ||
            (preferences.defaultProcessing === 'opencv' && radio.value === 'opencv')) {
            radio.checked = true;
        }
    });
    
    // Set default style
    const styleRadios = document.querySelectorAll('input[name="style"]');
    styleRadios.forEach(radio => {
        if (radio.value === preferences.defaultStyle) {
            radio.checked = true;
        }
    });
}// Security Functions
function showChangeUsername() {
    document.getElementById('current-username-display').value = currentUser;
    document.getElementById('change-username-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showChangePassword() {
    document.getElementById('change-password-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showSecurityQuestion() {
    const security = JSON.parse(localStorage.getItem(`userSecurity_${currentUser}`)) || {};
    if (security.question) {
        document.getElementById('security-question-select').value = security.question;
    }
    document.getElementById('security-question-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSecurityModal() {
    document.querySelectorAll('.security-modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
    
    // Clear form inputs
    document.querySelectorAll('.security-modal input').forEach(input => {
        if (!input.readOnly) input.value = '';
    });
    document.querySelectorAll('.security-modal select').forEach(select => {
        if (!select.disabled) select.selectedIndex = 0;
    });
}

async function changeUsername(event) {
    event.preventDefault();
    
    const newUsername = document.getElementById('new-username').value.trim();
    const securityAnswer = document.getElementById('username-security-answer').value.trim();
    
    if (!newUsername || !securityAnswer) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newUsername.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }
    
    // Verify security answer
    const security = JSON.parse(localStorage.getItem(`userSecurity_${currentUser}`)) || {};
    if (!security.answer || security.answer.toLowerCase() !== securityAnswer.toLowerCase()) {
        showToast('Incorrect security answer', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('new_username', newUsername);
        formData.append('security_answer', securityAnswer);
        
        const data = await apiCall('/change-username', {
            method: 'POST',
            body: formData
        });
        
        if (data.success) {
            // Update local user data
            const oldUser = currentUser;
            currentUser = newUsername;
            
            // Transfer user data to new username
            const oldStats = localStorage.getItem(`userStats_${oldUser}`);
            const oldSecurity = localStorage.getItem(`userSecurity_${oldUser}`);
            
            if (oldStats) {
                localStorage.setItem(`userStats_${currentUser}`, oldStats);
                localStorage.removeItem(`userStats_${oldUser}`);
            }
            if (oldSecurity) {
                localStorage.setItem(`userSecurity_${currentUser}`, oldSecurity);
                localStorage.removeItem(`userSecurity_${oldUser}`);
            }
            
            // Update UI
            document.getElementById('dashboard-username-display').textContent = currentUser;
            document.getElementById('profile-username').textContent = currentUser;
            
            showToast('Username changed successfully!', 'success');
            closeSecurityModal();
        }
    } catch (error) {
        showToast('Failed to change username: ' + error.message, 'error');
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const securityAnswer = document.getElementById('password-security-answer').value.trim();
    
    if (!currentPassword || !newPassword || !confirmPassword || !securityAnswer) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters', 'error');
        return;
    }
    
    // Verify security answer
    const security = JSON.parse(localStorage.getItem(`userSecurity_${currentUser}`)) || {};
    if (!security.answer || security.answer.toLowerCase() !== securityAnswer.toLowerCase()) {
        showToast('Incorrect security answer', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        formData.append('security_answer', securityAnswer);
        
        const data = await apiCall('/change-password', {
            method: 'POST',
            body: formData
        });
        
        if (data.success) {
            showToast('Password changed successfully!', 'success');
            closeSecurityModal();
        }
    } catch (error) {
        showToast('Failed to change password: ' + error.message, 'error');
    }
}

function setSecurityQuestion(event) {
    event.preventDefault();
    
    const question = document.getElementById('security-question-select').value;
    const answer = document.getElementById('security-answer').value.trim();
    const confirmAnswer = document.getElementById('confirm-security-answer').value.trim();
    
    if (!question || !answer || !confirmAnswer) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (answer !== confirmAnswer) {
        showToast('Answers do not match', 'error');
        return;
    }
    
    if (answer.length < 2) {
        showToast('Answer must be at least 2 characters', 'error');
        return;
    }
    
    // Save security question and answer locally
    const security = {
        question: question,
        answer: answer.toLowerCase() // Store in lowercase for case-insensitive comparison
    };
    
    localStorage.setItem(`userSecurity_${currentUser}`, JSON.stringify(security));
    
    // Update UI
    document.getElementById('username-security-question').textContent = question;
    document.getElementById('password-security-question').textContent = question;
    
    showToast('Security question set successfully!', 'success');
    closeSecurityModal();
}

// Update clearUserData to include security data
function clearUserData() {
    if (confirm('Are you sure you want to clear all your data? This action cannot be undone.')) {
        localStorage.removeItem(`userStats_${currentUser}`);
        localStorage.removeItem(`userPrefs_${currentUser}`);
        localStorage.removeItem(`userSecurity_${currentUser}`);
        loadDashboardData(); // Reload with defaults
        showToast('User data cleared successfully', 'success');
    }
}