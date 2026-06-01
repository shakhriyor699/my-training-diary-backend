import { Test, TestingModule } from '@nestjs/testing';
import { TrainingPlansController } from './training-plans.controller';

describe('TrainingPlansController', () => {
  let controller: TrainingPlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingPlansController],
    }).compile();

    controller = module.get<TrainingPlansController>(TrainingPlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
