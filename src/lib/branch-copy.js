import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/**
 * Per-branch marketing + SEO copy for Portuguese locals and Lisbon tourists.
 * Locales: en, pt, fr, de, nl, es
 */

const SHARED_CUISINES = ["Nepali", "Indian", "Portuguese", "Grill"];

const BRANCH = {
  "praca-do-chile": {
    en: {
      seoTitle: "Grill N Chill Praça do Chile | Events, Parties & Multi-Cuisine Restaurant Lisbon",
      seoDescription:
        "Book birthday parties, private events and large tables at Grill N Chill Praça do Chile. Nepali, Indian and Portuguese food with excellent Google reviews. Takeaway and reservations in Lisbon.",
      keywords: [
        "Grill N Chill Praça do Chile",
        "birthday party restaurant Lisbon",
        "private events Lisbon",
        "Nepali restaurant Lisbon",
        "Indian food Lisbon",
        "Portuguese grill Lisbon",
        "group booking restaurant Lisbon",
        "takeaway Praça do Chile",
      ],
      headline: "Events, parties & big bookings in Lisbon",
      intro:
        "Praça do Chile is our flagship for celebrations — birthday parties, private gatherings and large bookings — with Nepali, Indian and Portuguese dishes guests rate highly on Google.",
      knowsAbout: ["Private events", "Birthday parties", "Group bookings", "Nepali cuisine", "Indian cuisine", "Portuguese cuisine"],
      venueLabel: "Events & restaurant",
    },
    pt: {
      seoTitle: "Grill N Chill Praça do Chile | Eventos, Festas e Restaurante em Lisboa",
      seoDescription:
        "Reserve aniversários, eventos privados e mesas grandes no Grill N Chill Praça do Chile. Comida nepalesa, indiana e portuguesa com excelentes avaliações no Google. Takeaway e reservas em Lisboa.",
      keywords: [
        "Grill N Chill Praça do Chile",
        "festa de aniversário restaurante Lisboa",
        "eventos privados Lisboa",
        "restaurante nepalês Lisboa",
        "comida indiana Lisboa",
        "takeaway Praça do Chile",
      ],
      headline: "Eventos, festas e reservas grandes em Lisboa",
      intro:
        "A Praça do Chile é o nosso espaço de referência para celebrações — aniversários, eventos privados e grandes grupos — com pratos nepaleses, indianos e portugueses muito bem avaliados no Google.",
      knowsAbout: ["Eventos privados", "Aniversários", "Reservas de grupo", "Cozinha nepalesa", "Cozinha indiana", "Cozinha portuguesa"],
      venueLabel: "Eventos e restaurante",
    },
    fr: {
      seoTitle: "Grill N Chill Praça do Chile | Événements et restaurant à Lisbonne",
      seoDescription:
        "Réservez anniversaires, événements privés et grandes tables. Cuisine népalaise, indienne et portugaise — excellents avis Google. À emporter et réservations à Lisbonne.",
      keywords: ["Grill N Chill Lisbonne", "événement privé Lisbonne", "anniversaire restaurant", "cuisine népalaise Lisbonne"],
      headline: "Événements, fêtes et grandes réservations",
      intro:
        "Notre adresse Praça do Chile est idéale pour les célébrations — anniversaires, événements privés et grands groupes — avec une cuisine népalaise, indienne et portugaise très bien notée.",
      knowsAbout: ["Événements privés", "Anniversaires", "Réservations de groupe"],
      venueLabel: "Événements & restaurant",
    },
    de: {
      seoTitle: "Grill N Chill Praça do Chile | Events & Restaurant Lissabon",
      seoDescription:
        "Geburtstage, private Events und große Tische buchen. Nepalesisch, indisch und portugiesisch — starke Google-Bewertungen. Takeaway und Reservierungen in Lissabon.",
      keywords: ["Grill N Chill Lissabon", "Geburtstag Restaurant Lissabon", "Private Events Lissabon"],
      headline: "Events, Feiern und große Buchungen",
      intro:
        "Praça do Chile ist unser Haus für Feiern — Geburtstage, private Events und große Gruppen — mit nepalesischer, indischer und portugiesischer Küche und starken Google-Bewertungen.",
      knowsAbout: ["Private Events", "Geburtstage", "Gruppenbuchungen"],
      venueLabel: "Events & Restaurant",
    },
    nl: {
      seoTitle: "Grill N Chill Praça do Chile | Events & restaurant Lissabon",
      seoDescription:
        "Boek verjaardagen, privé-events en grote tafels. Nepalese, Indiase en Portugese keuken met sterke Google-reviews. Afhaal en reserveringen in Lissabon.",
      keywords: ["Grill N Chill Lissabon", "verjaardag restaurant Lissabon", "privé events"],
      headline: "Events, feesten en grote boekingen",
      intro:
        "Praça do Chile is ons adres voor vieringen — verjaardagen, privé-events en grote groepen — met Nepalese, Indiase en Portugese gerechten die hoog scoren op Google.",
      knowsAbout: ["Privé-events", "Verjaardagen", "Groepsboekingen"],
      venueLabel: "Events & restaurant",
    },
    es: {
      seoTitle: "Grill N Chill Praça do Chile | Eventos y restaurante en Lisboa",
      seoDescription:
        "Reserva cumpleaños, eventos privados y mesas grandes. Cocina nepalesa, india y portuguesa con excelentes reseñas en Google. Para llevar y reservas en Lisboa.",
      keywords: ["Grill N Chill Lisboa", "cumpleaños restaurante Lisboa", "eventos privados Lisboa"],
      headline: "Eventos, fiestas y reservas grandes",
      intro:
        "Praça do Chile es nuestro espacio para celebraciones — cumpleaños, eventos privados y grupos grandes — con cocina nepalesa, india y portuguesa muy valorada en Google.",
      knowsAbout: ["Eventos privados", "Cumpleaños", "Reservas de grupo"],
      venueLabel: "Eventos y restaurante",
    },
  },
  intendente: {
    en: {
      seoTitle: "Grill N Chill Intendente | Fine Dining Live Grill Lisbon",
      seoDescription:
        "Fine dining with a live grill at Grill N Chill Intendente. Nepali, Indian and Portuguese flavours for locals and tourists near Largo do Intendente. Book a table or order takeaway.",
      keywords: [
        "Grill N Chill Intendente",
        "fine dining Lisbon",
        "live grill Lisbon",
        "restaurant Intendente",
        "Nepali Indian Portuguese Lisbon",
        "tourists restaurant Lisbon",
      ],
      headline: "Fine dining with live grill",
      intro:
        "Intendente is our live-grill dining room — refined plates of Nepali, Indian and Portuguese food for Lisbon locals and travellers exploring the neighbourhood.",
      knowsAbout: ["Live grill", "Fine dining", "Nepali cuisine", "Indian cuisine", "Portuguese cuisine"],
      venueLabel: "Fine dining · live grill",
    },
    pt: {
      seoTitle: "Grill N Chill Intendente | Fine Dining com Live Grill em Lisboa",
      seoDescription:
        "Fine dining com live grill no Grill N Chill Intendente. Sabores nepaleses, indianos e portugueses para locais e turistas junto ao Largo do Intendente. Reserve mesa ou peça takeaway.",
      keywords: ["Grill N Chill Intendente", "fine dining Lisboa", "live grill Lisboa", "restaurante Intendente"],
      headline: "Fine dining com live grill",
      intro:
        "O Intendente é a nossa sala de live grill — pratos refinados nepaleses, indianos e portugueses para lisboetas e visitantes do bairro.",
      knowsAbout: ["Live grill", "Fine dining", "Cozinha nepalesa", "Cozinha indiana", "Cozinha portuguesa"],
      venueLabel: "Fine dining · live grill",
    },
    fr: {
      seoTitle: "Grill N Chill Intendente | Fine dining & grill vivant Lisbonne",
      seoDescription:
        "Fine dining avec grill vivant. Saveurs népalaises, indiennes et portugaises près du Largo do Intendente. Réservation ou à emporter.",
      keywords: ["Grill N Chill Intendente", "fine dining Lisbonne", "grill vivant"],
      headline: "Fine dining au grill vivant",
      intro:
        "Intendente est notre salle au grill vivant — assiettes raffinées népalaises, indiennes et portugaises pour habitants et voyageurs.",
      knowsAbout: ["Grill vivant", "Fine dining"],
      venueLabel: "Fine dining · grill vivant",
    },
    de: {
      seoTitle: "Grill N Chill Intendente | Fine Dining Live Grill Lissabon",
      seoDescription:
        "Fine Dining mit Live-Grill. Nepalesisch, indisch und portugiesisch nahe Largo do Intendente. Tisch reservieren oder Takeaway.",
      keywords: ["Grill N Chill Intendente", "Fine Dining Lissabon", "Live Grill"],
      headline: "Fine Dining mit Live-Grill",
      intro:
        "Intendente ist unser Live-Grill-Restaurant — raffinierte nepalesische, indische und portugiesische Küche für Locals und Reisende.",
      knowsAbout: ["Live-Grill", "Fine Dining"],
      venueLabel: "Fine Dining · Live-Grill",
    },
    nl: {
      seoTitle: "Grill N Chill Intendente | Fine dining live grill Lissabon",
      seoDescription:
        "Fine dining met live grill. Nepalese, Indiase en Portugese smaken bij Largo do Intendente. Reserveer of haal af.",
      keywords: ["Grill N Chill Intendente", "fine dining Lissabon", "live grill"],
      headline: "Fine dining met live grill",
      intro:
        "Intendente is onze live-grill dining room — verfijnde Nepalese, Indiase en Portugese gerechten voor locals en toeristen.",
      knowsAbout: ["Live grill", "Fine dining"],
      venueLabel: "Fine dining · live grill",
    },
    es: {
      seoTitle: "Grill N Chill Intendente | Fine dining con live grill en Lisboa",
      seoDescription:
        "Fine dining con live grill. Sabores nepaleses, indios y portugueses junto al Largo do Intendente. Reserva mesa o pide para llevar.",
      keywords: ["Grill N Chill Intendente", "fine dining Lisboa", "live grill Lisboa"],
      headline: "Fine dining con live grill",
      intro:
        "Intendente es nuestro comedor con live grill — platos refinados nepaleses, indios y portugueses para locales y viajeros.",
      knowsAbout: ["Live grill", "Fine dining"],
      venueLabel: "Fine dining · live grill",
    },
  },
  bakery: {
    en: {
      seoTitle: "Cake Shop Lisbon | Custom Cakes Alameda & Arroios | Grill N Chill Bakery",
      seoDescription:
        "Order custom cakes and shop ready-made cakes near Alameda, Arroios and Praça do Chile. The Bakery by Grill N Chill — pickup in Lisbon, birthday cakes, pastries and coffee.",
      keywords: [
        "cake Lisbon",
        "cakes Lisbon",
        "custom cake Lisbon",
        "cake Alameda Lisbon",
        "cakes Arroios",
        "custom cake Arroios",
        "bolo Alameda",
        "birthday cake Lisbon",
        "bakery Praça do Chile",
        "cake shop Lisbon",
        "Bakery Grill N Chill",
        "pastries Lisbon",
      ],
      headline: "Cakes to shop or order custom",
      intro:
        "The Bakery by Grill N Chill serves cakes and sweets near Alameda, Arroios and Praça do Chile — browse ready-made treats or order a custom cake for pickup in Lisbon.",
      knowsAbout: [
        "Cakes",
        "Custom cakes",
        "Birthday cakes",
        "Pastries",
        "Desserts",
        "Coffee",
        "Bakery café",
        "Alameda",
        "Arroios",
      ],
      venueLabel: "Bakery & café",
    },
    pt: {
      seoTitle: "Bolos Lisboa | Bolo Personalizado Alameda e Arroios | Grill N Chill Bakery",
      seoDescription:
        "Encomende bolos personalizados e compre bolos prontos perto de Alameda, Arroios e Praça do Chile. The Bakery by Grill N Chill — levantamento em Lisboa, bolos de aniversário e pastéis.",
      keywords: [
        "bolos Lisboa",
        "bolo personalizado Lisboa",
        "bolo Alameda",
        "bolos Arroios",
        "bolo aniversário Lisboa",
        "pastelaria Praça do Chile",
        "pastelaria Alameda",
        "Bakery Grill N Chill",
        "doces Lisboa",
      ],
      headline: "Bolos prontos ou personalizados",
      intro:
        "A The Bakery by Grill N Chill serve bolos e doces perto de Alameda, Arroios e Praça do Chile — compre prontos ou encomende um bolo personalizado para levantamento em Lisboa.",
      knowsAbout: ["Bolos", "Bolos personalizados", "Bolos de aniversário", "Pastéis", "Sobremesas", "Café", "Alameda", "Arroios"],
      venueLabel: "Padaria e café",
    },
    fr: {
      seoTitle: "Gâteaux Lisbonne | Sur mesure Alameda & Arroios | Grill N Chill Bakery",
      seoDescription:
        "Commandez un gâteau personnalisé ou achetez des gâteaux prêts près d’Alameda, Arroios et Praça do Chile. The Bakery by Grill N Chill — à emporter à Lisbonne.",
      keywords: [
        "gâteaux Lisbonne",
        "gâteau personnalisé Lisbonne",
        "gâteau Alameda",
        "gâteaux Arroios",
        "pâtisserie Lisbonne",
        "Bakery Grill N Chill",
      ],
      headline: "Gâteaux prêts ou sur mesure",
      intro:
        "The Bakery by Grill N Chill propose gâteaux et douceurs près d’Alameda, Arroios et Praça do Chile — créations du jour ou gâteau personnalisé à emporter à Lisbonne.",
      knowsAbout: ["Gâteaux", "Gâteaux sur mesure", "Pâtisseries", "Desserts", "Alameda", "Arroios"],
      venueLabel: "Boulangerie & café",
    },
    de: {
      seoTitle: "Kuchen Lissabon | Wunschkuchen Alameda & Arroios | Grill N Chill Bakery",
      seoDescription:
        "Wunschkuchen bestellen oder fertige Kuchen kaufen nahe Alameda, Arroios und Praça do Chile. The Bakery by Grill N Chill — Abholung in Lissabon.",
      keywords: [
        "Kuchen Lissabon",
        "Wunschkuchen Lissabon",
        "Kuchen Alameda",
        "Kuchen Arroios",
        "Bäckerei Lissabon",
        "Bakery Grill N Chill",
      ],
      headline: "Kuchen kaufen oder individuell bestellen",
      intro:
        "The Bakery by Grill N Chill bietet Kuchen nahe Alameda, Arroios und Praça do Chile — fertige Stücke oder einen Wunschkuchen zur Abholung in Lissabon.",
      knowsAbout: ["Kuchen", "Wunschkuchen", "Gebäck", "Desserts", "Alameda", "Arroios"],
      venueLabel: "Bäckerei & Café",
    },
    nl: {
      seoTitle: "Taarten Lissabon | Op maat Alameda & Arroios | Grill N Chill Bakery",
      seoDescription:
        "Bestel een taart op maat of koop klaargemaakte cakes bij Alameda, Arroios en Praça do Chile. The Bakery by Grill N Chill — afhalen in Lissabon.",
      keywords: [
        "taarten Lissabon",
        "taart op maat Lissabon",
        "taart Alameda",
        "taarten Arroios",
        "bakkerij Lissabon",
        "Bakery Grill N Chill",
      ],
      headline: "Taarten kopen of op maat bestellen",
      intro:
        "The Bakery by Grill N Chill maakt taarten nabij Alameda, Arroios en Praça do Chile — klaargemaakte cakes of een taart op maat voor afhalen in Lissabon.",
      knowsAbout: ["Taarten", "Taart op maat", "Gebak", "Desserts", "Alameda", "Arroios"],
      venueLabel: "Bakkerij & café",
    },
    es: {
      seoTitle: "Pasteles Lisboa | Encargo Alameda y Arroios | Grill N Chill Bakery",
      seoDescription:
        "Encarga un pastel personalizado o compra pasteles listos cerca de Alameda, Arroios y Praça do Chile. The Bakery by Grill N Chill — recogida en Lisboa.",
      keywords: [
        "pasteles Lisboa",
        "pastel personalizado Lisboa",
        "pastel Alameda",
        "pasteles Arroios",
        "pastelería Lisboa",
        "Bakery Grill N Chill",
      ],
      headline: "Pasteles listos o a medida",
      intro:
        "The Bakery by Grill N Chill ofrece pasteles cerca de Alameda, Arroios y Praça do Chile — listos o un pastel personalizado para recoger en Lisboa.",
      knowsAbout: ["Pasteles", "Pasteles personalizados", "Bollería", "Postres", "Alameda", "Arroios"],
      venueLabel: "Pastelería y café",
    },
  },
};

/**
 * @param {string} slug
 * @param {string} [locale]
 */
export function getBranchCopy(slug, locale = DEFAULT_LOCALE) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const bySlug = BRANCH[slug];
  if (!bySlug) return null;
  const copy = bySlug[loc] || bySlug.en;
  return {
    ...copy,
    cuisines: SHARED_CUISINES,
    slug,
    locale: loc,
  };
}

export function getAllBranchSlugs() {
  return Object.keys(BRANCH);
}
