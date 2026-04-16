declare module 'density-clustering/lib/DBSCAN' {
  class DBSCAN {
    run(
      dataset: number[][],
      epsilon: number,
      minPoints: number,
      distanceFunction?: string | ((a: number[], b: number[]) => number),
    ): number[][];
    noise: number[];
  }
  export = DBSCAN;
}
