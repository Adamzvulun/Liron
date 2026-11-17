// Glicko-2 skill ratings (issue #22, ADR 0010, ADR 0024).
// A straight implementation of Mark Glickman's "Example of the Glicko-2 system" (2022 edition,
// http://www.glicko.net/glicko/glicko2.pdf); the tests replay its worked example.
// Pure functions, no dependencies: the platform stores the numbers, this file does the maths.

/** A Glicko-2 rating on the familiar scale (as in chess: a few hundred to a few thousand). */
export interface Glicko {
  /** The skill estimate. */
  rating: number;
  /** Rating deviation: how unsure the estimate is. 350 means "no idea yet". */
  rd: number;
  /** Volatility: how erratic the performance is. */
  volatility: number;
}

/** One game in a rating period: the opponent before the period, and the score (1 win, 0 loss). */
export interface GameResult {
  opponent: Glicko;
  /** 1 for a win, 0 for a loss, anything between for partial credit. */
  score: number;
}

/**
 * Starting values. Glickman suggests rating 1500, RD 350 and volatility 0.06; issue #22 asks for
 * 1000 as the start, which only moves the scale (the maths centres on 1500 but works anywhere).
 * τ limits how fast volatility changes; Glickman suggests 0.3 to 1.2, and 0.5 is the usual pick.
 */
export const GLICKO_DEFAULTS = {
  rating: 1000,
  rd: 350,
  volatility: 0.06,
  tau: 0.5,
} as const;

const SCALE = 173.7178; // Glicko-2's internal scale factor, 400 / ln(10)
const CENTRE = 1500;
const EPSILON = 0.000001; // convergence tolerance for the volatility (step 5)
const MAX_PHI = GLICKO_DEFAULTS.rd / SCALE;

/** A rating for someone or something never rated before. */
export const newGlicko = (rating: number = GLICKO_DEFAULTS.rating): Glicko => ({
  rating,
  rd: GLICKO_DEFAULTS.rd,
  volatility: GLICKO_DEFAULTS.volatility,
});

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/** Step 5: the new volatility, by the Illinois algorithm. */
function newVolatility(phi: number, sigma: number, v: number, delta: number, tau: number) {
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d = phi * phi + v + ex;
    return (ex * (delta * delta - d)) / (2 * d * d) - (x - a) / (tau * tau);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  return Math.exp(A / 2);
}

/**
 * Rates one player over one rating period (Glickman's steps 2 to 8). With no games, only the
 * deviation grows, as for a period of absence.
 */
export function ratePeriod(
  player: Glicko,
  games: readonly GameResult[],
  tau: number = GLICKO_DEFAULTS.tau,
): Glicko {
  for (const { score } of games) {
    if (!(score >= 0 && score <= 1)) throw new RangeError(`Scores are 0 to 1, got ${score}`);
  }
  const mu = (player.rating - CENTRE) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;
  if (games.length === 0) {
    return { ...player, rd: Math.min(Math.sqrt(phi * phi + sigma * sigma), MAX_PHI) * SCALE };
  }
  // Steps 3 and 4: the estimated variance and the estimated improvement.
  let vInverse = 0;
  let sum = 0;
  for (const { opponent, score } of games) {
    const muJ = (opponent.rating - CENTRE) / SCALE;
    const gJ = g(opponent.rd / SCALE);
    const e = expected(mu, muJ, opponent.rd / SCALE);
    vInverse += gJ * gJ * e * (1 - e);
    sum += gJ * (score - e);
  }
  const v = 1 / vInverse;
  const delta = v * sum;
  // Steps 5 to 7.
  const sigmaNew = newVolatility(phi, sigma, v, delta, tau);
  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * sum;
  // Step 8: back to the familiar scale.
  return { rating: muNew * SCALE + CENTRE, rd: phiNew * SCALE, volatility: sigmaNew };
}

/**
 * Lets a rating's deviation grow over idle rating periods (one per day without play), as
 * Glicko-2 does for absent players: after a long break the next results move it more.
 * Never above the starting 350.
 */
export function afterIdle(player: Glicko, periods: number): Glicko {
  if (!(periods > 0)) return player;
  const phi = player.rd / SCALE;
  const grown = Math.sqrt(phi * phi + periods * player.volatility * player.volatility);
  return { ...player, rd: Math.min(grown, MAX_PHI) * SCALE };
}

/**
 * One answer, rated the way puzzle trainers do it: the learner and the item each play one game
 * against the other, as a rating period of its own. Both are rated from the values before it.
 */
export function rateAnswer(
  learner: Glicko,
  item: Glicko,
  score: number,
): { learner: Glicko; item: Glicko } {
  return {
    learner: ratePeriod(learner, [{ opponent: item, score }]),
    item: ratePeriod(item, [{ opponent: learner, score: 1 - score }]),
  };
}

/** The chance the learner gets the item right, by Glicko-2's expected score. */
export function chanceOfSuccess(learner: Glicko, item: Glicko): number {
  return expected(
    (learner.rating - CENTRE) / SCALE,
    (item.rating - CENTRE) / SCALE,
    Math.hypot(learner.rd, item.rd) / SCALE,
  );
}
