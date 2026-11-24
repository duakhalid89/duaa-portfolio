// Duaa Khalid — portfolio promo. Builds the whole After Effects project from scratch,
// queues the MP4 render and saves Duaa_Promo.aep. Run headless:
//   AfterFX.exe -noui -r "D:\Duaa Video\build\build_promo.jsx"
// Then render with aerender (see render.ps1).

(function () {
var ROOT = "D:/Duaa Video/";
var LOG = [];
function log(s) { LOG.push(String(s)); }
function flushLog() {
    var f = new File(ROOT + "build/build_log.txt");
    f.encoding = "UTF-8"; f.open("w"); f.write(LOG.join("\n")); f.close();
}
try {

var W = 1920, H = 1080, FPS = 30;
var TOTAL = 35;

// ---------- palette ----------
function C(hex) { hex = hex.replace("#", ""); return [parseInt(hex.substr(0, 2), 16) / 255, parseInt(hex.substr(2, 2), 16) / 255, parseInt(hex.substr(4, 2), 16) / 255]; }
var COL = {
    bg: C("#0B0618"), card: C("#160B2E"), cardHi: C("#1F1040"), ink: C("#FFFFFF"),
    soft: C("#C9B8F0"), mute: C("#8E7BB8"), mag: C("#E040FB"), vio: C("#7C4DFF"), cyan: C("#00E5FF"),
    black: C("#000000")
};

// ---------- fonts ----------
function hasFont(ps) {
    try { if (app.fonts && app.fonts.getFontsByPostScriptName) return app.fonts.getFontsByPostScriptName(ps).length > 0; } catch (e) {}
    return false;
}
function pickFont(cands) {
    for (var i = 0; i < cands.length; i++) if (hasFont(cands[i])) { log("font ok: " + cands[i]); return cands[i]; }
    log("font fallback (unverified): " + cands[cands.length - 1]);
    return cands[cands.length - 1];
}
var F = {
    black: pickFont(["SegoeUI-Black", "SegoeUIBlack", "Arial-BoldMT"]),
    bold: pickFont(["SegoeUI-Bold", "SegoeUIBold", "Arial-BoldMT"]),
    semi: pickFont(["SegoeUI-Semibold", "SegoeUISemibold", "SegoeUI-Bold"]),
    reg: pickFont(["SegoeUI", "ArialMT"]),
    cond: pickFont(["Bahnschrift-BoldCondensed", "BahnschriftBoldCondensed", "Bahnschrift-SemiBoldCondensed", "Bahnschrift-Bold", "Impact"])
};
try {
    var fams = app.fonts.allFonts;
    for (var fi = 0; fi < fams.length; fi++) {
        var fam = fams[fi];
        if (fam.length && String(fam[0].familyName).indexOf("Bahnschrift") >= 0) {
            var nm = []; for (var fj = 0; fj < fam.length; fj++) nm.push(fam[fj].postScriptName);
            log("Bahnschrift styles: " + nm.join(", "));
        }
    }
} catch (e) { log("allFonts n/a: " + e); }

// ---------- generic helpers ----------
function dims(prop) {
    var t = prop.propertyValueType;
    if (t == PropertyValueType.TwoD) return 2;
    if (t == PropertyValueType.ThreeD) return 3;
    return 1;
}
// keys: [[t, v], ...]; infl = ease influence (default 75); opts.linear
function K(prop, keys, infl, linear) {
    infl = infl || 75;
    for (var i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], keys[i][1]);
    var n = dims(prop);
    for (var k = 1; k <= prop.numKeys; k++) {
        if (linear) { prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR); continue; }
        var e = []; for (var j = 0; j < n; j++) e.push(new KeyframeEase(0, infl));
        try { prop.setTemporalEaseAtKey(k, e, e); } catch (err) { log("ease fail " + prop.name + ": " + err); }
    }
}
function S(v) { return [v, v, 100]; }
function tr(l) { return l.property("ADBE Transform Group"); }
function P(l) { return tr(l).property("ADBE Position"); }
function SC(l) { return tr(l).property("ADBE Scale"); }
function OP(l) { return tr(l).property("ADBE Opacity"); }
function RO(l) { return tr(l).property("ADBE Rotate Z"); }
function AN(l) { return tr(l).property("ADBE Anchor Point"); }

// fade+rise+scale entrance
function enter(l, t, dy, fromScale, dur) {
    dur = dur || 0.55; dy = (dy === undefined) ? 40 : dy;
    var p = P(l).value;
    K(OP(l), [[t, 0], [t + dur * 0.6, 100]], 70);
    if (dy) K(P(l), [[t, [p[0], p[1] + dy]], [t + dur, [p[0], p[1]]]], 85);
    if (fromScale) K(SC(l), [[t, S(fromScale)], [t + dur, S(100)]], 85);
}
// slide in horizontally from (current - dx)
function slideX(l, t, dx, dur) {
    var p = P(l).value; dur = dur || 0.5;
    K(P(l), [[t, [p[0] - dx, p[1]]], [t + dur, [p[0], p[1]]]], 85);
}
function pop(l, t, peak) {
    peak = peak || 112;
    var s = SC(l).value[0];
    K(SC(l), [[t, S(0)], [t + 0.22, S(s * peak / 100)], [t + 0.38, S(s)]], 60);
    K(OP(l), [[t, 0], [t + 0.08, 100]], 50);
}

function fx(l, match) { return l.property("ADBE Effect Parade").addProperty(match); }
function setP(eff, names, v) {
    for (var i = 0; i < names.length; i++) {
        try { var pr = (typeof names[i] == "number") ? eff.property(names[i]) : eff.property(names[i]); if (pr) { pr.setValue(v); return pr; } } catch (e) {}
    }
    log("setP failed: " + names.join("/"));
    return null;
}
// Text/shape layers are comp-sized: their effect point space is offset by half the comp size
// from the content space that sourceRectAtTime reports.
var OFF = "var o=[thisComp.width/2,thisComp.height/2];";
var RECT_L = OFF + "var r=sourceRectAtTime(0,false);[r.left, r.top+r.height/2]+o";
var RECT_R = OFF + "var r=sourceRectAtTime(0,false);[r.left+r.width, r.top+r.height/2]+o";
var RECT_TL = OFF + "var r=sourceRectAtTime(0,false);[r.left, r.top]+o";
var RECT_BR = OFF + "var r=sourceRectAtTime(0,false);[r.left+r.width, r.top+r.height]+o";
function ramp(l, c1, c2, diag) {
    var e = fx(l, "ADBE Ramp");
    e.property("ADBE Ramp-0001").expression = diag ? RECT_TL : RECT_L;
    e.property("ADBE Ramp-0002").setValue(c1.concat([1]));
    e.property("ADBE Ramp-0003").expression = diag ? RECT_BR : RECT_R;
    e.property("ADBE Ramp-0004").setValue(c2.concat([1]));
    return e;
}
function glow(l, radius, intensity, threshold) {
    var e = fx(l, "ADBE Glo2");
    setP(e, ["Glow Threshold", 2], threshold === undefined ? 40 : threshold);
    setP(e, ["Glow Radius", 3], radius);
    setP(e, ["Glow Intensity", 4], intensity);
    return e;
}
function shadow(l, opacity, dist, soft) {
    var e = fx(l, "ADBE Drop Shadow");
    setP(e, ["Opacity", 2], opacity * 2.55);
    setP(e, ["Direction", 3], 180);
    setP(e, ["Distance", 4], dist);
    setP(e, ["Softness", 5], soft);
    return e;
}
function tint(l, col) {
    var e = fx(l, "ADBE Fill");
    setP(e, ["Color", 3], col.concat([1]));
    return e;
}

// ---------- text ----------
// align: "c" (centre/middle anchor) or "l" (left/middle anchor)
function T(comp, str, font, size, col, pos, align, tracking) {
    var l = comp.layers.addText(str);
    var tp = l.property("ADBE Text Properties").property("ADBE Text Document");
    var d = tp.value;
    try { d.resetCharStyle(); d.resetParagraphStyle(); } catch (e) {}
    d.font = font; d.fontSize = size; d.applyFill = true; d.fillColor = col; d.applyStroke = false;
    d.tracking = tracking || 0;
    d.justification = (align == "l") ? ParagraphJustification.LEFT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
    tp.setValue(d);
    var r = l.sourceRectAtTime(0, false);
    AN(l).setValue(align == "l" ? [r.left, r.top + r.height / 2] : [r.left + r.width / 2, r.top + r.height / 2]);
    P(l).setValue(pos);
    l.name = str.substr(0, 24);
    return l;
}
function textW(l) { return l.sourceRectAtTime(0, false).width; }
function textH(l) { return l.sourceRectAtTime(0, false).height; }

// ---------- shapes ----------
function shapeLayer(comp, name, pos) {
    var l = comp.layers.addShape(); l.name = name;
    AN(l).setValue([0, 0]); P(l).setValue(pos || [comp.width / 2, comp.height / 2]);
    return l;
}
// adds a group with a rect/ellipse; returns the group. o: {fill, fillOp, stroke, strokeW, strokeOp, ellipse, offset}
function addShape(l, w, h, r, o) {
    o = o || {};
    var root = l.property("ADBE Root Vectors Group");
    var gi = root.addProperty("ADBE Vector Group").propertyIndex;
    var vecs = function () { return root.property(gi).property("ADBE Vectors Group"); };
    if (o.ellipse) {
        vecs().addProperty("ADBE Vector Shape - Ellipse");
        vecs().property(1).property("ADBE Vector Ellipse Size").setValue([w, h]);
    } else {
        vecs().addProperty("ADBE Vector Shape - Rect");
        vecs().property(1).property("ADBE Vector Rect Size").setValue([w, h]);
        vecs().property(1).property("ADBE Vector Rect Roundness").setValue(r);
    }
    if (o.trim) {
        vecs().addProperty("ADBE Vector Filter - Trim");
    }
    if (o.fill) {
        vecs().addProperty("ADBE Vector Graphic - Fill");
        var f = vecs().property(vecs().numProperties);
        f.property("ADBE Vector Fill Color").setValue(o.fill);
        f.property("ADBE Vector Fill Opacity").setValue(o.fillOp === undefined ? 100 : o.fillOp);
    }
    if (o.stroke) {
        vecs().addProperty("ADBE Vector Graphic - Stroke");
        var s = vecs().property(vecs().numProperties);
        s.property("ADBE Vector Stroke Color").setValue(o.stroke);
        s.property("ADBE Vector Stroke Width").setValue(o.strokeW || 2);
        s.property("ADBE Vector Stroke Opacity").setValue(o.strokeOp === undefined ? 100 : o.strokeOp);
        if (o.dash) {
            try {
                s.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Dash 1");
                s = vecs().property(vecs().numProperties);
                s.property("ADBE Vector Stroke Dashes").property("ADBE Vector Stroke Dash 1").setValue(o.dash[0]);
                s.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Gap 1");
                s = vecs().property(vecs().numProperties);
                s.property("ADBE Vector Stroke Dashes").property("ADBE Vector Stroke Gap 1").setValue(o.dash[1]);
                s.property("ADBE Vector Stroke Line Cap").setValue(2);
            } catch (e) { log("dash fail " + e); }
        }
        if (o.cap) { try { s.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e) {} }
    }
    if (o.offset) root.property(gi).property("ADBE Vector Transform Group").property("ADBE Vector Position").setValue(o.offset);
    return root.property(gi);
}
function trimOf(group) {
    var v = group.property("ADBE Vectors Group");
    for (var i = 1; i <= v.numProperties; i++) if (v.property(i).matchName == "ADBE Vector Filter - Trim") return v.property(i);
    return null;
}
function rrect(comp, name, pos, w, h, r, o) { var l = shapeLayer(comp, name, pos); addShape(l, w, h, r, o); return l; }
// glowing gradient border (separate layer so the fill stays clean)
function border(comp, name, pos, w, h, r, sw, glowR) {
    var l = rrect(comp, name, pos, w, h, r, { stroke: [1, 1, 1], strokeW: sw || 3 });
    ramp(l, COL.mag, COL.cyan, true);
    glow(l, glowR || 22, 0.9, 20);
    return l;
}
// text + pill behind it. Returns {text, pill}
function pill(comp, str, font, size, pos, align, fillCol, fillOp, txtCol, padX, padY, tracking, strokeCol) {
    var t = T(comp, str, font, size, txtCol || COL.ink, pos, align, tracking);
    var w = textW(t) + (padX || 28) * 2, h = textH(t) + (padY || 14) * 2;
    var cx = (align == "l") ? pos[0] + textW(t) / 2 : pos[0];
    var p = rrect(comp, "pill " + str.substr(0, 12), [cx, pos[1]], w, h, h / 2,
        { fill: fillCol, fillOp: fillOp === undefined ? 100 : fillOp, stroke: strokeCol, strokeW: 2, strokeOp: 60 });
    p.moveAfter(t);
    if (align == "l") { P(t).setValue([pos[0], pos[1]]); }
    return { text: t, pill: p, w: w, h: h };
}

// rounded-rect mask in layer space (top-left x,y)
function roundedMask(layer, x, y, w, h, r) {
    var k = r * 0.5523;
    var sh = new Shape();
    sh.vertices = [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]];
    sh.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
    sh.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
    sh.closed = true;
    var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    m.property("ADBE Mask Shape").setValue(sh);
    return m;
}

// ---------- project ----------
app.beginSuppressDialogs();
app.newProject();
var proj = app.project;
proj.bitsPerChannel = 8;
var fScenes = proj.items.addFolder("01 Scenes");
var fCards = proj.items.addFolder("02 Cards");
var fFoot = proj.items.addFolder("03 Footage");
var fAudio = proj.items.addFolder("04 Audio");

function imp(rel, folder) {
    var f = new File(ROOT + rel);
    if (!f.exists) { log("MISSING " + rel); return null; }
    var it = proj.importFile(new ImportOptions(f));
    it.parentFolder = folder;
    return it;
}
function addComp(name, w, h, dur, folder) {
    var c = proj.items.addComp(name, Math.round(w), Math.round(h), 1, dur, FPS);
    c.bgColor = COL.bg;
    c.motionBlur = true;
    c.shutterAngle = 200;
    if (folder) c.parentFolder = folder;
    return c;
}

var IMG = {}, VID = {}, AUD = {};
var imgs = ["bg", "glow", "profile_round", "tool_unity", "tool_unreal", "tool_csharp", "tool_cpp", "tool_blender", "tool_quest", "tool_threejs"];
for (var i = 0; i < imgs.length; i++) IMG[imgs[i]] = imp("assets/images/" + imgs[i] + ".png", fFoot);
var vids = ["unbroken-oath", "mask-regime", "abduction", "escape-room-vr", "germ-endless-runner", "spike-rush", "multiplayer-ludo", "snake-game"];
for (i = 0; i < vids.length; i++) { VID[vids[i]] = imp("assets/videos/" + vids[i] + ".mp4", fFoot); if (VID[vids[i]]) log("clip " + vids[i] + " dur=" + VID[vids[i]].duration.toFixed(2) + " " + VID[vids[i]].width + "x" + VID[vids[i]].height); }
var auds = ["voxel-revolution.mp3", "sfx_whoosh.wav", "sfx_pop.wav", "sfx_tick.wav", "sfx_impact.wav", "sfx_shimmer.wav"];
for (i = 0; i < auds.length; i++) AUD[auds[i].split(".")[0]] = imp("assets/audio/" + auds[i], fAudio);
log("music dur=" + (AUD["voxel-revolution"] ? AUD["voxel-revolution"].duration : "?"));

// footage layer that loops, starts `off` seconds into the clip, no audio
function addClip(comp, item, off) {
    var v = comp.layers.add(item);
    try { if (v.hasAudio) v.audioEnabled = false; } catch (e) {}
    v.timeRemapEnabled = true;
    v.property("ADBE Time Remapping").expression = "var d=Math.max(source.duration-0.1,0.5);(time+" + off + ")%d;";
    v.outPoint = comp.duration;
    return v;
}

// ---------- card precomps ----------
var PAD = 70;
function videoCard(name, clip, w, h, title, tag, mode, dur, off) {
    var cw = w + PAD * 2, ch = h + PAD * 2;
    var c = addComp("CARD " + name, cw, ch, dur, fCards);
    var cx = cw / 2, cy = ch / 2, R = 26;
    var v = addClip(c, clip, off || 1.0);
    var vw = clip.width, vh = clip.height;
    var s = (mode == "tall") ? h / vh : w / vw;
    SC(v).setValue(S(s * 100)); P(v).setValue([cx, cy]);
    var mw = w / s, mh = h / s;
    roundedMask(v, vw / 2 - mw / 2, vh / 2 - mh / 2, mw, mh, R / s);
    shadow(v, 70, 18, 50);
    // slow push-in on the footage
    K(SC(v), [[0, S(s * 100)], [dur, S(s * 104)]], 33);
    // dark base under title
    var b = border(c, "border", [cx, cy], w, h, R, 3, 20);
    // tag pill (top-left)
    if (tag) {
        var tg = pill(c, tag.toUpperCase(), F.bold, 18, [cx - w / 2 + 24, cy - h / 2 + 34], "l", COL.mag, 92, COL.ink, 14, 8, 60);
    }
    // title (bottom-left)
    var tt = pill(c, title, F.bold, mode == "tall" ? 28 : 30, [cx - w / 2 + 28, cy + h / 2 - 40], "l", COL.bg, 82, COL.ink, 18, 10, 0, [1, 1, 1]);
    return c;
}

function achievementCard(name, big, label, sub, dur, countTo, countAt) {
    var w = 440, h = 400, cw = w + PAD * 2, ch = h + PAD * 2;
    var c = addComp("CARD " + name, cw, ch, dur, fCards);
    var cx = cw / 2, cy = ch / 2;
    var base = rrect(c, "card fill", [cx, cy], w, h, 30, { fill: COL.card, fillOp: 88 });
    shadow(base, 60, 20, 60);
    // soft inner glow blob
    var blob = c.layers.add(IMG.glow); SC(blob).setValue(S(110)); P(blob).setValue([cx, cy - 60]);
    tint(blob, COL.vio); OP(blob).setValue(22); blob.blendingMode = BlendingMode.ADD;
    roundedMask(blob, 256 - w / 2 / 1.1, 256 - h / 2 / 1.1 + 60 / 1.1, w / 1.1, h / 1.1, 30 / 1.1);
    border(c, "border", [cx, cy], w, h, 30, 3, 22);
    var bt = T(c, big, F.cond, 150, COL.ink, [cx, cy - 55], "c", 10);
    ramp(bt, COL.mag, COL.cyan, false); glow(bt, 30, 0.8, 30);
    if (countTo) {
        bt.property("ADBE Text Properties").property("ADBE Text Document").expression =
            "var v=Math.round(easeOut(time," + countAt + "," + (countAt + 0.9) + ",0," + countTo + "));v+'+';";
    }
    var lt = T(c, label, F.black, 34, COL.ink, [cx, cy + 60], "c", 0);
    var st = T(c, sub, F.semi, 24, COL.soft, [cx, cy + 110], "c", 0);
    return { comp: c, big: bt, label: lt, sub: st };
}

// heading block used by grid scenes
function heading(comp, kicker, title, t) {
    var k = T(comp, kicker, F.bold, 24, COL.mag, [W / 2, 112], "c", 400);
    glow(k, 12, 0.6, 40);
    var ln1 = rrect(comp, "kicker line L", [W / 2 - textW(k) / 2 - 50, 112], 60, 3, 2, { fill: COL.mag });
    var ln2 = rrect(comp, "kicker line R", [W / 2 + textW(k) / 2 + 50, 112], 60, 3, 2, { fill: COL.cyan });
    var h = T(comp, title, F.black, 70, COL.ink, [W / 2, 172], "c", 0);
    enter(k, t, 20); enter(h, t + 0.1, 30, 0, 0.6);
    K(SC(ln1), [[t + 0.15, [0, 100, 100]], [t + 0.6, [100, 100, 100]]], 80);
    K(SC(ln2), [[t + 0.15, [0, 100, 100]], [t + 0.6, [100, 100, 100]]], 80);
    return h;
}
function floaty(l, amp, speed, phase) {
    P(l).expression = "value+[0,Math.sin(time*" + (speed || 1.4) + "+" + (phase || 0) + ")*" + (amp || 5) + "]";
}

// =====================================================================
// SCENES (local time)
// =====================================================================
var T0 = { s1: 0, s2: 3.0, s3: 4.8, s4: 10.0, s5: 14.6, s6: 19.0, s7: 23.6, s8: 31.3 };
var DUR = { s1: 3.0, s2: 1.8, s3: 5.2, s4: 4.6, s5: 4.4, s6: 4.6, s7: 7.7, s8: 3.7 };
var OVER = 0.6;

// ---- S1: "Looking for a" typewriter ----
var s1 = addComp("S1 Looking For", W, H, DUR.s1 + OVER, fScenes);
var TYPE_STR = "Looking for a", TYPE_T0 = 0.4, TYPE_DT = 0.085;
var t1 = T(s1, TYPE_STR, F.semi, 104, COL.ink, [W / 2, H / 2], "c", 0);
t1.property("ADBE Text Properties").property("ADBE Text Document").expression =
    "var s='" + TYPE_STR + "';var n=Math.floor(clamp((time-" + TYPE_T0 + ")/" + TYPE_DT + ",0,s.length));s.substr(0,n);";
var cur = rrect(s1, "cursor", [W / 2, H / 2], 6, 96, 2, { fill: COL.mag });
glow(cur, 14, 1, 10);
var fullW = textW(t1);
// cursor follows the typed text's right edge (text is centred)
P(cur).expression = "var t=thisComp.layer('" + t1.name + "');var r=t.sourceRectAtTime(time,false);var x=t.toComp([r.left+r.width,0])[0];[x+14," + (H / 2) + "]";
OP(cur).expression = "time>" + (TYPE_T0 + TYPE_STR.length * TYPE_DT + 0.6) + "?0:(Math.floor(time*3)%2?100:20)";
var ul = rrect(s1, "underline", [W / 2, H / 2 + 80], fullW + 40, 6, 3, { fill: [1, 1, 1] });
ramp(ul, COL.mag, COL.cyan, false); glow(ul, 18, 1, 10);
K(SC(ul), [[1.55, [0, 100, 100]], [2.05, [100, 100, 100]]], 85);
K(OP(t1), [[2.75, 100], [2.98, 0]], 70);
K(P(t1), [[2.75, [W / 2, H / 2]], [2.98, [W / 2, H / 2 - 60]]], 80);
K(OP(ul), [[2.7, 100], [2.92, 0]], 70);

// ---- S2: GAME DEVELOPER punch ----
var s2 = addComp("S2 Game Developer", W, H, DUR.s2 + OVER, fScenes);
var gdW = T(s2, "GAME DEVELOPER", F.cond, 230, COL.ink, [W / 2, H / 2 - 20], "c", 20);
var gdC = T(s2, "GAME DEVELOPER", F.cond, 230, COL.ink, [W / 2, H / 2 - 20], "c", 20);
ramp(gdC, COL.mag, COL.cyan, false); glow(gdC, 40, 1.0, 35);
var wipe = fx(gdC, "ADBE Linear Wipe");
setP(wipe, ["Wipe Angle", 2], 270); setP(wipe, ["Feather", 3], 160);
K(wipe.property(1), [[0.2, 100], [0.85, 0]], 70);
var gds = [gdW, gdC];
for (i = 0; i < gds.length; i++) {
    var an = gds[i].property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
    an.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount");
    var trk = gds[i].property("ADBE Text Properties").property("ADBE Text Animators").property(1).property("ADBE Text Animator Properties").property("ADBE Text Tracking Amount");
    K(trk, [[0, 140], [0.7, 0]], 85);
    K(SC(gds[i]), [[0, S(135)], [0.38, S(100)]], 88);
    K(OP(gds[i]), [[0, 0], [0.08, 100]], 50);
}
var sub2 = T(s2, "UNITY  \u2022  UNREAL ENGINE  \u2022  AR / VR", F.bold, 30, COL.soft, [W / 2, H / 2 + 120], "c", 300);
enter(sub2, 0.55, 20);

// ---- S3: intro card ----
var s3 = addComp("S3 Intro Card", W, H, DUR.s3 + OVER, fScenes);
var cardW = 1280, cardH = 480, ccx = W / 2, ccy = H / 2 + 10;
var s3Null = s3.layers.addNull(); s3Null.name = "CARD RIG"; P(s3Null).setValue([ccx, ccy]);
var c3 = rrect(s3, "card fill", [ccx, ccy], cardW, cardH, 40, { fill: COL.card, fillOp: 90 });
shadow(c3, 65, 30, 90);
var c3b = border(s3, "card border", [ccx, ccy], cardW, cardH, 40, 3, 26);
var px = ccx - cardW / 2 + 230, py = ccy;
var ringD = shapeLayer(s3, "ring dashed", [px, py]);
addShape(ringD, 372, 372, 0, { ellipse: true, stroke: [1, 1, 1], strokeW: 3, strokeOp: 45, dash: [18, 14] });
RO(ringD).expression = "time*40";
var ring = shapeLayer(s3, "ring", [px, py]);
var ringG = addShape(ring, 330, 330, 0, { ellipse: true, stroke: [1, 1, 1], strokeW: 7, trim: true, cap: true });
ramp(ring, COL.mag, COL.cyan, true); glow(ring, 24, 1, 15);
var rt = trimOf(ringG); if (rt) K(rt.property("ADBE Vector Trim End"), [[0.4, 0], [1.1, 100]], 80);
var prof = s3.layers.add(IMG.profile_round); P(prof).setValue([px, py]); SC(prof).setValue(S(50));
var tx = ccx - cardW / 2 + 450;
var hello = T(s3, "Hello, I am", F.black, 86, COL.ink, [tx, ccy - 120], "l", 0);
var duaa = T(s3, "Duaa", F.black, 86, COL.ink, [tx + textW(hello) + 26, ccy - 120], "l", 0);
ramp(duaa, COL.mag, COL.cyan, false); glow(duaa, 22, 0.8, 35);
var role = T(s3, "Game Developer  |  Unity & Unreal  |  AR / VR", F.semi, 34, COL.soft, [tx, ccy - 40], "l", 0);
var tools = pill(s3, "TOOLS I USE", F.bold, 20, [tx + 4, ccy + 40], "l", COL.mag, 22, COL.ink, 18, 9, 200, COL.mag);
var toolNames = ["tool_unity", "tool_unreal", "tool_csharp", "tool_cpp", "tool_blender", "tool_quest", "tool_threejs"];
var icons = [];
for (i = 0; i < toolNames.length; i++) {
    var ic = s3.layers.add(IMG[toolNames[i]]);
    P(ic).setValue([tx + 42 + i * 100, ccy + 140]); SC(ic).setValue(S(32));
    shadow(ic, 55, 8, 20);
    icons.push(ic);
}
// parent everything on the card to the rig so the card floats as one
var s3Layers = [c3, c3b, ringD, ring, prof, hello, duaa, role, tools.text, tools.pill].concat(icons);
for (i = 0; i < s3Layers.length; i++) s3Layers[i].parent = s3Null;
// animation
K(OP(c3), [[0, 0], [0.3, 100]], 60); K(SC(c3), [[0, S(88)], [0.6, S(100)]], 88);
K(OP(c3b), [[0, 0], [0.3, 100]], 60); K(SC(c3b), [[0, S(88)], [0.6, S(100)]], 88);
pop(prof, 0.35, 110); pop(ringD, 0.45, 108);
enter(hello, 0.6, 0); slideX(hello, 0.6, 40);
enter(duaa, 0.78, 0); K(SC(duaa), [[0.78, S(70)], [1.15, S(100)]], 85);
enter(role, 0.95, 20);
enter(tools.text, 1.2, 15); enter(tools.pill, 1.2, 15);
for (i = 0; i < icons.length; i++) pop(icons[i], 1.45 + i * 0.09, 118);
P(s3Null).expression = "value+[0,Math.sin(time*1.5)*5]";

// ---- S4: Featured games grid ----
var s4 = addComp("S4 Featured Games", W, H, DUR.s4 + OVER, fScenes);
heading(s4, "PROJECTS", "Featured Games", 0);
var g4 = [
    ["Unbroken Oath", "unbroken-oath", "GameCon 2026 \u00B7 2nd Prize", 2.0],
    ["Mask Regime", "mask-regime", "Global Game Jam", 1.5],
    ["Abduction", "abduction", "3D Adventure", 2.0],
    ["Escape Room VR", "escape-room-vr", "Meta Quest VR", 1.0]
];
var gw = 560, gh = 315, gap = 36;
for (i = 0; i < g4.length; i++) {
    var cc = videoCard(g4[i][0], VID[g4[i][1]], gw, gh, g4[i][0], g4[i][2], "fit", DUR.s4 + OVER, g4[i][3]);
    var cl = s4.layers.add(cc);
    var col = i % 2, row = Math.floor(i / 2);
    P(cl).setValue([W / 2 + (col ? 1 : -1) * (gw / 2 + gap / 2), 242 + gh / 2 + row * (gh + gap)]);
    cl.motionBlur = true;
    enter(cl, 0.28 + i * 0.12, 80, 82, 0.6);
}

// ---- S5: tall cards ----
var s5 = addComp("S5 More Builds", W, H, DUR.s5 + OVER, fScenes);
heading(s5, "MORE BUILDS", "Unreal, Multiplayer & C++", 0);
var g5 = [
    ["Germ Runner", "germ-endless-runner", "Unreal Engine", 1.0],
    ["Spike Rush", "spike-rush", "Unreal Engine", 1.0],
    ["Multiplayer Ludo", "multiplayer-ludo", "Node.js Backend", 0.5],
    ["Snake", "snake-game", "C++ \u00B7 DSA", 0.5]
];
var tw = 330, th = 560;
for (i = 0; i < g5.length; i++) {
    var c5 = videoCard(g5[i][0], VID[g5[i][1]], tw, th, g5[i][0], g5[i][2], "tall", DUR.s5 + OVER, g5[i][3]);
    var l5 = s5.layers.add(c5);
    P(l5).setValue([W / 2 + (i - 1.5) * (tw + 40), 615 + (i % 2 ? 22 : -22)]);
    l5.motionBlur = true;
    enter(l5, 0.22 + i * 0.1, 160, 90, 0.65);
    floaty(l5, 6, 1.2, i * 1.3);
}

// ---- S6: achievements ----
var s6 = addComp("S6 Achievements", W, H, DUR.s6 + OVER, fScenes);
heading(s6, "RECOGNITION", "Achievements", 0);
var a6 = [
    achievementCard("2nd Prize", "2nd", "Prize \u00B7 GameCon 2026", "Unbroken Oath \u2014 team FPS", DUR.s6 + OVER),
    achievementCard("Game Jam", "GGJ", "Global Game Jam", "Mask Regime \u2014 2-player racer", DUR.s6 + OVER),
    achievementCard("Games", "10+", "Playable Games", "2D \u00B7 3D \u00B7 VR \u00B7 Multiplayer", DUR.s6 + OVER, 10, 0.75)
];
for (i = 0; i < a6.length; i++) {
    var l6 = s6.layers.add(a6[i].comp);
    P(l6).setValue([W / 2 + (i - 1) * 490, 560]);
    l6.motionBlur = true;
    enter(l6, 0.25 + i * 0.15, 90, 80, 0.6);
    floaty(l6, 5, 1.3, i);
}
var strip = pill(s6, "2 Internships   \u2022   TreeObit Studios   \u2022   The Game Storm   \u2022   NED University", F.semi, 26, [W / 2, 880], "c", COL.cardHi, 85, COL.soft, 34, 16, 0, COL.vio);
enter(strip.text, 1.35, 25); enter(strip.pill, 1.35, 25);

// ---- S7: profile card + zoom on skills ----
var s7 = addComp("S7 Profile Card", W, H, DUR.s7 + OVER, fScenes);
var cam = s7.layers.addNull(); cam.name = "CAMERA RIG"; P(cam).setValue([W / 2, H / 2]); AN(cam).setValue([50, 50]);
var pW = 1220, pH = 660, pcx = W / 2, pcy = H / 2;
var L7 = [];
var p7 = rrect(s7, "card fill", [pcx, pcy], pW, pH, 44, { fill: COL.card, fillOp: 92 }); shadow(p7, 70, 30, 100); L7.push(p7);
var p7b = border(s7, "card border", [pcx, pcy], pW, pH, 44, 3, 26); L7.push(p7b);
var left = pcx - pW / 2;
var avx = left + 180, avy = pcy - 160;
var sr = shapeLayer(s7, "story ring", [avx, avy]); addShape(sr, 232, 232, 0, { ellipse: true, stroke: [1, 1, 1], strokeW: 8 });
ramp(sr, COL.mag, COL.cyan, true); glow(sr, 18, 0.9, 15); RO(sr).expression = "time*30"; L7.push(sr);
var av = s7.layers.add(IMG.profile_round); P(av).setValue([avx, avy]); SC(av).setValue(S(35)); L7.push(av);
var nx = left + 340;
var uname = T(s7, "duaa.khalid", F.bold, 56, COL.ink, [nx, pcy - 230], "l", 0); L7.push(uname);
var badge = rrect(s7, "verified", [nx + textW(uname) + 30, pcy - 228], 30, 30, 15, { fill: COL.cyan }); glow(badge, 12, 0.8, 20); L7.push(badge);
var kick = T(s7, "GAME DEVELOPER  \u00B7  KARACHI, PK", F.bold, 22, COL.mag, [nx, pcy - 178], "l", 200); L7.push(kick);
var stats = [["10+", "games"], ["2", "internships"], ["3.40", "CGPA"], ["2nd", "GameCon '26"]];
var statLayers = [];
for (i = 0; i < stats.length; i++) {
    var sx = nx + i * 190;
    var sn = T(s7, stats[i][0], F.black, 48, COL.ink, [sx, pcy - 110], "l", 0);
    var sl = T(s7, stats[i][1], F.semi, 22, COL.mute, [sx, pcy - 68], "l", 0);
    L7.push(sn); L7.push(sl); statLayers.push([sn, sl]);
}
var div = rrect(s7, "divider", [pcx, pcy - 15], pW - 120, 2, 1, { fill: [1, 1, 1], fillOp: 12 }); L7.push(div);
var bullets = ["Gameplay Programming", "Multiplayer & Networking", "AR / VR  \u00B7  Meta Quest", "Level Design & Lighting"];
var bx = left + 90, by0 = pcy + 55, bdy = 64;
var bLayers = [], hLayers = [];
for (i = 0; i < bullets.length; i++) {
    var by = by0 + i * bdy;
    var dot = rrect(s7, "dot " + i, [bx, by], 12, 12, 6, { fill: i % 2 ? COL.cyan : COL.mag }); L7.push(dot);
    var bt = T(s7, bullets[i], F.semi, 34, COL.ink, [bx + 28, by], "l", 0);
    var bw = textW(bt);
    var hl = shapeLayer(s7, "highlight " + i, [bx + 14, by]);
    addShape(hl, bw + 34, 50, 10, { fill: COL.mag, fillOp: 38, offset: [(bw + 34) / 2, 0] });
    hl.moveAfter(bt);
    L7.push(bt); L7.push(hl);
    bLayers.push([dot, bt]); hLayers.push(hl);
}
var btnX = left + pW - 230;
var hire = rrect(s7, "btn hire", [btnX, pcy + 110], 300, 76, 38, { fill: [1, 1, 1] }); ramp(hire, COL.mag, COL.vio, false); glow(hire, 16, 0.35, 75); L7.push(hire);
var hireT = T(s7, "Hire me", F.bold, 32, COL.ink, [btnX, pcy + 110], "c", 20); L7.push(hireT);
var view = rrect(s7, "btn view", [btnX, pcy + 210], 300, 76, 38, { stroke: COL.cyan, strokeW: 3 }); L7.push(view);
var viewT = T(s7, "View Portfolio", F.bold, 30, COL.cyan, [btnX, pcy + 210], "c", 0); L7.push(viewT);
for (i = 0; i < L7.length; i++) L7[i].parent = cam;
// animation
K(OP(p7), [[0, 0], [0.3, 100]], 60); K(SC(p7), [[0, S(86)], [0.65, S(100)]], 88);
K(OP(p7b), [[0, 0], [0.3, 100]], 60); K(SC(p7b), [[0, S(86)], [0.65, S(100)]], 88);
pop(av, 0.3, 110); pop(sr, 0.36, 108);
enter(uname, 0.5, 20); pop(badge, 0.75, 130); enter(kick, 0.62, 15);
for (i = 0; i < statLayers.length; i++) { enter(statLayers[i][0], 0.75 + i * 0.08, 25); enter(statLayers[i][1], 0.8 + i * 0.08, 20); }
K(SC(div), [[0.9, [0, 100, 100]], [1.4, [100, 100, 100]]], 85);
for (i = 0; i < bLayers.length; i++) { pop(bLayers[i][0], 1.0 + i * 0.08, 140); enter(bLayers[i][1], 1.0 + i * 0.08, 0); slideX(bLayers[i][1], 1.0 + i * 0.08, 20); }
enter(hire, 1.2, 25); enter(hireT, 1.2, 25); enter(view, 1.3, 25); enter(viewT, 1.3, 25);
// highlights sweep one by one while zoomed
var HL0 = 2.6, HLD = 0.62;
for (i = 0; i < hLayers.length; i++) {
    SC(hLayers[i]).setValue([0, 100, 100]);
    K(SC(hLayers[i]), [[HL0 + i * HLD, [0, 100, 100]], [HL0 + i * HLD + 0.38, [100, 100, 100]]], 85);
}
// camera zoom onto the bullet list, then back out
var FOC = [bx + 300, by0 + 0.9 * bdy], ZS = 138;
var zp = [W / 2 - (ZS / 100) * (FOC[0] - W / 2), H / 2 - (ZS / 100) * (FOC[1] - H / 2)];
K(SC(cam), [[1.75, S(100)], [2.45, S(ZS)], [5.4, S(ZS)], [6.15, S(100)]], 85);
K(P(cam), [[1.75, [W / 2, H / 2]], [2.45, zp], [5.4, zp], [6.15, [W / 2, H / 2]]], 85);
// hire button pulse
K(SC(hire), [[6.35, S(100)], [6.55, S(110)], [6.8, S(100)], [7.0, S(106)], [7.2, S(100)]], 60);
K(SC(hireT), [[6.35, S(100)], [6.55, S(110)], [6.8, S(100)], [7.0, S(106)], [7.2, S(100)]], 60);

// ---- S8: end card ----
var s8 = addComp("S8 End Card", W, H, DUR.s8 + 0.2, fScenes);
var lr = shapeLayer(s8, "logo ring", [W / 2, 330]);
var lrG = addShape(lr, 200, 200, 0, { ellipse: true, stroke: [1, 1, 1], strokeW: 6, trim: true, cap: true });
ramp(lr, COL.mag, COL.cyan, true); glow(lr, 24, 1, 15);
var lrt = trimOf(lrG); if (lrt) K(lrt.property("ADBE Vector Trim End"), [[0.1, 0], [0.9, 100]], 80);
RO(lr).expression = "time*60";
var dk = T(s8, "DK", F.black, 86, COL.ink, [W / 2, 330], "c", 0); ramp(dk, COL.mag, COL.cyan, true); glow(dk, 20, 0.8, 30);
pop(dk, 0.3, 115);
var nm8 = T(s8, "DUAA KHALID", F.black, 120, COL.ink, [W / 2, 560], "c", 120);
ramp(nm8, COL.ink, COL.soft, false);
enter(nm8, 0.55, 40, 0, 0.7);
var an8 = nm8.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
an8.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount");
K(nm8.property("ADBE Text Properties").property("ADBE Text Animators").property(1).property("ADBE Text Animator Properties").property("ADBE Text Tracking Amount"), [[0.55, 60], [1.6, 0]], 80);
var sb8 = T(s8, "Game Developer  \u00B7  Unity & Unreal  \u00B7  AR / VR", F.semi, 36, COL.soft, [W / 2, 650], "c", 0);
enter(sb8, 0.85, 25);
var url = pill(s8, "duaa-portfolio-nu.vercel.app", F.bold, 32, [W / 2, 770], "c", COL.cardHi, 90, COL.ink, 40, 18, 40, COL.mag);
glow(url.pill, 18, 0.6, 30);
enter(url.text, 1.15, 25); enter(url.pill, 1.15, 25);
var cr = T(s8, "Music: \u201CVoxel Revolution\u201D Kevin MacLeod (incompetech.com) \u00B7 Licensed under CC BY 4.0", F.reg, 18, COL.mute, [W / 2, 1030], "c", 0);
enter(cr, 1.5, 0);

// =====================================================================
// FX comps
// =====================================================================
var parts = addComp("FX Particles", W, H, TOTAL, fScenes);
for (i = 0; i < 44; i++) {
    var dl = shapeLayer(parts, "dust " + (i + 1), [0, 0]);
    addShape(dl, 8, 8, 0, { ellipse: true, fill: (i % 3 == 0) ? COL.cyan : (i % 3 == 1 ? COL.mag : [1, 1, 1]) });
    P(dl).expression = "seedRandom(index,true);var x=random(0,1920);var y0=random(0,1080);var sp=random(8,34);var y=(y0-time*sp)%1080;if(y<0)y+=1080;[x+Math.sin(time*random(0.3,0.9)+random(0,6))*24,y]";
    SC(dl).expression = "seedRandom(index,true);var s=random(25,110);[s,s]";
    OP(dl).expression = "seedRandom(index,true);var b=random(25,75);b*(0.55+0.45*Math.sin(time*random(1,3)+random(0,6)))";
}

// =====================================================================
// MAIN
// =====================================================================
var main = addComp("DUAA_PROMO_MAIN", W, H, TOTAL, null);
// background
var bgL = main.layers.add(IMG.bg); K(SC(bgL), [[0, S(100)], [TOTAL, S(110)]], 33);
var leakCols = [COL.mag, COL.vio, COL.cyan], leakPos = [[300, 250], [1600, 850], [1500, 150]];
for (i = 0; i < 3; i++) {
    var lk = main.layers.add(IMG.glow); lk.name = "light leak " + (i + 1);
    tint(lk, leakCols[i]); lk.blendingMode = BlendingMode.ADD;
    SC(lk).setValue(S(260)); OP(lk).setValue(i == 2 ? 14 : 22); P(lk).setValue(leakPos[i]);
    P(lk).expression = "wiggle(0.12,220)";
}
var pL = main.layers.add(parts); pL.name = "particles"; glow(pL, 10, 1, 10); OP(pL).setValue(80);

// scene layers with transitions
function placeScene(comp, start, dur, inStyle, outStyle) {
    var l = main.layers.add(comp);
    l.startTime = start; l.inPoint = start;
    l.outPoint = Math.min(start + dur + OVER, TOTAL);
    l.motionBlur = true;
    var e = start + dur;
    if (inStyle == "zoom") {
        K(OP(l), [[start, 0], [start + 0.3, 100]], 60);
        K(SC(l), [[start, S(90)], [start + 0.55, S(100)]], 88);
    }
    if (outStyle == "zoom") {
        K(OP(l), [[e, 100], [e + 0.38, 0]], 60);
        K(SC(l), [[e, S(100)], [e + 0.45, S(115)]], 88);
    } else if (outStyle == "cut") {
        l.outPoint = e;
    }
    return l;
}
var L1 = placeScene(s1, T0.s1, DUR.s1, "none", "cut");
var L2 = placeScene(s2, T0.s2, DUR.s2, "none", "zoom");
var L3 = placeScene(s3, T0.s3, DUR.s3, "zoom", "zoom");
var L4 = placeScene(s4, T0.s4, DUR.s4, "zoom", "zoom");
var L5 = placeScene(s5, T0.s5, DUR.s5, "zoom", "zoom");
var L6 = placeScene(s6, T0.s6, DUR.s6, "zoom", "zoom");
var L7L = placeScene(s7, T0.s7, DUR.s7, "zoom", "cut");
var L8 = placeScene(s8, T0.s8, DUR.s8, "none", "none");

// light sweep transition S7 -> S8
var sw = shapeLayer(main, "light sweep", [-700, H / 2]);
addShape(sw, 460, 2600, 0, { fill: [1, 1, 1] });
addShape(sw, 120, 2600, 0, { fill: COL.mag, offset: [-380, 0] });
addShape(sw, 60, 2600, 0, { fill: COL.cyan, offset: [330, 0] });
RO(sw).setValue(18);
var swb = fx(sw, "ADBE Gaussian Blur 2"); setP(swb, ["Blurriness", 1], 70);
glow(sw, 60, 0.8, 30);
sw.blendingMode = BlendingMode.ADD;
sw.inPoint = T0.s8 - 0.5; sw.outPoint = T0.s8 + 0.6;
K(P(sw), [[T0.s8 - 0.45, [-700, H / 2]], [T0.s8 + 0.45, [W + 700, H / 2]]], 55);
sw.motionBlur = true;

// fade to black at the end
var fade = main.layers.addSolid([0, 0, 0], "fade out", W, H, 1, TOTAL);
K(OP(fade), [[TOTAL - 0.7, 0], [TOTAL, 100]], 50);
var fadeIn = main.layers.addSolid([0, 0, 0], "fade in", W, H, 1, 0.6);
K(OP(fadeIn), [[0, 100], [0.4, 0]], 50);

// ---------- audio ----------
function sfx(item, t, db) {
    if (!item) return null;
    var a = main.layers.add(item); a.startTime = t;
    if (db) a.property("ADBE Audio Group").property("ADBE Audio Levels").setValue([db, db]);
    return a;
}
var mus = main.layers.add(AUD["voxel-revolution"]); mus.name = "MUSIC Voxel Revolution";
mus.outPoint = TOTAL;
K(mus.property("ADBE Audio Group").property("ADBE Audio Levels"), [[0, [-30, -30]], [0.8, [-4, -4]], [TOTAL - 1.8, [-4, -4]], [TOTAL, [-48, -48]]], 50);
for (i = 0; i < TYPE_STR.length; i++) if (TYPE_STR.charAt(i) != " ") sfx(AUD.sfx_tick, TYPE_T0 + i * TYPE_DT, -10);
sfx(AUD.sfx_impact, T0.s2, -1);
var whooshAt = [T0.s3 - 0.1, T0.s4 - 0.1, T0.s5 - 0.1, T0.s6 - 0.1, T0.s7 - 0.1, T0.s8 - 0.5];
for (i = 0; i < whooshAt.length; i++) sfx(AUD.sfx_whoosh, whooshAt[i], -4);
sfx(AUD.sfx_pop, T0.s3 + 0.35, -6);
for (i = 0; i < 7; i++) sfx(AUD.sfx_pop, T0.s3 + 1.45 + i * 0.09, -13);
for (i = 0; i < 4; i++) sfx(AUD.sfx_pop, T0.s4 + 0.28 + i * 0.12, -12);
for (i = 0; i < 4; i++) sfx(AUD.sfx_pop, T0.s5 + 0.22 + i * 0.1, -12);
for (i = 0; i < 3; i++) sfx(AUD.sfx_pop, T0.s6 + 0.25 + i * 0.15, -10);
for (i = 0; i < 4; i++) sfx(AUD.sfx_shimmer, T0.s7 + HL0 + i * HLD, -8);
sfx(AUD.sfx_pop, T0.s7 + 6.35, -8);
sfx(AUD.sfx_shimmer, T0.s8 + 0.1, -6);
sfx(AUD.sfx_impact, T0.s8 + 0.3, -9);

// ---------- render queue ----------
var rq = proj.renderQueue.items.add(main);
try { rq.applyTemplate("Best Settings"); } catch (e) { log("RS template: " + e); }
var om = rq.outputModule(1);
var tpls = om.templates; log("OM templates: " + tpls.join(" | "));
var pick = null;
for (i = 0; i < tpls.length; i++) if (/H\.264/i.test(tpls[i]) && /Match Render/i.test(tpls[i])) { pick = tpls[i]; break; }
if (!pick) for (i = 0; i < tpls.length; i++) if (/H\.264/i.test(tpls[i])) { pick = tpls[i]; break; }
if (pick) { om.applyTemplate(pick); log("OM picked: " + pick); } else log("NO H.264 template");
om.file = new File(ROOT + "render/Duaa_Khalid_Promo.mp4");

proj.save(new File(ROOT + "Duaa_Promo.aep"));
log("saved project");
} catch (err) {
    log("ERROR line " + err.line + ": " + err.toString());
}
log("done");
flushLog();
try { app.endSuppressDialogs(false); } catch (e) {}
try { main.openInViewer(); } catch (e) {}
})();
