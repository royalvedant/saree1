import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnqbWR3Ddr96_1troyALWSRsmdk6jiEps",
  authDomain: "saree-5f7e9.firebaseapp.com",
  projectId: "saree-5f7e9",
  storageBucket: "saree-5f7e9.firebasestorage.app",
  messagingSenderId: "687945747395",
  appId: "1:687945747395:web:b3e54aeb23ba4a6a75cb76",
  measurementId: "G-NW78C8LC8K"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    
    // --- File Upload Logic ---
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
        uploadArea.style.backgroundColor = '#fffaf5';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            uploadArea.innerHTML = `<i class='bx bx-check-circle' style='color: var(--primary);'></i><p>${file.name}</p><span>Ready to analyze</span>`;
            uploadArea.style.borderColor = 'var(--primary)';
        }
    }


    // --- Generic Option Selection Logic ---
    function setupSelection(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener('click', () => {
                // Find siblings and remove active class
                const type = el.tagName.toLowerCase();
                let siblings;
                if(type === 'button' && el.classList.contains('pill')) {
                     siblings = el.parentElement.querySelectorAll('.pill');
                } else {
                     siblings = el.parentElement.querySelectorAll('.style-card, .option-card, .option-card-small');
                }
                
                siblings.forEach(s => s.classList.remove('active'));
                el.classList.add('active');
            });
        });
    }

    setupSelection('.style-card');
    setupSelection('.option-card');
    setupSelection('.option-card-small');
    setupSelection('.pill');
    
    // Custom logic for color circles
    const colors = document.querySelectorAll('.color-circle');
    colors.forEach(color => {
        color.addEventListener('click', () => {
            colors.forEach(c => {
                c.classList.remove('active-color');
                c.innerHTML = ''; // Remove checkmark
            });
            color.classList.add('active-color');
            color.innerHTML = "<i class='bx bx-check'></i>";
        });
    });

    // Tab Switching
    const tabs = document.querySelectorAll('#sareeTabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Swap out the Saree style cards based on the tab
            const targetId = tab.getAttribute('data-target');
            if (targetId) {
                document.querySelectorAll('#sareeStylesContainer .style-cards').forEach(container => {
                    container.style.display = 'none';
                });
                document.getElementById(targetId).style.display = 'grid';
            }
        });
    });


    // --- Generate Button Logic ---
    const generateBtn = document.getElementById('generateBtn');
    const previewArea = document.getElementById('previewArea');
    const creditsEl = document.querySelector('.credits');
    const bannerAmountEl = document.querySelector('.banner-text .amount');

    generateBtn.addEventListener('click', () => {
        // UI feedback for generating
        generateBtn.disabled = true;
        generateBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin' ></i> Generating...";
        
        // Show loading state in preview
        previewArea.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="color: var(--text-muted); font-weight: 500;">AI is crafting your saree design...</p>
            </div>
        `;

        // Simulate API call delay (3 seconds)
        setTimeout(() => {
            // "Deduct" credit visually
            creditsEl.innerText = "0 credits";
            bannerAmountEl.innerText = "0 credits";
            bannerAmountEl.style.color = "var(--text-muted)";

            // Show result
            // Placeholer image for result since asset might not exist
            const resultUrl = "https://images.unsplash.com/photo-1610189044275-5202868ff178?q=80&w=800&auto=format&fit=crop"; 
            
            previewArea.innerHTML = `
                <img src="${resultUrl}" alt="Generated Saree" class="result-image">
                <div style="position: absolute; bottom: 1rem; right: 1rem; background: rgba(255,255,255,0.9); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.5rem;">
                    <i class='bx bx-check-circle' style='color: var(--primary)'></i> Generation Complete
                </div>
            `;

            // Reset button
            generateBtn.disabled = false;
            generateBtn.innerHTML = "<i class='bx bx-sparkles'></i> Generate New Art";
            
            // Re-apply hover effect dynamically by removing and adding class if needed, or it just works via CSS.
        }, 3000);
    });

    // --- Modal Logic ---
    const userProfileBtn = document.getElementById('userProfileBtn');
    const signInModal = document.getElementById('signInModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('passwordInput');
    const signInForm = document.getElementById('signInForm');
    const googleSignInBtn = document.getElementById('googleSignInBtn');

    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', () => {
            signInModal.classList.add('active');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            signInModal.classList.remove('active');
        });
    }

    if (signInModal) {
        signInModal.addEventListener('click', (e) => {
            if (e.target === signInModal) {
                signInModal.classList.remove('active');
            }
        });
    }

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePasswordBtn.innerHTML = type === 'password' ? "<i class='bx bx-hide'></i>" : "<i class='bx bx-show'></i>";
        });
    }

    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailInput').value;
            const password = document.getElementById('passwordInput').value;
            const submitBtn = signInForm.querySelector('.btn-primary');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                signInModal.classList.remove('active');
            } catch (error) {
                alert('Sign in failed: ' + error.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, googleProvider);
                signInModal.classList.remove('active');
            } catch (error) {
                alert('Google Sign-in failed: ' + error.message);
            }
        });
    }

    // Auth State Monitor
    onAuthStateChanged(auth, (user) => {
        const userInfoName = document.querySelector('#userProfileBtn .name');
        const userAvatar = document.querySelector('#userProfileBtn .avatar');
        
        if (user) {
            if (userInfoName) userInfoName.textContent = user.displayName || user.email.split('@')[0];
            if (userAvatar) {
                if (user.photoURL) {
                    userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    userAvatar.innerHTML = (user.displayName || user.email).charAt(0).toUpperCase();
                }
            }
        } else {
            if (userInfoName) userInfoName.textContent = 'Sign In';
            if (userAvatar) userAvatar.innerHTML = "<i class='bx bx-user'></i>";
        }
    });

});
