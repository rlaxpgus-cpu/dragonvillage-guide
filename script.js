const noticeTrack = document.getElementById("noticeTrack");
const noticeDots = document.getElementById("noticeDots");
const prevBtn = document.querySelector(".notice-arrow.prev");
const nextBtn = document.querySelector(".notice-arrow.next");

let notices = [];
let currentIndex = 0;

let autoSlideInterval = null;
const AUTO_SLIDE_DELAY = 4000;

function startAutoSlide() {
  stopAutoSlide();

  if (!notices.length || notices.length < 2) return;

  autoSlideInterval = setInterval(() => {
    showNextNotice();
  }, AUTO_SLIDE_DELAY);
}

function stopAutoSlide() {
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
}

function resetAutoSlide() {
  stopAutoSlide();
  startAutoSlide();
}

function renderNotices() {
  if (!noticeTrack || !noticeDots) return;

  noticeTrack.innerHTML = "";
  noticeDots.innerHTML = "";

  if (!notices.length) {
    noticeTrack.innerHTML = `
      <div class="notice-slide active">
        <a href="https://community.withhive.com/dvc/ko" target="_blank" rel="noopener noreferrer">
          <img src="/images/default-notice.png" alt="기본 공지 이미지">
        </a>
        <div class="notice-caption">공지 데이터가 없습니다.</div>
      </div>
    `;
    return;
  }

  notices.forEach((notice, index) => {
    const slide = document.createElement("div");
    slide.className = `notice-slide ${index === currentIndex ? "active" : ""}`;

    const imageSrc = notice.image
      ? `/${String(notice.image).replace(/^\/+/, "")}`
      : "/images/default-notice.png";

    const noticeLink = notice.link || "https://community.withhive.com/dvc/ko";

    slide.innerHTML = `
      <a href="${noticeLink}" target="_blank" rel="noopener noreferrer">
        <img src="${imageSrc}" alt="${notice.title}">
      </a>
      <div class="notice-caption">
        <strong>[${notice.category || "공지사항"}]</strong> ${notice.title}
      </div>
    `;

    const img = slide.querySelector("img");
    img.onerror = function () {
      if (img.dataset.fallbackApplied === "true") {
        img.style.display = "none";
        return;
      }

      img.dataset.fallbackApplied = "true";
      img.src = "/images/default-notice.png";
    };

    noticeTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = `dot ${index === currentIndex ? "active" : ""}`;
    dot.type = "button";
    dot.addEventListener("click", () => {
      currentIndex = index;
      renderNotices();
      resetAutoSlide();
    });

    noticeDots.appendChild(dot);
  });
}

function showPrevNotice() {
  if (!notices.length) return;
  currentIndex = (currentIndex - 1 + notices.length) % notices.length;
  renderNotices();
}

function showNextNotice() {
  if (!notices.length) return;
  currentIndex = (currentIndex + 1) % notices.length;
  renderNotices();
}

prevBtn?.addEventListener("click", () => {
  showPrevNotice();
  resetAutoSlide();
});

nextBtn?.addEventListener("click", () => {
  showNextNotice();
  resetAutoSlide();
});

noticeTrack?.addEventListener("mouseenter", stopAutoSlide);
noticeTrack?.addEventListener("mouseleave", startAutoSlide);

async function loadNotices() {
  try {
    const res = await fetch("./notices.json");
    const data = await res.json();

    notices = Array.isArray(data.items) ? data.items : [];
    currentIndex = 0;

    renderNotices();
    startAutoSlide();
  } catch (error) {
    console.error("공지 불러오기 실패:", error);
    notices = [];
    currentIndex = 0;
    renderNotices();
    stopAutoSlide();
  }
}

loadNotices();