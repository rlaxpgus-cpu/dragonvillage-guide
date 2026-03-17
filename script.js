const noticeTrack = document.getElementById("noticeTrack");
const noticeDots = document.getElementById("noticeDots");
const prevBtn = document.querySelector(".notice-arrow.prev");
const nextBtn = document.querySelector(".notice-arrow.next");

let notices = [];
let currentIndex = 0;

let autoSlideInterval = null;
const AUTO_SLIDE_DELAY = 4000;

const DEFAULT_NOTICE_IMAGE = "./images/default-notice.png";
const DEFAULT_NOTICE_LINK = "https://community.withhive.com/dvc/ko";

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

function getImageSrc(imagePath) {
  if (!imagePath) return DEFAULT_NOTICE_IMAGE;
  return String(imagePath).replace(/^\/+/, "./");
}

function renderNotices() {
  if (!noticeTrack || !noticeDots) return;

  noticeTrack.innerHTML = "";
  noticeDots.innerHTML = "";

  if (!notices.length) {
    noticeTrack.innerHTML = `
      <div class="notice-slide active">
        <a href="${DEFAULT_NOTICE_LINK}" target="_blank" rel="noopener noreferrer">
          <img src="${DEFAULT_NOTICE_IMAGE}" alt="기본 공지 이미지">
        </a>
        <div class="notice-caption">공지 데이터가 없습니다.</div>
      </div>
    `;
    return;
  }

  notices.forEach((notice, index) => {
    const slide = document.createElement("div");
    slide.className = `notice-slide ${index === currentIndex ? "active" : ""}`;

    const imageSrc = getImageSrc(notice.image);
    const noticeLink = notice.link || DEFAULT_NOTICE_LINK;
    const noticeTitle = notice.title || "공지 제목 없음";
    const noticeCategory = notice.category || "공지사항";

    slide.innerHTML = `
      <a href="${noticeLink}" target="_blank" rel="noopener noreferrer">
        <img src="${imageSrc}" alt="${noticeTitle}">
      </a>
      <div class="notice-caption">
        <strong>[${noticeCategory}]</strong> ${noticeTitle}
      </div>
    `;

    const img = slide.querySelector("img");
    img.onerror = function () {
      if (img.dataset.fallbackApplied === "true") {
        img.style.display = "none";
        return;
      }

      img.dataset.fallbackApplied = "true";
      img.src = DEFAULT_NOTICE_IMAGE;
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

    if (!res.ok) {
      throw new Error(`HTTP 오류: ${res.status}`);
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      notices = data;
    } else if (Array.isArray(data.items)) {
      notices = data.items;
    } else {
      notices = [];
    }

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