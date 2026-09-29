#target illustrator
/**
 * SimplePropiedades â€” Publica gratis REBUILD
 * - Solo 2 capas: story + post
 * - Titulares enormes
 * - Sin badge PUBLICA GRATIS
 * - Fondo con mÃ¡s atmÃ³sfera
 * - Hero oversized (puede salir de safe zone)
 * - Texto + CTA solo en safe zones
 * - 3 cards mÃ¡s cuadradas, SIN iconos
 */
(function () {
  if (!app.documents.length) throw new Error("Sin documento");
  var doc = app.activeDocument;
  if (String(doc.name).indexOf("SimplePropiedades") < 0 && String(doc.name).indexOf("Publica") < 0) {
    throw new Error("Documento incorrecto: " + doc.name);
  }

  app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

  var ASSETS =
    "C:/Users/chris/Desktop/Simple/brand/ads/simplepropiedades/2026-07-sistema-visual/illustrator/assets/";
  var HEROES =
    "C:/Users/chris/Desktop/Simple/brand/ads/simplepropiedades/2026-07-sistema-visual/heroes/";

  function hex(h) {
    var c = new RGBColor();
    var s = h.charAt(0) === "#" ? h.substr(1) : h;
    c.red = parseInt(s.substr(0, 2), 16);
    c.green = parseInt(s.substr(2, 2), 16);
    c.blue = parseInt(s.substr(4, 2), 16);
    return c;
  }

  var C = {
    primary: hex("4F46E5"),
    primarySoft: hex("818CF8"),
    deep: hex("312E81"),
    deep2: hex("1E1B4B"),
    text: hex("0C0C0E"),
    gray: hex("4B5563"),
    muted: hex("6B7280"),
    bg: hex("F4F5FB"),
    bg2: hex("EEF0FF"),
    surface: hex("FFFFFF"),
    border: hex("E5E7EB"),
    white: hex("FFFFFF"),
    wash: hex("C7D2FE")
  };

  function font(names) {
    for (var i = 0; i < names.length; i++) {
      try {
        return app.textFonts.getByName(names[i]);
      } catch (e) {}
    }
    return app.textFonts[0];
  }
  var fBlack = font(["SegoeUI-Bold", "Arial-Black", "Arial Black", "Arial-BoldMT", "Arial Bold"]);
  var fBold = font(["SegoeUI-Bold", "Arial-BoldMT", "Arial Bold"]);
  var fSemi = font(["SegoeUI-Semibold", "SegoeUI-Bold", "Arial-BoldMT"]);
  var fReg = font(["SegoeUI", "ArialMT", "Arial"]);
  var fMed = font(["SegoeUI-Semibold", "SegoeUI", "ArialMT"]);

    // Wipe layers safely (no infinite loop)
  var li;
  for (li = doc.layers.length - 1; li >= 0; li--) {
    try {
      doc.layers[li].locked = false;
      doc.layers[li].visible = true;
    } catch (eL) {}
  }
  // Clear page items on all layers first
  for (li = 0; li < doc.layers.length; li++) {
    try {
      while (doc.layers[li].pageItems.length) doc.layers[li].pageItems[0].remove();
    } catch (eC) { break; }
  }
  // Remove extra layers from the end
  var guard = 0;
  while (doc.layers.length > 1 && guard < 50) {
    guard++;
    try {
      doc.layers[doc.layers.length - 1].remove();
    } catch (eR) { break; }
  }
  var layerStory = doc.layers[0];
  layerStory.name = "story";
  layerStory.locked = false;
  while (layerStory.pageItems.length) layerStory.pageItems[0].remove();
  var layerPost = null;
  try { layerPost = doc.layers.getByName("post"); } catch (eP) { layerPost = doc.layers.add(); layerPost.name = "post"; }
  layerPost.locked = false;
  while (layerPost.pageItems.length) layerPost.pageItems[0].remove();

  function clearLayer(L) {
    L.locked = false;
    L.visible = true;
    while (L.pageItems.length) L.pageItems[0].remove();
  }

  function rect(L, left, top, w, h, fill, stroke, sw, op) {
    var p = L.pathItems.rectangle(top, left, w, h);
    p.filled = !!fill;
    if (fill) p.fillColor = fill;
    p.stroked = !!stroke;
    if (stroke) {
      p.strokeColor = stroke;
      p.strokeWidth = sw || 1;
    } else p.strokeWidth = 0;
    if (typeof op === "number") p.opacity = op;
    return p;
  }
  function rrect(L, left, top, w, h, rad, fill, stroke, sw, op) {
    var p = L.pathItems.roundedRectangle(top, left, w, h, rad, rad);
    p.filled = !!fill;
    if (fill) p.fillColor = fill;
    p.stroked = !!stroke;
    if (stroke) {
      p.strokeColor = stroke;
      p.strokeWidth = sw || 1;
    } else p.strokeWidth = 0;
    if (typeof op === "number") p.opacity = op;
    return p;
  }
  function oval(L, left, top, w, h, fill, op) {
    var p = L.pathItems.ellipse(top, left, w, h);
    p.filled = true;
    p.fillColor = fill;
    p.stroked = false;
    if (typeof op === "number") p.opacity = op;
    return p;
  }
  function area(L, str, left, top, w, h, size, fnt, col, justify, leading) {
    var path = L.pathItems.rectangle(top, left, w, h);
    path.filled = false;
    path.stroked = false;
    var tf = L.textFrames.areaText(path);
    tf.contents = str;
    var tr = tf.textRange;
    tr.characterAttributes.size = size;
    tr.characterAttributes.textFont = fnt;
    tr.characterAttributes.fillColor = col;
    tr.characterAttributes.autoLeading = false;
    tr.characterAttributes.leading = leading || size * 1.05;
    if (justify === "center") tr.paragraphAttributes.justification = Justification.CENTER;
    else if (justify === "left") tr.paragraphAttributes.justification = Justification.LEFT;
    return tf;
  }

  function placeFile(L, path, left, top, w, h, name, cover) {
    var f = new File(path);
    if (!f.exists) throw new Error("Missing " + path);
    var p = L.placedItems.add();
    p.file = f;
    p.name = name || "placed";
    var sx = (w / p.width) * 100;
    var sy = (h / p.height) * 100;
    var s = cover ? Math.max(sx, sy) : Math.min(sx, sy);
    p.resize(s, s);
    p.left = left + (w - p.width) / 2;
    p.top = top - (h - p.height) / 2;
    return p;
  }

  function placeLogo(L, cx, top, maxH) {
    var f = new File(ASSETS + "logo-door.png");
    var p = L.placedItems.add();
    p.file = f;
    p.name = "logo-mark";
    var s = (maxH / p.height) * 100;
    p.resize(s, s);
    // wordmark text next to it
    var markW = p.width;
    p.left = cx - (markW + 220) / 2;
    p.top = top;
    area(L, "Simple", p.left + markW + 10, top - 2, 120, 28, 22, fBold, C.text, "left", 24);
    area(L, "Propiedades", p.left + markW + 10, top - 26, 200, 28, 22, fBold, C.primary, "left", 24);
    return p;
  }

  function drawRichBg(L, left, top, w, h) {
    rect(L, left, top, w, h, C.bg, null, 0);
    // Atmospheric washes (reference-like depth)
    oval(L, left - w * 0.15, top + h * 0.05, w * 0.7, h * 0.45, C.wash, 35);
    oval(L, left + w * 0.45, top - h * 0.05, w * 0.7, h * 0.4, C.primarySoft, 18);
    oval(L, left + w * 0.1, top - h * 0.55, w * 0.8, h * 0.5, C.wash, 28);
    oval(L, left - w * 0.1, top - h * 0.75, w * 0.55, h * 0.35, C.primarySoft, 14);
    // Soft blobs if available
    try {
      var bl = placeFile(L, ASSETS + "blob-lg.png", left - 40, top - h * 0.15, w * 0.55, h * 0.35, "blob-lg", true);
      bl.opacity = 55;
      var bs = placeFile(L, ASSETS + "blob-sm.png", left + w * 0.55, top - h * 0.55, w * 0.5, h * 0.3, "blob-sm", true);
      bs.opacity = 50;
    } catch (e) {}
    // Dot grids (subtle craft)
    var i, j;
    for (i = 0; i < 5; i++) {
      for (j = 0; j < 8; j++) {
        oval(L, left + 36 + i * 14, top - 220 - j * 14, 3.5, 3.5, C.primarySoft, 40);
        oval(L, left + w - 100 + i * 14, top - 480 - j * 14, 3.5, 3.5, C.primarySoft, 35);
      }
    }
  }

  function squareCards(L, cL, y, cW, labels) {
    var gap = 14;
    var n = labels.length;
    var cardW = (cW - gap * (n - 1)) / n;
    var cardH = Math.max(cardW * 0.92, 118); // mÃ¡s cuadrados
    var i;
    for (i = 0; i < n; i++) {
      var x = cL + i * (cardW + gap);
      rrect(L, x, y, cardW, cardH, 10, C.surface, C.border, 1.25, 100);
      area(L, labels[i], x + 12, y - cardH * 0.28, cardW - 24, cardH * 0.55, 18, fSemi, C.text, "center", 24);
    }
    return cardH;
  }

  // ===================== STORY 1080x1920 =====================
  function buildStory() {
    clearLayer(layerStory);
    var ab = doc.artboards[0];
    doc.artboards.setActiveArtboardIndex(0);
    ab.name = "story";
    var r = ab.artboardRect;
    var L = r[0],
      T = r[1],
      R = r[2],
      B = r[3];
    var W = R - L,
      H = T - B;

    // Safe zones for text/CTA
    var topSafe = 260;
    var bottomSafe = 320;
    var sideSafe = 72;
    var cL = L + sideSafe;
    var cW = W - sideSafe * 2;

    drawRichBg(layerStory, L, T, W, H);

    // HERO oversized â€” can bleed past safe sides / into lower area
    var heroPath = ASSETS + "hero-publica-gratis-float.png";
    if (!new File(heroPath).exists) heroPath = HEROES + "hero-float-trim-tight.png";
    var heroW = W * 1.35;
    var heroH = 980;
    var heroLeft = L + (W - heroW) / 2;
    var heroTop = T - 900;
    placeFile(layerStory, heroPath, heroLeft, heroTop, heroW, heroH, "hero", true);

    // Soft fade over hero bottom so CTA stays clean
    rect(layerStory, L, B + bottomSafe + 180, W, 220, C.bg, null, 0, 55);
    oval(layerStory, L - 40, B + bottomSafe + 280, W + 80, 260, C.bg, 70);

    // TEXT in safe zone (top)
    var y = T - topSafe;
    // Logo row
    var logo = new File(ASSETS + "logo-door.png");
    var lp = layerStory.placedItems.add();
    lp.file = logo;
    lp.name = "logo";
    var ls = (42 / lp.height) * 100;
    lp.resize(ls, ls);
    var logoBlockW = lp.width + 16 + 210;
    lp.left = L + (W - logoBlockW) / 2;
    lp.top = y;
    area(layerStory, "SimplePropiedades", lp.left + lp.width + 12, y - 4, 220, 36, 20, fBold, C.text, "left", 24);
    y -= 70;

    // HUGE titles
    area(layerStory, "Publica tu", cL, y, cW, 100, 88, fBlack, C.text, "center", 70);
    y -= 92;
    area(layerStory, "propiedad", cL, y, cW, 100, 88, fBlack, C.text, "center", 70);
    y -= 92;
    area(layerStory, "en minutos", cL, y, cW, 100, 88, fBlack, C.primary, "center", 70);
    y -= 100;

    area(
      layerStory,
      "Crea tu publicaci" +
        String.fromCharCode(0x00F3) +
        "n, recibe contactos y gestiona todo desde un solo lugar.",
      cL + 10,
      y,
      cW - 20,
      70,
      20,
      fReg,
      C.muted,
      "center",
      28
    );
    y -= 90;

    // Cards (safe zone) â€” no icons
    var labels = [
      "Publicaci" + String.fromCharCode(0x00F3) + "n\nen 3 minutos",
      "Chat con\ninteresados",
      "Boost\nopcional"
    ];
    var cardH = squareCards(layerStory, cL, y, cW, labels);
    // cards sit above hero visually â€” send behind? Actually hero is below in composition
    // Move cards aren't overlapping hero much if y is still high

    // CTA fixed in bottom safe zone
    var ctaW = 520;
    var ctaL = L + (W - ctaW) / 2;
    var ctaY = B + bottomSafe + 90;
    rrect(layerStory, ctaL, ctaY, ctaW, 72, 20, C.primary, null, 0);
    area(layerStory, "Publicar ahora", ctaL, ctaY, ctaW, 72, 24, fSemi, C.white, "center", 28);
    area(layerStory, "simplepropiedades.app", cL, B + bottomSafe - 8, cW, 28, 14, fMed, C.primary, "center", 18);
  }

  // ===================== POST 1080x1350 =====================
  function buildPost() {
    clearLayer(layerPost);
    var ab = doc.artboards[1];
    doc.artboards.setActiveArtboardIndex(1);
    ab.name = "post";
    var r = ab.artboardRect;
    var L = r[0],
      T = r[1],
      R = r[2],
      B = r[3];
    var W = R - L,
      H = T - B;

    var topSafe = 72;
    var bottomSafe = 110;
    var sideSafe = 64;
    var cL = L + sideSafe;
    var cW = W - sideSafe * 2;

    drawRichBg(layerPost, L, T, W, H);

    // Hero oversized bleed
    var heroPath = ASSETS + "hero-publica-gratis.png";
    if (!new File(heroPath).exists) heroPath = HEROES + "hero-post-full.png";
    var heroW = W * 1.38;
    var heroH = 740;
    var heroLeft = L + (W - heroW) / 2;
    var heroTop = T - 560;
    placeFile(layerPost, heroPath, heroLeft, heroTop, heroW, heroH, "hero", true);

    rect(layerPost, L, B + bottomSafe + 140, W, 180, C.bg, null, 0, 50);
    oval(layerPost, L - 30, B + bottomSafe + 220, W + 60, 200, C.bg, 65);

    var y = T - topSafe - 8;
    var logo = new File(ASSETS + "logo-door.png");
    var lp = layerPost.placedItems.add();
    lp.file = logo;
    lp.name = "logo";
    var ls = (38 / lp.height) * 100;
    lp.resize(ls, ls);
    var logoBlockW = lp.width + 16 + 200;
    lp.left = L + (W - logoBlockW) / 2;
    lp.top = y;
    area(layerPost, "SimplePropiedades", lp.left + lp.width + 12, y - 2, 210, 32, 18, fBold, C.text, "left", 22);
    y -= 58;

    // HUGE titles for feed impact
    area(layerPost, "Publica tu propiedad", cL - 8, y, cW + 16, 90, 72, fBlack, C.text, "center", 58);
    y -= 62;
    area(layerPost, "en minutos", cL, y, cW, 90, 74, fBlack, C.primary, "center", 60);
    y -= 92;

    area(
      layerPost,
      "Crea tu publicaci" +
        String.fromCharCode(0x00F3) +
        "n, recibe contactos y gestiona todo desde un solo lugar.",
      cL + 20,
      y,
      cW - 40,
      50,
      17,
      fReg,
      C.muted,
      "center",
      24
    );
    y -= 64;

    var labels = [
      "Publicaci" + String.fromCharCode(0x00F3) + "n\nen 3 minutos",
      "Chat con\ninteresados",
      "Boost\nopcional"
    ];
    squareCards(layerPost, cL, y, cW, labels);

    var ctaW = 480;
    var ctaL = L + (W - ctaW) / 2;
    var ctaY = B + bottomSafe + 70;
    rrect(layerPost, ctaL, ctaY, ctaW, 64, 18, C.primary, null, 0);
    area(layerPost, "Publicar ahora", ctaL, ctaY, ctaW, 64, 22, fSemi, C.white, "center", 26);
    area(layerPost, "simplepropiedades.app", cL, B + bottomSafe - 10, cW, 26, 13, fMed, C.primary, "center", 16);
  }

  buildStory();
  buildPost();

  // Ensure only two layers remain
  for (var i = doc.layers.length - 1; i >= 0; i--) {
    var n = doc.layers[i].name;
    if (n !== "story" && n !== "post") {
      try {
        doc.layers[i].locked = false;
        doc.layers[i].remove();
      } catch (e3) {}
    }
  }

  app.redraw();
  "SimplePropiedades rebuild OK â€” layers: story + post";
})();


