const noticeTrack = document.getElementById("noticeTrack");
const noticeDots = document.getElementById("noticeDots");
const prevBtn = document.querySelector(".notice-arrow.prev");
const nextBtn = document.querySelector(".notice-arrow.next");

let notices = [];
let currentIndex = 0;

function renderNotices() {
  if (!noticeTrack || !noticeDots) return;

  noticeTrack.innerHTML = "";
  noticeDots.innerHTML = "";

  if (!notices.length) {
    noticeTrack.innerHTML = `
      <div class="notice-slide active">
        <a href="https://community.withhive.com/dvc/ko" target="_blank" rel="noopener noreferrer">
          <img src="images/default-notice.png" alt="기본 공지 이미지">
        </a>
        <div class="notice-caption">공지 데이터가 없습니다.</div>
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
      </div>
    `;

    const img = slide.querySelector("img");
    img.onerror = () => {
      img.src = "images/default-notice.png";
    };

    noticeTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = `dot ${index === currentIndex ? "active" : ""}`;
    dot.type = "button";
    dot.addEventListener("click", () => {
      currentIndex = index;
      renderNotices();
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

prevBtn?.addEventListener("click", showPrevNotice);
nextBtn?.addEventListener("click", showNextNotice);

async function loadNotices() {
  try {
    const res = await fetch("./notices.json");
    const data = await res.json();

    notices = Array.isArray(data.items) ? data.items : [];
    currentIndex = 0;
    renderNotices();
  } catch (error) {
    console.error("공지 불러오기 실패:", error);
  }
}

loadNotices();