(() => {
  'use strict';

  var MAX_FILES = 10;
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var fileBtnTrigger = document.getElementById('fileBtnTrigger');
  var fileListSection = document.getElementById('fileListSection');
  var fileList = document.getElementById('fileList');
  var fileCountEl = document.getElementById('fileCount');
  var clearAllBtn = document.getElementById('clearAllBtn');
  var settings = document.getElementById('settings');
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
  var downloadZipBtn = document.getElementById('downloadZipBtn');
  var restartBtn = document.getElementById('restartBtn');
  var renameArea = document.getElementById('renameArea');
  var renamePrefix = document.getElementById('renamePrefix');
  var renameDateCheck = document.getElementById('renameDateCheck');
  var renamePreview = document.getElementById('renamePreview');
  var renameBulkApply = document.getElementById('renameBulkApply');


  var selectedFiles = [];
  var convertedResults = [];
  var sizeLimit = 0;

  var FORMAT_MAP = {
    'heic':{label:'HEIC',badge:'badge-heic'},'heif':{label:'HEIF',badge:'badge-heic'},
    'jpg':{label:'JPEG',badge:'badge-jpeg'},'jpeg':{label:'JPEG',badge:'badge-jpeg'},
    'png':{label:'PNG',badge:'badge-png'},'webp':{label:'WebP',badge:'badge-webp'},
    'gif':{label:'GIF',badge:'badge-gif'},'bmp':{label:'BMP',badge:'badge-bmp'},
    'tiff':{label:'TIFF',badge:'badge-tiff'},'tif':{label:'TIFF',badge:'badge-tiff'},
    'svg':{label:'SVG',badge:'badge-unknown'},
  };

  // === Format preset ===
  presetCards.addEventListener('click', function(e) {
    var c = e.target.closest('.preset-card'); if (!c) return;
    presetCards.querySelectorAll('.preset-card').forEach(function(x) { x.classList.remove('active'); });
    c.classList.add('active');
    outputFormat.value = c.getAttribute('data-format');
    qualityNote.classList.toggle('visible', outputFormat.value === 'image/png');
    updateSizeState();
  });

  // === Size preset ===
  sizePresetCards.addEventListener('click', function(e) {
    var c = e.target.closest('.size-preset'); if (!c || c.disabled) return;
    sizePresetCards.querySelectorAll('.size-preset').forEach(function(x) { x.classList.remove('active'); });
    c.classList.add('active');
    sizeLimit = parseInt(c.getAttribute('data-limit'), 10) || 0;
  });

  function updateSizeState() {
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

  // === Rename ===
  function getDateStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function updateRenamePreview() {
    var p = renamePrefix.value.trim();
    if (!p) { renamePreview.textContent = ''; return; }
    var ds = renameDateCheck.checked ? getDateStr() + '_' : '';
    renamePreview.textContent = '→ ' + ds + p + '_01.jpg, ' + ds + p + '_02.jpg …';
  }
  renamePrefix.addEventListener('input', updateRenamePreview);
  renameDateCheck.addEventListener('change', updateRenamePreview);

  renameBulkApply.addEventListener('click', function() {
    var p = renamePrefix.value.trim(); if (!p) return;
    var ds = renameDateCheck.checked ? getDateStr() + '_' : '';
    convertedResults.forEach(function(r, i) {
      var ext = r.fileName.match(/\.[^.]+$/)[0];
      r.fileName = ds + p + '_' + String(i+1).padStart(2,'0') + ext;
    });
    renderResultsList();
  });



  // === File selection ===
  fileBtnTrigger.addEventListener('click', function(e) { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click', function(e) {
    if (e.target === fileBtnTrigger || e.target === fileInput) return; fileInput.click();
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length > 0) addFiles(fileInput.files); fileInput.value = '';
  });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  });
  document.addEventListener('paste', function(e) {
    var items = e.clipboardData && e.clipboardData.items; if (!items) return;
    var files = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) { var f = items[i].getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) { e.preventDefault(); addFiles(files); }
  });

  // === Clear / Restart ===
  clearAllBtn.addEventListener('click', resetAll);
  restartBtn.addEventListener('click', function() { resetAll(); window.scrollTo({top:0,behavior:'smooth'}); });

  function resetAll() {
    selectedFiles = []; convertedResults = [];
    fileListSection.style.display = 'none'; settings.style.display = 'none';
    resultsSection.style.display = 'none'; progressSection.style.display = 'none';
    resultsList.innerHTML = ''; fileList.innerHTML = '';
    resultsSummary.innerHTML = ''; renamePrefix.value = ''; renameDateCheck.checked = false;
    renamePreview.textContent = '';
    dropZone.querySelector('.drop-text').textContent = 'ここに写真をドラッグ＆ドロップ';
  }

  function addFiles(newFiles) {
    var toAdd = Array.from(newFiles);
    var remaining = MAX_FILES - selectedFiles.length;
    if (remaining <= 0) { alert('最大' + MAX_FILES + '枚までです'); return; }
    if (toAdd.length > remaining) { toAdd = toAdd.slice(0, remaining); }
    selectedFiles = selectedFiles.concat(toAdd);
    updateUI();
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1); updateUI();
    if (selectedFiles.length === 0) {
      fileListSection.style.display = 'none'; settings.style.display = 'none';
      dropZone.querySelector('.drop-text').textContent = 'ここに写真をドラッグ＆ドロップ';
    }
  }

  function updateUI() {
    resultsSection.style.display = 'none'; progressSection.style.display = 'none';
    resultsList.innerHTML = ''; convertedResults = [];
    if (selectedFiles.length > 0) {
      dropZone.querySelector('.drop-text').textContent = '✅ ' + selectedFiles.length + '枚えらび済み';
      fileCountEl.textContent = selectedFiles.length + '枚の写真';
      renderFileList();
      fileListSection.style.display = 'block'; settings.style.display = 'block';
      settings.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }

  // === Format / Preview ===
  function detectFormat(file) {
    var ext = getExt(file.name).toLowerCase();
    if (FORMAT_MAP[ext]) return {ext:ext, label:FORMAT_MAP[ext].label, badge:FORMAT_MAP[ext].badge};
    var m = file.type;
    if (m==='image/heic'||m==='image/heif') return {ext:'heic',label:'HEIC',badge:'badge-heic'};
    if (m==='image/jpeg') return {ext:'jpeg',label:'JPEG',badge:'badge-jpeg'};
    if (m==='image/png') return {ext:'png',label:'PNG',badge:'badge-png'};
    if (m==='image/webp') return {ext:'webp',label:'WebP',badge:'badge-webp'};
    return {ext:ext||'?',label:(ext||'?').toUpperCase(),badge:'badge-unknown'};
  }
  function isHeic(f) {
    var n = f.name.toLowerCase();
    return n.endsWith('.heic')||n.endsWith('.heif')||f.type==='image/heic'||f.type==='image/heif';
  }
  function createPreview(file, container) {
    if (isHeic(file)) {
      var ph = document.createElement('div'); ph.className='file-item-thumb-placeholder'; ph.textContent='⏳';
      container.prepend(ph);
      heic2any({blob:file,toType:'image/jpeg',quality:0.3}).then(function(b) {
        if (Array.isArray(b)) b=b[0];
        var img=document.createElement('img'); img.className='file-item-thumb'; img.src=URL.createObjectURL(b);
        ph.replaceWith(img);
      }).catch(function() { ph.textContent='📱'; });
    } else {
      var url=URL.createObjectURL(file), img=document.createElement('img');
      img.className='file-item-thumb'; img.src=url;
      img.onerror=function() { URL.revokeObjectURL(url);
        var p=document.createElement('div'); p.className='file-item-thumb-placeholder'; p.textContent='🖼️'; img.replaceWith(p);
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
        '<div class="file-item-info"><div class="file-item-name">' + esc(file.name||'クリップボード画像') +
        '</div><div class="file-item-meta">' + fmtSize(file.size) + '</div></div>' +
        '<span class="file-item-badge ' + fmt.badge + '">' + esc(fmt.label) + '</span>';
      var del = document.createElement('button'); del.type='button'; del.className='file-item-delete'; del.textContent='✕';
      del.setAttribute('data-index', index);
      del.addEventListener('click', function() { removeFile(parseInt(this.getAttribute('data-index'),10)); });
      item.appendChild(del);
      createPreview(file, item);
      fileList.appendChild(item);
    });
  }

  // === Settings ===
  qualitySlider.addEventListener('input', function() { qualityValue.textContent = qualitySlider.value; });
  maxWidthSlider.addEventListener('input', function() {
    var v = parseInt(maxWidthSlider.value, 10);
    maxWidthValue.textContent = v === 0 ? '変更なし' : v + 'px';
  });

  // === Size-limited convert ===
  async function convertWithLimit(file, format, maxW, target, baseQ) {
    var blob = await rawConvert(file, baseQ, format, maxW);
    if (format === 'image/png' || target <= 0 || blob.size <= target) return blob;
    var lo = 0.05, hi = baseQ, best = null;
    for (var i = 0; i < 8; i++) {
      var mid = (lo + hi) / 2;
      var c = await rawConvert(file, mid, format, maxW);
      if (c.size <= target) { best = c; lo = mid; } else { hi = mid; }
    }
    if (best) return best;
    var rw = maxW > 0 ? maxW : 1920;
    for (var j = 0; j < 6; j++) {
      rw = Math.round(rw * 0.7); if (rw < 200) break;
      var r = await rawConvert(file, lo, format, rw);
      if (r.size <= target) return r;
    }
    throw new Error(fmtSize(target) + ' 以下にできませんでした。サイズ制限を変更してください。');
  }

  async function rawConvert(file, quality, format, maxW) {
    if (isHeic(file)) {
      var b = await heic2any({blob:file,toType:format,quality:format==='image/png'?undefined:quality});
      if (Array.isArray(b)) b=b[0];
      if (maxW > 0) b = await resizeBlob(b, quality, format, maxW);
      return b;
    }
    return canvasConvert(file, quality, format, maxW);
  }

  // === Main convert ===
  convertBtn.addEventListener('click', async function() {
    if (!selectedFiles.length) return;
    if (outputFormat.value === 'image/png' && sizeLimit > 0) {
      alert('PNG形式ではサイズ制限は使えません。JPEGかWebPを選んでください。'); return;
    }
    convertBtn.disabled = true;
    convertBtn.querySelector('.convert-btn-text').textContent = '変換中…';
    convertBtn.querySelector('.convert-btn-icon').textContent = '⏳';
    resultsList.innerHTML = ''; resultsSummary.innerHTML = '';
    renameList.innerHTML = ''; convertedResults = [];

    progressSection.style.display = 'block'; progressBar.style.width = '0%';
    progressText.textContent = '⏳ 変換しています…';
    progressCount.textContent = '0 / ' + selectedFiles.length;

    var q = parseInt(qualitySlider.value, 10) / 100;
    var fmt = outputFormat.value;
    var maxW = parseInt(maxWidthSlider.value, 10);
    var ext = fmt === 'image/jpeg' ? '.jpg' : fmt === 'image/png' ? '.png' : '.webp';
    var totOrig = 0, totConv = 0, ok = 0;

    for (var i = 0; i < selectedFiles.length; i++) {
      var file = selectedFiles[i];
      progressText.textContent = '⏳ ' + (i+1) + '枚目…';
      progressCount.textContent = (i+1) + ' / ' + selectedFiles.length;
      progressBar.style.width = ((i+1) / selectedFiles.length * 100) + '%';
      try {
        var blob = await convertWithLimit(file, fmt, maxW, sizeLimit, q);
        var fi = detectFormat(file);
        var baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
        var result = {
          originalName: file.name, originalSize: file.size,
          convertedBlob: blob, convertedSize: blob.size,
          fileName: baseName + ext, thumbUrl: URL.createObjectURL(blob),
          fromExt: fi.label, toExt: ext.replace('.','').toUpperCase(),
        };
        convertedResults.push(result);
        totOrig += result.originalSize; totConv += result.convertedSize; ok++;
      } catch (err) { renderErrorCard(file.name, err.message); }
    }

    renderResultsList();
    if (ok > 0) {
      var pct = totOrig > 0 ? ((1 - totConv / totOrig) * 100).toFixed(1) : 0;
      var sign = pct >= 0 ? '小さくなりました' : '大きくなりました';
      var limitInfo = '';
      if (sizeLimit > 0) {
        limitInfo = '<div class="summary-item"><span class="summary-label">📧 サイズ制限</span><span class="summary-value text-green">全枚 ' + fmtSize(sizeLimit) + ' 以下 ✓</span></div>';
      }
      resultsSummary.innerHTML =
        '<div class="summary-card">' +
          '<div class="summary-item"><span class="summary-label">変換成功</span><span class="summary-value">' + ok + ' / ' + selectedFiles.length + ' 枚</span></div>' +
          '<div class="summary-item"><span class="summary-label">合計サイズ</span><span class="summary-value">' + fmtSize(totOrig) + ' → ' + fmtSize(totConv) + '</span></div>' +
          '<div class="summary-item"><span class="summary-label">サイズ変化</span><span class="summary-value ' + (pct >= 0 ? 'text-green' : 'text-red') + '">' + Math.abs(pct) + '% ' + sign + '</span></div>' +
          limitInfo +
        '</div>';
    }

    renameArea.style.display = convertedResults.length > 0 ? 'block' : 'none';
    progressText.textContent = '✅ 完了！';
    resultsSection.style.display = 'block';
    convertBtn.disabled = false;
    convertBtn.querySelector('.convert-btn-text').textContent = '変換する';
    convertBtn.querySelector('.convert-btn-icon').textContent = '🔄';
    resultsSection.scrollIntoView({behavior:'smooth',block:'start'});
  });

  // === Render results ===
  function renderResultsList() {
    resultsList.innerHTML = '';
    convertedResults.forEach(function(r) {
      var card = document.createElement('div'); card.className = 'result-card';
      card.innerHTML =
        '<img class="result-thumb" src="' + r.thumbUrl + '" alt="">' +
        '<div class="result-info"><div class="result-name">' + esc(r.fileName) +
        '</div><div class="result-detail">' + fmtSize(r.originalSize) + ' → ' + fmtSize(r.convertedSize) + '</div></div>';
      var dl = document.createElement('button'); dl.type='button'; dl.className='result-download'; dl.textContent='💾 保存';
      dl.addEventListener('click', function() { download(r); });
      card.appendChild(dl);
      resultsList.appendChild(card);
    });
  }

  function renderErrorCard(name, msg) {
    var card = document.createElement('div'); card.className = 'result-card result-card-error';
    card.innerHTML = '<div class="result-info"><div class="result-name">' + esc(name||'画像') +
      '</div><div class="result-detail" style="color:#dc2626">⚠️ ' + esc(msg) + '</div></div>';
    resultsList.appendChild(card);
  }

  // === Canvas / Resize ===
  function resizeBlob(blob, q, fmt, maxW) {
    return new Promise(function(ok, ng) {
      var img = new Image(), url = URL.createObjectURL(blob);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (maxW > 0 && w > maxW) { h = Math.round(h*(maxW/w)); w = maxW; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(b) { b ? ok(b) : ng(new Error('失敗')); }, fmt, fmt==='image/png'?undefined:q);
      };
      img.onerror = function() { URL.revokeObjectURL(url); ng(new Error('失敗')); };
      img.src = url;
    });
  }
  function canvasConvert(file, q, fmt, maxW) {
    return new Promise(function(ok, ng) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (maxW > 0 && w > maxW) { h = Math.round(h*(maxW/w)); w = maxW; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(b) { b ? ok(b) : ng(new Error('失敗')); }, fmt, fmt==='image/png'?undefined:q);
      };
      img.onerror = function() { URL.revokeObjectURL(url); ng(new Error('失敗')); };
      img.src = url;
    });
  }

  // === Utilities ===
  function getExt(n) { var m = n.match(/\.([^.]+)$/); return m ? m[1] : ''; }
  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function download(r) {
    var a = document.createElement('a'); a.href = r.thumbUrl; a.download = r.fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // === ZIP ===
  downloadZipBtn.addEventListener('click', async function() {
    if (!convertedResults.length) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.querySelector('.download-main-text').textContent = 'ZIP作成中…';
    try {
      var zip = new JSZip(), used = {};
      convertedResults.forEach(function(r) {
        var name = r.fileName;
        if (used[name]) { var c = used[name]++; var p = name.split('.'); var e = p.pop(); name = p.join('.')+'_'+c+'.'+e; }
        else { used[name] = 1; }
        zip.file(name, r.convertedBlob);
      });
      var zb = await zip.generateAsync({type:'blob'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(zb); a.download = 'converted-images.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch (e) { alert('ZIP作成失敗: ' + e.message); }
    downloadZipBtn.disabled = false;
    downloadZipBtn.querySelector('.download-main-text').textContent = 'ダウンロード';
  });
})();
