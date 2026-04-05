(() => {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const settings = document.getElementById('settings');
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  const outputFormat = document.getElementById('outputFormat');
  const convertBtn = document.getElementById('convertBtn');
  const resultsSection = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  let selectedFiles = [];
  let convertedResults = [];

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
    settings.style.display = 'block';
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    convertedResults = [];
    dropZone.querySelector('.drop-text').textContent =
      selectedFiles.length + ' 件のファイルを選択中';
  }

  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
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
    return name.endsWith('.heic') || name.endsWith('.heif');
  }

  async function convertFile(file, quality, format) {
    let blob;
    const fromExt = getExtension(file.name).toUpperCase() || file.type.split('/')[1]?.toUpperCase() || '?';

    if (isHeic(file)) {
      // HEIC/HEIF -> use heic2any
      blob = await heic2any({
        blob: file,
        toType: format,
        quality: format === 'image/png' ? undefined : quality,
      });
      // heic2any may return array for multi-image HEIC
      if (Array.isArray(blob)) blob = blob[0];
    } else {
      // Other formats -> Canvas conversion
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
      fromExt: fromExt,
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
        '<div class="result-name">' + escapeHtml(result.originalName) + '</div>' +
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
