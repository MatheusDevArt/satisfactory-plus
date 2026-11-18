// Clean Game Icon & Large Showcase Renderer (Eager loading for CSS-transformed Infinite Canvas)
(function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNum(num, maxDecimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const abs = Math.abs(num);
    if (abs < 1e-6) return '0';
    const rounded = Number(Math.round(num + 'e' + maxDecimals) + 'e-' + maxDecimals);
    return rounded.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals
    });
  }

  function getInitials(name) {
    if (!name) return '?';
    const clean = name.replace(/^(Alternativa|Minério de|Lingote de|Barra de)\s+/i, '');
    const words = clean.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
  }

  function renderEntityIcon(entity, size = 44) {
    if (!entity) return '';
    const primaryUrl = entity.wikiImage || entity.icon || '';
    const fallbackUrl = entity.wikiImageFallback || '';
    const initials = getInitials(entity.name);
    const isFluid = entity.isFluid || entity.form === 'LIQUID' || entity.form === 'GAS';

    return `
      <div class="game-icon ${isFluid ? 'is-fluid' : ''}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;" title="${escapeHtml(entity.name)}">
        <img
          src="${primaryUrl}"
          alt="${escapeHtml(entity.name)}"
          width="${size}"
          height="${size}"
          draggable="false"
          style="width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;display:block;"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.triedFallback!=='1' && '${fallbackUrl}'){this.dataset.triedFallback='1';this.src='${fallbackUrl}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}"
        />
        <span class="game-icon-fallback" style="display:none;font-size:${Math.max(11, Math.floor(size * 0.32))}px">${escapeHtml(initials)}</span>
      </div>
    `;
  }

  /**
   * Renders a large, borderless high-resolution image directly inside the Magnific card showcase
   */
  function renderShowcaseImage(entity, size = 176) {
    if (!entity) return '';
    const primaryUrl = entity.wikiImage || entity.icon || '';
    const fallbackUrl = entity.wikiImageFallback || '';
    const initials = getInitials(entity.name);

    return `
      <div class="showcase-img-wrap" style="width:${size}px;height:${size}px;" title="${escapeHtml(entity.name)}">
        <img
          src="${primaryUrl}"
          alt="${escapeHtml(entity.name)}"
          width="${size}"
          height="${size}"
          draggable="false"
          class="showcase-img-el"
          style="width:100%;height:100%;object-fit:contain;display:block;"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.triedFallback!=='1' && '${fallbackUrl}'){this.dataset.triedFallback='1';this.src='${fallbackUrl}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}"
        />
        <span class="game-icon-fallback" style="display:none;font-size:32px;border-radius:14px;">${escapeHtml(initials)}</span>
      </div>
    `;
  }

  window.FicsitUI = {
    renderEntityIcon,
    renderShowcaseImage,
    escapeHtml,
    formatNum
  };

  window.renderEntityIcon = renderEntityIcon;
  window.renderShowcaseImage = renderShowcaseImage;
})();
