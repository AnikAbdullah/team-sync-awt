import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  it('is defined', () => {
    const service = new WorkspacesService({} as never);
    expect(service).toBeDefined();
  });
});
