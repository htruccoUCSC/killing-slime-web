// ChronosGate Gamer Portal Core Script - 2010s Time & Space Portal
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Fullscreen & Orientation Locking Logic
    const isMobileDevice = () => {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 1024;
        return isMobileUA || (hasTouch && isSmallScreen);
    };

    const arcadeScreen = document.getElementById('arcade-screen');

    function updateGameFrameSize() {
        const gameFrame = document.getElementById('game-frame');
        if (!gameFrame) return;

        if (!document.body.classList.contains('mobile-play-active')) {
            // Restore desktop sizes
            gameFrame.style.removeProperty('width');
            gameFrame.style.removeProperty('height');
            return;
        }

        const isPortrait = window.innerHeight > window.innerWidth;
        const lw = isPortrait ? window.innerHeight : window.innerWidth;
        const lh = isPortrait ? window.innerWidth : window.innerHeight;

        let targetWidth, targetHeight;
        if (lw / lh > 16 / 9) {
            // Screen is wider than 16:9 (pillarbox)
            targetHeight = lh;
            targetWidth = lh * (16 / 9);
        } else {
            // Screen is taller than 16:9 (letterbox)
            targetWidth = lw;
            targetHeight = lw * (9 / 16);
        }

        gameFrame.style.setProperty('width', `${targetWidth}px`, 'important');
        gameFrame.style.setProperty('height', `${targetHeight}px`, 'important');
    }

    function handleMobileOrientation() {
        if (!document.body.classList.contains('mobile-play-active')) return;
        if (!arcadeScreen) return;

        if (window.innerHeight > window.innerWidth) {
            arcadeScreen.classList.add('portrait-rotated');
        } else {
            arcadeScreen.classList.remove('portrait-rotated');
        }
        
        // Update game frame size to preserve 16:9 aspect ratio
        updateGameFrameSize();
    }

    function activateMobilePlay() {
        if (!isMobileDevice()) return;
        
        document.body.classList.add('mobile-play-active');
        if (arcadeScreen) {
            arcadeScreen.classList.add('mobile-fullscreen');
            handleMobileOrientation();

            // Trigger browser native fullscreen or use Safari address bar scroll hack
            let fullscreenTriggered = false;
            try {
                if (arcadeScreen.requestFullscreen) {
                    arcadeScreen.requestFullscreen();
                    fullscreenTriggered = true;
                } else if (arcadeScreen.webkitRequestFullscreen) {
                    arcadeScreen.webkitRequestFullscreen();
                    fullscreenTriggered = true;
                } else if (arcadeScreen.msRequestFullscreen) {
                    arcadeScreen.msRequestFullscreen();
                    fullscreenTriggered = true;
                }
            } catch (err) {
                console.warn("Fullscreen request failed, falling back to scroll hack:", err);
            }

            // iOS Safari scroll hack fallback if native Fullscreen API wasn't triggered
            if (!fullscreenTriggered) {
                try {
                    // Temporarily expand body height to trigger address bar minimize on scroll
                    document.documentElement.style.height = '120%';
                    document.body.style.setProperty('height', '120%', 'important');
                    document.body.style.setProperty('overflow', 'auto', 'important');
                    
                    setTimeout(() => {
                        window.scrollTo(0, 1);
                        setTimeout(() => {
                            // Lock height and viewport scrollability back
                            document.documentElement.style.height = '100%';
                            document.body.style.setProperty('height', '100%', 'important');
                            document.body.style.setProperty('overflow', 'hidden', 'important');
                            handleMobileOrientation();
                        }, 300);
                    }, 100);
                } catch (err) {
                    console.warn("iOS URL bar scroll hack failed:", err);
                }
            }
        }
        
        // Re-inject responsive styles to ensure footer state matches the mobile play state
        injectResponsiveStyles();
    }

    function deactivateMobilePlay() {
        document.body.classList.remove('mobile-play-active');
        
        // Restore document element height and body properties from scroll hack overrides
        try {
            document.documentElement.style.height = '';
            document.body.style.removeProperty('height');
            document.body.style.removeProperty('overflow');
        } catch (e) {}

        if (arcadeScreen) {
            arcadeScreen.classList.remove('mobile-fullscreen');
            arcadeScreen.classList.remove('portrait-rotated');

            // Exit native fullscreen if active
            try {
                const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
                if (isFullscreen) {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            } catch (err) {
                console.warn("Exit fullscreen failed:", err);
            }
        }
        
        // Restore desktop iframe sizing properties
        updateGameFrameSize();
        
        // Re-inject responsive styles to restore footer on desktop view
        injectResponsiveStyles();
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

    // Sync state back if user exits native fullscreen manually via device hardware back or swiping
    function handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!isFullscreen && document.body.classList.contains('mobile-play-active')) {
            deactivateMobilePlay();
            const homeTab = document.querySelector('.nav-tab[data-tab="home"]');
            if (homeTab) homeTab.click();
        }
    }

    window.addEventListener('resize', handleMobileOrientation);
    window.addEventListener('orientationchange', handleMobileOrientation);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // 1. TABS SYSTEM
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(targetTab, updateHistory = true) {
        const tab = document.querySelector(`.nav-tab[data-tab="${targetTab}"]`);
        if (!tab) return;

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

        // Clear devlog query/hash from URL when switching tabs if it was present
        if (updateHistory && targetTab !== 'devlogs') {
            if (window.location.hash || window.location.pathname !== '/') {
                history.pushState(null, null, '/');
            }
        }
    }

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            switchTab(targetTab, true);
        });
    });

    // 2. DYNAMIC IFRAME INJECTOR (Solves Unity Build Overwrites!)
    const gameFrame = document.getElementById('game-frame');
    let injectResponsiveStyles = () => {};
    if (gameFrame) {
        injectResponsiveStyles = () => {
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
                    
                    /* Hide footer on smaller viewport / mobile views */
                    @media (max-width: 1024px) {
                        #unity-footer {
                            display: none !important;
                        }
                        #unity-container.unity-desktop #unity-canvas {
                            height: 100% !important;
                        }
                    }
                `;
                doc.head.appendChild(style);

                // Defensive check to hide footer if parent is in mobile play mode
                try {
                    if (window.parent && window.parent.document && window.parent.document.body.classList.contains('mobile-play-active')) {
                        const forceHideStyle = doc.createElement('style');
                        forceHideStyle.id = "force-hide-footer-override";
                        forceHideStyle.textContent = `
                            #unity-footer {
                                display: none !important;
                            }
                            #unity-container.unity-desktop #unity-canvas {
                                height: 100% !important;
                            }
                        `;
                        doc.head.appendChild(forceHideStyle);
                    }
                } catch (e) {
                    console.warn("Could not read parent document state due to origin policy, falling back to CSS media query.", e);
                }

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

        // Restore safe details/summary tags
        escaped = escaped
            .replace(/&lt;details&gt;/g, '<details>')
            .replace(/&lt;\/details&gt;/g, '</details>')
            .replace(/&lt;summary&gt;/g, '<summary>')
            .replace(/&lt;\/summary&gt;/g, '</summary>');

        // Bold: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\"/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italics: *text* or _text_
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');

        // Images: ![alt](url)
        escaped = escaped.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            let resolvedUrl = url;
            if (url.startsWith('../assets/')) {
                resolvedUrl = url.replace('../assets/', 'assets/');
            }
            return `<img src="${resolvedUrl}" alt="${alt}" class="devlog-image">`;
        });

        // Links: [text](url)
        escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Inline Code: `code`
        escaped = escaped.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

        return escaped;
    }

    function parseMarkdown(md) {
        const lines = md.split('\n');
        let html = '';
        let inList = false;
        let inTable = false;
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i]; // Keep original line spacing inside code blocks
            let trimmed = line.trim();

            // Handle Code Block parsing
            if (inCodeBlock) {
                if (trimmed === '```') {
                    html += '</code></pre>';
                    inCodeBlock = false;
                    continue;
                } else {
                    // Escape raw HTML inside code block
                    const escapedLine = line
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    html += escapedLine + '\n';
                    continue;
                }
            }

            // Handle Table parsing
            if (inTable) {
                if (trimmed.startsWith('|')) {
                    const cells = trimmed.split('|').slice(1, -1);
                    html += '<tr>';
                    cells.forEach(c => {
                        html += `<td>${parseInlineMarkdown(c.trim())}</td>`;
                    });
                    html += '</tr>';
                    continue;
                } else {
                    html += '</tbody></table></div>';
                    inTable = false;
                    // Fall through to let the line process normally
                }
            }

            // Skip H1 title header since we pull it out for the accordion header headline
            if (i === 0 && trimmed.startsWith('# ')) {
                continue;
            }

            // Detect Code Block start
            if (trimmed.startsWith('```')) {
                if (inList) { html += '</ul>'; inList = false; }
                if (inTable) { html += '</tbody></table></div>'; inTable = false; }
                const lang = trimmed.substring(3).trim();
                html += `<pre><code class="language-${lang}">`;
                inCodeBlock = true;
                continue;
            }

            // Detect new table start
            if (!inTable && trimmed.startsWith('|') && trimmed.includes('|')) {
                const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
                const isSeparator = nextLine.startsWith('|') && nextLine.includes('-') && /^[|:\s-]+$/.test(nextLine);
                if (isSeparator) {
                    if (inList) { html += '</ul>'; inList = false; }
                    const headers = trimmed.split('|').slice(1, -1);
                    html += '<div class="table-container"><table><thead><tr>';
                    headers.forEach(h => {
                        html += `<th>${parseInlineMarkdown(h.trim())}</th>`;
                    });
                    html += '</tr></thead><tbody>';
                    inTable = true;
                    i++; // Skip the separator line
                    continue;
                }
            }

            // Handle inline HTML blocks (details, summary) directly to avoid wrapping in <p>
            if (trimmed.startsWith('<details') || trimmed.startsWith('</details>') || trimmed.startsWith('<summary')) {
                if (inList) { html += '</ul>'; inList = false; }
                if (inTable) { html += '</tbody></table></div>'; inTable = false; }
                html += parseInlineMarkdown(trimmed);
                continue;
            }

            // Handle Subheadings (##, ###, or ####)
            if (trimmed.startsWith('#### ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h6>${parseInlineMarkdown(trimmed.substring(5))}</h6>`;
                continue;
            }
            if (trimmed.startsWith('### ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h5>${parseInlineMarkdown(trimmed.substring(4))}</h5>`;
                continue;
            }
            if (trimmed.startsWith('## ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h4>${parseInlineMarkdown(trimmed.substring(3))}</h4>`;
                continue;
            }
            if (trimmed.startsWith('# ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h3>${parseInlineMarkdown(trimmed.substring(2))}</h3>`;
                continue;
            }

            // Handle List Items starting with * or -
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                let content = trimmed.substring(2);
                content = parseInlineMarkdown(content);
                html += `<li>${content}</li>`;
                continue;
            }

            // If not a list item, close list if we were in one
            if (inList && trimmed !== '') {
                html += '</ul>';
                inList = false;
            }

            // Handle empty lines (paragraphs separator)
            if (trimmed === '') {
                continue;
            }

            // Standard paragraph
            let content = parseInlineMarkdown(trimmed);
            html += `<p>${content}</p>`;
        }

        if (inTable) {
            html += '</tbody></table></div>';
        }

        if (inCodeBlock) {
            html += '</code></pre>';
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

    let devlogsCache = [];

    function getDevlogId(filePath) {
        const parts = filePath.split('/');
        const fileName = parts[parts.length - 1];
        return fileName.replace(/\.md$/, '');
    }

    function getTargetDevlogFromUrl() {
        // 1. Check hash first (useful for local files / fallbacks)
        const hash = window.location.hash;
        if (hash) {
            const cleanedHash = hash.replace(/^#\/?/, '');
            const finalHash = cleanedHash.replace(/^devlog\//, '');
            if (finalHash) return finalHash;
        }

        // 2. Check pathname for clean URLs on Vercel
        const pathname = window.location.pathname;
        if (pathname && pathname !== '/') {
            const cleanedPath = pathname.replace(/^\/|\/$/g, '');
            const finalPath = cleanedPath.replace(/^devlog\//, '');
            if (finalPath) return finalPath;
        }

        return null;
    }

    function navigateToDevlog(devlogId) {
        if (window.location.protocol === 'file:') {
            history.pushState(null, null, `#${devlogId}`);
        } else {
            history.pushState(null, null, `/${devlogId}`);
        }
        handleRouting();
    }

    function navigateToHome() {
        if (window.location.protocol === 'file:') {
            history.pushState(null, null, '#');
        } else {
            history.pushState(null, null, '/');
        }
        handleRouting();
    }

    function handleRouting() {
        const portalView = document.getElementById('portal-view');
        const readerView = document.getElementById('reader-view');
        const targetId = getTargetDevlogFromUrl();

        if (targetId) {
            // Find in cache
            const devlog = devlogsCache.find(log => getDevlogId(log.file) === targetId);
            if (devlog) {
                // Render the devlog content
                const title = extractHeadline(devlog.content);
                const parsedBody = parseMarkdown(devlog.content);
                
                document.getElementById('reader-title').textContent = title;
                document.getElementById('reader-meta').textContent = `Posted by: ${devlog.author} | Date: ${devlog.date}`;
                
                const tagsContainer = document.getElementById('reader-tags');
                tagsContainer.innerHTML = '';
                if (devlog.tags && Array.isArray(devlog.tags)) {
                    devlog.tags.forEach((tag, idx) => {
                        const tagEl = document.createElement('span');
                        tagEl.className = devlog.featured && idx === 0 ? 'tag-badge featured' : 'tag-badge';
                        tagEl.textContent = tag;
                        tagsContainer.appendChild(tagEl);
                    });
                }
                
                document.getElementById('reader-body').innerHTML = parsedBody;
                
                // Add copy buttons to details elements
                const detailsElements = document.querySelectorAll('#reader-body details');
                detailsElements.forEach(details => {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.textContent = 'COPY';
                    
                    copyBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Extract code text if a block is inside, else fall back to details innerText
                        const codeElement = details.querySelector('pre code');
                        const textToCopy = codeElement ? codeElement.textContent : details.innerText.replace('COPY', '').trim();
                        
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            copyBtn.textContent = 'COPIED!';
                            copyBtn.classList.add('copied');
                            setTimeout(() => {
                                copyBtn.textContent = 'COPY';
                                copyBtn.classList.remove('copied');
                            }, 2000);
                        }).catch(err => {
                            console.error('Could not copy text: ', err);
                            copyBtn.textContent = 'ERROR';
                        });
                    });
                    
                    details.appendChild(copyBtn);
                });
                
                // Toggle view display
                if (portalView) portalView.style.display = 'none';
                if (readerView) readerView.style.display = 'block';
                
                // Scroll to top of the reading page
                window.scrollTo(0, 0);
            } else {
                console.warn(`Devlog with id ${targetId} not loaded in cache yet.`);
            }
        } else {
            // Show portal, hide reader
            if (portalView) portalView.style.display = '';
            if (readerView) readerView.style.display = 'none';
            
            // Make sure we are on the devlogs tab if we navigated back
            const activeTab = document.querySelector('.nav-tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'devlogs') {
                switchTab('devlogs', false);
            }
        }
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
                    return null;
                }
            });

            // Wait for all and filter out failed files
            const loadedLogs = (await Promise.all(fetchPromises)).filter(log => log !== null);
            devlogsCache = loadedLogs;

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
                const devlogId = getDevlogId(log.file);

                // Create clickable Card instead of accordion
                const card = document.createElement('div');
                card.className = 'devlog-card';
                card.id = `devlog-card-${devlogId}`;

                const cardHeader = document.createElement('div');
                cardHeader.className = 'devlog-card-header';

                const titleEl = document.createElement('h3');
                titleEl.className = 'devlog-card-title';
                titleEl.textContent = title;

                const dateEl = document.createElement('span');
                dateEl.className = 'devlog-card-date';
                dateEl.textContent = log.date;

                cardHeader.appendChild(titleEl);
                cardHeader.appendChild(dateEl);

                const metaEl = document.createElement('div');
                metaEl.className = 'devlog-card-meta';
                metaEl.textContent = `By ${log.author}`;

                const tagsEl = document.createElement('div');
                tagsEl.className = 'devlog-card-tags';

                if (log.tags && Array.isArray(log.tags)) {
                    log.tags.forEach((tag, idx) => {
                        const tagEl = document.createElement('span');
                        tagEl.className = log.featured && idx === 0 ? 'tag-badge featured' : 'tag-badge';
                        tagEl.textContent = tag;
                        tagsEl.appendChild(tagEl);
                    });
                }

                card.appendChild(cardHeader);
                card.appendChild(metaEl);
                card.appendChild(tagsEl);

                card.addEventListener('click', () => {
                    navigateToDevlog(devlogId);
                });

                devlogListContainer.appendChild(card);
            });

            // Initial run of routing once logs are loaded
            handleRouting();

        } catch (error) {
            devlogListContainer.innerHTML = `
                <div style="font-family: monospace; text-align: center; color: #ff3333; padding: 30px;">
                    [ CHRONOS-DATABASE OFFLINE / CONNECTION FAILED ]
                </div>
            `;
            console.error("Critical error building devlog timeline", error);
        }
    }

    // Set up back button listener
    const backHomeBtn = document.getElementById('back-home-btn');
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            navigateToHome();
        });
    }

    // Set up router events
    window.addEventListener('popstate', handleRouting);
    window.addEventListener('hashchange', handleRouting);

    loadDevlogs();
});
