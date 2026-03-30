/**
 * Simple Dependency Injection Container
 * For now, we will use a manual injection pattern.
 * Use cases will be instantiated with their dependencies.
 */

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  public register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  public get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found in DI Container`);
    }
    return service as T;
  }
}

export const container = DIContainer.getInstance();
