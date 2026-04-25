/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a random number from a normal distribution N(0, 1)
 * using the Box-Muller transform.
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Monte Carlo simulation for price trajectories.
 * 
 * @param startPrice - The starting price (entry)
 * @param volatility - Estimated volatility (percentage per step, e.g., 0.001 for 0.1%)
 * @param steps - Number of time steps to simulate
 * @param numPaths - Number of simulations to run
 * @returns Array of price paths, each path is an array of numbers
 */
export function simulatePricePaths(
  startPrice: number,
  volatility: number,
  steps: number = 30,
  numPaths: number = 30
): number[][] {
  const paths: number[][] = [];

  for (let i = 0; i < numPaths; i++) {
    const path: number[] = [startPrice];
    let currentPrice = startPrice;

    for (let j = 1; j <= steps; j++) {
      // Simple Geometric Brownian Motion approximation
      // Change = currentPrice * volatility * randomNormal
      const change = currentPrice * volatility * randomNormal();
      currentPrice += change;
      path.push(Number(currentPrice.toFixed(2)));
    }
    paths.push(path);
  }

  return paths;
}

/**
 * Formats Monte Carlo paths for Recharts.
 * Recharts expects an array of objects where each object represents a step.
 */
export function formatPathsForChart(paths: number[][]): any[] {
  if (paths.length === 0) return [];
  
  const steps = paths[0].length;
  const data = [];

  for (let step = 0; step < steps; step++) {
    const stepData: any = { step };
    paths.forEach((path, pathIndex) => {
      stepData[`path_${pathIndex}`] = path[step];
    });
    data.push(stepData);
  }

  return data;
}
