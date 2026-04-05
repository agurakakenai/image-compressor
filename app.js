(() => {
  'use strict';

  var MAX_FILES = 10;

  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var fileBtnTrigger = document.getElementById('fileBtnTrigger');
  var fileListSection = document.getElementById('fileListSection');
  var fileList = document.getElementById('fileList');
  var clearAllBtn = document.getElementById('clearAllBtn');
  var settings = document.getElementById('settings');
  var qualitySlider = document.getElementById('quality');
  var qualityValue = document.getElementById('qualityValue');
  var qualityNote = document.getElementById('qualityNote');
  var outputFormat = document.getElementById('outputFormat');
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

  var selectedFiles = [];
  var convertedResults = [];

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

  fileBtnTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', function(e) {
    if (e.target === fileBtnTrigger || e.target === fileInput) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files.length > 0) addFiles(fileInput.files);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  });

  // Clipboard paste support
  document.addEventListener('paste', function(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    var files = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        var file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  });

  // Clear all button
  clearAllBtn.addEventListener('click', function() {
    selectedFiles = [];
    convertedResults = [];
    fileListSection.style.display = 'none';
    settings.style.display = 'none';
    resultsSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultsList.innerHTML = '';
    fileList.innerHTML = '';
    resultsSummary.innerHTML = '';
    dropZone.querySelector('.drop-text').textContent = '画像ファイルをドラッグ＆ドロップ';
  });

  function addFiles(newFiles) {
    var toAdd = [...newFiles];
    var remaining = MAX_FILES - selectedFiles.length;

    if (remaining <= 0) {
      alert('最大 ' + MAX_FILES + ' 枚までです。不要なファイルを削除してから追加してください。');
      return;
    }

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
      dropZone.querySelector('.drop-text').textContent = '画像ファイルをドラッグ＆ドロップ';
    }
  }

  function updateUI() {
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    convertedResults = [];

    if (selectedFiles.length > 0) {
      dropZone.querySelector('.drop-text').textContent =
        selectedFiles.length + ' / ' + MAX_FILES + ' 件選択中（追加ドロップ可）';
      renderFileList();
      fileListSection.style.display = 'block';
      settings.style.display = 'block';
    }
  }

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
    return name.endsWith('.heic') || name.endsWith('.heif') ||
      file.type === 'image/heic' || file.type === 'image/heif';
  }

  function createPreview(file, container) {
    if (isHeic(file)) {
      var placeholder = document.createElement('div');
      placeholder.className = 'file-item-thumb-placeholder';
      placeholder.textContent = '⏳';
      container.prepend(placeholder);
      heic2any({ blob: file, toType: 'image/jpeg', quality: 0.3 })
        .then(function(blob) {
          if (Array.isArray(blob)) blob = blob[0];
          var img = document.createElement('img');
          img.className = 'file-item-thumb';
          img.src = URL.createObjectURL(blob);
          img.alt = 'プレビュー';
          placeholder.replaceWith(img);
        })
        .catch(function() {
          placeholder.textContent = '📱';
        });
    } else {
      var url = URL.createObjectURL(file);
      var img = document.createElement('img');
      img.className = 'file-item-thumb';
      img.alt = 'プレビュー';
      img.src = url;
      img.onerror = function() {
        URL.revokeObjectURL(url);
        var ph = document.createElement('div');
        ph.className = 'file-item-thumb-placeholder';
        ph.textContent = '🖼️';
        img.replaceWith(ph);
      };
      container.prepend(img);
    }
  }

  function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach(function(file, index) {
      var fmt = detectFormat(file);
      var item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML =
        '<div class="file-item-info">' +
          '<div class="file-item-name">' + escapeHtml(file.name) + '</div>' +
          '<div class="file-item-meta">' + formatSize(file.size) + ' ・ ' + escapeHtml(fmt.label) + ' (' + escapeHtml(file.type || '不明') + ')</div>' +
        '</div>' +
        '<span class="file-item-badge ' + fmt.badge + '">' + escapeHtml(fmt.label) + '</span>';

      // Delete button
      var delBtn = document.createElement('button');
      delBtn.className = 'file-item-delete';
      delBtn.textContent = '✕';
      delBtn.title = '削除';
      delBtn.setAttribute('data-index', index);
      delBtn.addEventListener('click', function() {
        removeFile(parseInt(this.getAttribute('data-index'), 10));
      });
      item.appendChild(delBtn);

      createPreview(file, item);
      fileList.appendChild(item);
    });
  }

  qualitySlider.addEventListener('input', function() {
    qualityValue.textContent = qualitySlider.value;
  });

  maxWidthSlider.addEventListener('input', function() {
    var v = parseInt(maxWidthSlider.value, 10);
    maxWidthValue.textContent = v === 0 ? '変更なし' : v + 'px';
  });

  outputFormat.addEventListener('change', function() {
    qualityNote.classList.toggle('visible', outputFormat.value === 'image/png');
  });

  convertBtn.addEventListener('click', async function() {
    if (selectedFiles.length === 0) return;
    convertBtn.disabled = true;
    convertBtn.textContent = '⏳ 変換中...';
    resultsList.innerHTML = '';
    resultsSummary.innerHTML = '';
    convertedResults = [];

    // Show progress
    progressSection.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '変換中...';
    progressCount.textContent = '0 / ' + selectedFiles.length;

    var quality = parseInt(qualitySlider.value, 10) / 100;
    var format = outputFormat.value;
    var maxW = parseInt(maxWidthSlider.value, 10);

    var totalOriginal = 0;
    var totalConverted = 0;
    var successCount = 0;

    for (var i = 0; i < selectedFiles.length; i++) {
      var file = selectedFiles[i];
      progressText.textContent = '変換中... ' + (i + 1) + ' / ' + selectedFiles.length;
      progressCount.textContent = (i + 1) + ' / ' + selectedFiles.length;
      progressBar.style.width = ((i + 1) / selectedFiles.length * 100) + '%';

      try {
        var result = await convertFile(file, quality, format, maxW);
        convertedResults.push(result);
        renderResultCard(result);
        totalOriginal += result.originalSize;
        totalConverted += result.convertedSize;
        successCount++;
      } catch (err) {
        renderErrorCard(file.name, err.message);
      }
    }

    // Summary
    if (successCount > 0) {
      var savedPct = totalOriginal > 0
        ? ((1 - totalConverted / totalOriginal) * 100).toFixed(1)
        : 0;
      var sign = savedPct >= 0 ? '削減' : '増加';
      resultsSummary.innerHTML =
        '<div class="summary-card">' +
          '<div class="summary-item"><span class="summary-label">変換成功</span><span class="summary-value">' + successCount + ' / ' + selectedFiles.length + ' 枚</span></div>' +
          '<div class="summary-item"><span class="summary-label">合計サイズ</span><span class="summary-value">' + formatSize(totalOriginal) + ' → ' + formatSize(totalConverted) + '</span></div>' +
          '<div class="summary-item"><span class="summary-label">サイズ変化</span><span class="summary-value ' + (savedPct >= 0 ? 'text-green' : 'text-red') + '">' + Math.abs(savedPct) + '% ' + sign + '</span></div>' +
        '</div>';
    }

    progressText.textContent = '変換完了！';
    resultsSection.style.display = 'block';
    convertBtn.disabled = false;
    convertBtn.textContent = '🔄 変換する';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  async function convertFile(file, quality, format, maxW) {
    var fmt = detectFormat(file);
    var blob;

    if (isHeic(file)) {
      blob = await heic2any({
        blob: file,
        toType: format,
        quality: format === 'image/png' ? undefined : quality,
      });
      if (Array.isArray(blob)) blob = blob[0];
      // Resize HEIC if needed
      if (maxW > 0) {
        blob = await resizeBlob(blob, quality, format, maxW);
      }
    } else {
      blob = await canvasConvert(file, quality, format, maxW);
    }

    var ext = format === 'image/jpeg' ? '.jpg'
      : format === 'image/png' ? '.png' : '.webp';
    var toExt = ext.replace('.', '').toUpperCase();
    var baseName = file.name.replace(/\.[^.]+$/, '') || 'pasted-image';
    var thumbUrl = URL.createObjectURL(blob);

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

  function resizeBlob(blob, quality, format, maxW) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(blob);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width;
        var h = img.height;
        if (maxW > 0 && w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          function(b) {
            if (!b) { reject(new Error('リサイズに失敗しました')); return; }
            resolve(b);
          },
          format,
          format === 'image/png' ? undefined : quality
        );
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('リサイズ用画像の読み込みに失敗'));
      };
      img.src = url;
    });
  }

  function canvasConvert(file, quality, format, maxW) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width;
        var h = img.height;
        if (maxW > 0 && w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          function(blob) {
            if (!blob) { reject(new Error('変換に失敗しました')); return; }
            resolve(blob);
          },
          format,
          format === 'image/png' ? undefined : quality
        );
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('画像の読み込みに失敗しました'));
      };
      img.src = url;
    });
  }

  function getExtension(name) {
    var m = name.match(/\.([^.]+)$/);
    return m ? m[1] : '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function renderResultCard(result) {
    var card = document.createElement('div');
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
    var dlBtn = document.createElement('button');
    dlBtn.className = 'result-download';
    dlBtn.textContent = '💾 ダウンロード';
    dlBtn.addEventListener('click', function() { downloadFile(result); });
    card.appendChild(dlBtn);
    resultsList.appendChild(card);
  }

  function renderErrorCard(name, message) {
    var card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHtml(name) + '</div>' +
        '<div class="result-detail" style="color:#dc3545;">⚠️ ' + escapeHtml(message) + '</div>' +
      '</div>';
    resultsList.appendChild(card);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function downloadFile(result) {
    var a = document.createElement('a');
    a.href = result.thumbUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadAllBtn.addEventListener('click', function() {
    convertedResults.forEach(function(r) { downloadFile(r); });
  });

  // ZIP download
  downloadZipBtn.addEventListener('click', async function() {
    if (convertedResults.length === 0) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = '⏳ ZIP作成中...';

    try {
      var zip = new JSZip();
      var usedNames = {};
      convertedResults.forEach(function(r) {
        var name = r.fileName;
        if (usedNames[name]) {
          var count = usedNames[name]++;
          var parts = name.split('.');
          var ext = parts.pop();
          name = parts.join('.') + '_' + count + '.' + ext;
        } else {
          usedNames[name] = 1;
        }
        zip.file(name, r.convertedBlob);
      });

      var zipBlob = await zip.generateAsync({ type: 'blob' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'converted-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('ZIPの作成に失敗しました: ' + err.message);
    }

    downloadZipBtn.disabled = false;
    downloadZipBtn.textContent = '📦 ZIPでダウンロード';
  });
})();
