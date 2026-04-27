import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'web' },
}));

import {
  createFilesSettingsCategoryController,
  type FilesSettingsCategoryController,
  type FilesSettingsCategoryControllerOptions,
} from './files-settings-category';
import type { UploadedFile } from '../entities/providers/file-upload';

const controllers: FilesSettingsCategoryController[] = [];

function makeUpload(id: string, name: string, content = `# ${name}`): UploadedFile {
  return { id, name, content };
}

function createController(options: FilesSettingsCategoryControllerOptions) {
  const controller = createFilesSettingsCategoryController(options);
  controllers.push(controller);
  return controller;
}

describe('files settings category controller', () => {
  afterEach(() => {
    controllers.splice(0).forEach((controller) => controller.dispose());
  });

  it('stores pasted content, refreshes uploads, and bumps the uploads version', async () => {
    const events: string[] = [];
    let uploads: UploadedFile[] = [];
    const addUpload = vi.fn(async (name: string, content: string) => {
      events.push(`add:${name}:${content}`);
      uploads = [...uploads, makeUpload('pasted', name, content)];
    });
    const getUploads = vi.fn(async () => {
      events.push('get');
      return uploads;
    });
    const bumpUploads = vi.fn(() => events.push('bump'));
    const controller = createController({ addUpload, getUploads, bumpUploads });

    controller.setPasteFileName(' villains.md ');
    controller.setPasteContent('# Lord Ember');
    await controller.addPastedContent();

    expect(addUpload).toHaveBeenCalledWith('villains.md', '# Lord Ember');
    expect(events).toEqual(['add:villains.md:# Lord Ember', 'get', 'bump']);
    expect(controller.getSnapshot()).toMatchObject({
      uploads: [makeUpload('pasted', 'villains.md', '# Lord Ember')],
      pasteFileName: '',
      pasteContent: '',
    });
  });

  it('chooses web files through the picker and stores every selected file', async () => {
    let uploads: UploadedFile[] = [];
    const addUpload = vi.fn(async (name: string, content: string) => {
      uploads = [...uploads, makeUpload(name, name, content)];
    });
    const getUploads = vi.fn(async () => uploads);
    const bumpUploads = vi.fn();
    const controller = createController({
      addUpload,
      getUploads,
      bumpUploads,
      pickFiles: vi.fn(async () => [
        { name: 'npc.md', text: async () => '# NPC' },
        { name: 'items.json', text: async () => '[{"name":"Moonblade"}]' },
      ]),
    });

    await controller.pickFilesWeb();

    expect(addUpload).toHaveBeenNthCalledWith(1, 'npc.md', '# NPC');
    expect(addUpload).toHaveBeenNthCalledWith(2, 'items.json', '[{"name":"Moonblade"}]');
    expect(controller.getSnapshot().uploads.map((upload) => upload.name)).toEqual(['npc.md', 'items.json']);
    expect(bumpUploads).toHaveBeenCalledTimes(1);
  });

  it('removes an upload with pending row state and refreshes the session upload version', async () => {
    let uploads = [makeUpload('keep', 'keep.md'), makeUpload('drop', 'drop.md')];
    const bumpUploads = vi.fn();
    const controller = createController({
      getUploads: vi.fn(async () => uploads),
      removeUpload: vi.fn(async (id: string) => {
        uploads = uploads.filter((upload) => upload.id !== id);
      }),
      bumpUploads,
    });

    await controller.load();
    bumpUploads.mockClear();
    const deleteUpload = controller.deleteUpload('drop');

    expect(controller.getSnapshot().removingUploadId).toBe('drop');
    await deleteUpload;
    expect(controller.getSnapshot().uploads.map((upload) => upload.id)).toEqual(['keep']);
    expect(controller.getSnapshot().removingUploadId).toBeNull();
    expect(bumpUploads).toHaveBeenCalledTimes(1);
  });

  it('deletes all local app data through the files category reset path', async () => {
    const events: string[] = [];
    let finishReset!: () => void;
    const controller = createController({
      confirmDeleteAllData: vi.fn(async () => {
        events.push('confirm');
        return true;
      }),
      getUploads: vi.fn(async () => [makeUpload('old', 'old.md')]),
      resetStoredAppData: vi.fn(() => new Promise<void>((resolve) => {
        events.push('reset-storage');
        finishReset = resolve;
      })),
      stopSession: vi.fn(() => events.push('stop-session')),
      onDeleteAllDataReset: vi.fn(() => events.push('reset-settings')),
    });
    await controller.load();
    controller.setPasteFileName('scratch.md');
    controller.setPasteContent('# Scratch');

    const deletion = controller.deleteAllData();
    await Promise.resolve();

    expect(controller.getSnapshot().deleteAllPending).toBe(true);
    finishReset();
    await deletion;

    expect(events).toEqual(['confirm', 'stop-session', 'reset-storage', 'reset-settings']);
    expect(controller.getSnapshot()).toMatchObject({
      uploads: [],
      pasteFileName: '',
      pasteContent: '',
      deleteAllPending: false,
      deleteAllStatus: 'All local app data was deleted.',
    });
  });
});
