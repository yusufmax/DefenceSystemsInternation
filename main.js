import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");
  let currentLang = "uz"; // Default is Uzbek 'uz'
  
  if (urlLang && ["uz", "en"].includes(urlLang)) {
    currentLang = urlLang;
    localStorage.setItem("dsi_lang", urlLang);
  } else {
    currentLang = localStorage.getItem("dsi_lang") || "uz";
  }
  
  // --- DOM ELEMENTS ---
  const header = document.querySelector(".header-bar");
  const logoWrapper = document.querySelector(".logo-icon-wrapper");
  const heroWatermark = document.querySelector(".hero-watermark");
  
  const navMenu = document.querySelector(".nav-menu");
  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const navLinks = document.querySelectorAll(".nav-link");
  const langBtns = document.querySelectorAll(".lang-btn");
  
  const contactForm = document.getElementById("dsi-contact-form");
  const formSubmitBtn = contactForm.querySelector("button[type='submit']");
  const formNotification = document.getElementById("form-notification");

  // --- INITIALIZATION ---
  initLanguage();
  initMap();
  initLocationMap();
  triggerOnLoadAnimations();
  initScrollAnimations();

  // --- STICKY HEADER & ACTIVE SECTIONS ---
  window.addEventListener("scroll", () => {
    // Add scrolled class to header
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }

    // Scroll active link highlight
    let currentSectionId = "";
    const sections = document.querySelectorAll("section");
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSectionId}`) {
        link.classList.add("active");
      }
    });
  });

  // --- MOBILE DRAWER TOGGLE ---
  mobileToggle.addEventListener("click", () => {
    mobileToggle.classList.toggle("active");
    navMenu.classList.toggle("active");
  });

  // Close mobile menu when clicking nav link
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      mobileToggle.classList.remove("active");
      navMenu.classList.remove("active");
    });
  });

  // --- ON LOAD ANIMATIONS ---
  function triggerOnLoadAnimations() {
    // Animate logo sweep on load
    if (logoWrapper) {
      logoWrapper.classList.add("animate-sweep");
    }
    // Animate watermark sweep on load
    if (heroWatermark) {
      setTimeout(() => {
        heroWatermark.classList.add("sweep");
      }, 300);
    }
  }

  // --- SCROLL REVEAL ANIMATIONS ---
  function initScrollAnimations() {
    const revealElements = document.querySelectorAll(
      "section, .facts-card, .product-card, .trust-card, .process-step, .contact-info, .contact-form-wrapper"
    );
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: "0px 0px -40px 0px"
    });

    revealElements.forEach(elem => {
      revealObserver.observe(elem);
    });
  }

  // --- LANGUAGE SWITCHER LOGIC ---
  function initLanguage() {
    // Set active language switcher button state
    langBtns.forEach(btn => {
      btn.classList.remove("active");
      if (btn.getAttribute("data-lang") === currentLang) {
        btn.classList.add("active");
      }
    });

    // Translate page content
    translatePage();

    // Bind event listeners to language switcher buttons
    langBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const selectedLang = e.target.getAttribute("data-lang");
        if (selectedLang !== currentLang) {
          currentLang = selectedLang;
          localStorage.setItem("dsi_lang", currentLang);
          
          // Toggle active class on buttons
          langBtns.forEach(b => b.classList.remove("active"));
          e.target.classList.add("active");

          // Translate page content
          translatePage();
        }
      });
    });
  }

  function translatePage() {
    const copy = window.translations[currentLang];
    if (!copy) return;

    // Translate all elements with data-translate attribute
    const elementsToTranslate = document.querySelectorAll("[data-translate]");
    elementsToTranslate.forEach(elem => {
      const key = elem.getAttribute("data-translate");
      if (copy[key]) {
        // Handle input placeholders specifically
        if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA") {
          elem.setAttribute("placeholder", copy[key]);
        } else {
          elem.innerHTML = copy[key];
        }
      }
    });

    // Also update HTML lang attribute
    document.documentElement.setAttribute("lang", currentLang);
  }

  // --- INTERACTIVE D3 WIREFRAME DOTTED GLOBE FOCUSED ON UZBEKISTAN ---
  function initMap() {
    const container = document.getElementById("cobe-globe-container");
    const canvas = document.getElementById("cobe-globe-canvas");
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Resolve dimensions
    const containerWidth = container.offsetWidth || 280;
    const containerHeight = container.offsetHeight || 280;
    const baseRadius = Math.min(containerWidth, containerHeight) / 2.3;

    // HiDPI canvas setup
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    // D3 orthographic projection centered on Uzbekistan
    const projection = d3.geoOrthographic()
      .scale(baseRadius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)
      .rotate([-64.59, -41.38]);

    const path = d3.geoPath().projection(projection).context(context);

    // State
    let countries = null;
    let uzbekistan = null;
    const uzbekDots = [];
    let rotation = [64.59, 41.38]; // [lambda, phi]
    let autoRotate = true;
    const rotationSpeed = 0.12;
    let pulsePhase = 0;
    let pointerDown = null;
    let fallbackTriggered = false;

    // --- Point-in-polygon (winding number) ---
    function pointInRing(point, ring) {
      const [px, py] = point;
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    }

    function pointInFeature(point, feature) {
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        if (!pointInRing(point, geom.coordinates[0])) return false;
        for (let i = 1; i < geom.coordinates.length; i++) {
          if (pointInRing(point, geom.coordinates[i])) return false;
        }
        return true;
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          if (pointInRing(point, poly[0])) {
            let inHole = false;
            for (let i = 1; i < poly.length; i++) {
              if (pointInRing(point, poly[i])) { inHole = true; break; }
            }
            if (!inHole) return true;
          }
        }
      }
      return false;
    }

    function generateDots(feature, stepDeg) {
      const dots = [];
      const [[minLng, minLat], [maxLng, maxLat]] = d3.geoBounds(feature);
      for (let lng = minLng; lng <= maxLng; lng += stepDeg) {
        for (let lat = minLat; lat <= maxLat; lat += stepDeg) {
          if (pointInFeature([lng, lat], feature)) {
            dots.push([lng, lat]);
          }
        }
      }
      return dots;
    }

    // --- SVG Fallback (same as before) ---
    function showFallbackMap() {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      if (canvas) canvas.style.display = "none";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 60");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.opacity = "0.95";

      const border = document.createElementNS("http://www.w3.org/2000/svg", "path");
      border.setAttribute("d", "M 8,10 L 25,7 L 40,8 L 52,15 L 68,14 L 75,20 L 84,18 L 94,22 L 95,28 L 88,32 L 80,30 L 76,27 L 70,30 L 67,42 L 60,40 L 52,48 L 40,43 L 30,42 L 15,35 Z");
      border.setAttribute("fill", "rgba(182, 138, 60, 0.04)");
      border.setAttribute("stroke", "rgba(182, 138, 60, 0.2)");
      border.setAttribute("stroke-width", "0.5");
      svg.appendChild(border);

      const hqRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hqRing.setAttribute("cx", "74.7"); hqRing.setAttribute("cy", "31.2");
      hqRing.setAttribute("r", "5"); hqRing.setAttribute("fill", "none");
      hqRing.setAttribute("stroke", "#b68a3c"); hqRing.setAttribute("stroke-width", "0.75");
      const animR = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animR.setAttribute("attributeName", "r"); animR.setAttribute("values", "2;10;2");
      animR.setAttribute("dur", "2s"); animR.setAttribute("repeatCount", "indefinite");
      hqRing.appendChild(animR);
      const animO = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animO.setAttribute("attributeName", "opacity"); animO.setAttribute("values", "1;0;1");
      animO.setAttribute("dur", "2s"); animO.setAttribute("repeatCount", "indefinite");
      hqRing.appendChild(animO);
      svg.appendChild(hqRing);

      const hqDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hqDot.setAttribute("cx", "74.7"); hqDot.setAttribute("cy", "31.2");
      hqDot.setAttribute("r", "2"); hqDot.setAttribute("fill", "#b68a3c");
      svg.appendChild(hqDot);

      container.appendChild(svg);
    }

    // --- Canvas render loop ---
    function render() {
      context.clearRect(0, 0, containerWidth, containerHeight);
      const s = projection.scale();
      const sf = s / baseRadius;
      const cx = containerWidth / 2;
      const cy = containerHeight / 2;

      // Gold atmosphere glow
      const glow = context.createRadialGradient(cx, cy, s * 0.92, cx, cy, s * 1.35);
      glow.addColorStop(0, "rgba(182, 138, 60, 0.07)");
      glow.addColorStop(1, "rgba(182, 138, 60, 0)");
      context.beginPath();
      context.arc(cx, cy, s * 1.35, 0, 2 * Math.PI);
      context.fillStyle = glow;
      context.fill();

      // Globe background sphere
      context.beginPath();
      context.arc(cx, cy, s, 0, 2 * Math.PI);
      context.fillStyle = "#0a0a09";
      context.fill();
      context.strokeStyle = "rgba(182, 138, 60, 0.22)";
      context.lineWidth = 1.2 * sf;
      context.stroke();

      if (!countries) return;

      // Graticule grid
      context.beginPath();
      path(d3.geoGraticule()());
      context.strokeStyle = "rgba(255, 255, 255, 0.06)";
      context.lineWidth = 0.4 * sf;
      context.stroke();

      // All country outlines (wireframe)
      context.beginPath();
      countries.features.forEach(f => path(f));
      context.strokeStyle = "rgba(255, 255, 255, 0.14)";
      context.lineWidth = 0.4 * sf;
      context.stroke();

      // Uzbekistan highlighted outline
      if (uzbekistan) {
        context.beginPath();
        path(uzbekistan);
        context.strokeStyle = "rgba(182, 138, 60, 0.55)";
        context.lineWidth = 1.4 * sf;
        context.stroke();
      }

      // Uzbekistan territory dots (gold)
      uzbekDots.forEach(([lng, lat]) => {
        const p = projection([lng, lat]);
        if (p) {
          context.beginPath();
          context.arc(p[0], p[1], 1.15 * sf, 0, 2 * Math.PI);
          context.fillStyle = "rgba(182, 138, 60, 0.82)";
          context.fill();
        }
      });

      // Tashkent HQ pulsing marker
      pulsePhase += 0.04;
      const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);
      const tashkent = projection([69.2401, 41.2995]);
      if (tashkent) {
        // Pulsing ring
        const ringR = (3.5 + pulse * 4) * sf;
        context.beginPath();
        context.arc(tashkent[0], tashkent[1], ringR, 0, 2 * Math.PI);
        context.strokeStyle = `rgba(182, 138, 60, ${0.55 - pulse * 0.45})`;
        context.lineWidth = 0.8 * sf;
        context.stroke();

        // Inner glow
        context.beginPath();
        context.arc(tashkent[0], tashkent[1], 5 * sf, 0, 2 * Math.PI);
        context.fillStyle = "rgba(182, 138, 60, 0.08)";
        context.fill();

        // Center dot
        context.beginPath();
        context.arc(tashkent[0], tashkent[1], 2 * sf, 0, 2 * Math.PI);
        context.fillStyle = "#b68a3c";
        context.fill();
      }
    }

    // --- Load world data ---
    async function loadData() {
      try {
        const resp = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const world = await resp.json();

        countries = topojson.feature(world, world.objects.countries);

        // Find Uzbekistan (ISO 3166-1 numeric: 860)
        uzbekistan = countries.features.find(f => f.id === "860");

        if (uzbekistan) {
          const dots = generateDots(uzbekistan, 0.7);
          dots.forEach(d => uzbekDots.push(d));
        }

        canvas.style.opacity = "1";
        render();
      } catch (err) {
        console.error("Globe data load failed:", err);
        showFallbackMap();
      }
    }

    // --- Auto-rotation ---
    const timer = d3.timer(() => {
      if (autoRotate) {
        rotation[0] += rotationSpeed;
        projection.rotate([-rotation[0], -rotation[1]]);
        render();
      } else {
        render(); // still render for pulse animation
      }
    });

    // --- Pointer drag interaction ---
    canvas.addEventListener("pointerdown", (e) => {
      autoRotate = false;
      pointerDown = { x: e.clientX, y: e.clientY, rot: [...rotation] };
      canvas.style.cursor = "grabbing";
    });

    window.addEventListener("pointermove", (e) => {
      if (!pointerDown) return;
      const sens = 0.35;
      rotation[0] = pointerDown.rot[0] - (e.clientX - pointerDown.x) * sens;
      rotation[1] = pointerDown.rot[1] + (e.clientY - pointerDown.y) * sens;
      rotation[1] = Math.max(-90, Math.min(90, rotation[1]));
      projection.rotate([-rotation[0], -rotation[1]]);
      render();
    }, { passive: true });

    window.addEventListener("pointerup", () => {
      if (pointerDown) {
        pointerDown = null;
        canvas.style.cursor = "grab";
        setTimeout(() => { autoRotate = true; }, 20);
      }
    });

    // --- Scroll-to-zoom ---
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(baseRadius * 0.6, Math.min(baseRadius * 3, projection.scale() * factor));
      projection.scale(newScale);
      render();
    }, { passive: false });

    loadData();
  }

  // --- EXPANDABLE LOCATION MAP CARD ---
  function initLocationMap() {
    const card = document.getElementById("location-map");
    if (!card) return;

    const inner = card.querySelector(".location-map-inner");
    if (!inner) return;

    // Toggle expand/collapse on click
    card.addEventListener("click", (e) => {
      // If expanded and clicking, open Google Maps
      if (card.classList.contains("expanded")) {
        window.open("https://maps.google.com/?q=41.3775,69.2401", "_blank");
        return;
      }
      card.classList.toggle("expanded");
    });

    // 3D perspective tilt on mouse move
    card.addEventListener("mousemove", (e) => {
      const rect = inner.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      inner.style.transform = `perspective(800px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg)`;
    });

    // Reset tilt on mouse leave
    card.addEventListener("mouseleave", () => {
      inner.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
    });

    // Collapse when clicking outside
    document.addEventListener("click", (e) => {
      if (!card.contains(e.target) && card.classList.contains("expanded")) {
        card.classList.remove("expanded");
      }
    });
  }

  // --- CONTACT FORM SUBMISSION WITH VALIDATION ---
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Clear notifications
      formNotification.style.display = "none";
      formNotification.className = "form-notification";

      // Form validation
      const name = document.getElementById("form-input-name").value.trim();
      const org = document.getElementById("form-input-org").value.trim();
      const country = document.getElementById("form-input-country").value.trim();
      const req = document.getElementById("form-input-req").value.trim();
      const msg = document.getElementById("form-input-msg").value.trim();

      const copy = window.translations[currentLang];

      if (!name || !org || !country || !req) {
        showFormNotification(copy.form_error || "Please fill in all required fields.", "error");
        return;
      }

      // Show sending state
      formSubmitBtn.disabled = true;
      const originalBtnText = formSubmitBtn.innerHTML;
      formSubmitBtn.innerHTML = `<span class="spinner"></span> ${copy.form_sending}`;

      // Simulate API post (B2B email routing simulation)
      setTimeout(() => {
        // Success state
        showFormNotification(copy.form_success, "success");
        contactForm.reset();
        
        // Restore button state
        formSubmitBtn.disabled = false;
        formSubmitBtn.innerHTML = originalBtnText;

        // Auto fade out notification after 8 seconds
        setTimeout(() => {
          formNotification.style.display = "none";
        }, 8000);
      }, 1500);
    });
  }

  function showFormNotification(message, type) {
    formNotification.innerHTML = message;
    formNotification.style.display = "block";
    formNotification.classList.add(type);
    
    // Smooth scroll to notification if B2B form is large
    formNotification.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});
