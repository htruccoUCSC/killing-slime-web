// ChronosGate Gamer Portal Core Script - 2010s Time & Space Portal
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Fullscreen & Orientation Locking Logic
    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    };

    const arcadeScreen = document.getElementById('arcade-screen');

    function handleMobileOrientation() {
        if (!document.body.classList.contains('mobile-play-active')) return;
        if (!arcadeScreen) return;

        if (window.innerHeight > window.innerWidth) {
            arcadeScreen.classList.add('portrait-rotated');
        } else {
            arcadeScreen.classList.remove('portrait-rotated');
        }
    }

    function activateMobilePlay() {
        if (!isMobileDevice()) return;
        
        document.body.classList.add('mobile-play-active');
        if (arcadeScreen) {
            arcadeScreen.classList.add('mobile-fullscreen');
            handleMobileOrientation();
        }
    }

    function deactivateMobilePlay() {
        document.body.classList.remove('mobile-play-active');
        if (arcadeScreen) {
            arcadeScreen.classList.remove('mobile-fullscreen');
            arcadeScreen.classList.remove('portrait-rotated');
        }
    }

    // Exit Game button handler
    const mobileExitBtn = document.getElementById('mobile-exit-btn');
    if (mobileExitBtn) {
        mobileExitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deactivateMobilePlay();
            // Switch back to home tab
            const homeTab = document.querySelector('.nav-tab[data-tab="home"]');
            if (homeTab) homeTab.click();
        });
    }

    window.addEventListener('resize', handleMobileOrientation);
    window.addEventListener('orientationchange', handleMobileOrientation);

    // 1. TABS SYSTEM
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            // Update nav state
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content state
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Update wrapper class for custom play tab layout
            const wrapper = document.querySelector('.wrapper');
            if (wrapper) {
                if (targetTab === 'play') {
                    wrapper.classList.add('play-active');
                    setTimeout(() => {
                        const frame = document.getElementById('game-frame');
                        if (frame) frame.focus();
                    }, 100);
                    activateMobilePlay();
                } else {
                    wrapper.classList.remove('play-active');
                    deactivateMobilePlay();
                }
            }
        });
    });

    // 2. DYNAMIC IFRAME INJECTOR (Solves Unity Build Overwrites!)
    const gameFrame = document.getElementById('game-frame');
    if (gameFrame) {
        const injectResponsiveStyles = () => {
            try {
                const doc = gameFrame.contentDocument || gameFrame.contentWindow.document;
                if (!doc) return;

                // Inject responsive CSS styles override
                const style = doc.createElement('style');
                style.id = "arcade-fluid-override";
                style.textContent = `
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        background: #000 !important;
                    }
                    #unity-container.unity-desktop {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        transform: none !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                    }
                    #unity-container.unity-desktop #unity-canvas {
                        width: 100% !important;
                        height: calc(100% - 38px) !important;
                        display: block !important;
                    }
                    #unity-container.unity-mobile #unity-canvas {
                        width: 100% !important;
                        height: 100% !important;
                        display: block !important;
                    }
                    #unity-footer {
                        width: 100% !important;
                        height: 38px !important;
                        background: #111 !important;
                        border-top: 1px solid #333 !important;
                        color: #fff !important;
                        position: absolute !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        padding: 0 10px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        box-sizing: border-box !important;
                        z-index: 99 !important;
                    }
                    #unity-logo-title-footer, #unity-fullscreen-button, #unity-build-title {
                        float: none !important;
                        margin: 0 !important;
                    }
                `;
                doc.head.appendChild(style);

                // Block Unity's absolute JS overrides by redefining style values
                const canvas = doc.querySelector('#unity-canvas');
                if (canvas) {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    
                    Object.defineProperty(canvas.style, 'width', {
                        get: function() { return '100%'; },
                        set: function(val) { /* ignore absolute pixel updates */ }
                    });
                    Object.defineProperty(canvas.style, 'height', {
                        get: function() { return '100%'; },
                        set: function(val) { /* ignore absolute pixel updates */ }
                    });
                }
            } catch (e) {
                console.warn("Could not inject responsive styles into iframe. Same-origin constraint might apply on flat file systems.", e);
            }
        };

        // Inject on load (useful for restarts/reboots)
        gameFrame.addEventListener('load', injectResponsiveStyles);
        
        // Trigger immediately if already loaded
        if (gameFrame.contentDocument && gameFrame.contentDocument.readyState === 'complete') {
            injectResponsiveStyles();
        }
    }

    // 3. CRT TOGGLE FX
    const crtToggleBtn = document.getElementById('crt-toggle-btn');

    if (crtToggleBtn && arcadeScreen) {
        crtToggleBtn.addEventListener('click', () => {
            const isActive = arcadeScreen.classList.toggle('crt-active');
            if (isActive) {
                crtToggleBtn.textContent = "CRT SCANLINES: ON";
                crtToggleBtn.classList.add('active');
            } else {
                crtToggleBtn.textContent = "CRT SCANLINES: OFF";
                crtToggleBtn.classList.remove('active');
            }
        });
    }

    // 4. GAME SCREENSHOT CAROUSEL
    let currentSlide = 0;
    const slides = document.querySelectorAll('.media-slide');
    const totalSlides = slides.length;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        if (slides[index]) {
            slides[index].classList.add('active');
        }
    }

    document.getElementById('slider-prev-btn')?.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        showSlide(currentSlide);
    });

    document.getElementById('slider-next-btn')?.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    });

    // 5. OFFICIAL GAME SOUNDTRACK AUDIO PLAYER
    let audioCtx = null;
    let playState = false;
    let analyser = null;
    let sourceNode = null;
    let gainNode = null;
    let visualizerCanvas = document.getElementById('audio-visualizer');
    let visCtx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;

    // Create background audio element
    const audioElement = new Audio();
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous"; // Safe cross-origin handling

    const trackUrls = [
        "assets/icu - sadface_lacey (120 bpm).wav",
        "assets/icu - battle_music(tothedeath) (155 bpm) (1).wav"
    ];
    let activeTrack = 0;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 32;

            // Connect HTML Audio element to Web Audio nodes
            sourceNode = audioCtx.createMediaElementSource(audioElement);
            gainNode = audioCtx.createGain();
            
            const volumeSlider = document.getElementById('volume-slider');
            gainNode.gain.setValueAtTime(volumeSlider ? parseFloat(volumeSlider.value) : 0.5, audioCtx.currentTime);

            // Connect chain: Source -> Gain -> Analyser -> Destination
            sourceNode.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioCtx.destination);
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function startAudio() {
        initAudio();
        const currentSrc = trackUrls[activeTrack];
        if (!audioElement.src.endsWith(encodeURI(currentSrc))) {
            audioElement.src = currentSrc;
        }
        audioElement.play().catch(e => console.warn("Audio playback failed:", e));
        drawVisualizer();
    }

    function stopAudio() {
        audioElement.pause();
    }

    function switchTrack() {
        initAudio();
        activeTrack = (activeTrack + 1) % trackUrls.length;
        audioElement.src = trackUrls[activeTrack];
        if (playState) {
            audioElement.play().catch(e => console.warn("Audio playback failed on switch:", e));
        }
    }

    // Draw active bars visualizer
    function drawVisualizer() {
        if (!playState || !analyser || !visCtx) return;

        requestAnimationFrame(drawVisualizer);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        visCtx.fillStyle = '#000';
        visCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const barWidth = (visualizerCanvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * visualizerCanvas.height;

            // Lime Green / Purple color mixing
            visCtx.fillStyle = `rgb(57, ${255 - (i * 12)}, 20)`;
            visCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth - 1, barHeight);

            x += barWidth;
        }
    }

    const playBtn = document.getElementById('play-synth-btn');
    const switchBtn = document.getElementById('switch-track-btn');
    const playIcon = document.getElementById('play-icon');
    const playText = document.getElementById('play-text');
    const volumeSlider = document.getElementById('volume-slider');

    playBtn?.addEventListener('click', () => {
        playState = !playState;
        if (playState) {
            startAudio();
            if (playIcon) playIcon.textContent = "[ || ]";
            if (playText) playText.textContent = "MUTE MUSIC";
            playBtn.classList.add('playing');
            if (switchBtn) switchBtn.style.display = 'block';
        } else {
            stopAudio();
            if (playIcon) playIcon.textContent = "[ > ]";
            if (playText) playText.textContent = "PLAY SOUNDTRACK";
            playBtn.classList.remove('playing');
            if (switchBtn) switchBtn.style.display = 'none';
            
            // Clear visualizer
            if (visCtx) {
                visCtx.fillStyle = '#000';
                visCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
            }
        }
    });

    switchBtn?.addEventListener('click', () => {
        switchTrack();
    });

    volumeSlider?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (gainNode && audioCtx) {
            gainNode.gain.setValueAtTime(val, audioCtx.currentTime);
        }
    });

    // 6. DYNAMIC MARKDOWN DEVLOG SYSTEM WITH JSON CATALOG
    function parseInlineMarkdown(text) {
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\"/g, '<strong>$1</strong>');
        // Handle bold with asterisks correctly
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Links: [text](url)
        escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        return escaped;
    }

    function parseMarkdown(md) {
        const lines = md.split('\n');
        let html = '';
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip H1 title header since we pull it out for the accordion header headline
            if (i === 0 && line.startsWith('# ')) {
                continue;
            }

            // Handle Subheadings (## or ###)
            if (line.startsWith('### ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h5>${line.substring(4)}</h5>`;
                continue;
            }
            if (line.startsWith('## ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h4>${line.substring(3)}</h4>`;
                continue;
            }

            // Handle List Items starting with * or -
            if (line.startsWith('* ') || line.startsWith('- ')) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                let content = line.substring(2);
                content = parseInlineMarkdown(content);
                html += `<li>${content}</li>`;
                continue;
            }

            // If not a list item, close list if we were in one
            if (inList && line !== '') {
                html += '</ul>';
                inList = false;
            }

            // Handle empty lines (paragraphs separator)
            if (line === '') {
                continue;
            }

            // Standard paragraph
            let content = parseInlineMarkdown(line);
            html += `<p>${content}</p>`;
        }

        if (inList) {
            html += '</ul>';
        }

        return html;
    }

    function extractHeadline(md) {
        const firstLine = md.split('\n')[0].trim();
        if (firstLine.startsWith('# ')) {
            return firstLine.substring(2);
        }
        return "Untitled Devlog";
    }

    async function loadDevlogs() {
        const devlogListContainer = document.getElementById('dynamic-devlog-list');
        if (!devlogListContainer) return;

        try {
            // Fetch catalog list from catalog.json
            const catalogResponse = await fetch('devlogs/catalog.json');
            if (!catalogResponse.ok) {
                throw new Error("Could not fetch devlogs catalog list.");
            }
            const catalog = await catalogResponse.json();

            // Fetch each markdown file
            const fetchPromises = catalog.map(async (item) => {
                try {
                    const response = await fetch(item.file);
                    if (!response.ok) {
                        // Silently ignore if file deleted / not found
                        console.warn(`Devlog file ignored (not found): ${item.file}`);
                        return null;
                    }
                    const text = await response.text();
                    return {
                        ...item,
                        content: text,
                        success: true
                    };
                } catch (err) {
                    console.warn(`Error fetching ${item.file}, ignoring:`, err);
                    return null; // Ignore deleted logs silently
                }
            });

            // Wait for all and filter out any failed/ignored files
            const loadedLogs = (await Promise.all(fetchPromises)).filter(log => log !== null);

            // Clear loading screens
            devlogListContainer.innerHTML = '';

            if (loadedLogs.length === 0) {
                devlogListContainer.innerHTML = `
                    <div style="font-family: monospace; text-align: center; color: var(--text-muted); padding: 30px;">
                        [ NO ACTIVE CHRONICLES RECORDED ]
                    </div>
                `;
                return;
            }

            loadedLogs.forEach((log) => {
                const title = extractHeadline(log.content);
                const parsedBody = parseMarkdown(log.content);

                const accordionItem = document.createElement('div');
                accordionItem.className = 'devlog-accordion-item';

                const header = document.createElement('div');
                header.className = 'devlog-accordion-header';
                
                const headerLeft = document.createElement('div');
                headerLeft.className = 'devlog-accordion-header-left';
                
                const titleEl = document.createElement('h3');
                titleEl.className = 'devlog-accordion-title';
                titleEl.textContent = title;
                
                const metaEl = document.createElement('span');
                metaEl.className = 'devlog-accordion-meta';
                metaEl.textContent = `Posted by: ${log.author} | Date: ${log.date}`;
                
                headerLeft.appendChild(titleEl);
                headerLeft.appendChild(metaEl);

                const toggleEl = document.createElement('span');
                toggleEl.className = 'devlog-accordion-toggle';
                toggleEl.textContent = '[ + EXPAND ]';

                header.appendChild(headerLeft);
                header.appendChild(toggleEl);

                const contentPanel = document.createElement('div');
                contentPanel.className = 'devlog-accordion-content';

                const bodyEl = document.createElement('div');
                bodyEl.className = 'devlog-body';
                bodyEl.innerHTML = parsedBody;

                const footerEl = document.createElement('div');
                footerEl.className = 'devlog-footer';

                if (log.tags && Array.isArray(log.tags)) {
                    log.tags.forEach((tag, idx) => {
                        const tagEl = document.createElement('span');
                        if (idx === 0 && log.featured) {
                            tagEl.className = 'tag-badge featured';
                        } else {
                            tagEl.className = 'tag-badge';
                        }
                        tagEl.textContent = tag;
                        footerEl.appendChild(tagEl);
                    });
                }

                contentPanel.appendChild(bodyEl);
                contentPanel.appendChild(footerEl);

                accordionItem.appendChild(header);
                accordionItem.appendChild(contentPanel);

                header.addEventListener('click', () => {
                    const isExpanded = accordionItem.classList.toggle('expanded');
                    toggleEl.textContent = isExpanded ? '[ - COLLAPSE ]' : '[ + EXPAND ]';
                });

                devlogListContainer.appendChild(accordionItem);
            });

        } catch (error) {
            devlogListContainer.innerHTML = `
                <div style="font-family: monospace; text-align: center; color: #ff3333; padding: 30px;">
                    [ CHRONOS-DATABASE OFFLINE / CONNECTION FAILED ]
                </div>
            `;
            console.error("Critical error building devlog timeline", error);
        }
    }

    loadDevlogs();
});
