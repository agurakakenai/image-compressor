(() => {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileListSection = document.getElementById('fileListSection');
  const fileList = document.getElementById('fileList');
  const settings = document.getElementById('settings');
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  const qualityNote = document.getElementById('qualityNote');
  const outputFormat = document.getElementById('outputFormat');
  const convertBtn = document.getElementById('convertBtn');
  const resultsSection = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  let selectedFiles = [];
  let convertedResults = [];

  const FORMAT_MAP = {
    'heic': { label: 'HEIC', badge: 'badge-heic', icon: '📱' },
    'heif': { label: 'HEIF', badge: 'badge-heic', icon: '📱' },
    'jpg':  { label: 'JPEG', badge: 'badge-jpeg', icon: '🖼️' },
    'jpeg': { label: 'JPEG', badge: 'badge-jpeg', icon: '🖼️' },
    'png':  { label: 'PNG',  badge: 'badge-png',  icon: '🖼️' },
    'webp': { label: 'WebP', badge: 'badge-webp', icon: '🖼️' },
    'gif':  { label: 'GIF',  badge: 'badge-gif',  icon: '🎞️' },
    'bmp':  { label: 'BMP',  badge: 'badge-bmp',  icon: '🖼️' },
    'tiff': { label: 'TIFF', badge: 'badge-tiff', icon: '🖼️' },
    'tif':  { label: 'TIFF', badge: 'badge-tiff', icon: '🖼️' },
    'svg':  { label: 'SVG',  badge: 'badge-unknown', icon: '📐' },
  };

  // File selection
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.file-btn') || e.target === dropZone || e.target.closest('.drop-zone-content')) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFiles(fileInput.files);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    selectedFiles = [...files];
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    convertedResults = [];

    dropZone.querySelector('.drop-text').textContent =
      selectedFiles.length + ' 件のファイルを選択中';

    // Show file list with detected formats
    renderFileList();
    fileListSection.style.display = 'block';
    settings.style.display = 'block';
  }

  function detectFormat(file) {
    const ext = getExtension(file.name).toLowerCase();
    if (FORMAT_MAP[ext]) return { ext: ext, ...FORMAT_MAP[ext] };

    // Fallback: try MIME type
    const mime = file.type;
    if (mime === 'image/heic' || mime === 'image/heif') return { ext: 'heic', ...FORMAT_MAP['heic'] };
    if (mime === 'image/jpeg') return { ext: 'jpeg', ...FORMAT_MAP['jpeg'] };
    if (mime === 'image/png') return { ext: 'png', ...FORMAT_MAP['png'] };
    if (mime === 'image/webp') return { ext: 'webp', ...FORMAT_MAP['webp'] };
    if (mime === 'image/gif') return { ext: 'gif', ...FORMAT_MAP['gif'] };
    if (mime === 'image/bmp') return { ext: 'bmp', ...FORMAT_MAP['bmp'] };
    if (mime === 'image/tiff') return { ext: 'tiff', ...FORMAT_MAP['tiff'] };

    return { ext: ext || '?', label: ext.toUpperCase() || '不明', badge: 'badge-unknown', icon: '❓' };
  }

  function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file) => {
      const fmt = detectFormat(file);
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML =
        '<span class="file-item-icon">' + fmt.icon + '</span>' +
        '<div class="file-item-info">' +
          '<div class="file-item-name">' + escapeHtml(file.name) + '</div>' +
          '<div class="file-item-meta">' + formatSize(file.size) + ' ・ MIME: ' + escapeHtml(file.type || '不明') + '</div>' +
        '</div>' +
        '<span class="file-item-badge ' + fmt.badge + '">' + escapeHtml(fmt.label) + '</span>';
      fileList.appendChild(item);
    });
  }

  // Quality slider
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
  });

  // Show/hide quality note based on format
  outputFormat.addEventListener('change', () => {
    qualityNote.classList.toggle('visible', outputFormat.value === 'image/png');
  });

  // Convert
  convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    convertBtn.disabled = true;
    convertBtn.textContent = '⏳ 変換中...';
    resultsList.innerHTML = '';
    convertedResults = [];

    const quality = parseInt(qualitySlider.value, 10) / 100;
    const format = outputFormat.value;

    for (const file of selectedFiles) {
      try {
        const result = await convertFile(file, quality, format);
        convertedResults.push(result);
        renderResultCard(result);
      } catch (err) {
        renderErrorCard(file.name, err.message);
      }
    }

    resultsSection.style.display = 'block';
    convertBtn.disabled = false;
    convertBtn.textContent = '🔄 変換する';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function isHeic(file) {
    const name = file.name.toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') ||
      file.type === 'image/heic' || file.type === 'image/heif';
  }

  async function convertFile(file, quality, format) {
    const fmt = detectFormat(file);
    let blob;

    if (isHeic(file)) {
      blob = await heic2any({
        blob: file,
        toType: format,
        quality: format === 'image/png' ? undefined : quality,
      });
      if (Array.isArray(blob)) blob = blob[0];
    } else {
      blob = await canvasConvert(file, quality, format);
    }

    const ext = format === 'image/jpeg' ? '.jpg'
      : format === 'image/png' ? '.png' : '.webp';
    const toExt = ext.replace('.', '').toUpperCase();
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const thumbUrl = URL.createObjectURL(blob);

    return {
      originalName: file.name,
      originalSize: file.size,
      convertedBlob: blob,
      convertedSize: blob.size,
      fileName: baseName + ext,
      thumbUrl: thumbUrl,
      fromExt: fmt.label,
      toExt: toExt,
    };
  }

  function canvasConvert(file, quality, format) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('変換に失敗しました')); return; }
            resolve(blob);
          },
          format,
          format === 'image/png' ? undefined : quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('画像の読み込みに失敗しました'));
      };
      img.src = url;
    });
  }

  function getExtension(name) {
    const m = name.match(/\.([^.]+)$/);
    return m ? m[1] : '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function renderResultCard(result) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<img class="result-thumb" src="' + result.thumbUrl + '" alt="プレビュー">' +
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHtml(result.fileName) + '</div>' +
        '<div class="result-detail">' +
          '<span class="result-format from">' + escapeHtml(result.fromExt) + '</span>' +
          '<span class="result-arrow">→</span>' +
          '<span class="result-format to">' + escapeHtml(result.toExt) + '</span>' +
          '  ' + formatSize(result.originalSize) + ' → ' + formatSize(result.convertedSize) +
        '</div>' +
      '</div>';
    const dlBtn = document.createElement('button');
    dlBtn.className = 'result-download';
    dlBtn.textContent = '💾 ダウンロード';
    dlBtn.addEventListener('click', () => downloadFile(result));
    card.appendChild(dlBtn);
    resultsList.appendChild(card);
  }

  function renderErrorCard(name, message) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHtml(name) + '</div>' +
        '<div class="result-detail" style="color:#dc3545;">⚠️ ' + escapeHtml(message) + '</div>' +
      '</div>';
    resultsList.appendChild(card);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function downloadFile(result) {
    const a = document.createElement('a');
    a.href = result.thumbUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadAllBtn.addEventListener('click', () => {
    convertedResults.forEach((r) => downloadFile(r));
  });
})();
