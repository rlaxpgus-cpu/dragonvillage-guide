const noticeTrack = document.getElementById("noticeTrack");
const noticeDots = document.getElementById("noticeDots");
const prevBtn = document.querySelector(".notice-arrow.prev");
const nextBtn = document.querySelector(".notice-arrow.next");

let notices = [];
let currentIndex = 0;
let autoSlide = null;

function renderNotices() {
  if (!noticeTrack || !noticeDots) return;

  noticeTrack.innerHTML = "";
  noticeDots.innerHTML = "";

  if (!notices.length) {
    noticeTrack.innerHTML = `
      <div class="notice-slide active">
        <a href="https://community.withhive.com/dvc/ko" target="_blank" rel="noopener noreferrer">
          <img src="images/default-notice.png" alt="기본 공지 배너">
        </a>
      </div>
    `;
    return;
  }

  notices.forEach((notice, index) => {
    const slide = document.createElement("div");
    slide.className = `notice-slide ${index === currentIndex ? "active" : ""}`;

    slide.innerHTML = `
      <a href="${notice.link}" target="_blank" rel="noopener noreferrer">
        <img src="${notice.image || "images/default-notice.png"}" alt="${notice.title}">
      </a>
      <div class="notice-caption">
        <strong>[${notice.category || "공지"}]</strong> ${notice.title}
        ${notice.date ? `<div class="notice-date">${notice.date}</div>` : ""}
      </div>
    `;

    const img = slide.querySelector("img");
    img.addEventListener("error", () => {
      img.src = "images/default-notice.png";
    });

    noticeTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = `dot ${index === currentIndex ? "active" : ""}`;
    dot.type = "button";
    dot.addEventListener("click", () => {
      currentIndex = index;
      renderNotices();
      restartAutoSlide();
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

function startAutoSlide() {
  if (autoSlide) clearInterval(autoSlide);
  autoSlide = setInterval(() => {
    if (!notices.length) return;
    showNextNotice();
  }, 5000);
}

function restartAutoSlide() {
  startAutoSlide();
}

prevBtn?.addEventListener("click", () => {
  showPrevNotice();
  restartAutoSlide();
});

nextBtn?.addEventListener("click", () => {
  showNextNotice();
  restartAutoSlide();
});

async function loadNotices() {
  try {
    const res = await fetch("./notices.json");
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
    renderNotices();
  }
}

loadNotices();