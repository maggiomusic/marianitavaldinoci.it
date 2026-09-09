(function(){
  "use strict";

  var state = {
    lang: localStorage.getItem('mv_lang') || 'it',
    lightboxList: [],
    lightboxIndex: 0,
    seriesIndex: 0
  };

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------------- Header scroll + mobile nav ---------------- */
  var header = document.getElementById('siteHeader');
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', function(){
    navToggle.classList.toggle('open');
    mainNav.classList.toggle('open');
  });
  mainNav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      navToggle.classList.remove('open');
      mainNav.classList.remove('open');
    });
  });

  /* ---------------- i18n ---------------- */
  function get(obj, path){
    return path.split('.').reduce(function(o,k){ return (o && o[k] !== undefined) ? o[k] : null; }, obj);
  }

  function applyI18n(){
    var dict = SITE_DATA.i18n[state.lang];
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var val = get(dict, el.getAttribute('data-i18n'));
      if (val !== null) el.textContent = val;
    });
    document.querySelectorAll('.lang-toggle button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === state.lang);
    });
    renderBio(dict);
    renderCritica(dict);
    renderPaintings(dict);
    renderSculptures(dict);
    if (lightboxOpenType) refreshLightboxContent(dict);
  }

  document.querySelectorAll('.lang-toggle button').forEach(function(b){
    b.addEventListener('click', function(){
      state.lang = b.getAttribute('data-lang');
      localStorage.setItem('mv_lang', state.lang);
      applyI18n();
    });
  });

  /* ---------------- Bio ---------------- */
  function renderBio(dict){
    var box = document.getElementById('bioText');
    box.innerHTML = dict.bio.paragraphs.map(function(p){ return '<p>' + p + '</p>'; }).join('');

    var pl = document.getElementById('personaliList');
    pl.innerHTML = dict.bio.personali.map(function(row){
      return '<li><span class="yr">' + row[0] + '</span><span>' + row[1] + '</span></li>';
    }).join('');

    var cl = document.getElementById('collettiveList');
    cl.innerHTML = dict.bio.collettive.map(function(row){
      return '<li><span class="yr">' + row[0] + '</span><span>' + row[1] + '</span></li>';
    }).join('');
  }

  /* ---------------- Critica ---------------- */
  function renderCritica(dict){
    var box = document.getElementById('critList');
    box.innerHTML = dict.critica.quotes.map(function(q){
      var note = q.note ? ' — <em>' + q.note + '</em>' : '';
      return '' +
        '<div class="crit-item">' +
          '<div class="crit-mark">&ldquo;</div>' +
          '<p class="crit-text">' + q.text + '</p>' +
          '<div class="crit-meta"><span class="author">' + q.author + '</span><span>' + q.year + note + '</span></div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- Galleries ---------------- */
  function renderPaintings(dict){
    var grid = document.getElementById('paintingsGrid');
    grid.innerHTML = SITE_DATA.paintings.map(function(p, i){
      var t = p[state.lang];
      var isSeries = !!p.series;
      var img = 'assets/img/paintings/' + (isSeries ? p.series[0].key : p.key) + '.jpg';
      return '' +
        '<div class="card" data-type="painting" data-index="' + i + '">' +
          '<div class="frame" style="aspect-ratio:' + (p.ratio || 1) + '">' +
            '<img src="' + img + '" alt="' + t.title + '" loading="lazy">' +
          '</div>' +
          '<div class="cap"><div class="t">' + t.title + '</div><div class="y">' + (t.year || '') + (t.size ? ' · ' + t.size : '') + '</div></div>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.card').forEach(function(card){
      card.addEventListener('click', function(){ openLightbox('painting', parseInt(card.getAttribute('data-index'), 10)); });
    });
  }

  function renderSculptures(dict){
    var grid = document.getElementById('sculpturesGrid');
    grid.innerHTML = SITE_DATA.sculptures.map(function(s, i){
      var t = s[state.lang];
      var label = state.lang === 'it' ? s.series_label_it : s.series_label_en;
      return '' +
        '<div class="card" data-type="sculpture" data-index="' + i + '">' +
          '<div class="frame" style="aspect-ratio:' + (s.ratio || 1) + '">' +
            '<img src="assets/img/sculptures/' + s.key + '.png" alt="' + t.title + '" loading="lazy">' +
          '</div>' +
          '<div class="cap">' +
            (label ? '<div class="tag">' + (state.lang==='it' ? 'Vizi capitali' : 'Deadly sins') + '</div>' : '') +
            '<div class="t">' + t.title + '</div><div class="y">' + s.year + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.card').forEach(function(card){
      card.addEventListener('click', function(){ openLightbox('sculpture', parseInt(card.getAttribute('data-index'), 10)); });
    });
  }

  /* ---------------- Lightbox ---------------- */
  var lightbox = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbTitle = document.getElementById('lbTitle');
  var lbMeta = document.getElementById('lbMeta');
  var lbText = document.getElementById('lbText');
  var lbEyebrow = document.getElementById('lbEyebrow');
  var lbSeries = document.getElementById('lbSeries');
  var lbMedia = document.querySelector('.lb-media');
  var lightboxOpenType = null;
  var currentRatio = 1;

  /* Size the media box itself to the current image's own proportions,
     as large as possible within the available width/height — so a tall
     painting gets a tall box and a wide one gets a wide box, instead of
     every image being letterboxed into one fixed shape. */
  var lbInner = document.querySelector('.lb-inner');
  function sizeLightboxMedia(ratio){
    currentRatio = ratio || 1;
    var mobile = window.innerWidth <= 880;
    // measure .lb-inner, not .lb-media itself — the media box's own content
    // (an <img> that may not have finished loading yet) isn't a reliable
    // thing to measure, so derive its column width from the grid math instead
    var innerW = lbInner.clientWidth;
    var gap = parseFloat(getComputedStyle(lbInner).columnGap) || 0;
    var availW = mobile ? innerW : (innerW - gap) * (1.3 / 2.1);
    var availH = window.innerHeight * (mobile ? 0.5 : 0.82);
    var boxW = Math.min(availW, availH * currentRatio);
    var boxH = boxW / currentRatio;
    lbMedia.style.width = boxW + 'px';
    lbMedia.style.height = boxH + 'px';
  }
  window.addEventListener('resize', function(){
    if (lightbox.classList.contains('open')) sizeLightboxMedia(currentRatio);
  });

  function openLightbox(type, index){
    lightboxOpenType = type;
    state.lightboxIndex = index;
    state.seriesIndex = 0;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshLightboxContent(SITE_DATA.i18n[state.lang]);
  }

  function closeLightbox(){
    lightbox.classList.remove('open');
    lightboxOpenType = null;
    document.body.style.overflow = '';
  }

  function refreshLightboxContent(dict){
    if (lightboxOpenType === 'painting'){
      var p = SITE_DATA.paintings[state.lightboxIndex];
      var t = p[state.lang];
      lbEyebrow.textContent = dict.gallery.dipinti_title;
      if (p.series){
        var part = p.series[state.seriesIndex];
        var pt = part[state.lang];
        lbTitle.textContent = t.title + ' — ' + pt.title;
        lbMeta.textContent = [t.year, t.size].filter(Boolean).join(' · ');
        lbText.textContent = pt.text || t.text;
        lbImage.src = 'assets/img/paintings/' + part.key + '.jpg';
        lbImage.alt = pt.title;
        sizeLightboxMedia(part.ratio || p.ratio);
        lbSeries.innerHTML = p.series.map(function(part2, i){
          return '<button data-i="' + i + '" class="' + (i===state.seriesIndex?'active':'') + '"><img src="assets/img/paintings/' + part2.key + '.jpg" alt=""></button>';
        }).join('');
        lbSeries.querySelectorAll('button').forEach(function(btn){
          btn.addEventListener('click', function(){
            state.seriesIndex = parseInt(btn.getAttribute('data-i'), 10);
            refreshLightboxContent(SITE_DATA.i18n[state.lang]);
          });
        });
      } else {
        lbTitle.textContent = t.title;
        lbMeta.textContent = [t.year, t.size].filter(Boolean).join(' · ');
        lbText.textContent = t.text;
        lbImage.src = 'assets/img/paintings/' + p.key + '.jpg';
        lbImage.alt = t.title;
        sizeLightboxMedia(p.ratio);
        lbSeries.innerHTML = '';
      }
    } else if (lightboxOpenType === 'sculpture'){
      var s = SITE_DATA.sculptures[state.lightboxIndex];
      var st = s[state.lang];
      var label = state.lang === 'it' ? s.series_label_it : s.series_label_en;
      lbEyebrow.textContent = dict.gallery.sculture_title;
      lbTitle.textContent = st.title;
      lbMeta.textContent = [label, s.year].filter(Boolean).join(' · ');
      lbText.textContent = '';
      lbImage.src = 'assets/img/sculptures/' + s.key + '.png';
      lbImage.alt = st.title;
      sizeLightboxMedia(s.ratio);
      lbSeries.innerHTML = '';
    }
  }

  function navigate(delta){
    var list = lightboxOpenType === 'painting' ? SITE_DATA.paintings : SITE_DATA.sculptures;
    state.lightboxIndex = (state.lightboxIndex + delta + list.length) % list.length;
    state.seriesIndex = 0;
    refreshLightboxContent(SITE_DATA.i18n[state.lang]);
  }

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', function(){ navigate(-1); });
  document.getElementById('lbNext').addEventListener('click', function(){ navigate(1); });
  lightbox.addEventListener('click', function(e){ if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e){
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal(){
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el){ io.observe(el); });
  }

  /* ---------------- Init ---------------- */
  applyI18n();
  initReveal();
})();
