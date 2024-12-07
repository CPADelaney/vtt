// js/dice.js

/**
 * Rolls a single die with the specified number of sides.
 * @param {number} sides - Number of sides on the die (e.g., 6 for a six-sided die).
 * @returns {number} - Result of the die roll.
 */
export function rollSingleDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Parses and evaluates a dice expression (e.g., "2d6+3").
 * Supports addition and subtraction of multiple dice and constants.
 * @param {string} expression - The dice expression to evaluate.
 * @returns {string} - Detailed result of the dice roll and the total.
 */
export function rollCombinedDiceExpression(expression) {
  const originalExpr = expression;
  expression = expression.trim().replace(/\s+/g, '');
  const regex = /([+\-])?(\d*d\d+|\d+)/gi;
  let total = 0;
  let detailParts = [];
  let match;

  while ((match = regex.exec(expression)) !== null) {
    let sign = match[1] || '+';
    let token = match[2];

    let signFactor = (sign === '-') ? -1 : 1;

    if (token.includes('d')) {
      let [diceCountStr, sidesStr] = token.split('d');
      let diceCount = parseInt(diceCountStr || '1', 10);
      let sides = parseInt(sidesStr, 10);

      let rolls = [];
      for (let i = 0; i < diceCount; i++) {
        let result = rollSingleDice(sides);
        rolls.push(result);
      }

      let sumRolls = rolls.reduce((a, b) => a + b, 0);
      total += sumRolls * signFactor;
      detailParts.push(`${sign}${diceCount}d${sides} [${rolls.join(',')}]`);
    } else {
      let num = parseInt(token, 10);
      total += num * signFactor;
      detailParts.push(`${sign}${num}`);
    }
  }

  let detailStr = detailParts.join('');
  detailStr = detailStr.replace(/^\+/, ''); // Remove leading +

  return `Rolled ${originalExpr}: ${detailStr} = ${total}`;
}

