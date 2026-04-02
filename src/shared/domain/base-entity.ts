export abstract class BaseEntity {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  public abstract toJSON(): Record<string, unknown>;
}
