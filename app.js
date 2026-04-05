(() => {
  'use strict';

  // Show sidebar ads only when AdSense fills them
  document.querySelectorAll('.ad-sidebar').forEach(function(el) {
    var ins = el.querySelector('.adsbygoogle');
    if (ins && ins.dataset.adStatus === 'filled') {
      el.classList.add('ad-loaded');
    }
  });

  var MAX_FILES = 10;

  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var fileBtnTrigger = document.getElementById('fileBtnTrigger');
  var fileListSection = document.getElementById('fileListSection');
  var fileList = document.getElementById('fileList');
  var clearAllBtn = document.getElementById('clearAllBtn');
  var settings = document.getElementById('settings');
  var step3 = document.getElementById('step3');
  var qualitySlider = document.getElementById('quality');
  var qualityValue = document.getElementById('qualityValue');
  var qualityNote = document.getElementById('qualityNote');
  var outputFormat = document.getElementById('outputFormat');
  var presetCards = document.getElementById('presetCards');
  var sizePresetCards = document.getElementById('sizePresetCards');
  var sizePngNote = document.getElementById('sizePngNote');
  var maxWidthSlider = document.getElementById('maxWidth');
  var maxWidthValue = document.getElementById('maxWidthValue');
  var convertBtn = document.getElementById('convertBtn');
  var progressSection = document.getElementById('progressSection');
  var progressText = document.getElementById('progressText');
  var progressCount = document.getElementById('progressCount');
  var progressBar = document.getElementById('progressBar');
  var resultsSection = document.getElementById('results');
  var resultsList = document.getElementById('resultsList');
  var resultsSummary = document.getElementById('resultsSummary');
  var downloadAllBtn = document.getElementById('downloadAllBtn');
  var downloadZipBtn = document.getElementById('downloadZipBtn');
  var restartBtn = document.getElementById('restartBtn');
  var renameArea = document.getElementById('renameArea');
  var renamePrefix = document.getElementById('renamePrefix');
  var renameDateCheck = document.getElementById('renameDateCheck');
  var renamePreview = document.getElementById('renamePreview');
  var renameBulkApply = document.getElementById('renameBulkApply');
  var renameList = document.getElementById('renameList');

  var selectedFiles = [];
  var convertedResults = [];
  var sizeLimit = 0;

  var FORMAT_MAP = {
    'heic': { label: 'HEIC', badge: 'badge-heic' },
    'heif': { label: 'HEIF', badge: 'badge-heic' },
    'jpg':  { label: 'JPEG', badge: 'badge-jpeg' },
    'jpeg': { label: 'JPEG', badge: 'badge-jpeg' },
    'png':  { label: 'PNG',  badge: 'badge-png' },
    'webp': { label: 'WebP', badge: 'badge-webp' },
    'gif':  { label: 'GIF',  badge: 'badge-gif' },
    'bmp':  { label: 'BMP',  badge: 'badge-bmp' },
    'tiff': { label: 'TIFF', badge: 'badge-tiff' },
    'tif':  { label: 'TIFF', badge: 'badge-tiff' },
    'svg':  { label: 'SVG',  badge: 'badge-unknown' },
  };

  // ========== Format preset ==========
  presetCards.addEventListener('click', function(e) {
    var card = e.target.closest('.preset-card');
    if (!card) return;
    presetCards.querySelectorAll('.preset-card').forEach(function(c) { c.classList.remove('active'); });
    card.classList.add('active');
    outputFormat.value = card.getAttribute('data-format');
    qualityNote.classList.toggle('visible', outputFormat.value === 'image/png');
    updateSizePresetState();
  });

  // ========== Size preset ==========
  sizePresetCards.addEventListener('click', function(e) {
    var card = e.target.closest('.size-preset');
    if (!card || card.disabled) return;
    sizePresetCards.querySelectorAll('.size-preset').forEach(function(c) { c.classList.remove('active'); });
    card.classList.add('active');
    sizeLimit = parseInt(card.getAttribute('data-limit'), 10) || 0;
  });

  function updateSizePresetState() {
    var isPng = outputFormat.value === 'image/png';
    sizePngNote.style.display = isPng ? 'block' : 'none';
    sizePresetCards.querySelectorAll('.size-preset').forEach(function(btn) {
      var limit = parseInt(btn.getAttribute('data-limit'), 10);
      if (limit > 0) {
        btn.disabled = isPng;
        btn.classList.toggle('preset-disabled', isPng);
        if (isPng && btn.classList.contains('active')) {
          btn.classList.remove('active');
          sizePresetCards.querySelector('[data-limit="0"]').classList.add('active');
          sizeLimit = 0;
        }
      }
    });
  }

  // ========== Rename preview (bulk) ==========
  function updateRenamePreview() {
    var prefix = renamePrefix.value.trim();
    if (!prefix) { renamePreview.textContent = ''; return; }
    var dateStr = renameDateCheck.checked ? getDateStr() + '_' : '';
    renamePreview.textContent = '例: ' + dateStr + prefix + '_01.jpg, ' + dateStr + prefix + '_02.jpg …';
  }
  renamePrefix.addEventListener('input', updateRenamePreview);
  renameDateCheck.addEventListener('change', updateRenamePreview);

  function getDateStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // ========== Bulk rename apply ==========
  renameBulkApply.addEventListener('click', function() {
    var prefix = renamePrefix.value.trim();
    if (!prefix) return;
    var dateStr = renameDateCheck.checked ? getDateStr() + '_' : '';
    convertedResults.forEach(function(r, i) {
      var ext = r.fileName.match(/\.[^.]+$/)[0];
      var newName = dateStr + prefix + '_' + String(i + 1).padStart(2, '0') + ext;
      r.fileName = newName;
    });
    renderRenameList();
    renderResultsList();
  });

  // ========== Individual rename ==========
  function renderRenameList() {
    renameList.innerHTML = '';
    convertedResults.forEach(function(r, i) {
      var row = document.createElement('div');
      row.className = 'rename-item';
      var thumb = document.createElement('img');
      thumb.className = 'rename-item-thumb';
      thumb.src = r.thumbUrl;
      thumb.alt = '';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'rename-item-input';
      var ext = r.fileName.match(/\.[^.]+$/)[0];
      input.value = r.fileName.replace(/\.[^.]+$/, '');
      input.setAttribute('data-index', i);
      input.setAttribute('data-ext', ext);
      input.addEventListener('change', function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        var newName = this.value.trim();
        if (newName) {
          convertedResults[idx].fileName = newName + this.getAttribute('data-ext');
          renderResultsList();
        }
      });
      var extLabel = document.createElement('span');
      extLabel.className = 'rename-item-ext';
      extLabel.textContent = ext;
      row.appendChild(thumb);
      row.appendChild(input);
      row.appendChild(extLabel);
      renameList.appendChild(row);
    });
  }

  // ========== File selection ==========
  fileBtnTrigger.addEventListener('click', function(e) { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click', function(e) {
    if (e.target === fileBtnTrigger || e.target === fileInput) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length > 0) addFiles(fileInput.files);
    fileInput.value = '';
  });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  });

  document.addEventListener('paste', function(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    var files = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        var f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) { e.preventDefault(); addFiles(files); }
  });

  // ========== Clear / Restart ==========
  clearAllBtn.addEventListener('click', function() { resetAll(); });
  restartBtn.addEventListener('click', function() { resetAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  function resetAll() {
    selectedFiles = []; convertedResults = [];
    fileListSection.style.display = 'none';
    settings.style.display = 'none';
    step3.style.display = 'none';
    resultsSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultsList.innerHTML = ''; fileList.innerHTML = '';
    resultsSummary.innerHTML = ''; renameList.innerHTML = '';
    renamePrefix.value = ''; renameDateCheck.checked = false;
    renamePreview.textContent = '';
    dropZone.querySelector('.drop-text').textContent = 'ここに写真をドラッグ＆ドロップ';
  }

  function addFiles(newFiles) {
    var toAdd = Array.from(newFiles);
    var remaining = MAX_FILES - selectedFiles.length;
    if (remaining <= 0) { alert('一度に変換できるのは ' + MAX_FILES + ' 枚までです。'); return; }
    if (toAdd.length > remaining) {
      alert('あと ' + remaining + ' 枚まで追加できます。先頭の ' + remaining + ' 枚を追加します。');
      toAdd = toAdd.slice(0, remaining);
    }
    selectedFiles = selectedFiles.concat(toAdd);
    updateUI();
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateUI();
    if (selectedFiles.length === 0) {
      fileListSection.style.display = 'none';
      settings.style.display = 'none';
      step3.style.display = 'none';
      dropZone.querySelector('.drop-text').textContent = 'ここに写真をドラッグ＆ドロップ';
    }
  }

  function updateUI() {
    resultsSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultsList.innerHTML = ''; convertedResults = [];
    if (selectedFiles.length > 0) {
      dropZone.querySelector('.drop-text').textContent = '✅ ' + selectedFiles.length + ' 枚えらび済み（追加もできます）';
      renderFileList();
      fileListSection.style.display = 'block';
      settings.style.display = 'block';
      step3.style.display = 'block';
      settings.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ========== Format detect ==========
  function detectFormat(file) {
    var ext = getExtension(file.name).toLowerCase();
    if (FORMAT_MAP[ext]) return { ext: ext, label: FORMAT_MAP[ext].label, badge: FORMAT_MAP[ext].badge };
    var mime = file.type;
    if (mime === 'image/heic' || mime === 'image/heif') return { ext: 'heic', label: 'HEIC', badge: 'badge-heic' };
    if (mime === 'image/jpeg') return { ext: 'jpeg', label: 'JPEG', badge: 'badge-jpeg' };
    if (mime === 'image/png') return { ext: 'png', label: 'PNG', badge: 'badge-png' };
    if (mime === 'image/webp') return { ext: 'webp', label: 'WebP', badge: 'badge-webp' };
    if (mime === 'image/gif') return { ext: 'gif', label: 'GIF', badge: 'badge-gif' };
    if (mime === 'image/bmp') return { ext: 'bmp', label: 'BMP', badge: 'badge-bmp' };
    if (mime === 'image/tiff') return { ext: 'tiff', label: 'TIFF', badge: 'badge-tiff' };
    return { ext: ext || '?', label: ext.toUpperCase() || '不明', badge: 'badge-unknown' };
  }

  function isHeic(file) {
    var name = file.name.toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
  }

  // ========== Preview / File list ==========
  function createPreview(file, container) {
    if (isHeic(file)) {
      var ph = document.createElement('div');
      ph.className = 'file-item-thumb-placeholder'; ph.textContent = '⏳';
      container.prepend(ph);
      heic2any({ blob: file, toType: 'image/jpeg', quality: 0.3 }).then(function(blob) {
        if (Array.isArray(blob)) blob = blob[0];
        var img = document.createElement('img');
        img.className = 'file-item-thumb'; img.src = URL.createObjectURL(blob); img.alt = '';
        ph.replaceWith(img);
      }).catch(function() { ph.textContent = '📱'; });
    } else {
      var url = URL.createObjectURL(file);
      var img = document.createElement('img');
      img.className = 'file-item-thumb'; img.alt = ''; img.src = url;
      img.onerror = function() {
        URL.revokeObjectURL(url);
        var p = document.createElement('div'); p.className = 'file-item-thumb-placeholder'; p.textContent = '🖼️';
        img.replaceWith(p);
      };
      container.prepend(img);
    }
  }

  function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach(function(file, index) {
      var fmt = detectFormat(file);
      var item = document.createElement('div'); item.className = 'file-item';
      item.innerHTML =
        '<div class="file-item-info"><div class="file-item-name">' + escapeHtml(file.name || 'クリップボードの画像') +
        '</div><div class="file-item-meta">' + formatSize(file.size) + '</div></div>' +
        '<span class="file-item-badge ' + fmt.badge + '">' + escapeHtml(fmt.label) + '</span>';
      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'file-item-delete'; delBtn.textContent = '✕';
      delBtn.setAttribute('data-index', index);
      delBtn.addEventListener('click', function() { removeFile(parseInt(this.getAttribute('data-index'), 10)); });
      item.appendChild(delBtn);
      createPreview(file, item);
      fileList.appendChild(item);
    });
  }

  // ========== Settings ==========
  qualitySlider.addEventListener('input', function() { qualityValue.textContent = qualitySlider.value; });
  maxWidthSlider.addEventListener('input', function() {
    var v = parseInt(maxWidthSlider.value, 10);
    maxWidthValue.textContent = v === 0 ? '変更なし' : v + 'px';
  });

  // ========== Size-limited convert ==========
  async function convertWithSizeLimit(file, format, maxW, targetBytes, baseQuality) {
    var blob = await rawConvert(file, baseQuality, format, maxW);
    if (format === 'image/png' || targetBytes <= 0) return blob;
    if (blob.size <= targetBytes) return blob;

    // Binary search quality
    var lo = 0.05, hi = baseQuality, bestBlob = null;
    for (var attempt = 0; attempt < 8; attempt++) {
      var mid = (lo + hi) / 2;
      var candidate = await rawConvert(file, mid, format, maxW);
      if (candidate.size <= targetBytes) { bestBlob = candidate; lo = mid; }
      else { hi = mid; }
    }
    if (bestBlob) return bestBlob;

    // Aggressive resize if still over
    var resizeW = maxW > 0 ? maxW : 1920;
    for (var r = 0; r < 6; r++) {
      resizeW = Math.round(resizeW * 0.7);
      if (resizeW < 200) break;
      var resized = await rawConvert(file, lo, format, resizeW);
      if (resized.size <= targetBytes) return resized;
    }

    // Give up - throw clear error
    throw new Error('写真が大きすぎて ' + formatSize(targetBytes) + ' 以下にできませんでした。サイズ制限を「制限なし」にするか、別の形式を試してください。');
  }

  async function rawConvert(file, quality, format, maxW) {
    if (isHeic(file)) {
      var blob = await heic2any({ blob: file, toType: format, quality: format === 'image/png' ? undefined : quality });
      if (Array.isArray(blob)) blob = blob[0];
      if (maxW > 0) blob = await resizeBlob(blob, quality, format, maxW);
      return blob;
    }
    return canvasConvert(file, quality, format, maxW);
  }

  // ========== Main convert ==========
  convertBtn.addEventListener('click', async function() {
    if (selectedFiles.length === 0) return;

    // Validate: PNG + size limit = blocked
    if (outputFormat.value === 'image/png' && sizeLimit > 0) {
      alert('PNG形式ではサイズ制限は使えません。\nJPEGかWebPを選ぶか、サイズ制限を「制限なし」にしてください。');
      return;
    }

    convertBtn.disabled = true;
    convertBtn.querySelector('.convert-btn-text').textContent = '変換しています…';
    convertBtn.querySelector('.convert-btn-icon').textContent = '⏳';
    resultsList.innerHTML = ''; resultsSummary.innerHTML = '';
    renameList.innerHTML = ''; convertedResults = [];

    progressSection.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '⏳ 変換しています…しばらくお待ちください';
    progressCount.textContent = '0 / ' + selectedFiles.length;

    var quality = parseInt(qualitySlider.value, 10) / 100;
    var format = outputFormat.value;
    var maxW = parseInt(maxWidthSlider.value, 10);
    var ext = format === 'image/jpeg' ? '.jpg' : format === 'image/png' ? '.png' : '.webp';

    var totalOriginal = 0, totalConverted = 0, successCount = 0;

    for (var i = 0; i < selectedFiles.length; i++) {
      var file = selectedFiles[i];
      progressText.textContent = '⏳ ' + (i + 1) + ' 枚目を変換中…';
      progressCount.textContent = (i + 1) + ' / ' + selectedFiles.length;
      progressBar.style.width = ((i + 1) / selectedFiles.length * 100) + '%';

      try {
        var blob = await convertWithSizeLimit(file, format, maxW, sizeLimit, quality);
        var fmt = detectFormat(file);
        var baseName = file.name.replace(/\.[^.]+$/, '') || 'pasted-image';
        var thumbUrl = URL.createObjectURL(blob);
        var result = {
          originalName: file.name, originalSize: file.size,
          convertedBlob: blob, convertedSize: blob.size,
          fileName: baseName + ext, thumbUrl: thumbUrl,
          fromExt: fmt.label, toExt: ext.replace('.', '').toUpperCase(),
        };
        convertedResults.push(result);
        totalOriginal += result.originalSize;
        totalConverted += result.convertedSize;
        successCount++;
      } catch (err) {
        renderErrorCard(file.name, err.message);
      }
    }

    // Render result cards
    renderResultsList();

    // Summary
    if (successCount > 0) {
      var savedPct = totalOriginal > 0 ? ((1 - totalConverted / totalOriginal) * 100).toFixed(1) : 0;
      var sign = savedPct >= 0 ? '小さくなりました' : '大きくなりました';
      var limitInfo = '';
      if (sizeLimit > 0) {
        limitInfo = '<div class="summary-item"><span class="summary-label">📧 サイズ制限</span><span class="summary-value text-green">全枚 ' + formatSize(sizeLimit) + ' 以下 ✓</span></div>';
      }
      resultsSummary.innerHTML =
        '<div class="summary-card">' +
          '<div class="summary-item"><span class="summary-label">変換成功</span><span class="summary-value">' + successCount + ' / ' + selectedFiles.length + ' 枚</span></div>' +
          '<div class="summary-item"><span class="summary-label">合計サイズ</span><span class="summary-value">' + formatSize(totalOriginal) + ' → ' + formatSize(totalConverted) + '</span></div>' +
          '<div class="summary-item"><span class="summary-label">サイズ変化</span><span class="summary-value ' + (savedPct >= 0 ? 'text-green' : 'text-red') + '">' + Math.abs(savedPct) + '% ' + sign + '</span></div>' +
          limitInfo +
        '</div>';
    }

    // Render rename UI
    renderRenameList();
    renameArea.style.display = convertedResults.length > 0 ? 'block' : 'none';

    progressText.textContent = '✅ 変換が終わりました！';
    resultsSection.style.display = 'block';
    convertBtn.disabled = false;
    convertBtn.querySelector('.convert-btn-text').textContent = '変換する';
    convertBtn.querySelector('.convert-btn-icon').textContent = '🔄';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ========== Render results list ==========
  function renderResultsList() {
    resultsList.innerHTML = '';
    convertedResults.forEach(function(result) {
      var card = document.createElement('div'); card.className = 'result-card';
      card.innerHTML =
        '<img class="result-thumb" src="' + result.thumbUrl + '" alt="">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHtml(result.fileName) + '</div>' +
          '<div class="result-detail">' +
            '<span class="result-format from">' + escapeHtml(result.fromExt) + '</span>' +
            '<span class="result-arrow">→</span>' +
            '<span class="result-format to">' + escapeHtml(result.toExt) + '</span>' +
            '  ' + formatSize(result.originalSize) + ' → ' + formatSize(result.convertedSize) +
          '</div>' +
        '</div>';
      var dlBtn = document.createElement('button');
      dlBtn.type = 'button'; dlBtn.className = 'result-download'; dlBtn.textContent = '💾 保存';
      dlBtn.addEventListener('click', function() { downloadFile(result); });
      card.appendChild(dlBtn);
      resultsList.appendChild(card);
    });
  }

  function renderErrorCard(name, message) {
    var card = document.createElement('div'); card.className = 'result-card result-card-error';
    card.innerHTML =
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHtml(name || 'クリップボードの画像') + '</div>' +
        '<div class="result-detail" style="color:#dc2626;">⚠️ ' + escapeHtml(message) + '</div>' +
      '</div>';
    resultsList.appendChild(card);
  }

  // ========== Canvas / Resize ==========
  function resizeBlob(blob, quality, format, maxW) {
    return new Promise(function(resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(blob);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(b) { b ? resolve(b) : reject(new Error('リサイズ失敗')); }, format, format === 'image/png' ? undefined : quality);
      };
      img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('リサイズ失敗')); };
      img.src = url;
    });
  }

  function canvasConvert(file, quality, format, maxW) {
    return new Promise(function(resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(blob) { blob ? resolve(blob) : reject(new Error('変換失敗')); }, format, format === 'image/png' ? undefined : quality);
      };
      img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('画像読み込み失敗')); };
      img.src = url;
    });
  }

  // ========== Utilities ==========
  function getExtension(name) { var m = name.match(/\.([^.]+)$/); return m ? m[1] : ''; }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function escapeHtml(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function downloadFile(result) {
    var a = document.createElement('a');
    a.href = result.thumbUrl; a.download = result.fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  downloadAllBtn.addEventListener('click', function() {
    convertedResults.forEach(function(r) { downloadFile(r); });
  });

  // ZIP download
  downloadZipBtn.addEventListener('click', async function() {
    if (convertedResults.length === 0) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.querySelector('.download-main-text').textContent = 'ZIP を作っています…';
    try {
      var zip = new JSZip();
      var usedNames = {};
      convertedResults.forEach(function(r) {
        var name = r.fileName;
        if (usedNames[name]) {
          var count = usedNames[name]++;
          var parts = name.split('.'); var ext = parts.pop();
          name = parts.join('.') + '_' + count + '.' + ext;
        } else { usedNames[name] = 1; }
        zip.file(name, r.convertedBlob);
      });
      var zipBlob = await zip.generateAsync({ type: 'blob' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob); a.download = 'converted-images.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) { alert('ZIPの作成に失敗しました: ' + err.message); }
    downloadZipBtn.disabled = false;
    downloadZipBtn.querySelector('.download-main-text').textContent = '変換した写真をダウンロード';
  });
})();
