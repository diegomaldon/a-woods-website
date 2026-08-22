/* ==========================================================================
   A. Woods — gallery.js
   Fetches data/gallery.json and renders:
     - a curated preview grid on the homepage (#gallery-preview)
     - the full filterable grid + lightbox on the gallery page (#gallery-grid)
   Swapping real project photos later = editing data/gallery.json only.
   ========================================================================== */
(function () {
  const DATA_URL = "data/gallery.json";

  async function fetchGalleryData() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("Gallery data request failed: " + res.status);
      return await res.json();
    } catch (err) {
      console.error("Could not load gallery data:", err);
      return [];
    }
  }

  function displayTitle(item) {
    return item.title.replace(/\s*—\s*PLACEHOLDER$/i, "");
  }

  function previewTileMarkup(item) {
    return `
      <figure class="gallery-item">
        <a class="gallery-tile" href="gallery.html" aria-label="View full project gallery — ${displayTitle(item)}">
          <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async" width="800" height="600" />
          <span class="gallery-tile__caption">${item.categoryLabel}<span>${displayTitle(item)}</span></span>
        </a>
      </figure>`;
  }

  function fullTileMarkup(item, index) {
    return `
      <figure class="gallery-item" data-category="${item.category}">
        <button type="button" class="gallery-tile" data-index="${index}" aria-haspopup="dialog" aria-label="Open full-size photo: ${displayTitle(item)}">
          <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async" width="800" height="600" />
          <span class="gallery-tile__caption">${item.categoryLabel}<span>${displayTitle(item)}</span></span>
        </button>
      </figure>`;
  }

  async function initPreview() {
    const grid = document.getElementById("gallery-preview");
    if (!grid) return;
    const data = await fetchGalleryData();
    if (!data.length) return;

    // Curate one project per category first so the preview reads as varied,
    // then fill up to 8 tiles with whatever's left.
    const picks = [];
    const seenCategories = new Set();
    data.forEach((item) => {
      if (!seenCategories.has(item.category)) {
        seenCategories.add(item.category);
        picks.push(item);
      }
    });
    data.forEach((item) => {
      if (picks.length < 8 && !picks.includes(item)) picks.push(item);
    });

    grid.innerHTML = picks.slice(0, 8).map(previewTileMarkup).join("");
  }

  async function initFullGallery() {
    const grid = document.getElementById("gallery-grid");
    const filterBar = document.getElementById("gallery-filters");
    const emptyState = document.getElementById("gallery-empty");
    if (!grid || !filterBar) return;

    const data = await fetchGalleryData();
    if (!data.length) {
      if (emptyState) {
        emptyState.textContent = "Gallery photos are temporarily unavailable — please check back soon, or call us directly.";
        emptyState.classList.add("is-visible");
      }
      return;
    }

    grid.innerHTML = data.map(fullTileMarkup).join("");

    const categories = [];
    const labels = {};
    data.forEach((item) => {
      if (!labels[item.category]) {
        labels[item.category] = item.categoryLabel;
        categories.push(item.category);
      }
    });

    filterBar.innerHTML = [
      '<button type="button" class="filter-btn" data-filter="all" aria-pressed="true">All Work</button>',
      ...categories.map(
        (cat) => `<button type="button" class="filter-btn" data-filter="${cat}" aria-pressed="false">${labels[cat]}</button>`
      ),
    ].join("");

    const itemEls = Array.from(grid.querySelectorAll(".gallery-item"));
    let visible = data.slice();

    function applyFilter(filter) {
      visible = filter === "all" ? data.slice() : data.filter((d) => d.category === filter);
      const visibleIds = new Set(visible.map((v) => v.id));
      let anyVisible = false;
      itemEls.forEach((el, i) => {
        const match = visibleIds.has(data[i].id);
        el.hidden = !match;
        if (match) anyVisible = true;
      });
      if (emptyState) emptyState.classList.toggle("is-visible", !anyVisible);
    }

    filterBar.addEventListener("click", (event) => {
      const btn = event.target.closest(".filter-btn");
      if (!btn) return;
      filterBar.querySelectorAll(".filter-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      applyFilter(btn.dataset.filter);
    });

    initLightbox(data, grid, () => visible);
  }

  function initLightbox(data, grid, getVisibleList) {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const imgEl = lightbox.querySelector(".lightbox__frame img");
    const titleEl = lightbox.querySelector(".lightbox__caption strong");
    const metaEl = lightbox.querySelector(".lightbox__caption span");
    const closeBtn = lightbox.querySelector(".lightbox__close");
    const prevBtn = lightbox.querySelector(".lightbox__nav--prev");
    const nextBtn = lightbox.querySelector(".lightbox__nav--next");

    let currentList = [];
    let currentIndex = 0;
    let lastFocused = null;

    function render() {
      const item = currentList[currentIndex];
      if (!item) return;
      imgEl.src = item.image;
      imgEl.alt = item.alt;
      titleEl.textContent = displayTitle(item);
      metaEl.textContent = `${item.categoryLabel} · ${item.location}`;
    }

    function openAt(list, index) {
      currentList = list;
      currentIndex = index;
      render();
      lightbox.classList.add("is-open");
      lastFocused = document.activeElement;
      closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      lightbox.classList.remove("is-open");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function step(delta) {
      if (!currentList.length) return;
      currentIndex = (currentIndex + delta + currentList.length) % currentList.length;
      render();
    }

    function onKeydown(event) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "Tab") {
        // Simple focus trap across the three interactive controls.
        const focusable = [prevBtn, nextBtn, closeBtn];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    grid.addEventListener("click", (event) => {
      const tile = event.target.closest(".gallery-tile[data-index]");
      if (!tile) return;
      const dataIndex = Number(tile.dataset.index);
      const item = data[dataIndex];
      const list = getVisibleList();
      const listIndex = list.findIndex((d) => d.id === item.id);
      openAt(list, listIndex === -1 ? 0 : listIndex);
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPreview();
    initFullGallery();
  });
})();
