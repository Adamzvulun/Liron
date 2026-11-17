import { HALL_BUILDINGS, SUBJECT_ID, type SubjectInfo } from '../core/subject.ts';

/** Checks a list of subjects: valid, unique ids, places and buildings. Throws on the first problem. */
export function defineSubjects<T extends SubjectInfo>(list: readonly T[]): readonly T[] {
  const ids = new Set<string>();
  const places = new Set<string>();
  const buildings = new Set<string>();
  for (const s of list) {
    if (!SUBJECT_ID.test(s.id)) throw new Error(`Invalid subject id: "${s.id}"`);
    if (ids.has(s.id)) throw new Error(`Two subjects use the id "${s.id}"`);
    if (places.has(s.place)) throw new Error(`Two subjects use the place "${s.place}"`);
    if (s.building) {
      if (!(HALL_BUILDINGS as readonly string[]).includes(s.building))
        throw new Error(`Unknown building "${s.building}" for "${s.id}"`);
      if (buildings.has(s.building))
        throw new Error(`Two subjects use the building "${s.building}"`);
      buildings.add(s.building);
    }
    ids.add(s.id);
    places.add(s.place);
  }
  return Object.freeze([...list]);
}
