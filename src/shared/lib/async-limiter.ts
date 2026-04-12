type AsyncFactory<T> = () => Promise<T>;

export interface AsyncLimiter {
  run<T>(factory: AsyncFactory<T>): Promise<T>;
}

export function createAsyncLimiter(concurrency: number): AsyncLimiter {
  const limit = Math.max(1, concurrency);
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= limit) {
      return;
    }

    const candidate = queue.shift();
    if (!candidate) {
      return;
    }

    active += 1;
    candidate();
  };

  return {
    run<T>(factory: AsyncFactory<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const execute = () => {
          void factory()
            .then(resolve, reject)
            .finally(() => {
              active -= 1;
              next();
            });
        };

        queue.push(execute);
        next();
      });
    },
  };
}

export async function parallelMapLimit<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) {
    return [];
  }

  const limiter = createAsyncLimiter(concurrency);
  return Promise.all(items.map((item, index) => limiter.run(() => mapper(item, index))));
}
