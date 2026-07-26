import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceMember])],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService, TypeOrmModule],
})
export class MembershipsModule {}
