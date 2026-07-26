import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceSettings } from './entities/workspace-settings.entity';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, WorkspaceSettings])],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService, TypeOrmModule],
})
export class WorkspacesModule {}
