const slider = document.getElementById("noticeSlider");
const track = document.getElementById("noticeTrack");
const dotsWrap = document.getElementById("noticeDots");

let slides = [];
let dots = [];
let currentIndex = 0;
let autoSlide = null;

function showSlide(index) {
  if (!slides.length) return;

  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  currentIndex = index;
}

function nextSlide() {
  if (!slides.length) return;
  showSlide((currentIndex + 1) % slides.length);
}

function prevSlide() {
  if (!slides.length) return;
  showSlide((currentIndex - 1 + slides.length) % slides.length);
}

function startAutoSlide() {
  stopAutoSlide();
  autoSlide = setInterval(nextSlide, 4000);
}

function stopAutoSlide() {
  if (autoSlide) {
    clearInterval(autoSlide);
    autoSlide = null;
  }
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadNotices() {
  if (!slider || !track || !dotsWrap) return;

  const prevBtn = slider.querySelector(".prev");
  const nextBtn = slider.querySelector(".next");

  try {
    const response = await fetch(`./notices.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const notices = await response.json();

    if (!Array.isArray(notices) || notices.length === 0) {
      track.innerHTML = `
        <div class="notice-empty">
          아직 불러온 공지사항이 없습니다.
        </div>
      `;
      dotsWrap.innerHTML = "";
      return;
    }

    track.innerHTML = notices.map((notice, index) => {
      const title = escapeHtml(notice.title || "공지사항");
      const link = notice.link || "#";
      const image = notice.image || "./images/default-notice.png";
      const date = escapeHtml(notice.date || "");

      return `
        <div class="notice-slide ${index === 0 ? "active" : ""}">
          <a href="${link}" target="_blank" rel="noopener noreferrer">
            <img src="${image}" alt="${title}">
            <div class="notice-meta">
              <p class="notice-title">${title}</p>
              <p class="notice-date">${date}</p>
            </div>
          </a>
        </div>
      `;
    }).join("");

    dotsWrap.innerHTML = notices.map((_, index) => `
      <button class="dot ${index === 0 ? "active" : ""}" aria-label="${index + 1}번 공지로 이동"></button>
    `).join("");

    slides = Array.from(track.querySelectorAll(".notice-slide"));
    dots = Array.from(dotsWrap.querySelectorAll(".dot"));

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        showSlide(index);
        startAutoSlide();
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        prevSlide();
        startAutoSlide();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        nextSlide();
        startAutoSlide();
      });
    }

    slider.addEventListener("mouseenter", stopAutoSlide);
    slider.addEventListener("mouseleave", startAutoSlide);

    showSlide(0);
    startAutoSlide();
  } catch (error) {
    console.error("공지사항 로드 실패:", error);
    track.innerHTML = `
      <div class="notice-empty">
        공지사항을 불러오지 못했습니다.
      </div>
    `;
    dotsWrap.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", loadNotices);