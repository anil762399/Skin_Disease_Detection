document.addEventListener("DOMContentLoaded", () => {
  let currentUser = null;

  // DOM element references
  const homeBtn = document.getElementById('home-btn');
  const aboutBtn = document.getElementById('about-btn');
  const feedbackBtn = document.getElementById('feedback-btn');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const userProfile = document.getElementById('user-profile');
  const logoutBtn = document.getElementById('logout-btn');
  const modeToggle = document.getElementById('mode-toggle');
  
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  const uploadArea = document.getElementById('upload-area');
  const uploadInput = document.getElementById('upload-input');
  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');
  const predictBtn = document.getElementById('predict-btn');
  
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');
  const confidenceFill = document.getElementById('confidence-fill');
  
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackText = document.getElementById('feedback-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  const notification = document.getElementById('notification');

  // Authentication status check
  async function checkAuthStatus() {
    try {
      const response = await fetch('/profile');
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        currentUser.analysisHistory = data.analysisHistory || [];
        return true;
      }
    } catch (error) {
      console.log('Not authenticated');
    }
    return false;
  }

  // App initialization
  async function initializeApp() {
    const isAuthenticated = await checkAuthStatus();
    if (isAuthenticated) {
      showLoggedInView();
      updateDashboard();
    } else {
      showAuthView();
    }
  }

  // View management functions
  function showAuthView() {
    const authElement = document.getElementById('auth');
    const homeElement = document.getElementById('home');
    const aboutElement = document.getElementById('about-us');
    const feedbackElement = document.getElementById('feedback');
    const dashboardElement = document.getElementById('dashboard');
    
    if (authElement) authElement.style.display = 'block';
    if (homeElement) homeElement.style.display = 'none';
    if (aboutElement) aboutElement.style.display = 'none';
    if (feedbackElement) feedbackElement.style.display = 'none';
    if (dashboardElement) dashboardElement.style.display = 'none';
    
    if (homeBtn) homeBtn.style.display = 'none';
    if (aboutBtn) aboutBtn.style.display = 'none';
    if (feedbackBtn) feedbackBtn.style.display = 'none';
    if (dashboardBtn) dashboardBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  function showLoggedInView() {
    const authElement = document.getElementById('auth');
    const homeElement = document.getElementById('home');
    
    if (authElement) authElement.style.display = 'none';
    if (homeElement) homeElement.style.display = 'block';
    
    if (homeBtn) homeBtn.style.display = 'inline-flex';
    if (aboutBtn) aboutBtn.style.display = 'inline-flex';
    if (feedbackBtn) feedbackBtn.style.display = 'inline-flex';
    if (dashboardBtn) dashboardBtn.style.display = 'inline-flex';
    if (userProfile) userProfile.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && currentUser) {
      userNameElement.textContent = currentUser.name;
    }
    
    switchSection('home');
  }

  // Tab switching for login/register
  if (loginTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      if (registerTab) registerTab.classList.remove('active');
      if (loginForm) loginForm.classList.add('active');
      if (registerForm) registerForm.classList.remove('active');
    });
  }

  if (registerTab) {
    registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      if (loginTab) loginTab.classList.remove('active');
      if (registerForm) registerForm.classList.add('active');
      if (loginForm) loginForm.classList.remove('active');
    });
  }

  // Validation functions
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validateForm(formData, isLogin = true) {
    let isValid = true;
    
    if (!isLogin) {
      if (!formData.name || !formData.name.trim()) {
        showFieldError('register-name', 'Please enter your full name');
        isValid = false;
      }
    }
    
    if (!validateEmail(formData.email)) {
      showFieldError(isLogin ? 'login-email' : 'register-email', 'Please enter a valid email address');
      isValid = false;
    }
    
    if (formData.password.length < 6) {
      showFieldError(isLogin ? 'login-password' : 'register-password', 'Password must be at least 6 characters');
      isValid = false;
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      showFieldError('register-confirm-password', 'Passwords do not match');
      isValid = false;
    }
    
    return isValid;
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');
    
    if (field && errorElement) {
      field.classList.add('error');
      errorElement.textContent = message;
      errorElement.classList.add('show');
      
      field.addEventListener('input', () => {
        field.classList.remove('error');
        errorElement.classList.remove('show');
      }, { once: true });
    }
  }

  // Login form handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailField = document.getElementById('login-email');
      const passwordField = document.getElementById('login-password');
      
      if (!emailField || !passwordField) return;
      
      const formData = {
        email: emailField.value,
        password: passwordField.value
      };
      
      if (!validateForm(formData, true)) return;
      
      const submitBtn = loginForm.querySelector('.action-btn');
      if (!submitBtn) return;
      
      const originalText = submitBtn.innerHTML;
      submitBtn.classList.add('loading');
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      
      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          currentUser = result.user;
          currentUser.analysisHistory = currentUser.analysisHistory || [];
          showLoggedInView();
          await updateUserProfile();
          showNotification(`Welcome back, ${result.user.name}! Ready for medical analysis.`, 'success');
        } else {
          showNotification(result.error || 'Login failed', 'error');
        }
      } catch (error) {
        showNotification('Network error. Please try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Register form handler
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nameField = document.getElementById('register-name');
      const emailField = document.getElementById('register-email');
      const passwordField = document.getElementById('register-password');
      const confirmPasswordField = document.getElementById('register-confirm-password');
      
      if (!nameField || !emailField || !passwordField || !confirmPasswordField) return;
      
      const formData = {
        name: nameField.value,
        email: emailField.value,
        password: passwordField.value,
        confirmPassword: confirmPasswordField.value
      };
      
      if (!validateForm(formData, false)) return;
      
      const submitBtn = registerForm.querySelector('.action-btn');
      if (!submitBtn) return;
      
      const originalText = submitBtn.innerHTML;
      submitBtn.classList.add('loading');
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
      
      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          currentUser = result.user;
          currentUser.analysisHistory = [];
          showLoggedInView();
          showNotification(`Welcome to DermaCare, ${result.user.name}! Your account has been created successfully.`, 'success');
        } else {
          showNotification(result.error || 'Registration failed', 'error');
        }
      } catch (error) {
        showNotification('Network error. Please try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/logout', { method: 'POST' });
        currentUser = null;
        showAuthView();
        showNotification('You have been logged out successfully. Thank you for using DermaCare!', 'success');
        
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        
        if (previewContainer) previewContainer.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'none';
        if (uploadInput) uploadInput.value = '';
      } catch (error) {
        showNotification('Logout failed, but session cleared locally', 'warning');
        currentUser = null;
        showAuthView();
      }
    });
  }

  // Section switching
  function switchSection(sectionId) {
    if (!currentUser && sectionId !== 'auth') {
      showNotification('Please login to access this section', 'warning');
      return;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.querySelectorAll('.section').forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(30px) scale(0.95)';
      setTimeout(() => {
        section.style.display = 'none';
      }, 400);
    });
    
    setTimeout(() => {
      const targetSection = document.getElementById(sectionId.replace('-us', ''));
      if (targetSection) {
        targetSection.style.display = 'block';
        setTimeout(() => {
          targetSection.style.opacity = '1';
          targetSection.style.transform = 'translateY(0) scale(1)';
        }, 50);
      }
    }, 400);
    
    const activeBtn = document.getElementById(sectionId.replace('-us', '') + '-btn');
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  // Navigation event listeners
  if (homeBtn) homeBtn.addEventListener('click', () => switchSection('home'));
  if (aboutBtn) aboutBtn.addEventListener('click', () => switchSection('about-us'));
  if (feedbackBtn) feedbackBtn.addEventListener('click', () => switchSection('feedback'));
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      switchSection('dashboard');
      setTimeout(updateDashboard, 500);
    });
  }

  // Dark mode toggle
  if (modeToggle) {
    modeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const icon = modeToggle.querySelector('i');
      
      if (icon) {
        if (document.body.classList.contains('dark-mode')) {
          icon.className = 'fas fa-sun';
          showNotification('Dark mode activated for better evening use', 'success');
        } else {
          icon.className = 'fas fa-moon';
          showNotification('Light mode activated', 'success');
        }
      }
    });
  }

  // File upload handlers
  if (uploadArea) {
    uploadArea.addEventListener('click', () => {
      if (!currentUser) {
        showNotification('Please login to upload medical images', 'warning');
        return;
      }
      if (uploadInput) uploadInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (currentUser) {
        uploadArea.classList.add('dragover');
      }
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (!currentUser) {
        showNotification('Please login to upload medical images', 'warning');
        return;
      }
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    });
  }

  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFileSelect(file);
      }
    });
  }

  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid medical image file (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('File size must be less than 10MB for optimal analysis', 'error');
      return;
    }

    if (!previewImg) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      if (previewContainer) previewContainer.style.display = 'block';
      if (resultContainer) resultContainer.style.display = 'none';
      
      if (predictBtn) {
        predictBtn.disabled = false;
        predictBtn.style.opacity = '1';
        predictBtn.classList.add('pulse-medical');
      }
    };
    reader.readAsDataURL(file);

    showNotification('Medical image loaded successfully! Ready for AI analysis.', 'success');
  }

  // Prediction handler
  if (predictBtn) {
    predictBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showNotification('Please login to perform medical analysis', 'warning');
        return;
      }

      if (!uploadInput || !uploadInput.files.length) {
        showNotification('Please upload a skin image first for analysis!', 'warning');
        return;
      }

      const file = uploadInput.files[0];
      const formData = new FormData();
      formData.append("file", file);

      showLoading(true);
      predictBtn.classList.add('loading');
      predictBtn.classList.remove('pulse-medical');
      predictBtn.innerHTML = '<i class="fas fa-brain"></i> Analyzing with AI...';

      try {
        const response = await fetch("/predict", {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          displayResult(result.prediction, result.confidence);
          showNotification('Medical analysis completed and saved to your history!', 'success');
          
          await updateUserProfile();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Analysis failed');
        }
      } catch (error) {
        console.error("Error:", error);
        showNotification(error.message || 'Analysis failed. Please ensure image quality and try again.', 'error');
      } finally {
        showLoading(false);
        predictBtn.classList.remove('loading');
        predictBtn.innerHTML = '<i class="fas fa-brain"></i> Analyze Image';
      }
    });
  }

  // User profile update
  async function updateUserProfile() {
    try {
      const response = await fetch('/profile');
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        currentUser.analysisHistory = data.analysisHistory || [];
      }
    } catch (error) {
      console.log('Failed to update user profile');
    }
  }

  // Dashboard update
  async function updateDashboard() {
    if (!currentUser) return;

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileJoined = document.getElementById('profile-joined');

    if (profileName) profileName.textContent = currentUser.name;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileJoined && currentUser.joinDate) {
      profileJoined.textContent = new Date(currentUser.joinDate).toLocaleDateString();
    }

    try {
      const response = await fetch('/dashboard');
      if (response.ok) {
        const stats = await response.json();
        const totalAnalysesElement = document.getElementById('total-analyses');
        const avgConfidenceElement = document.getElementById('avg-confidence');
        
        if (totalAnalysesElement) totalAnalysesElement.textContent = stats.totalAnalyses;
        if (avgConfidenceElement) avgConfidenceElement.textContent = `${stats.avgConfidence}%`;
      }
    } catch (error) {
      console.log('Failed to load dashboard stats');
    }

    const historyContainer = document.getElementById('analysis-history');
    if (historyContainer) {
      if (!currentUser.analysisHistory || currentUser.analysisHistory.length === 0) {
        historyContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            <p>No analyses yet. Upload your first skin image to get started!</p>
          </div>
        `;
      } else {
        historyContainer.innerHTML = currentUser.analysisHistory
          .slice(0, 5)
          .map(analysis => `
            <div class="analysis-item">
              <div class="analysis-date">${new Date(analysis.date).toLocaleString()}</div>
              <div class="analysis-result">${analysis.condition} (${Math.round(analysis.confidence * 100)}% confidence)</div>
            </div>
          `).join('');
      }
    }
  }

  // Display analysis results
  function displayResult(prediction, confidence) {
    if (!resultContent || !confidenceFill || !resultContainer) return;
    
    const severityLevel = confidence > 0.9 ? 'High' : confidence > 0.75 ? 'Medium' : 'Low';
    const urgencyClass = confidence > 0.9 ? 'urgent' : confidence > 0.75 ? 'moderate' : 'low';

    resultContent.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <strong style="font-size: 1.4rem; color: var(--primary-blue);">
          <i class="fas fa-diagnoses"></i> Detected Condition: ${prediction}
        </strong>
      </div>
      <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: var(--text-light); font-size: 1.1rem;">
          <i class="fas fa-chart-bar"></i> Confidence Level: 
        </span>
        <strong style="color: var(--medical-green); font-size: 1.2rem;">${Math.round(confidence * 100)}%</strong>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <span style="color: var(--text-light);">Analysis Certainty: </span>
        <span class="${urgencyClass}" style="font-weight: bold;">${severityLevel}</span>
      </div>
      <div style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(244, 194, 161, 0.1)); padding: 1.5rem; border-radius: 12px; margin-top: 1.5rem; border-left: 4px solid var(--light-blue);">
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
          <i class="fas fa-user-md" style="color: var(--medical-green); margin-right: 0.5rem; font-size: 1.2rem;"></i>
          <strong style="color: var(--primary-blue);">Medical Disclaimer</strong>
        </div>
        <small style="color: var(--text-light); line-height: 1.5;">
          This AI analysis is for educational and screening purposes only. 
          <strong>Always consult with a qualified dermatologist</strong> for proper medical diagnosis, 
          treatment recommendations, and professional healthcare advice. Early detection and professional 
          consultation are crucial for optimal skin health outcomes.
        </small>
      </div>
    `;

    setTimeout(() => {
      confidenceFill.style.width = `${confidence * 100}%`;
    }, 500);

    resultContainer.style.display = 'block';
  }

  // Feedback form handler
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!currentUser) {
        showNotification('Please login to submit feedback', 'warning');
        return;
      }
      
      if (!feedbackText) return;
      
      const feedback = feedbackText.value.trim();
      if (!feedback) {
        showNotification('Please share your experience with DermaCare to help us improve.', 'warning');
        return;
      }

      const submitBtn = feedbackForm.querySelector('.action-btn');
      if (!submitBtn) return;
      
      const originalText = submitBtn.innerHTML;
      submitBtn.classList.add('loading');
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submitting to Medical Team...';

      try {
        const response = await fetch('/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedback: feedback })
        });

        const result = await response.json();
        
        if (response.ok) {
          showNotification(`Thank you, ${currentUser.name}! Your valuable medical feedback has been submitted.`, 'success');
          feedbackText.value = '';
        } else {
          showNotification(result.error || 'Failed to submit feedback', 'error');
        }
      } catch (error) {
        showNotification('Network error. Please try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Utility functions
  function showLoading(show) {
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  function showNotification(message, type = 'info') {
    if (!notification) return;
    
    const notificationText = notification.querySelector('.notification-text') || notification;
    const notificationIcon = notification.querySelector('.notification-icon');
    
    if (notificationText.textContent !== undefined) {
      notificationText.textContent = message;
    } else {
      notification.textContent = message;
    }
    
    if (notificationIcon) {
      let iconClass = 'fas fa-info-circle';
      switch(type) {
        case 'success':
          iconClass = 'fas fa-check-circle';
          break;
        case 'error':
          iconClass = 'fas fa-exclamation-circle';
          break;
        case 'warning':
          iconClass = 'fas fa-exclamation-triangle';
          break;
      }
      notificationIcon.className = iconClass;
    }
    
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }

  // Notification close handler
  if (notification) {
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
      });
    }
    
    notification.addEventListener('click', () => {
      notification.classList.remove('show');
    });
  }

  // Character counter for feedback
  if (feedbackText) {
    const charCount = document.getElementById('char-count');
    if (charCount) {
      feedbackText.addEventListener('input', () => {
        charCount.textContent = feedbackText.value.length;
      });
    }
  }

  // Category buttons for feedback
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!currentUser) return;
    
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case '1':
          e.preventDefault();
          switchSection('home');
          showNotification('Switched to Medical Analysis', 'success');
          break;
        case '2':
          e.preventDefault();
          switchSection('about-us');
          showNotification('Viewing Medical Information', 'success');
          break;
        case '3':
          e.preventDefault();
          switchSection('feedback');
          showNotification('Medical Feedback Section', 'success');
          break;
        case '4':
          e.preventDefault();
          switchSection('dashboard');
          setTimeout(updateDashboard, 500);
          showNotification('Medical Dashboard', 'success');
          break;
      }
    }
  });

  // Intersection Observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        if (entry.target.classList.contains('feature-card')) {
          entry.target.style.transform = 'translateY(0) scale(1)';
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('.section, .feature-card').forEach(element => {
    observer.observe(element);
  });

  // Touch gesture handling
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', e => {
    if (!currentUser) return;
    touchEndX = e.changedTouches[0].screenX;
    handleMedicalGesture();
  });

  function handleMedicalGesture() {
    const swipeThreshold = 100;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      const currentSection = document.querySelector('.section[style*="block"]')?.id || 'home';
      
      if (diff > 0) {
        // Swipe left - next section
        if (currentSection === 'home') {
          switchSection('dashboard');
          setTimeout(updateDashboard, 500);
          showNotification('Medical Dashboard', 'success');
        } else if (currentSection === 'dashboard') {
          switchSection('about-us');
          showNotification('Medical Information', 'success');
        } else if (currentSection === 'about-us') {
          switchSection('feedback');
          showNotification('Medical Feedback', 'success');
        }
      } else {
        // Swipe right - previous section
        if (currentSection === 'feedback') {
          switchSection('about-us');
          showNotification('Medical Information', 'success');
        } else if (currentSection === 'about-us') {
          switchSection('dashboard');
          setTimeout(updateDashboard, 500);
          showNotification('Medical Dashboard', 'success');
        } else if (currentSection === 'dashboard') {
          switchSection('home');
          showNotification('Medical Analysis', 'success');
        }
      }
    }
  }

  // Initialize the application
  initializeApp();

  // Welcome message
  setTimeout(() => {
    if (!currentUser) {
      showNotification('Welcome to DermaCare! Please login or register to access medical analysis features.', 'success');
    }
  }, 1000);
});