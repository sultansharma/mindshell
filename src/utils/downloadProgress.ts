import { EventEmitter } from 'events';

export interface DownloadProgressEvent {
  model: string;
  progress: string;
  isComplete: boolean;
  error?: string;
  stage?: 'initializing' | 'downloading' | 'verifying' | 'writing' | 'complete';
  percentage?: number;
}

class DownloadProgressTracker extends EventEmitter {
  private currentModel: string = '';
  private currentProgress: string = '';
  private currentStage: DownloadProgressEvent['stage'] = 'initializing';
  private currentPercentage: number = 0;

  startDownload(model: string) {
    this.currentModel = model;
    this.currentProgress = 'Initializing download...';
    this.currentStage = 'initializing';
    this.currentPercentage = 0;
    this.emit('progress', {
      model,
      progress: this.currentProgress,
      isComplete: false,
      stage: this.currentStage,
      percentage: this.currentPercentage
    });
  }

  updateProgress(progress: string, stage?: DownloadProgressEvent['stage'], percentage?: number) {
    this.currentProgress = progress;
    if (stage) this.currentStage = stage;
    if (percentage !== undefined) this.currentPercentage = percentage;
    
    this.emit('progress', {
      model: this.currentModel,
      progress: this.currentProgress,
      isComplete: false,
      stage: this.currentStage,
      percentage: this.currentPercentage
    });
  }

  completeDownload() {
    this.currentStage = 'complete';
    this.currentPercentage = 100;
    this.emit('progress', {
      model: this.currentModel,
      progress: 'Download completed!',
      isComplete: true,
      stage: this.currentStage,
      percentage: this.currentPercentage
    });
  }

  errorDownload(error: string) {
    this.emit('progress', {
      model: this.currentModel,
      progress: `Download failed: ${error}`,
      isComplete: true,
      error,
      stage: this.currentStage,
      percentage: this.currentPercentage
    });
  }

  getCurrentProgress(): DownloadProgressEvent {
    return {
      model: this.currentModel,
      progress: this.currentProgress,
      isComplete: false,
      stage: this.currentStage,
      percentage: this.currentPercentage
    };
  }
}

// Global instance
export const downloadTracker = new DownloadProgressTracker(); 