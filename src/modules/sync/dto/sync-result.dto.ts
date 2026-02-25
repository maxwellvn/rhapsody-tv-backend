export class ContentSyncResultDto {
  programsCreated: number;
  programsSkipped: number;
  videosCreated: number;
  videosSkipped: number;
  videoUrlsResolved: number;
  errors: string[];
  durationMs: number;
}

export class ScheduleSyncResultDto {
  programsCreated: number;
  schedulesCreated: number;
  schedulesSkipped: number;
  usedFallback: boolean;
  errors: string[];
  durationMs: number;
}

export class SyncStatusDto {
  state: 'idle' | 'syncing-content' | 'syncing-schedule' | 'completed' | 'error';
  progress?: { current: number; total: number; phase: string };
  lastContentResult?: ContentSyncResultDto;
  lastScheduleResult?: ScheduleSyncResultDto;
  lastSyncAt?: string;
  error?: string;
}
