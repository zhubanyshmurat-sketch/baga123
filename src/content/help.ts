import type { HelpContact } from "@/lib/content/types";

/**
 * Seed list of help contacts. Used to populate the database and as a fallback when the
 * database is unreachable.
 *
 * IMPORTANT: none of these entries is marked as verified. Before launch, call every number,
 * confirm the opening hours, add the numbers of your university's counselling service, and
 * mark each contact as checked in the admin panel (Admin → Help contacts).
 */
export const helpContacts: HelpContact[] = [
  {
    id: "seed-112",
    kind: "emergency",
    name: { kk: "Бірыңғай жедел қызметтер нөмірі", ru: "Единый номер экстренных служб" },
    description: {
      kk: "Өмірге қауіп төнгенде: жедел жәрдем, полиция, құтқарушылар.",
      ru: "При угрозе жизни: скорая помощь, полиция, спасатели.",
    },
    phone: "112",
    hours: { kk: "Тәулік бойы", ru: "Круглосуточно" },
    city: { kk: "Бүкіл Қазақстан", ru: "Весь Казахстан" },
    isActive: true,
    sortOrder: 1,
    verifiedAt: null,
  },
  {
    id: "seed-111",
    kind: "hotline",
    name: {
      kk: "Балалар мен жасөспірімдерге арналған сенім телефоны",
      ru: "Детский телефон доверия",
    },
    description: {
      kk: "Тегін және құпия. 18 жасқа дейінгі жасөспірімдерге арналған.",
      ru: "Бесплатно и конфиденциально. Для детей и подростков до 18 лет.",
    },
    phone: "111",
    hours: { kk: "Тәулік бойы", ru: "Круглосуточно" },
    city: { kk: "Бүкіл Қазақстан", ru: "Весь Казахстан" },
    isActive: true,
    sortOrder: 2,
    verifiedAt: null,
  },
];
