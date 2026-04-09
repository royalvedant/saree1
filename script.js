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
    let uploadedPersonFile = null;
    
    // --- File Upload Logic ---
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadArea && fileInput) {
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
                uploadedPersonFile = file;
                uploadArea.innerHTML = `<i class='bx bx-check-circle' style='color: var(--primary);'></i><p>${file.name}</p><span>Ready to analyze</span>`;
                uploadArea.style.borderColor = 'var(--primary)';
            }
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
    const sareeTabsContainer = document.getElementById('sareeTabs');
    if (sareeTabsContainer) {
        const tabs = sareeTabsContainer.querySelectorAll('.tab');
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
    }


    // --- Generate Button Logic ---
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        const previewArea = document.getElementById('previewArea');
        const creditsEl = document.querySelector('.credits');
        const bannerAmountEl = document.querySelector('.banner-text .amount');

        async function getSelectedSareeSelection() {
            const selectedStyleCard = document.querySelector('#sareeStylesContainer .style-card.active img');
            if (!selectedStyleCard) {
                throw new Error('Please select a saree style.');
            }

            const imageSrc = selectedStyleCard.getAttribute('src');
            const response = await fetch(imageSrc);
            if (!response.ok) {
                throw new Error('Could not load selected saree image.');
            }

            const blob = await response.blob();
            const safeName = (selectedStyleCard.getAttribute('alt') || 'saree')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            return {
                file: new File([blob], `${safeName || 'saree'}.png`, { type: blob.type || 'image/png' }),
                previewSrc: imageSrc,
                altText: selectedStyleCard.getAttribute('alt') || '',
            };
        }

        generateBtn.addEventListener('click', async () => {
            if (!uploadedPersonFile) {
                alert('Please upload your photo first.');
                return;
            }

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

            try {
                const startMs = Date.now();
                const selectedSaree = await getSelectedSareeSelection();
                const formData = new FormData();
                formData.append('person_image', uploadedPersonFile);
                formData.append('saree_image', selectedSaree.file);
                const controller = new AbortController();
                const timeoutMs = 120000; // 2 minutes
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const res = await fetch('/try-on', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                const raw = await res.text();
                let data = {};
                try {
                    data = raw ? JSON.parse(raw) : {};
                } catch {
                    data = {
                        error: res.ok
                            ? 'Server returned an invalid response.'
                            : `Unexpected response (${res.status}). Static hosts need a /try-on handler (e.g. Netlify function) or the Flask app for real generation.`,
                    };
                }

                if (!res.ok) {
                    const message = data.suggestion || data.error || 'Image generation failed.';
                    previewArea.innerHTML = `
                        <div class="empty-state">
                            <i class='bx bx-error-circle' style='color:#dc2626;'></i>
                            <p>${message}</p>
                        </div>
                    `;
                    return;
                }

                // "Deduct" credit visually
                if (creditsEl) creditsEl.innerText = "0 credits";
                if (bannerAmountEl) {
                    bannerAmountEl.innerText = "0 credits";
                    bannerAmountEl.style.color = "var(--text-muted)";
                }

                // Show result
                // In demo/testing mode, show the user-selected saree image in artwork preview.
                const resultUrl = data.demo_mode ? selectedSaree.previewSrc : (data.result_url || selectedSaree.previewSrc);
                const elapsedMs = Date.now() - startMs;
                const minDelayMs = 3000;
                if (elapsedMs < minDelayMs) {
                    await new Promise((resolve) => setTimeout(resolve, minDelayMs - elapsedMs));
                }

                const styleVideoMap = {
                    'Banarasi Silk': '/static/banarasi-silk-preview.mov',
                    'Chanderi': '/static/chanderi-preview.mov',
                    'Maheshwari': '/static/maheshwari-preview.mov',
                    'Kanchipuram': '/static/kanchipuram-preview.mov',
                    'Mysore Silk': '/static/mysoresilk-preview.mov',
                    'Pattu': '/static/pattu-preview.mov',
                    'Patola': '/static/patola-preview.mov',
                    'Bandhani': '/static/bandhani-preview.mov',
                    'Kota Doria': '/static/kotadoria-preview.mov',
                    'Tant': '/static/tant-preview.mov',
                    'Baluchari': '/static/baluchari-preview.mov',
                    'Jamdani': '/static/jamdani-preview.mov',
                };
                const selectedVideo = styleVideoMap[selectedSaree.altText];

                if (selectedVideo) {
                    previewArea.innerHTML = `
                        <video class="result-image" autoplay muted loop playsinline controls>
                            <source src="${selectedVideo}" type="video/quicktime">
                        </video>
                        <div style="position: absolute; bottom: 1rem; right: 1rem; background: rgba(255,255,255,0.9); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.5rem;">
                            <i class='bx bx-play-circle' style='color: var(--primary)'></i> Video Preview
                        </div>
                    `;
                    const previewVideo = previewArea.querySelector('video');
                    if (previewVideo) {
                        previewVideo.play().catch(() => {});
                    }
                } else {
                    previewArea.innerHTML = `
                        <img src="${resultUrl}" alt="Generated Saree" class="result-image">
                        <div style="position: absolute; bottom: 1rem; right: 1rem; background: rgba(255,255,255,0.9); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.5rem;">
                            <i class='bx bx-check-circle' style='color: var(--primary)'></i> Generation Complete
                        </div>
                    `;
                }
            } catch (error) {
                const isTimeout = error && error.name === 'AbortError';
                previewArea.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-error-circle' style='color:#dc2626;'></i>
                        <p>${isTimeout ? 'Generation timed out after 2 minutes. Please try again with a clearer image and simpler saree reference.' : (error.message || 'Something went wrong. Please try again.')}</p>
                    </div>
                `;
            } finally {
                // Reset button
                generateBtn.disabled = false;
                generateBtn.innerHTML = "<i class='bx bx-sparkles'></i> Generate New Art";
            }
        });
    }

    // --- Purchase Button Logic (Pricing Page) ---
    const handlePayment = async (plan) => {
      // 1. Create order on your backend
      try {
          const response = await fetch('http://localhost:5001/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: plan.price * 100, planName: plan.title }) // Convert to paise
          });
          const order = await response.json();

          // 2. Initialize Razorpay Checkout
          const options = {
            key: "rzp_test_Saj7NdYTWA8bNg", // Use your Test Key ID here
            amount: order.amount,
            currency: order.currency,
            name: "AI Saree Studio",
            description: `Purchase ${plan.credits} Credits - ${plan.title}`,
            order_id: order.id,
            handler: async function (response) {
              // 3. Send response to backend for verification
              const verifyRes = await fetch('http://localhost:5001/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...response,
                  userId: auth.currentUser ? auth.currentUser.uid : "unknown",
                  creditsToAdd: plan.credits
                })
              });
              const verifyData = await verifyRes.json();
              if(verifyData.status === "ok") alert("Payment Successful! Credits added.");
              else alert("Payment verification failed.");
            },
            prefill: {
              email: auth.currentUser ? auth.currentUser.email : "",
            },
            theme: {
              color: "#EA580C"
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
      } catch (e) {
          console.error(e);
          alert("Payment initialization failed. Ensure the backend acts on port 5001.");
      }
    };

    const purchaseButtons = document.querySelectorAll('.purchase-btn');
    purchaseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (auth.currentUser) {
                // Find details
                const card = btn.closest('.relative');
                if (!card) return;
                const title = card.querySelector('h3').innerText;
                let credits = 5;
                let priceUSD = 2.99;
                
                if (title === 'Mini') { credits = 5; priceUSD = 2.99; }
                else if (title === 'Basic') { credits = 30; priceUSD = 7.99; }
                else if (title === 'Pro') { credits = 150; priceUSD = 29.99; }
                else if (title === 'Creator Plan') { credits = 175; priceUSD = 29.99; }
                
                // Static USD to INR conversion (approx ₹83 per USD)
                const priceINR = Math.round(priceUSD * 83);
                
                handlePayment({ price: priceINR, credits, title });
            } else {
                const currentModal = document.getElementById('signInModal');
                if (currentModal) currentModal.classList.add('active');
            }
        });
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
        const purchaseButtons = document.querySelectorAll('.purchase-btn');

        const authState = user ? 'signed_in' : 'signed_out';
        switch (authState) {
            case 'signed_in':
                purchaseButtons.forEach(btn => {
                    btn.innerHTML = "Purchase Now <i class='bx bx-right-arrow-alt w-4 h-4 text-xl'></i>";
                });
                break;
            case 'signed_out':
                purchaseButtons.forEach(btn => {
                    btn.innerHTML = "Sign in to Purchase <i class='bx bx-right-arrow-alt w-4 h-4 text-xl'></i>";
                });
                break;
        }

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
