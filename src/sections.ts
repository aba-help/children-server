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
