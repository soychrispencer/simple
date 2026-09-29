#target illustrator
/**
 * SimplePropiedades — Publica gratis v4
 * User brief:
 * - Titulares exageradamente grandes
 * - Fondo rico (blobs + washes)
 * - Hero oversized (puede salir de safe zone)
 * - Texto + CTA SOLO en safe zones
 * - Cards más cuadradas, iconos flat sin efectos
 * - Solo 2 capas: post + story
 */
(function () {
  if (!app.documents.length) throw new Error("Sin documento");
  var doc = app.activeDocument;
  var dn = String(doc.name || "");
  if (dn.indexOf("SimplePropiedades") < 0 && dn.indexOf("Publica") < 0) {
    throw new Error("Documento incorrecto: " + dn + " — abortado");
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
    text: hex("0C0C0E"),
    gray: hex("4B5563"),
    muted: hex("6B7280"),
    bg: hex("F3F4FB"),
    surface: hex("FFFFFF"),
    border: hex("E5E7EB"),
    white: hex("FFFFFF"),
    wash: hex("C7D2FE"),
    wash2: hex("DDD6FE")
  };

  function font(names) {
    for (var i = 0; i < names.length; i++) {
      try {
        return app.textFonts.getByName(names[i]);
      } catch (e) {}
    }
    return app.textFonts[0];
  }
  var fBlack = font(["Arial-Black", "Arial Black", "SegoeUI-Bold", "Arial-BoldMT", "Arial Bold"]);
  var fBold = font(["SegoeUI-Bold", "Arial-BoldMT", "Arial Bold"]);
  var fSemi = font(["SegoeUI-Semibold", "SegoeUI-Bold", "Arial-BoldMT"]);
  var fReg = font(["SegoeUI", "ArialMT", "Arial"]);
  var fMed = font(["SegoeUI-Semibold", "SegoeUI", "ArialMT"]);

  // ---- Reset to exactly 2 layers: story + post ----
  var li, guard;
  for (li = doc.layers.length - 1; li >= 0; li--) {
    try {
      doc.layers[li].locked = false;
      doc.layers[li].visible = true;
    } catch (e0) {}
  }
  for (li = 0; li < doc.layers.length; li++) {
    try {
      while (doc.layers[li].pageItems.length) doc.layers[li].pageItems[0].remove();
    } catch (e1) {
      break;
    }
  }
  guard = 0;
  while (doc.layers.length > 1 && guard < 80) {
    guard++;
    try {
      doc.layers[doc.layers.length - 1].remove();
    } catch (e2) {
      break;
    }
  }
  var layerStory = doc.layers[0];
  layerStory.name = "story";
  layerStory.locked = false;
  while (layerStory.pageItems.length) layerStory.pageItems[0].remove();

  var layerPost;
  try {
    layerPost = doc.layers.getByName("post");
  } catch (e3) {
    layerPost = doc.layers.add();
    layerPost.name = "post";
  }
  layerPost.locked = false;
  while (layerPost.pageItems.length) layerPost.pageItems[0].remove();

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
    tr.characterAttributes.leading = leading || size * 0.98;
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

  function drawRichBg(L, left, top, w, h) {
    rect(L, left, top, w, h, C.bg, null, 0);
    // Large atmospheric fields
    oval(L, left - w * 0.25, top + h * 0.08, w * 0.9, h * 0.55, C.wash, 42);
    oval(L, left + w * 0.35, top + h * 0.02, w * 0.85, h * 0.48, C.wash2, 32);
    oval(L, left + w * 0.05, top - h * 0.35, w * 0.95, h * 0.55, C.wash, 36);
    oval(L, left + w * 0.4, top - h * 0.55, w * 0.75, h * 0.45, C.primarySoft, 16);
    oval(L, left - w * 0.15, top - h * 0.72, w * 0.7, h * 0.4, C.wash2, 30);
    oval(L, left + w * 0.55, top - h * 0.85, w * 0.6, h * 0.35, C.primarySoft, 12);
    try {
      var bl = placeFile(L, ASSETS + "blob-lg.png", left - 80, top - h * 0.08, w * 0.7, h * 0.42, "blob-lg", true);
      bl.opacity = 60;
      var bm = placeFile(L, ASSETS + "blob-a.png", left + w * 0.4, top - h * 0.25, w * 0.65, h * 0.38, "blob-a", true);
      bm.opacity = 45;
      var bs = placeFile(L, ASSETS + "blob-sm.png", left + w * 0.5, top - h * 0.62, w * 0.55, h * 0.32, "blob-sm", true);
      bs.opacity = 55;
      var bc = placeFile(L, ASSETS + "blob-c.png", left - 20, top - h * 0.7, w * 0.45, h * 0.28, "blob-c", true);
      bc.opacity = 40;
    } catch (e) {}
    // Dot craft
    var i, j;
    for (i = 0; i < 6; i++) {
      for (j = 0; j < 10; j++) {
        oval(L, left + 28 + i * 13, top - 180 - j * 13, 3, 3, C.primarySoft, 38);
        oval(L, left + w - 110 + i * 13, top - 420 - j * 13, 3, 3, C.primarySoft, 32);
      }
    }
  }

  function flatIcon(L, kind, x, y, s) {
    // Flat geometric icons — NO glow, NO shadow
    if (kind === "clock") {
      var c = L.pathItems.ellipse(y, x, s, s);
      c.filled = false;
      c.stroked = true;
      c.strokeColor = C.primary;
      c.strokeWidth = 2;
      // hands
      rect(L, x + s * 0.48, y - s * 0.22, 2, s * 0.28, C.primary, null, 0);
      rect(L, x + s * 0.48, y - s * 0.45, s * 0.22, 2, C.primary, null, 0);
    } else if (kind === "chat") {
      rrect(L, x, y, s * 0.92, s * 0.7, 4, null, C.primary, 2);
      // tail
      var t = L.pathItems.add();
      t.setEntirePath([
        [x + s * 0.18, y - s * 0.7],
        [x + s * 0.18, y - s * 0.92],
        [x + s * 0.42, y - s * 0.7]
      ]);
      t.closed = true;
      t.filled = true;
      t.fillColor = C.primary;
      t.stroked = false;
      rect(L, x + s * 0.18, y - s * 0.22, s * 0.55, 2, C.primary, null, 0);
      rect(L, x + s * 0.18, y - s * 0.38, s * 0.4, 2, C.primary, null, 0);
    } else {
      // globe
      var g = L.pathItems.ellipse(y, x, s, s);
      g.filled = false;
      g.stroked = true;
      g.strokeColor = C.primary;
      g.strokeWidth = 2;
      var g2 = L.pathItems.ellipse(y - s * 0.08, x + s * 0.28, s * 0.44, s * 0.84);
      g2.filled = false;
      g2.stroked = true;
      g2.strokeColor = C.primary;
      g2.strokeWidth = 1.6;
      rect(L, x + 2, y - s * 0.32, s - 4, 1.6, C.primary, null, 0);
      rect(L, x + 2, y - s * 0.58, s - 4, 1.6, C.primary, null, 0);
    }
  }

  function squareCards(L, cL, y, cW, items) {
    var gap = 12;
    var n = items.length;
    var cardW = (cW - gap * (n - 1)) / n;
    var cardH = Math.max(cardW * 1.02, 130); // almost square
    var i;
    for (i = 0; i < n; i++) {
      var x = cL + i * (cardW + gap);
      // Flat card: soft fill + thin border, radius 8 (más cuadrado / menos pill)
      rrect(L, x, y, cardW, cardH, 8, C.surface, C.border, 1.15, 100);
      flatIcon(L, items[i].icon, x + (cardW - 28) / 2, y - 18, 28);
      area(L, items[i].label, x + 10, y - 56, cardW - 20, cardH - 70, 16, fSemi, C.text, "center", 21);
    }
    return cardH;
  }

  var CARD_ITEMS = [
    {
      icon: "clock",
      label: "Publicaci" + String.fromCharCode(0x00F3) + "n\nen 2 minutos"
    },
    { icon: "chat", label: "Chat con\ninteresados" },
    { icon: "globe", label: "Alcance\nnacional" }
  ];

  // ===================== STORY =====================
  function buildStory() {
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

    var topSafe = 270;
    var bottomSafe = 360;
    var sideSafe = 64;
    var cL = L + sideSafe;
    var cW = W - sideSafe * 2;

    drawRichBg(layerStory, L, T, W, H);

    // HERO oversized — bleeds past sides / into lower canvas
    var heroPath = ASSETS + "hero-publica-gratis-float.png";
    if (!new File(heroPath).exists) heroPath = HEROES + "hero-float-trim-tight.png";
    var heroW = W * 1.48;
    var heroH = 1050;
    var heroLeft = L + (W - heroW) / 2 - 40;
    var heroTop = T - 820;
    placeFile(layerStory, heroPath, heroLeft, heroTop, heroW, heroH, "hero", true);

    // Soft scrim so CTA/text stay readable over hero
    rect(layerStory, L, B + bottomSafe + 160, W, 260, C.bg, null, 0, 62);
    oval(layerStory, L - 60, B + bottomSafe + 240, W + 120, 300, C.bg, 75);

    // ---- TEXT SAFE ZONE (top) ----
    var y = T - topSafe;
    var logo = new File(ASSETS + "logo-door.png");
    var lp = layerStory.placedItems.add();
    lp.file = logo;
    lp.name = "logo";
    var ls = (40 / lp.height) * 100;
    lp.resize(ls, ls);
    var logoBlockW = lp.width + 14 + 200;
    lp.left = L + (W - logoBlockW) / 2;
    lp.top = y;
    area(layerStory, "Simple", lp.left + lp.width + 12, y - 2, 100, 24, 20, fBold, C.text, "left", 22);
    area(layerStory, "Propiedades", lp.left + lp.width + 12, y - 24, 200, 24, 20, fBold, C.primary, "left", 22);
    y -= 78;

    // EXAGGERATED titles
    area(layerStory, "Publica tu", cL - 10, y, cW + 20, 110, 96, fBlack, C.text, "center", 78);
    y -= 98;
    area(layerStory, "propiedad", cL - 10, y, cW + 20, 110, 96, fBlack, C.text, "center", 78);
    y -= 98;
    area(layerStory, "en minutos", cL - 10, y, cW + 20, 110, 96, fBlack, C.primary, "center", 78);
    y -= 108;

    area(
      layerStory,
      "Crea tu publicaci" +
        String.fromCharCode(0x00F3) +
        "n, recibe contactos y gestiona todo desde un solo lugar.",
      cL + 8,
      y,
      cW - 16,
      64,
      19,
      fReg,
      C.muted,
      "center",
      26
    );
    y -= 82;

    squareCards(layerStory, cL, y, cW, CARD_ITEMS);

    // CTA only in bottom safe zone
    var ctaW = 540;
    var ctaL = L + (W - ctaW) / 2;
    var ctaY = B + bottomSafe + 88;
    rrect(layerStory, ctaL, ctaY, ctaW, 72, 12, C.primary, null, 0);
    area(layerStory, "Publicar ahora", ctaL, ctaY, ctaW, 72, 24, fSemi, C.white, "center", 28);
    area(layerStory, "simplepropiedades.app", cL, B + bottomSafe - 6, cW, 28, 14, fMed, C.primary, "center", 18);
  }

  // ===================== POST =====================
  function buildPost() {
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

    var topSafe = 64;
    var bottomSafe = 120;
    var sideSafe = 56;
    var cL = L + sideSafe;
    var cW = W - sideSafe * 2;

    drawRichBg(layerPost, L, T, W, H);

    var heroPath = ASSETS + "hero-publica-gratis.png";
    if (!new File(heroPath).exists) heroPath = HEROES + "hero-post-full.png";
    var heroW = W * 1.52;
    var heroH = 820;
    var heroLeft = L + (W - heroW) / 2 + 30;
    var heroTop = T - 480;
    placeFile(layerPost, heroPath, heroLeft, heroTop, heroW, heroH, "hero", true);

    rect(layerPost, L, B + bottomSafe + 120, W, 200, C.bg, null, 0, 55);
    oval(layerPost, L - 40, B + bottomSafe + 200, W + 80, 220, C.bg, 70);

    var y = T - topSafe;
    var logo = new File(ASSETS + "logo-door.png");
    var lp = layerPost.placedItems.add();
    lp.file = logo;
    lp.name = "logo";
    var ls = (36 / lp.height) * 100;
    lp.resize(ls, ls);
    var logoBlockW = lp.width + 14 + 190;
    lp.left = L + (W - logoBlockW) / 2;
    lp.top = y;
    area(layerPost, "Simple", lp.left + lp.width + 10, y - 1, 90, 22, 18, fBold, C.text, "left", 20);
    area(layerPost, "Propiedades", lp.left + lp.width + 10, y - 22, 190, 22, 18, fBold, C.primary, "left", 20);
    y -= 58;

    // HUGE feed titles
    area(layerPost, "Publica tu", cL - 16, y, cW + 32, 92, 78, fBlack, C.text, "center", 64);
    y -= 70;
    area(layerPost, "propiedad", cL - 16, y, cW + 32, 92, 78, fBlack, C.text, "center", 64);
    y -= 70;
    area(layerPost, "en minutos", cL - 16, y, cW + 32, 92, 80, fBlack, C.primary, "center", 66);
    y -= 88;

    area(
      layerPost,
      "Crea tu publicaci" +
        String.fromCharCode(0x00F3) +
        "n, recibe contactos y gestiona todo desde un solo lugar.",
      cL + 16,
      y,
      cW - 32,
      48,
      16,
      fReg,
      C.muted,
      "center",
      22
    );
    y -= 58;

    squareCards(layerPost, cL, y, cW, CARD_ITEMS);

    var ctaW = 500;
    var ctaL = L + (W - ctaW) / 2;
    var ctaY = B + bottomSafe + 64;
    rrect(layerPost, ctaL, ctaY, ctaW, 64, 12, C.primary, null, 0);
    area(layerPost, "Publicar ahora", ctaL, ctaY, ctaW, 64, 22, fSemi, C.white, "center", 26);
    area(layerPost, "simplepropiedades.app", cL, B + bottomSafe - 12, cW, 26, 13, fMed, C.primary, "center", 16);
  }

  buildStory();
  buildPost();

  // Final layer purge
  for (var i = doc.layers.length - 1; i >= 0; i--) {
    var n = doc.layers[i].name;
    if (n !== "story" && n !== "post") {
      try {
        doc.layers[i].locked = false;
        doc.layers[i].remove();
      } catch (e4) {}
    }
  }

  app.redraw();
  "OK v4 — layers story + post";
})();
