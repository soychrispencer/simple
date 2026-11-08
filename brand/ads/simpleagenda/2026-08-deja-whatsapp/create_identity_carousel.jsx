#target illustrator

(function () {
    var previousInteractionLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var output = Folder('G:/Mi unidad/Simple/Publicidad/SimpleAgenda/01 Lanzamiento Instagram/04 Identidad final/Identidad consolidada final 2026-11-08 - Instrument Sans');
    var appRoot = Folder('C:/Users/Chris/Desktop/Proyectos/Simple/apps/simpleagenda/public');
    var logoHorizontal = File(appRoot.fsName + '/logo-horizontal.png');
    var logoLight = File(appRoot.fsName + '/logo-light.png');
    var illustration = File(appRoot.fsName + '/hero/personaje-calendario-hibrido-secuencia-compacta.png');

    function rgb(hex) {
        var c = new RGBColor();
        c.red = parseInt(hex.substr(1, 2), 16);
        c.green = parseInt(hex.substr(3, 2), 16);
        c.blue = parseInt(hex.substr(5, 2), 16);
        return c;
    }

    function font(names, label) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        throw new Error('Falta la fuente ' + label + '.');
    }

    function rect(layer, left, top, width, height, fill, radius, stroke, strokeWidth) {
        var path = radius
            ? layer.pathItems.roundedRectangle(top, left, width, height, radius, radius)
            : layer.pathItems.rectangle(top, left, width, height);
        path.filled = fill !== null;
        if (fill !== null) path.fillColor = fill;
        path.stroked = stroke !== null;
        if (stroke !== null) {
            path.strokeColor = stroke;
            path.strokeWidth = strokeWidth || 1;
        }
        return path;
    }

    function ellipse(layer, left, top, width, height, fill, stroke, strokeWidth) {
        var path = layer.pathItems.ellipse(top, left, width, height);
        path.filled = fill !== null;
        if (fill !== null) path.fillColor = fill;
        path.stroked = stroke !== null;
        if (stroke !== null) {
            path.strokeColor = stroke;
            path.strokeWidth = strokeWidth || 1;
        }
        return path;
    }

    function line(layer, x1, y1, x2, y2, color, width) {
        var path = layer.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width || 1;
        return path;
    }

    function text(layer, value, left, baseline, size, fill, face, leading, tracking, alignment) {
        var frame = layer.textFrames.pointText([left, baseline]);
        frame.contents = value;
        var attrs = frame.textRange.characterAttributes;
        attrs.textFont = face;
        attrs.size = size;
        attrs.fillColor = fill;
        attrs.autoLeading = false;
        attrs.leading = leading || size * 1.16;
        attrs.tracking = tracking || 0;
        if (alignment) frame.textRange.paragraphAttributes.justification = alignment;
        return frame;
    }

    function place(layer, file, left, top, width, height) {
        var item = layer.placedItems.add();
        item.file = file;
        item.width = width;
        item.height = height;
        item.position = [left, top];
        item.embed();
        return item;
    }

    var C = {
        teal: rgb('#002E32'),
        lime: rgb('#B8DB3A'),
        ink: rgb('#0E0E10'),
        carbon: rgb('#1C1C1C'),
        carbonSoft: rgb('#252525'),
        white: rgb('#FFFFFF'),
        paper: rgb('#FAFAFA'),
        ash: rgb('#D9D9D9'),
        muted: rgb('#A3A3A3'),
        darkMuted: rgb('#626B6C'),
        paleTeal: rgb('#DCE9E7'),
    };

    var W = 1080, H = 1350, GAP = 100;
    var x = [0, W + GAP, 2 * (W + GAP)];
    var displayFont = font(['InstrumentSans-Bold', 'InstrumentSans-SemiBold', 'InstrumentSans-Regular'], 'Instrument Sans');
    var regularFont = font(['Inter18pt-Regular'], 'Inter Regular');
    var boldFont = font(['Inter28pt-Bold'], 'Inter Bold');

    var names = ['01_Problema_WhatsApp', '02_Agenda_24-7', '03_Registro_Gratis'];

    if (!output.exists && !output.create()) throw new Error('No se pudo crear la carpeta de salida.');
    var deliverableFiles = [File(output.fsName + '/SimpleAgenda_Carrusel_Identidad.ai')];
    for (var checkIndex = 0; checkIndex < names.length; checkIndex++) {
        deliverableFiles.push(File(output.fsName + '/' + names[checkIndex] + '.png'));
    }
    for (var existingIndex = 0; existingIndex < deliverableFiles.length; existingIndex++) {
        if (deliverableFiles[existingIndex].exists) {
            throw new Error('Ya existe ' + deliverableFiles[existingIndex].name + '. No se sobrescribieron archivos.');
        }
    }
    if (!logoHorizontal.exists || !logoLight.exists || !illustration.exists) {
        throw new Error('Falta el logo o la ilustración híbrida de SimpleAgenda.');
    }

    var doc = app.documents.add(DocumentColorSpace.RGB, W, H);
    doc.rulerUnits = RulerUnits.Pixels;
    doc.artboards.add([W + GAP, H, 2 * W + GAP, 0]);
    doc.artboards.add([2 * (W + GAP), H, 3 * W + 2 * GAP, 0]);
    doc.artboards[0].name = '01 - Coordinar por WhatsApp';
    doc.artboards[1].name = '02 - Agenda disponible 24/7';
    doc.artboards[2].name = '03 - Registro gratis';

    function darkLogo(layer, offset) {
        place(layer, logoLight, offset + 72, 1280, 228, 59.4);
    }

    function lightLogo(layer, offset) {
        place(layer, logoHorizontal, offset + 72, 1280, 228, 59.4);
    }

    function base(layer, offset, page, background, isDark) {
        rect(layer, offset, H, W, H, background, 0, null, 0);
        if (isDark) darkLogo(layer, offset); else lightLogo(layer, offset);
        text(layer, page, offset + 904, 1274, 18, isDark ? C.muted : C.darkMuted, boldFont, 22, 30);
        line(layer, offset + 72, 66, offset + 1008, 66, isDark ? C.carbonSoft : C.ash, 1.5);
    }

    function bubble(layer, left, top, width, height, fill, message, time, textColor) {
        rect(layer, left, top, width, height, fill, 23, null, 0);
        text(layer, message, left + 25, top - 42, 24, textColor || C.white, regularFont, 30, 0);
        text(layer, time, left + width - 74, top - 71, 13, C.muted, regularFont, 16, 0);
    }

    // 01 — dolor: coordinación manual por mensajería.
    var one = doc.layers[0];
    one.name = '01 - Dolor WhatsApp';
    base(one, x[0], '01 / 03', C.teal, true);
    text(one, 'EL PROBLEMA', x[0] + 78, 1154, 16, C.lime, boldFont, 20, 170);
    text(one, 'Deja de coordinar', x[0] + 78, 1068, 72, C.white, displayFont, 82, -19);
    text(one, 'horas por', x[0] + 78, 986, 72, C.white, displayFont, 82, -19);
    text(one, 'WhatsApp.', x[0] + 78, 900, 88, C.lime, displayFont, 96, -22);
    text(one, 'Tu agenda profesional, con reservas online 24/7.', x[0] + 82, 824, 26, C.white, regularFont, 34, -3);
    rect(one, x[0] + 70, 710, 940, 506, C.ink, 30, C.carbonSoft, 1.5);
    text(one, 'COORDINAR UNA HORA NO DEBER\u00cdA SER AS\u00cd', x[0] + 104, 654, 15, C.muted, boldFont, 18, 100);
    bubble(one, x[0] + 104, 585, 610, 88, C.carbonSoft, '\u00bfTienes una hora para ma\u00f1ana?', '10:42', C.white);
    bubble(one, x[0] + 374, 467, 600, 88, C.teal, '\u00bfY a las 10:30?', '10:43', C.white);
    bubble(one, x[0] + 104, 349, 650, 88, C.carbonSoft, 'D\u00e9jame revisar mi agenda...', '10:45', C.white);
    text(one, 'DESLIZA', x[0] + 858, 112, 16, C.lime, boldFont, 20, 65);
    line(one, x[0] + 940, 117, x[0] + 956, 117, C.lime, 2.5);
    line(one, x[0] + 949, 124, x[0] + 956, 117, C.lime, 2.5);
    line(one, x[0] + 949, 110, x[0] + 956, 117, C.lime, 2.5);

    // 02 — solución: personaje híbrido y reserva online.
    var two = doc.layers.add();
    two.name = '02 - Agenda 24/7';
    base(two, x[1], '02 / 03', C.paper, false);
    text(two, 'LA SOLUCI\u00d3N', x[1] + 78, 1154, 16, C.teal, boldFont, 20, 170);
    text(two, 'Tu agenda', x[1] + 78, 1064, 78, C.teal, displayFont, 88, -18);
    text(two, 'disponible', x[1] + 78, 980, 78, C.teal, displayFont, 88, -18);
    rect(two, x[1] + 78, 854, 214, 74, C.lime, 22, null, 0);
    text(two, '24/7', x[1] + 111, 816, 48, C.ink, displayFont, 54, -7);
    text(two, 'Comparte tu link. Tus pacientes eligen\nhorario y reciben confirmaci\u00f3n autom\u00e1tica.', x[1] + 318, 900, 22, C.darkMuted, regularFont, 29, -2);
    place(two, illustration, x[1] + 72, 752, 936, 468);
    rect(two, x[1] + 72, 215, 936, 96, C.teal, 24, null, 0);
    text(two, 'Sin llamadas. Sin dobles reservas.', x[1] + 110, 184, 27, C.white, boldFont, 32, -3);
    text(two, 'La cita se confirma mientras t\u00fa atiendes.', x[1] + 110, 150, 17, C.paleTeal, regularFont, 23, 0);

    // 03 — conversión: claro, breve y sin cobro automático.
    var three = doc.layers.add();
    three.name = '03 - Regístrate gratis';
    base(three, x[2], '03 / 03', C.ink, true);
    text(three, 'M\u00c1S TIEMPO PARA ATENDER', x[2] + 78, 1154, 16, C.lime, boldFont, 20, 140);
    text(three, 'Sin llamadas.', x[2] + 78, 1048, 76, C.white, displayFont, 88, -18);
    text(three, 'Sin dobles reservas.', x[2] + 78, 956, 69, C.white, displayFont, 79, -16);
    text(three, 'Con cobros integrados.', x[2] + 82, 870, 31, C.lime, boldFont, 38, -2);
    rect(three, x[2] + 72, 682, 936, 164, C.carbon, 27, C.carbonSoft, 1.5);
    rect(three, x[2] + 108, 633, 120, 62, C.lime, 17, null, 0);
    text(three, '24/7', x[2] + 133, 601, 27, C.ink, boldFont, 32, 0);
    text(three, 'Tus pacientes reservan incluso fuera de horario.', x[2] + 260, 621, 20, C.white, regularFont, 26, 0);
    rect(three, x[2] + 72, 390, 936, 186, C.lime, 28, null, 0);
    text(three, 'Reg\u00edstrate gratis', x[2] + 118, 342, 39, C.ink, displayFont, 44, -5);
    text(three, 'Prueba Pro por 30 d\u00edas.', x[2] + 118, 294, 27, C.ink, boldFont, 32, -2);
    text(three, 'Despu\u00e9s sigues en Gratis. Sin tarjeta ni cobro autom\u00e1tico.', x[2] + 118, 258, 18, C.ink, regularFont, 24, -1);
    ellipse(three, x[2] + 906, 328, 54, 54, C.teal, null, 0);
    line(three, x[2] + 922, 301, x[2] + 942, 301, C.white, 3);
    line(three, x[2] + 934, 309, x[2] + 942, 301, C.white, 3);
    line(three, x[2] + 934, 293, x[2] + 942, 301, C.white, 3);
    text(three, 'simpleagenda.app', x[2] + 82, 170, 18, C.white, boldFont, 22, 30);

    var aiFile = File(output.fsName + '/SimpleAgenda_Carrusel_Identidad.ai');
    var saveOptions = new IllustratorSaveOptions();
    saveOptions.pdfCompatible = true;
    saveOptions.embedLinkedFiles = true;
    doc.artboards.setActiveArtboardIndex(0);
    doc.saveAs(aiFile, saveOptions);

    var pngOptions = new ExportOptionsPNG24();
    pngOptions.antiAliasing = true;
    pngOptions.transparency = false;
    pngOptions.artBoardClipping = true;
    pngOptions.horizontalScale = 100;
    pngOptions.verticalScale = 100;
    for (var i = 0; i < 3; i++) {
        doc.artboards.setActiveArtboardIndex(i);
        doc.exportFile(File(output.fsName + '/' + names[i] + '.png'), ExportType.PNG24, pngOptions);
    }
    doc.artboards.setActiveArtboardIndex(0);
    app.userInteractionLevel = previousInteractionLevel;
    alert('Carrusel actualizado con la identidad de SimpleAgenda. Se guardó el AI editable y las tres láminas en ' + output.fsName);
}());
