/**
 * App sections that are opened per user (client, 2026-11-12: «признак платности ... к каждому
 * разделу», separate columns in the users table, set by the admin).
 *
 * The ids are the app's SectionId (child-app/src/navigation/types.ts); each one is a boolean
 * column access_<name> in users. Access to a section opens all of its paid parts.
 */
export const SECTIONS = [
  { id: "neurospeech", column: "access_neurospeech", title: "Нейрологопедия" },
  { id: "rhythmSchemes", column: "access_rhythm_schemes", title: "Ритмосхемы" },
  { id: "echoSchemes", column: "access_echo_schemes", title: "Эхосхемы" },
  { id: "drumComplex", column: "access_drum_complex", title: "Барабанный комплекс" },
  { id: "hearing", column: "access_hearing", title: "Слушаю звуки" },
  { id: "makatop", column: "access_makatop", title: "Макатоп" },
  { id: "readingTutor", column: "access_reading_tutor", title: "Самоучитель по чтению" },
  { id: "interactiveVerbs", column: "access_interactive_verbs", title: "Интерактивные глаголы" },
  { id: "mediaLibrary", column: "access_media_library", title: "Медиатека" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export type SectionAccess = Record<SectionId, boolean>;

export const isSectionId = (value: string): value is SectionId =>
  SECTIONS.some((section) => section.id === value);

/**
 * Parts of a section that can be opened on their own (client, 2026-11-16, «Работа оплаты в
 * разделах Аваши»): every Макатоп category (its songs + symbols) and every Медиатека album.
 * An album with sub-albums (Нейро -> Нейро 1, Нейро 2) can be opened whole or one sub-album at a
 * time. Access to the whole section still opens everything. Ids are "<section>:<subsection id>"
 * with the subsection ids of child-app/data/data.json; stored in users.access_parts.
 */
export const PARTS: { id: string; section: SectionId; title: string; parent?: string }[] = [
  { id: "makatop:meAndMyFamily", section: "makatop", title: "Я и моя семья" },
  { id: "makatop:peopleAndProfessions", section: "makatop", title: "Люди/профессии" },
  { id: "makatop:animalsBirdsInsects", section: "makatop", title: "Животные/птицы/насекомые" },
  { id: "makatop:transportAndVehicles", section: "makatop", title: "Транспорт и средства передвижения" },
  { id: "makatop:geographicObjectsAndPublicPlaces", section: "makatop", title: "Географические объекты и общественные места" },
  { id: "makatop:worldAround", section: "makatop", title: "Окружающий мир" },
  { id: "makatop:leisureGamesAndToys", section: "makatop", title: "Досуг (игры и игрушки)" },
  { id: "makatop:studyAndSchoolSupplies", section: "makatop", title: "Учеба/школьные принадлежности" },
  { id: "makatop:objectsClothesAndHygiene", section: "makatop", title: "Предметы/одежда и гигиена" },
  { id: "makatop:verbs", section: "makatop", title: "Глаголы" },
  { id: "makatop:foodAndDrinks", section: "makatop", title: "Еда и напитки" },
  { id: "makatop:housingFurnitureAppliances", section: "makatop", title: "Жилье, мебель, быт.техника" },
  { id: "makatop:bodyParts", section: "makatop", title: "Части тела" },
  { id: "makatop:numbersLettersSounds", section: "makatop", title: "Числа, буквы, звуки" },
  { id: "makatop:questionsAndCommunication", section: "makatop", title: "Вопросы и коммуникативные выражения" },
  { id: "makatop:pronouns", section: "makatop", title: "Местоимения" },
  { id: "makatop:prepositionsAndAdverbs", section: "makatop", title: "Предлоги и наречия" },
  { id: "makatop:calendarTime", section: "makatop", title: "Календарь, время" },
  { id: "makatop:adjectives", section: "makatop", title: "Прилагательные" },
  { id: "makatop:spatialOrientation", section: "makatop", title: "Пространственные ориентиры" },
  { id: "mediaLibrary:ml-govorilki", section: "mediaLibrary", title: "Говорилки" },
  { id: "mediaLibrary:ml-zvukachi", section: "mediaLibrary", title: "Звукачи" },
  { id: "mediaLibrary:ml-musicMassage", section: "mediaLibrary", title: "Музыкальный массаж" },
  { id: "mediaLibrary:ml-neuro", section: "mediaLibrary", title: "Нейро" },
  { id: "mediaLibrary:ml-neuro-1", section: "mediaLibrary", title: "Нейро 1", parent: "mediaLibrary:ml-neuro" },
  { id: "mediaLibrary:ml-neuro-2", section: "mediaLibrary", title: "Нейро 2", parent: "mediaLibrary:ml-neuro" },
  { id: "mediaLibrary:ml-prosilki", section: "mediaLibrary", title: "Просилки" },
  { id: "mediaLibrary:ml-rap", section: "mediaLibrary", title: "РЭП" },
  { id: "mediaLibrary:ml-umnyashki", section: "mediaLibrary", title: "Умняшки" },
  { id: "mediaLibrary:ml-umnyashki-acquaintance", section: "mediaLibrary", title: "Знакомство", parent: "mediaLibrary:ml-umnyashki" },
  { id: "mediaLibrary:ml-umnyashki-prepositions", section: "mediaLibrary", title: "Предлоги", parent: "mediaLibrary:ml-umnyashki" },
  { id: "mediaLibrary:ml-umnyashki-endings", section: "mediaLibrary", title: "Окончания", parent: "mediaLibrary:ml-umnyashki" },
  { id: "mediaLibrary:ml-umnyashki-verbs", section: "mediaLibrary", title: "Глаголы", parent: "mediaLibrary:ml-umnyashki" },
];

export const isPartId = (value: string) => PARTS.some((part) => part.id === value);
