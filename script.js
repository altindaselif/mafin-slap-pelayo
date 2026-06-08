(() => {
  /* --- FIREBASE SETUP --- */
  const firebaseConfig = {
    apiKey: "AIzaSyA014kNYIzYgs_2jywkE-V1n2fS-udM8Zc",
    authDomain: "mafin-slap-pelayo.firebaseapp.com",
    databaseURL:
      "https://mafin-slap-pelayo-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "mafin-slap-pelayo",
    storageBucket: "mafin-slap-pelayo.firebasestorage.app",
    messagingSenderId: "340769516489",
    appId: "1:340769516489:web:11db5461326f7ea47a1618",
    measurementId: "G-JLTDDGNS0J",
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const analytics = firebase.analytics();

  firebase
    .appCheck()
    .activate(
      new firebase.appCheck.ReCaptchaEnterpriseProvider(
        "6LfUeK8sAAAAADIyIcZ658v3ogfWE9U6YQpR5DzT",
      ),
      true,
    );

  const database = firebase.database();
  const countrySlapsRef = database.ref("country_slaps_v3");
  const globalSlapRef = database.ref("global_slaps");

  /* --- APP CONFIGURATION --- */
  const CONFIG = {
    MAX_SLAPS_FOR_BAR: 100,
    GHOST_ENCOURAGE_AT: 50,
    GHOST_FLY_AT: 100,
    QUOTE_START_AT: 150,
    QUOTE_INTERVAL: 50,
    PAGE_SIZE: 5,
  };

  /* --- DOM ELEMENTS --- */
  const btnEn = document.querySelector(".en-button");
  const btnEs = document.querySelector(".es-button");
  const btnPt = document.querySelector(".pt-button");
  const translatableElements = document.querySelectorAll("[data-i18n]");
  const slapButton = document.querySelector(".slap-button");
  const slapVideo = document.querySelector(".slap-video");
  const currentSlapsEl = document.querySelector(".current-slaps");
  const localTotalSlapsEl = document.querySelector(".local-total-slaps");
  const globalTotalSlapsEl = document.querySelector(".global-total-slaps");
  const ghost = document.querySelector(".ghost-img");
  const bubble = document.querySelector(".speech-bubble");
  const videoModal = document.querySelector(".video-modal");
  const closeModalBtn = document.querySelector(".close-modal-button");
  const popupVideo = document.querySelector(".popup-video");
  const videoQuoteText = document.querySelector(".video-quote-text");
  const evilContainer = document.querySelector(".evil-container");
  const flipContainer = document.querySelector(".stats-flip-container");
  const flipBtn = document.querySelector(".flip-button");
  const userCountryDataEl = document.querySelector(".user-country-data");
  const userCountryScoreEl = document.querySelector(".user-country-score");
  const countEl = document.querySelector(".ghost-click-count");
  const progressFillEl = document.querySelector(".ghost-progress-fill");
  const svContainer = document.querySelector(".sv-container");
  const svImages = document.querySelectorAll(".sv-photo-img");

  /* --- APP STATE --- */
  let currentQuoteData = null;
  let hasGhostPeeked = false;
  let currentSlaps = 0;
  let regularQuoteIndex = 0;
  let userCountryCode = "XX";
  let pendingSlaps = 0;
  let isCountryLoading = true;
  let latestCountrySnapshot = null;
  let currentPage = 0;
  let sortedCountries = [];
  let lastSlapTime = 0;
  let hasCelebrated = false;

  let savedCountry = localStorage.getItem("mafin_user_country");
  if (savedCountry && savedCountry !== "XX") {
    userCountryCode = savedCountry;
    isCountryLoading = false;
  }

  let localTotalSlaps = localStorage.getItem("mafin_local_slaps")
    ? parseInt(localStorage.getItem("mafin_local_slaps")) || 0
    : 0;
  if (localTotalSlapsEl)
    localTotalSlapsEl.textContent = localTotalSlaps.toLocaleString();
  if (userCountryDataEl)
    userCountryDataEl.textContent = translations[getCurrentLang()]["loading"];

  /* --- HELPER FUNCTIONS --- */
  function getCurrentLang() {
    if (btnEn && btnEn.classList.contains("active")) return "en";
    if (btnPt && btnPt.classList.contains("active")) return "pt";
    return "es";
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function getFullCountryName(code, lang) {
    if (code === "XX" || !code) return translations[lang]["unknown"];
    try {
      const locale = lang === "pt" ? "pt-BR" : lang;
      const regionNames = new Intl.DisplayNames([locale], { type: "region" });
      return regionNames.of(code);
    } catch (e) {
      return code;
    }
  }

  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === "XX") return "🌍";
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(char.charCodeAt(0) + 127397),
      );
  }

  const GEO_APIS = [
    () =>
      fetch("https://1.1.1.1/cdn-cgi/trace")
        .then((r) => r.text())
        .then((d) => {
          const loc = d.split("\n").find((l) => l.startsWith("loc="));
          return loc ? loc.split("=")[1] : null;
        }),
    () =>
      fetch("https://ipapi.co/country/").then((r) => (r.ok ? r.text() : null)),
    () =>
      fetch("https://api.country.is/")
        .then((r) => r.json())
        .then((d) => d.country),
    () =>
      fetch("https://freeipapi.com/api/json")
        .then((r) => r.json())
        .then((d) => d.countryCode),
  ];

  async function detectCountry() {
    if (!isCountryLoading) return;

    const lang = getCurrentLang();

    for (const api of GEO_APIS) {
      try {
        const code = await api();
        if (code && code.trim().length === 2) {
          userCountryCode = code.trim();
          break;
        }
      } catch (e) {
        continue;
      }
    }

    isCountryLoading = false;

    if (userCountryCode !== "XX") {
      localStorage.setItem("mafin_user_country", userCountryCode);
    } else if (userCountryDataEl) {
      userCountryDataEl.textContent = translations[lang]["location-error"];
    }

    if (pendingSlaps > 0 && userCountryCode !== "XX") {
      countrySlapsRef
        .child(userCountryCode)
        .transaction((v) => (v || 0) + pendingSlaps);
      pendingSlaps = 0;
    }

    if (latestCountrySnapshot) {
      renderTop5(latestCountrySnapshot);
    }
  }

  /* --- UI RENDERERS --- */
  function setLanguage(lang) {
    if (btnEn) btnEn.classList.toggle("active", lang === "en");
    if (btnEs) btnEs.classList.toggle("active", lang === "es");
    if (btnPt) btnPt.classList.toggle("active", lang === "pt");

    translatableElements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && translations[lang] && translations[lang][key]) {
        el.innerHTML = translations[lang][key];
      }
    });

    if (latestCountrySnapshot) {
      renderTop5(latestCountrySnapshot);
    }

    if (currentQuoteData) renderQuoteInBubble(lang);
  }

  function triggerWinnerCelebration(winnerCode) {
    const lang = getCurrentLang();
    const winnerName = getFullCountryName(winnerCode, lang);
    const flag = getFlagEmoji(winnerCode);

    let text = `¡Felicidades<br>${flag} ${winnerName}!`;
    if (lang === "en") text = `Congratulations<br>${flag} ${winnerName}!`;
    if (lang === "pt") text = `Parabéns<br>${flag} ${winnerName}!`;

    const announcement = document.createElement("div");
    announcement.classList.add("winner-announcement");
    announcement.innerHTML = text;
    document.body.appendChild(announcement);

    if (window.confetti) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }

    setTimeout(() => {
      if (announcement) announcement.remove();
    }, 4000);
  }

  function renderTop5(snapshot) {
    latestCountrySnapshot = snapshot;
    const data = snapshot.val();
    const lang = getCurrentLang();
    if (!data) return;

    sortedCountries = Object.entries(data)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    if (!hasCelebrated && sortedCountries.length > 0) {
      triggerWinnerCelebration(sortedCountries[0].code);
      hasCelebrated = true;
    }

    if (userCountryCode !== "XX") {
      const fullName = getFullCountryName(userCountryCode, lang);
      const flag = getFlagEmoji(userCountryCode);
      const score = data[userCountryCode] || 0;
      if (userCountryDataEl)
        userCountryDataEl.textContent = `${flag} ${fullName}`;
      if (userCountryScoreEl)
        userCountryScoreEl.textContent = score.toLocaleString();
    }

    renderPage();
  }

  function renderPage() {
    const lang = getCurrentLang();
    const totalPages = Math.ceil(sortedCountries.length / CONFIG.PAGE_SIZE);
    const pageItems = sortedCountries.slice(
      currentPage * CONFIG.PAGE_SIZE,
      currentPage * CONFIG.PAGE_SIZE + CONFIG.PAGE_SIZE,
    );

    const medals = ["🥇", "🥈", "🥉"];

    pageItems.forEach((item, index) => {
      const globalIndex = currentPage * CONFIG.PAGE_SIZE + index;
      const li = document.querySelector(`#top-rank-${index + 1}`);

      if (li) {
        li.classList.remove("is-empty");
        const medal =
          medals[globalIndex] !== undefined
            ? medals[globalIndex]
            : `${globalIndex + 1}.`;
        li.querySelector("span:first-child").textContent = medal;
        li.querySelector(".rank-country").textContent = `${getFlagEmoji(
          item.code,
        )} ${getFullCountryName(item.code, lang)}`;

        li.querySelector(".rank-count").textContent =
          item.count.toLocaleString();
      }
    });

    for (let i = pageItems.length; i < CONFIG.PAGE_SIZE; i++) {
      const li = document.querySelector(`#top-rank-${i + 1}`);
      if (!li) continue;
      li.querySelector("span:first-child").textContent = "";
      li.querySelector(".rank-country").textContent = "";
      li.querySelector(".rank-count").textContent = "";
      li.classList.add("is-empty");
    }

    const prevBtn = document.querySelector(".prev-button");
    const nextBtn = document.querySelector(".next-button");
    const indicator = document.querySelector(".page-indicator");

    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
    if (indicator) indicator.textContent = `${currentPage + 1} / ${totalPages}`;
  }

  function triggerHeartExplosion() {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const heart = document.createElement("div");
        heart.classList.add("flying-heart");
        heart.innerHTML = "❤️";
        const rx = 50 + (Math.random() - 0.5) * 100;
        const ry = 80 + (Math.random() - 0.5) * 100;
        heart.style.left = rx + "px";
        heart.style.top = ry + "px";
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 2500);
      }, i * 120);
    }
  }

  function renderQuoteInBubble(lang) {
    if (!bubble) return;
    bubble.removeAttribute("data-i18n");
    bubble.classList.add("quote-mode");
    bubble.innerHTML = `<div class="quote-content">${currentQuoteData[lang]}<br>
      <button class="bubble-play-button">▶ Play Clip</button></div>`;
    if (currentQuoteData.isMarta) triggerHeartExplosion();
  }

  function openVideoModal() {
    if (!currentQuoteData) return;
    const lang = getCurrentLang();
    if (videoQuoteText)
      videoQuoteText.innerHTML = currentQuoteData.isMarta
        ? currentQuoteData[lang]
        : `"${currentQuoteData[lang]}"`;
    if (popupVideo) {
      popupVideo.src = currentQuoteData.videoSrc;
      popupVideo.play();
    }
    if (slapVideo) slapVideo.muted = true;
    if (videoModal) videoModal.classList.add("show");
    if (bubble) bubble.classList.add("is-hidden");
  }

  /* --- GAME LOGIC --- */
  function updateCounters() {
    currentSlaps++;
    localTotalSlaps++;

    if (currentSlapsEl)
      currentSlapsEl.textContent = currentSlaps.toLocaleString();
    if (localTotalSlapsEl)
      localTotalSlapsEl.textContent = localTotalSlaps.toLocaleString();
    localStorage.setItem("mafin_local_slaps", localTotalSlaps);

    if (isCountryLoading) {
      pendingSlaps++;
    } else if (userCountryCode !== "XX") {
      countrySlapsRef.child(userCountryCode).transaction((v) => (v || 0) + 1);
    }

    globalSlapRef.transaction((v) => (v || 0) + 1);
  }
  function updateProgressBar() {
    let slapsLeft = CONFIG.MAX_SLAPS_FOR_BAR - currentSlaps;
    if (slapsLeft < 0) slapsLeft = 0;
    if (countEl) countEl.textContent = slapsLeft;
    if (progressFillEl) progressFillEl.style.width = slapsLeft + "%";
  }

  function checkGhostMilestones() {
    if (!ghost) return;
    if (!hasGhostPeeked) {
      ghost.classList.add("ghost-peek");
      if (bubble) bubble.classList.add("show-bubble");
      hasGhostPeeked = true;
    }
    if (currentSlaps === CONFIG.GHOST_ENCOURAGE_AT && bubble) {
      bubble.setAttribute("data-i18n", "bubble-encourage");
      setLanguage(getCurrentLang());
      bubble.classList.remove("show-bubble");
      void bubble.offsetWidth;
      bubble.classList.add("show-bubble");
    }
    if (
      currentSlaps === CONFIG.GHOST_FLY_AT &&
      !ghost.classList.contains("ghost-fly")
    ) {
      if (bubble) bubble.classList.add("d-none");
      const r = ghost.getBoundingClientRect();
      ghost.classList.add("ghost-ready-to-fly");
      ghost.style.top = r.top + "px";
      ghost.style.left = r.left + "px";
      ghost.style.setProperty("--target-x", 20 - r.left + "px");
      ghost.style.setProperty("--target-y", 20 - r.top + "px");
      ghost.classList.remove("ghost-peek");
      void ghost.offsetWidth;
      ghost.classList.add("ghost-fly");
    }
  }

  function checkVideoMilestones() {
    if (currentSlaps === 500) {
      currentQuoteData = martaVIPQuote;
      renderQuoteInBubble(getCurrentLang());
      return;
    }
    if (
      currentSlaps >= CONFIG.QUOTE_START_AT &&
      (currentSlaps - CONFIG.QUOTE_START_AT) % CONFIG.QUOTE_INTERVAL === 0
    ) {
      if (regularQuoteIndex < mafinQuotes.length) {
        currentQuoteData = mafinQuotes[regularQuoteIndex];
        regularQuoteIndex++;
        renderQuoteInBubble(getCurrentLang());
      }
    }
  }

  /* --- EVENT LISTENERS --- */
  if (btnEn) btnEn.addEventListener("click", () => setLanguage("en"));
  if (btnEs) btnEs.addEventListener("click", () => setLanguage("es"));
  if (btnPt) btnPt.addEventListener("click", () => setLanguage("pt"));

  if (slapButton) {
    slapButton.addEventListener("click", (e) => {
      if (!e.isTrusted) return;

      let currentTime = new Date().getTime();
      if (currentTime - lastSlapTime < 100) return;

      lastSlapTime = currentTime;

      if (slapVideo) {
        slapVideo.currentTime = 0;
        slapVideo.play();
      }
      updateCounters();
      updateProgressBar();
      checkGhostMilestones();
      checkVideoMilestones();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (videoModal) videoModal.classList.remove("show");
      if (popupVideo) {
        popupVideo.pause();
        popupVideo.src = "";
        popupVideo.load();
      }
      if (slapVideo) slapVideo.muted = false;
      if (bubble) bubble.classList.remove("is-hidden");
    });
  }

  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      const isFlipped = flipContainer.classList.toggle("flipped");
      flipBtn.textContent = isFlipped ? "🔙" : "🏆";
    });
  }

  if (ghost) {
    ghost.addEventListener("animationend", (e) => {
      if (e.animationName === "flyToVideo") {
        bubble.setAttribute("data-i18n", "bubble-back");
        setLanguage(getCurrentLang());
        bubble.classList.remove("d-none");
        bubble.classList.add("bubble-fixed-top");
        void bubble.offsetWidth;
        bubble.classList.add("show-bubble");
      }
    });
  }

  if (evilContainer) {
    evilContainer.addEventListener("click", () => {
      if (window.innerWidth <= 950) {
        evilContainer.classList.toggle("evil-hide");
      }
    });
  }

  document.querySelector(".prev-button")?.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      renderPage();
    }
  });

  document.querySelector(".next-button")?.addEventListener("click", () => {
    const totalPages = Math.ceil(sortedCountries.length / CONFIG.PAGE_SIZE);
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderPage();
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("bubble-play-button")) openVideoModal();
  });

  /* --- INIT --- */
  shuffleArray(mafinQuotes);
  setLanguage("es");

  globalSlapRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data !== null && globalTotalSlapsEl) {
      globalTotalSlapsEl.textContent = data.toLocaleString();
    }
  });

  detectCountry().then(() => {
    countrySlapsRef.on("value", renderTop5);
  });

  setTimeout(() => {
    if (evilContainer) evilContainer.classList.add("evil-enter");
  }, 500);
})();
