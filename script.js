const state = {
  albums: [],
  site: null,
  activeAlbum: null,
  activeIndex: 0,
};

const page = document.getElementById("page");
const albumView = document.getElementById("album-view");
const workGrid = document.getElementById("work-grid");
const albumImage = document.getElementById("album-image");
const albumCounter = document.getElementById("album-counter");

function albumImagePath(album, filename) {
  const folder = album.folder || `albums/${album.id}`;
  return `${folder}/${filename}`;
}

function coverFor(album) {
  const cover = album.cover || album.images[0];
  return albumImagePath(album, cover);
}

async function loadData() {
  const [siteResponse, albumsResponse] = await Promise.all([
    fetch("site.json"),
    fetch("albums.generated.json"),
  ]);

  if (!siteResponse.ok || !albumsResponse.ok) {
    throw new Error("Could not load site content.");
  }

  state.site = await siteResponse.json();
  state.albums = await albumsResponse.json();
}

function renderSite() {
  const { site } = state;
  document.title = site.title;
  document.getElementById("site-title").textContent = site.title;

  const subtitle = document.getElementById("site-subtitle");
  subtitle.textContent = site.subtitle || "";

  document.getElementById("about-text").textContent = site.about;

  const contact = document.getElementById("contact-details");
  contact.innerHTML = `
    <p><a href="tel:+17872192163">${site.contact.phone}</a></p>
    <p><a href="mailto:${site.contact.email}">${site.contact.email}</a></p>
    <p>${site.contact.location}</p>
  `;

  const testimonials = document.getElementById("testimonials-grid");
  testimonials.innerHTML = site.testimonials
    .map(
      (item) => `
        <article class="testimonial-card">
          <p class="testimonial-quote">"${item.quote}"</p>
          <p class="testimonial-author">${item.author}</p>
        </article>
      `
    )
    .join("");
}

function renderWorkGrid() {
  workGrid.innerHTML = state.albums
    .map(
      (album) => `
        <button
          type="button"
          class="work-item"
          data-album-id="${album.id}"
          aria-label="Open ${album.title}"
        >
          <div class="work-thumb">
            <img src="${coverFor(album)}" alt="${album.title}" loading="lazy" />
          </div>
        </button>
      `
    )
    .join("");

  workGrid.querySelectorAll(".work-item").forEach((button) => {
    button.addEventListener("click", () => {
      openAlbum(button.dataset.albumId);
    });
  });
}

function openAlbum(albumId) {
  const album = state.albums.find((item) => item.id === albumId);
  if (!album || !album.images.length) return;

  state.activeAlbum = album;
  state.activeIndex = 0;
  updateAlbumView();
  albumView.hidden = false;
  document.body.classList.add("album-open");
  history.pushState({ albumId }, "", `#${albumId}`);
}

function closeAlbum() {
  albumView.hidden = true;
  document.body.classList.remove("album-open");
  state.activeAlbum = null;
  history.pushState(null, "", "#work");
  document.getElementById("work").scrollIntoView({ behavior: "smooth" });
}

function updateAlbumView() {
  const { activeAlbum, activeIndex } = state;
  if (!activeAlbum) return;

  const filename = activeAlbum.images[activeIndex];
  albumCounter.textContent = `${activeIndex + 1} / ${activeAlbum.images.length}`;
  albumImage.src = albumImagePath(activeAlbum, filename);
  albumImage.alt = `${activeAlbum.title} photo ${activeIndex + 1}`;
}

function showNext(step) {
  if (!state.activeAlbum) return;

  const total = state.activeAlbum.images.length;
  state.activeIndex = (state.activeIndex + step + total) % total;
  updateAlbumView();
}

function bindEvents() {
  document.getElementById("back-button").addEventListener("click", closeAlbum);

  document.getElementById("album-prev").addEventListener("click", () => {
    showNext(-1);
  });

  document.getElementById("album-next").addEventListener("click", () => {
    showNext(1);
  });

  document.getElementById("album-mobile-prev").addEventListener("click", () => {
    showNext(-1);
  });

  document.getElementById("album-mobile-next").addEventListener("click", () => {
    showNext(1);
  });

  const albumStage = document.getElementById("album-stage");
  let touchStartX = 0;
  let touchStartY = 0;

  albumStage.addEventListener(
    "touchstart",
    (event) => {
      if (albumView.hidden || event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  albumStage.addEventListener(
    "touchend",
    (event) => {
      if (albumView.hidden || !event.changedTouches.length) return;

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipe = 50;

      if (Math.abs(deltaX) < minSwipe || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      showNext(deltaX < 0 ? 1 : -1);
    },
    { passive: true }
  );

  window.addEventListener("keydown", (event) => {
    if (albumView.hidden) return;

    if (event.key === "Escape") closeAlbum();
    if (event.key === "ArrowLeft") showNext(-1);
    if (event.key === "ArrowRight") showNext(1);
  });

  window.addEventListener("popstate", (event) => {
    if (event.state?.albumId) {
      openAlbum(event.state.albumId);
      return;
    }

    if (!albumView.hidden) {
      albumView.hidden = true;
      document.body.classList.remove("album-open");
      state.activeAlbum = null;
    }
  });

  if (location.hash.startsWith("#") && location.hash.length > 1) {
    const albumId = location.hash.slice(1);
    if (state.albums.some((album) => album.id === albumId)) {
      openAlbum(albumId);
    }
  }
}

async function init() {
  try {
    await loadData();
    renderSite();
    renderWorkGrid();
    bindEvents();
  } catch (error) {
    workGrid.innerHTML =
      "<p>Could not load albums. Run <code>python3 scripts/generate_albums.py</code> if you are viewing locally.</p>";
    console.error(error);
  }
}

init();
