(() => {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const settings = document.getElementById('settings');
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  const maxWidthInput = document.getElementById('maxWidth');
  const outputFormat = document.getElementById('outputFormat');
  const compressBtn = document.getElementById('compressBtn');
  const resultsSection = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  let selectedFiles = [];
  let compressedResults = [];

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
    const files = [...e.dataTransfer.files].filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (files.length > 0) handleFiles(files);
  });

  function handleFiles(files) {
    selectedFiles = [...files];
    settings.style.display = 'block';
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    compressedResults = [];
    dropZone.querySelector('.drop-text').textContent =
      selectedFiles.length + ' 件のファイルを選択中';
  }

  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
  });

  compressBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    compressBtn.disabled = true;
    compressBtn.textContent = '⏳ 圧縮中...';
    resultsList.innerHTML = '';
    compressedResults = [];

    const quality = parseInt(qualitySlider.value, 10) / 100;
    const maxWidth = parseInt(maxWidthInput.value, 10);
    const format = outputFormat.value;

    for (const file of selectedFiles) {
      try {
        const result = await compressImage(file, quality, maxWidth, format);
        compressedResults.push(result);
        renderResultCard(result);
      } catch (err) {
        renderErrorCard(file.name, err.message);
      }
    }

    resultsSection.style.display = 'block';
    compressBtn.disabled = false;
    compressBtn.textContent = '🚀 圧縮する';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function compressImage(file, quality, maxWidth, format) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('圧縮に失敗しました')); return; }
            const ext = format === 'image/jpeg' ? '.jpg'
              : format === 'image/png' ? '.png' : '.webp';
            const baseName = file.name.replace(/\.[^.]+$/, '');
            resolve({
              originalName: file.name,
              originalSize: file.size,
              compressedBlob: blob,
              compressedSize: blob.size,
              fileName: baseName + '_compressed' + ext,
              thumbUrl: URL.createObjectURL(blob),
            });
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

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function renderResultCard(result) {
    const saving = result.originalSize - result.compressedSize;
    const percent = ((saving / result.originalSize) * 100).toFixed(1);
    const isSmaller = saving > 0;
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<img class="result-thumb" src="' + result.thumbUrl + '" alt="プレビュー">' +
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHtml(result.originalName) + '</div>' +
        '<div class="result-sizes">' +
          formatSize(result.originalSize) + ' → ' + formatSize(result.compressedSize) +
          ' <span class="result-saving ' + (isSmaller ? '' : 'negative') + '">' +
            '(' + (isSmaller ? '-' : '+') + Math.abs(percent) + '%)' +
          '</span>' +
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
        '<div class="result-sizes" style="color:#dc3545;">⚠️ ' + escapeHtml(message) + '</div>' +
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
    compressedResults.forEach((r) => downloadFile(r));
  });
})();
