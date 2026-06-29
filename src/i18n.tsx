import { createContext, useContext, useState } from "react";

export type Lang = "de" | "en" | "uk";

const T = {
  de: {
    navHome: "Home", navInteractive: "Interaktiv", navPosterMaker: "Poster Maker", navMerch: "Merch",

    order: "Bestellen",

    invertDark: "Weiß auf Schwarz", invertLight: "Schwarz auf Weiß",
    randomize: "Alles neu generieren", addText: "+ Text hinzufügen", exportPng: "Export PNG",

    sectionSize: "Größe", sectionLayout: "Layout",
    sectionPattern: "Kreide", sectionLogos: "Logos", sectionIllustrations: "Illustrationen",

    format: "Format",
    patternType: "Muster", patternLines: "Linien", patternWavy: "Wellenlinien", patternGrid: "Raster",
    brush: "Pinsel", strokes: "Striche", strength: "Stärke", opacity: "Deckkraft",
    color: "Farbe", colorWhite: "Weiß", colorBlack: "Schwarz", regenerate: "Neu generieren",

    drawOn: "Zeichnen an", drawOff: "Zeichnen", eraser: "Gummi",

    editText: "Text bearbeiten", filled: "Gefüllt", outline: "Umriss",
    fontLabel: "Schriftart", sizeLabel: "Größe", weightLabel: "Gewicht",
    wNormal: "Normal", wBold: "Bold", wBlack: "Black",

    all: "Alle", portraits: "Personen", buildings: "Gebäude", icons: "Objekte",
    ornaments: "Ornamente",
    selected: "Ausgewählt:", chalkFilter: "Kreide-Filter", chalk: "Kreide", original: "Original",
    contrast: "Kontrast", brightness: "Helligkeit", threshold: "Schwelle",
    assetLength: "Länge", assetSize: "Größe", assetHeight: "Höhe",
    assetStrength: "Stärke", chalkColor: "Kreide-Farbe",
    rotation: "Drehung", assetOpacity: "Deckkraft",
    mirror: "⇋ Spiegeln", mirrorV: "⇅ V-Spiegeln", deleteBtn: "🗑 Löschen",
    layerUp: "↑ Ebene", layerDown: "↓ Ebene",
    assetHint: "Klick oder auf Poster ziehen", noItems: "Keine Elemente in dieser Kategorie.",
    upload: "⬆ SVG/PNG hochladen",

    layoutHintLogos: "Layout wählen · Texte & Logos werden angeordnet",
    layoutHintNoLogos: "Layout ordnet Texte an · Logos im Logo-Bereich hinzufügen",

    strokeTitle: "Kreidelinie", deleteLabel: "Löschen",

    hintDraw: "Zeichnen aktiv · ziehen zum Malen · Zeichnen ausschalten zum Bewegen",
    hintMove: "Alles verschieben: Striche, Texte, Linien & Logos · Entf zum Löschen · Strg+Z Rückgängig",

    pickImage: "Bild wählen", savePng: "SAVE PNG", backToEditor: "← Zurück zum Editor",
    scale: "Skalierung", resolution: "Auflösung", chalkDensity: "Chalk-Dichte",
    noise: "Rauschen", strokeDir: "Strichrichtung", strokeWeight: "Strichstärke",
    trail: "Trail", shimmer: "Lebendigkeit",
    source: "Quelle", mode: "Modus", cameraStart: "Kamera starten", cameraStop: "Kamera stoppen",
    stencil: "Schablone", cameraError: "Kamera konnte nicht gestartet werden. Zugriff erlauben und neu laden.",
  },
  en: {
    order: "Order",
    navHome: "Home", navInteractive: "Interactive", navPosterMaker: "Poster Maker", navMerch: "Merch",

    invertDark: "White on Black", invertLight: "Black on White",
    randomize: "Randomize all", addText: "+ Add text", exportPng: "Export PNG",

    sectionSize: "Size", sectionLayout: "Layout",
    sectionPattern: "Chalk", sectionLogos: "Logos", sectionIllustrations: "Illustrations",

    format: "Format",
    patternType: "Pattern", patternLines: "Lines", patternWavy: "Wavy lines", patternGrid: "Grid",
    brush: "Brush", strokes: "Lines", strength: "Width", opacity: "Opacity",
    color: "Color", colorWhite: "White", colorBlack: "Black", regenerate: "Regenerate",

    drawOn: "Drawing on", drawOff: "Draw", eraser: "Eraser",

    editText: "Edit text", filled: "Filled", outline: "Outline",
    fontLabel: "Font", sizeLabel: "Size", weightLabel: "Weight",
    wNormal: "Normal", wBold: "Bold", wBlack: "Black",

    all: "All", portraits: "People", buildings: "Buildings", icons: "Objects",
    ornaments: "Ornaments",
    selected: "Selected:", chalkFilter: "Chalk filter", chalk: "Chalk", original: "Original",
    contrast: "Contrast", brightness: "Brightness", threshold: "Threshold",
    assetLength: "Length", assetSize: "Size", assetHeight: "Height",
    assetStrength: "Width", chalkColor: "Chalk color",
    rotation: "Rotation", assetOpacity: "Opacity",
    mirror: "⇋ Mirror", mirrorV: "⇅ V-Mirror", deleteBtn: "🗑 Delete",
    layerUp: "↑ Layer", layerDown: "↓ Layer",
    assetHint: "Click or drag to poster", noItems: "No items in this category.",
    upload: "⬆ Upload SVG/PNG",

    layoutHintLogos: "Choose layout · Texts & logos will be arranged",
    layoutHintNoLogos: "Layout arranges texts · Add logos in the logos section",

    strokeTitle: "Chalk line", deleteLabel: "Delete",

    hintDraw: "Drawing active · drag to paint · turn off drawing to move",
    hintMove: "Move anything: strokes, texts, lines & logos · Del to delete · Ctrl+Z to undo",

    pickImage: "Choose image", savePng: "SAVE PNG", backToEditor: "← Back to editor",
    scale: "Scale", resolution: "Resolution", chalkDensity: "Chalk density",
    noise: "Noise", strokeDir: "Stroke direction", strokeWeight: "Stroke weight",
    trail: "Trail", shimmer: "Shimmer",
    source: "Source", mode: "Mode", cameraStart: "Start camera", cameraStop: "Stop camera",
    stencil: "Stencil", cameraError: "Could not start camera. Allow access and reload.",
  },
  uk: {
    order: "Замовити",
    navHome: "Головна", navInteractive: "Інтерактив", navPosterMaker: "Постер", navMerch: "Мерч",

    invertDark: "Білий на чорному", invertLight: "Чорний на білому",
    randomize: "Перегенерувати все", addText: "+ Додати текст", exportPng: "Експорт PNG",

    sectionSize: "Форматік", sectionLayout: "Лейаут",
    sectionPattern: "Крейда", sectionLogos: "Лого", sectionIllustrations: "Картіночки",

    format: "Формат",
    patternType: "Тип", patternLines: "Лінії", patternWavy: "Хвилясті лінії", patternGrid: "Сітка",
    brush: "Пензель", strokes: "Штрихи", strength: "Товщина", opacity: "Прозорість",
    color: "Колір", colorWhite: "Білий", colorBlack: "Чорний", regenerate: "Перегенерувати",

    drawOn: "Мишка", drawOff: "Малювалка", eraser: "Гумка",

    editText: "Редагувати текст", filled: "Заповнений", outline: "Контур",
    fontLabel: "Шрифт", sizeLabel: "Розмір", weightLabel: "Товщина",
    wNormal: "Звичайний", wBold: "Жирний", wBlack: "Чорний",

    all: "Всі", portraits: "Персони", buildings: "Будівлі", icons: "Обʼєкти",
    ornaments: "Орнаменти",
    selected: "Вибрано:", chalkFilter: "Крейдяний фільтр", chalk: "Крейда", original: "Оригінал",
    contrast: "Контраст", brightness: "Яскравість", threshold: "Поріг",
    assetLength: "Довжина", assetSize: "Розмір", assetHeight: "Висота",
    assetStrength: "Товщина", chalkColor: "Колір крейди",
    rotation: "Обертання", assetOpacity: "Прозорість",
    mirror: "⇋ Дзеркало", mirrorV: "⇅ В-дзеркало", deleteBtn: "🗑 Видалити",
    layerUp: "↑ Шар", layerDown: "↓ Шар",
    assetHint: "Клік або перетягни на постер", noItems: "Немає елементів у цій категорії.",
    upload: "⬆ Завантажити SVG/PNG",

    layoutHintLogos: "Обрати макет · Тексти й логотипи будуть розставлені",
    layoutHintNoLogos: "Макет розставляє тексти · Логотипи — у розділі логотипів",

    strokeTitle: "Крейдова лінія", deleteLabel: "Видалити",

    hintDraw: "Малювання активне · тягни для нанесення · вимкни для переміщення",
    hintMove: "Пересувай штрихи, тексти, лінії й логотипи · Del для видалення · Ctrl+Z скасувати",

    pickImage: "Вибрати зображення", savePng: "Зберегти PNG", backToEditor: "← До редактора",
    scale: "Масштаб", resolution: "Роздільність", chalkDensity: "Щільність крейди",
    noise: "Шум", strokeDir: "Напрям", strokeWeight: "Товщина",
    trail: "Слід", shimmer: "Жвавість",
    source: "Джерело", mode: "Режим", cameraStart: "Увімкнути камеру", cameraStop: "Вимкнути камеру",
    stencil: "Трафарет", cameraError: "Не вдалося запустити камеру. Дозвольте доступ і перезавантажте.",
  },
} as const;

export type Translations = { [K in keyof typeof T.de]: string };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translations }>({
  lang: "uk", setLang: () => {}, t: T.uk,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("uk");
  return <Ctx.Provider value={{ lang, setLang, t: T[lang] }}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
