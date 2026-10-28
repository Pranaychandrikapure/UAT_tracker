import {
  ChangeRequest,
  Defect,
  DevTask,
  KRARecord,
  ProjectItem,
  ReadyItem,
  Release,
  SrnDocument,
  UserItem,
} from "./api";

// Pure clean initial state - no dummy/mock records
export const DEFAULT_PROJECTS: ProjectItem[] = [];
export const DEFAULT_USERS: UserItem[] = [];
export const DEFAULT_CHANGE_REQUESTS: ChangeRequest[] = [];
export const DEFAULT_DEV_TASKS: DevTask[] = [];
export const DEFAULT_DEFECTS: Defect[] = [];
export const DEFAULT_READY_ITEMS: ReadyItem[] = [];
export const DEFAULT_SRN_DOCUMENTS: SrnDocument[] = [];
export const DEFAULT_RELEASES: Release[] = [];
