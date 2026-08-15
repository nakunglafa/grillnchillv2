import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/**
 * Nearby landmarks with per-locale blurbs (names stay as place names).
 */
const NEARBY = {
  "praca-do-chile": [
    {
      name: "Praça do Chile",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+do+Chile+Lisbon",
      blurb: {
        en: "The square that gives the restaurant its name — cafés and tram lines at the doorstep.",
        pt: "A praça que dá nome ao restaurante — cafés e elétricos à porta.",
        fr: "La place qui donne son nom au restaurant — cafés et tramways au pied de la porte.",
        de: "Der Platz, der dem Restaurant den Namen gibt — Cafés und Straßenbahnen vor der Tür.",
        nl: "Het plein dat het restaurant zijn naam geeft — cafés en trams voor de deur.",
        es: "La plaza que da nombre al restaurante — cafés y tranvías a la puerta.",
      },
    },
    {
      name: "Avenida Almirante Reis",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Avenida+Almirante+Reis+Lisbon",
      blurb: {
        en: "A main artery of eastern Lisbon, a short stroll for a post-dinner walk.",
        pt: "Uma via principal do leste de Lisboa — ideal para um passeio após o jantar.",
        fr: "Une artère principale de l’est de Lisbonne — parfaite pour une promenade après le dîner.",
        de: "Eine Hauptader im Osten Lissabons — ideal für einen Spaziergang nach dem Essen.",
        nl: "Een hoofdader in oostelijk Lissabon — ideaal voor een wandeling na het eten.",
        es: "Una arteria principal del este de Lisboa — ideal para un paseo después de cenar.",
      },
    },
    {
      name: "Arroios",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arroios+Lisbon",
      blurb: {
        en: "Neighbourhood streets, local shops and easy metro access nearby.",
        pt: "Ruas de bairro, comércio local e metro perto.",
        fr: "Rues de quartier, commerces locaux et métro à proximité.",
        de: "Nachbarschaftsstraßen, lokale Läden und Metro in der Nähe.",
        nl: "Buurtstraten, lokale winkels en metro in de buurt.",
        es: "Calles de barrio, comercios locales y metro cerca.",
      },
    },
  ],
  intendente: [
    {
      name: "Largo do Intendente",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Largo+do+Intendente+Lisbon",
      blurb: {
        en: "The lively square at the heart of Intendente — murals, bars and late evenings.",
        pt: "A praça animada no coração do Intendente — murais, bares e noites longas.",
        fr: "La place animée au cœur d’Intendente — fresques, bars et soirées prolongées.",
        de: "Der lebendige Platz im Herzen von Intendente — Murals, Bars und lange Abende.",
        nl: "Het levendige plein in het hart van Intendente — muurschilderingen, bars en late avonden.",
        es: "La plaza animada en el corazón de Intendente — murales, bares y noches largas.",
      },
    },
    {
      name: "Martim Moniz",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Martim+Moniz+Lisbon",
      blurb: {
        en: "Multicultural square and tram hub a short walk downhill.",
        pt: "Praça multicultural e nó de elétricos a poucos minutos a descer.",
        fr: "Place multiculturelle et hub de tramways à quelques minutes en descendant.",
        de: "Multikultureller Platz und Straßenbahnknoten — kurz bergab.",
        nl: "Multicultureel plein en tramknooppunt — een kort stukje bergaf.",
        es: "Plaza multicultural y nudo de tranvías a pocos minutos cuesta abajo.",
      },
    },
    {
      name: "Miradouro da Senhora do Monte",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miradouro+da+Senhora+do+Monte",
      blurb: {
        en: "One of Lisbon’s classic viewpoints, a climb away for sunset views.",
        pt: "Um dos miradouros clássicos de Lisboa — vale a subida ao pôr do sol.",
        fr: "Un des belvédères classiques de Lisbonne — une montée pour le coucher de soleil.",
        de: "Einer der klassischen Aussichtspunkte Lissabons — ein Aufstieg für den Sonnenuntergang.",
        nl: "Een van Lissabons klassieke uitzichtpunten — een klim voor zonsondergang.",
        es: "Uno de los miradores clásicos de Lisboa — una subida para ver el atardecer.",
      },
    },
  ],
  bakery: [
    {
      name: "Praça do Chile",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+do+Chile+Lisbon",
      blurb: {
        en: "The square outside the bakery — trams, cafés and the main Grill N Chill restaurant nearby.",
        pt: "A praça à porta da pastelaria — elétricos, cafés e o restaurante Grill N Chill perto.",
        fr: "La place devant la boulangerie — tramways, cafés et le restaurant Grill N Chill tout près.",
        de: "Der Platz vor der Bäckerei — Straßenbahnen, Cafés und das Grill-N-Chill-Restaurant in der Nähe.",
        nl: "Het plein voor de bakkerij — trams, cafés en het Grill N Chill-restaurant dichtbij.",
        es: "La plaza frente a la pastelería — tranvías, cafés y el restaurante Grill N Chill cerca.",
      },
    },
    {
      name: "Alameda",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alameda+Lisbon+metro",
      blurb: {
        en: "A short walk toward Alameda metro — convenient for cake pickup after work or study.",
        pt: "A poucos minutos do metro Alameda — ideal para levantar bolos depois do trabalho ou aulas.",
        fr: "À quelques minutes du métro Alameda — pratique pour récupérer un gâteau.",
        de: "Nur wenige Minuten zur Metro Alameda — ideal zur Kuchenabholung.",
        nl: "Op loopafstand van metro Alameda — handig om een taart op te halen.",
        es: "A pocos minutos del metro Alameda — ideal para recoger pasteles.",
      },
    },
    {
      name: "Arroios",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arroios+Lisbon",
      blurb: {
        en: "Quiet residential streets and local shops just around the corner — cakes for Arroios neighbours.",
        pt: "Ruas residenciais tranquilas e comércio local à volta da esquina — bolos para vizinhos de Arroios.",
        fr: "Rues résidentielles calmes et commerces locaux au coin de la rue — gâteaux pour Arroios.",
        de: "Ruhige Wohnstraßen und lokale Läden gleich um die Ecke — Kuchen für Arroios.",
        nl: "Rustige woonwijken en lokale winkels om de hoek — taarten voor Arroios.",
        es: "Calles residenciales tranquilas y comercios locales a la vuelta — pasteles para Arroios.",
      },
    },
  ],
};

/**
 * @param {string} slug
 * @param {string} [locale]
 * @returns {{ name: string, blurb: string, mapsUrl: string }[]}
 */
export function getNearbyPlaces(slug, locale = DEFAULT_LOCALE) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const list = NEARBY[slug];
  if (!Array.isArray(list)) return [];
  return list.map((place) => ({
    name: place.name,
    mapsUrl: place.mapsUrl,
    blurb: place.blurb[loc] || place.blurb.en || "",
  }));
}
