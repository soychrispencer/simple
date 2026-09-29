/**
 * SimplePropiedades — Publica gratis
 *
 * Sistema unificado Story + Post:
 * - Capas: SOLO Story | Post
 * - Mismo ritmo vertical relativo
 * - Títulos densos XXL
 * - Cards tipográficas cuadradas (sin íconos/sombras)
 * - Hero limpio: sangrado asimétrico + puede pasar bajo CTA
 * - CTA solapado al hero (zona segura)
 * - Fondo atmósfera anclado al hero
 *
 * node run-illustrator.mjs
 */
#target illustrator

(function () {
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var ROOT = File($.fileName).parent;
    var ASSETS = new Folder(ROOT.fsName + '/assets');
    var EXPORT = new Folder(ROOT.fsName + '/export');
    if (!EXPORT.exists) EXPORT.create();

    function rgb(hex) {
        var c = new RGBColor();
        c.red = parseInt(hex.substr(1, 2), 16);
        c.green = parseInt(hex.substr(3, 2), 16);
        c.blue = parseInt(hex.substr(5, 2), 16);
        return c;
    }

    var C = {
        primary: rgb('#4F46E5'),
        text: rgb('#0C0C0E'),
        gray: rgb('#6B7280'),
        bg: rgb('#F7F7F5'),
        surface: rgb('#FFFFFF'),
        border: rgb('#E8E8E6'),
        white: rgb('#FFFFFF')
    };

    var CONTENT = {
        title1: 'Publica tu\npropiedad',
        title2: 'en minutos',
        subtitle: 'Crea tu publicación, recibe contactos y gestiona todo desde un solo lugar.',
        cards: [
            { line1: 'Publicación', line2: 'en 3 minutos' },
            { line1: 'Chat con', line2: 'interesados' },
            { line1: 'Boost', line2: 'opcional' }
        ],
        cta: 'Publicar ahora',
        url: 'simplepropiedades.app',
        hero: 'hero-publica-gratis.png',
        logo: 'logo-door.png',
        send: 'icon-send.png',
        globe: 'icon-globe.png'
    };

    function findFont(candidates) {
        var fonts = app.textFonts;
        var i, j, cand, name;
        for (j = 0; j < candidates.length; j++) {
            try { return fonts.getByName(candidates[j]); } catch (e) {}
        }
        for (j = 0; j < candidates.length; j++) {
            cand = String(candidates[j]).toLowerCase();
            for (i = 0; i < fonts.length; i++) {
                name = String(fonts[i].name).toLowerCase();
                if (name.indexOf(cand) >= 0) return fonts[i];
            }
        }
        return fonts[0];
    }

    var fontBold = findFont(['SegoeUI-Bold', 'Segoe UI Bold', 'Arial-BoldMT', 'Helvetica-Bold']);
    var fontReg = findFont(['SegoeUI', 'Segoe UI', 'ArialMT', 'Helvetica']);
    var fontSem = findFont(['SegoeUI-Semibold', 'Segoe UI Semibold', 'SegoeUI-Bold', 'Arial-BoldMT']);

    function abRect(ab) { return ab.artboardRect; }
    function abW(ab) { var r = abRect(ab); return r[2] - r[0]; }
    function abH(ab) { var r = abRect(ab); return r[1] - r[3]; }
    function docX(ab, x) { return abRect(ab)[0] + x; }
    function docY(ab, yFromTop) { return abRect(ab)[1] - yFromTop; }

    function roundRect(layer, ab, x, yFromTop, w, h, rad, fill, stroke, sw) {
        var item = layer.pathItems.roundedRectangle(docY(ab, yFromTop), docX(ab, x), w, h, rad, rad);
        item.filled = !!fill;
        if (fill) item.fillColor = fill;
        item.stroked = !!stroke;
        if (stroke) {
            item.strokeColor = stroke;
            item.strokeWidth = sw || 1;
        } else {
            item.stroked = false;
        }
        return item;
    }

    function pointText(layer, ab, str, size, font, color) {
        var tf = layer.textFrames.pointText([docX(ab, 0), docY(ab, 0)]);
        tf.contents = str;
        tf.textRange.characterAttributes.size = size;
        tf.textRange.characterAttributes.textFont = font;
        tf.textRange.characterAttributes.fillColor = color;
        return tf;
    }

    function placeTop(tf, ab, left, topY) {
        var b = tf.geometricBounds;
        tf.translate(docX(ab, left) - b[0], docY(ab, topY) - b[1]);
        return tf;
    }

    function centerTop(tf, ab, centerX, topY) {
        var b = tf.geometricBounds;
        return placeTop(tf, ab, centerX - (b[2] - b[0]) / 2, topY);
    }

    function boundsH(item) {
        var b = item.geometricBounds;
        return b[1] - b[3];
    }

    function placePng(layer, ab, fileName, x, yFromTop, targetW, targetH) {
        var f = new File(ASSETS.fsName + '/' + fileName);
        if (!f.exists) throw new Error('Missing ' + f.fsName);
        var item = layer.placedItems.add();
        item.file = f;
        var s = targetW / item.width;
        if (targetH) s = Math.min(s, targetH / item.height);
        item.width = item.width * s;
        item.height = item.height * s;
        item.left = docX(ab, x);
        item.top = docY(ab, yFromTop);
        item.name = fileName;
        return item;
    }

    /**
     * Hero oversized + sangrado asimétrico (edificio rompe borde derecho).
     * Sin clip — el CTA se dibuja encima y se solapa.
     */
    function placeHeroAsym(layer, ab, fileName, artW, topY, scaleW, shiftRight) {
        var f = new File(ASSETS.fsName + '/' + fileName);
        if (!f.exists) throw new Error('Missing ' + f.fsName);
        var item = layer.placedItems.add();
        item.file = f;
        var s = scaleW / item.width;
        item.width = item.width * s;
        item.height = item.height * s;
        item.left = docX(ab, (artW - item.width) / 2 + shiftRight);
        item.top = docY(ab, topY);
        item.name = 'hero-bleed';
        return item;
    }

    function buildPiece(doc, layer, abIndex, format) {
        var ab = doc.artboards[abIndex];
        doc.artboards.setActiveArtboardIndex(abIndex);
        doc.activeLayer = layer;

        var w = abW(ab);
        var h = abH(ab);
        var cx = w / 2;

        // Ritmo relativo unificado (% del alto)
        var safeTop = Math.round(h * (format === 'story' ? 0.135 : 0.036));
        var safeBottom = Math.round(h * (format === 'story' ? 0.145 : 0.042));
        var side = Math.round(w * 0.045);

        // Métricas proporcionales al canvas (mismo sistema Story/Post)
        var M = {
            logo: Math.round(h * (format === 'story' ? 0.02 : 0.025)),
            wm: Math.round(h * (format === 'story' ? 0.0115 : 0.0145)),
            title: Math.round(h * (format === 'story' ? 0.078 : 0.082)),
            sub: Math.round(h * (format === 'story' ? 0.0105 : 0.012)),
            card: Math.round(h * (format === 'story' ? 0.055 : 0.072)),
            cardR: 4,
            ctaH: Math.round(h * (format === 'story' ? 0.034 : 0.042)),
            ctaW: Math.round(w * (format === 'story' ? 0.42 : 0.37)),
            gap: Math.round(h * 0.0035)
        };
        if (M.title > 156) M.title = 156;
        if (M.title < 84) M.title = 84;
        if (M.card > 118) M.card = 118;
        if (M.card < 92) M.card = 92;
        if (M.ctaW > 470) M.ctaW = 470;
        if (M.ctaW < 350) M.ctaW = 350;

        // 1) Fondo
        placePng(layer, ab, format === 'story' ? 'bg-story.png' : 'bg-post.png', 0, 0, w, h);

        // 2) Bloque tipográfico denso (safe)
        var y = safeTop;

        var logo = placePng(layer, ab, CONTENT.logo, 0, y, M.logo);
        var tSimple = pointText(layer, ab, 'Simple', M.wm, fontBold, C.text);
        var tProp = pointText(layer, ab, 'Propiedades', M.wm, fontBold, C.primary);
        var bS = tSimple.geometricBounds;
        var bP = tProp.geometricBounds;
        var brandW = M.logo + 10 + (bS[2] - bS[0]) + (bP[2] - bP[0]);
        var brandLeft = (w - brandW) / 2;
        var lb = logo.geometricBounds;
        logo.translate(docX(ab, brandLeft) - lb[0], docY(ab, y) - lb[1]);
        placeTop(tSimple, ab, brandLeft + M.logo + 10, y + (M.logo - (bS[1] - bS[3])) / 2);
        bS = tSimple.geometricBounds;
        bP = tProp.geometricBounds;
        tProp.translate(bS[2] - bP[0], bS[1] - bP[1]);
        y += M.logo + M.gap + 2;

        var t1 = pointText(layer, ab, CONTENT.title1, M.title, fontBold, C.text);
        try {
            t1.textRange.characterAttributes.autoLeading = false;
            t1.textRange.characterAttributes.leading = M.title * 0.8;
        } catch (e) {}
        centerTop(t1, ab, cx, y);
        y += boundsH(t1) - 10;

        var t2Size = Math.round(M.title * 1.16);
        var t2 = pointText(layer, ab, CONTENT.title2, t2Size, fontBold, C.primary);
        try {
            t2.textRange.characterAttributes.autoLeading = false;
            t2.textRange.characterAttributes.leading = t2Size * 0.8;
        } catch (e) {}
        centerTop(t2, ab, cx, y);
        y += boundsH(t2) + M.gap;

        var subW = Math.min(Math.round(w * 0.86), w - side * 2);
        var subH = Math.round(M.sub * 2.15);
        var subPath = layer.pathItems.rectangle(docY(ab, y), docX(ab, (w - subW) / 2), subW, subH);
        var sub = layer.textFrames.areaText(subPath);
        sub.contents = CONTENT.subtitle;
        sub.textRange.characterAttributes.size = M.sub;
        sub.textRange.characterAttributes.textFont = fontReg;
        sub.textRange.characterAttributes.fillColor = C.gray;
        try {
            sub.textRange.characterAttributes.autoLeading = false;
            sub.textRange.characterAttributes.leading = M.sub * 1.22;
        } catch (e) {}
        sub.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
        y += subH + M.gap + 2;

        // 3) Un lenguaje de cards: tipográficas, cuadradas, sin efectos
        var cardGap = Math.round(w * 0.012);
        var cardSize = M.card;
        var cardsTotalW = cardSize * 3 + cardGap * 2;
        // En post, no dejar que las 3 cards desborden el ancho útil
        if (cardsTotalW > w - side * 2) {
            cardSize = Math.floor((w - side * 2 - cardGap * 2) / 3);
        }
        cardsTotalW = cardSize * 3 + cardGap * 2;
        var cardsLeft = Math.round((w - cardsTotalW) / 2);
        var i;
        for (i = 0; i < CONTENT.cards.length; i++) {
            var card = CONTENT.cards[i];
            var cX = cardsLeft + i * (cardSize + cardGap);
            roundRect(layer, ab, cX, y, cardSize, cardSize, M.cardR, C.surface, C.border, 1.2).name = 'card-' + (i + 1);

            var l1Size = format === 'story' ? 17 : 15;
            var l2Size = format === 'story' ? 17 : 15;
            var l1 = pointText(layer, ab, card.line1, l1Size, fontBold, C.text);
            var l2 = pointText(layer, ab, card.line2, l2Size, fontBold, C.primary);
            try {
                l1.textRange.characterAttributes.autoLeading = false;
                l1.textRange.characterAttributes.leading = l1Size * 1.1;
                l2.textRange.characterAttributes.autoLeading = false;
                l2.textRange.characterAttributes.leading = l2Size * 1.1;
            } catch (e) {}
            var b1 = l1.geometricBounds;
            var b2 = l2.geometricBounds;
            var blockH = (b1[1] - b1[3]) + 4 + (b2[1] - b2[3]);
            var textTop = y + (cardSize - blockH) / 2;
            placeTop(l1, ab, cX + (cardSize - (b1[2] - b1[0])) / 2, textTop);
            b1 = l1.geometricBounds;
            placeTop(l2, ab, cX + (cardSize - (b2[2] - b2[0])) / 2, textTop + (b1[1] - b1[3]) + 4);
        }
        var cardsBottom = y + cardSize;

        // 4) CTA en zona segura (se dibuja después, solapado al hero)
        var ctaH = M.ctaH;
        var ctaW = M.ctaW;
        var footerH = ctaH + 12 + 24 + 6;
        var ctaY = h - safeBottom - footerH;

        // 5) Hero: arranca justo tras cards; sangra derecha; pasa bajo CTA
        var heroTop = cardsBottom + Math.round(h * 0.004);
        var heroScaleW = w * (format === 'story' ? 1.52 : 1.46);
        var shiftRight = Math.round(w * (format === 'story' ? 0.12 : 0.11));
        placeHeroAsym(layer, ab, CONTENT.hero, w, heroTop, heroScaleW, shiftRight);

        // 6) CTA + URL encima (unidad visual con el hero)
        var ctaX = (w - ctaW) / 2;
        roundRect(layer, ab, ctaX, ctaY, ctaW, ctaH, 12, C.primary, null, 0).name = 'cta';

        var ctaFs = format === 'story' ? 24 : 20;
        var ctaLabel = pointText(layer, ab, CONTENT.cta, ctaFs, fontBold, C.white);
        var clb = ctaLabel.geometricBounds;
        var clw = clb[2] - clb[0];
        var clh = clb[1] - clb[3];
        var iconS = format === 'story' ? 20 : 18;
        var groupW = iconS + 12 + clw;
        var groupLeft = ctaX + (ctaW - groupW) / 2;
        placePng(layer, ab, CONTENT.send, groupLeft, ctaY + (ctaH - iconS) / 2, iconS);
        placeTop(ctaLabel, ab, groupLeft + iconS + 12, ctaY + (ctaH - clh) / 2);

        var urlY = ctaY + ctaH + 10;
        var urlFs = format === 'story' ? 19 : 17;
        var urlTf = pointText(layer, ab, CONTENT.url, urlFs, fontSem, C.primary);
        var ub = urlTf.geometricBounds;
        var uw = ub[2] - ub[0];
        var uh = ub[1] - ub[3];
        var gIcon = 17;
        var total = gIcon + 8 + uw;
        var ux = (w - total) / 2;
        placePng(layer, ab, CONTENT.globe, ux, urlY + Math.max(0, (uh - gIcon) / 2), gIcon);
        placeTop(urlTf, ab, ux + gIcon + 8, urlY);
    }

    // ——— Document ———
    var d;
    for (d = app.documents.length - 1; d >= 0; d--) {
        try {
            if (app.documents[d].name.indexOf('SimplePropiedades-Publica-gratis') === 0) {
                app.documents[d].close(SaveOptions.DONOTSAVECHANGES);
            }
        } catch (e) {}
    }

    var preset = new DocumentPreset();
    preset.title = 'SimplePropiedades — Publica gratis';
    preset.width = 1080;
    preset.height = 1920;
    preset.colorMode = DocumentColorSpace.RGB;
    preset.units = RulerUnits.Pixels;

    var doc = app.documents.addDocument(DocumentColorSpace.RGB, preset);
    doc.artboards[0].name = 'Story · 1080×1920';
    doc.artboards[0].artboardRect = [0, 1920, 1080, 0];
    doc.artboards.add([1200, 1920, 2280, 570]).name = 'Post · 1080×1350';

    var layerStory = doc.layers[0];
    layerStory.name = 'Story';
    var layerPost = doc.layers.add();
    layerPost.name = 'Post';

    buildPiece(doc, layerStory, 0, 'story');
    buildPiece(doc, layerPost, 1, 'post');

    try {
        for (d = doc.layers.length - 1; d >= 0; d--) {
            var n = doc.layers[d].name;
            if (n !== 'Story' && n !== 'Post') doc.layers[d].remove();
        }
    } catch (e) {}
    try { layerStory.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e) {}

    var aiFile = new File(ROOT.fsName + '/SimplePropiedades-Publica-gratis.ai');
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    doc.saveAs(aiFile, saveOpts);

    function exportAB(index, name) {
        doc.artboards.setActiveArtboardIndex(index);
        var dest = new File(EXPORT.fsName + '/' + name);
        var opt = new ExportOptionsPNG24();
        opt.antiAliasing = true;
        opt.transparency = false;
        opt.artBoardClipping = true;
        opt.horizontalScale = 100;
        opt.verticalScale = 100;
        doc.exportFile(dest, ExportType.PNG24, opt);
    }

    exportAB(0, 'simplepropiedades-story-publica-gratis-01.png');
    exportAB(1, 'simplepropiedades-post-publica-gratis-01.png');

    return aiFile.fsName;
})();
