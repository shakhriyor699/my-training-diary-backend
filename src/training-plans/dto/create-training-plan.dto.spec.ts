import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTrainingPlanDto } from './create-training-plan.dto';

describe('CreateTrainingPlanDto', () => {
  it('accepts deloadAfterWeeks values above 12 when still within the supported range', async () => {
    const dto = plainToInstance(CreateTrainingPlanDto, {
      title: 'Plan',
      deloadAfterWeeks: 20,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects deloadAfterWeeks values above 52', async () => {
    const dto = plainToInstance(CreateTrainingPlanDto, {
      title: 'Plan',
      deloadAfterWeeks: 53,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('deloadAfterWeeks');
  });
});
