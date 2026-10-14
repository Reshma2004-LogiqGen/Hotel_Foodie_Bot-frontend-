import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Leaf, Lightbulb, RotateCw } from 'lucide-react';
import { getNutrition } from '../api';
import type { Nutrient, NutritionSummary } from '../types';

const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
] as const;

/** `limit` nutrients turn orange past 100% of the daily value; more protein or fibre is fine. */
const TABLE_ROWS: { key: Nutrient; label: string; unit: string; limit: boolean }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', limit: true },
  { key: 'protein', label: 'Protein', unit: 'g', limit: false },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', limit: true },
  { key: 'fat', label: 'Total fat', unit: 'g', limit: true },
  { key: 'fiber', label: 'Dietary fibre', unit: 'g', limit: false },
  { key: 'sugar', label: 'Sugar', unit: 'g', limit: true },
  { key: 'sodium', label: 'Sodium', unit: 'mg', limit: true },
];

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function CalorieRing({ calories, percent }: { calories: number; percent: number }) {
  const filled = Math.min(percent, 100) / 100;
  return (
    <div className="cx-kcal-ring" aria-label={`${calories} kilocalories, ${percent}% of daily needs`}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={RING_RADIUS} className="cx-kcal-track" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          className="cx-kcal-fill"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - filled)}
        />
      </svg>
      <div>
        <strong>{calories}</strong>
        <span>kcal</span>
      </div>
    </div>
  );
}

const formatAmount = (value: number, unit: string) =>
  `${unit === 'g' && value < 10 ? Math.round(value * 10) / 10 : Math.round(value)} ${unit}`;

interface NutritionCardProps {
  orderNumber: string;
  code: string;
  onLoaded?: () => void;
}

export default function NutritionCard({ orderNumber, code, onLoaded }: NutritionCardProps) {
  const [data, setData] = useState<NutritionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getNutrition(orderNumber, code)
      .then(result => {
        if (cancelled) return;
        setData(result);
        onLoadedRef.current?.();
      })
      .catch(() => { if (!cancelled) setError("We couldn't load the nutrition details right now."); });
    return () => { cancelled = true; };
  }, [orderNumber, code, attempt]);

  const servings = data?.items.reduce((sum, dish) => sum + dish.quantity, 0) ?? 0;

  return (
    <section className="cx-card cx-nutri-card">
      <div className="cx-card-head">
        <span className="cx-card-icon is-green"><Leaf size={18} /></span>
        <div>
          <h2>Nutrition facts</h2>
          <p>{data ? `For your whole order · ${servings} ${servings === 1 ? 'serving' : 'servings'}` : 'For your whole order'}</p>
        </div>
      </div>

      {!data && !error && (
        <div className="cx-nutri-loading" aria-label="Loading nutrition">
          <span className="cx-skeleton is-ring" />
          <div>
            <span className="cx-skeleton" />
            <span className="cx-skeleton" />
            <span className="cx-skeleton" />
          </div>
        </div>
      )}

      {error && (
        <div className="cx-nutri-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="cx-btn cx-btn--soft cx-btn--sm" onClick={() => setAttempt(n => n + 1)}>
            <RotateCw size={15} /> Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="cx-nutri-summary">
            <CalorieRing calories={Math.round(data.totals.calories)} percent={data.dailyPercentages.calories} />
            <div className="cx-macro-tiles">
              {MACROS.map(macro => (
                <div key={macro.key} className={`cx-macro is-${macro.key}`}>
                  <strong>{Math.round(data.totals[macro.key])}<small>g</small></strong>
                  <span>{macro.label}</span>
                </div>
              ))}
            </div>
          </div>

          <table className="cx-nutri-table">
            <thead>
              <tr>
                <th scope="col">Nutrient</th>
                <th scope="col">Amount</th>
                <th scope="col">% Daily value</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map(({ key, label, unit, limit }) => {
                const percent = data.dailyPercentages[key];
                return (
                  <tr key={key} className={key === 'calories' ? 'is-main' : ''}>
                    <th scope="row">{label}</th>
                    <td>{formatAmount(data.totals[key], unit)}</td>
                    <td>
                      <span className="cx-nutri-dv">
                        <span className="cx-nutri-track">
                          <span
                            className={`cx-nutri-fill ${limit && percent > 100 ? 'is-over' : ''}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </span>
                        <span className="cx-nutri-value">{percent}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="cx-subhead">Dish by dish</h3>
          <ul className="cx-nutri-dishes">
            {data.items.map((dish, index) => (
              <li key={`${dish.name}-${index}`}>
                <div className="cx-nutri-dish-head">
                  <strong>{dish.quantity > 1 ? `${dish.quantity} × ` : ''}{dish.name}</strong>
                  <span>{Math.round(dish.calories)} kcal</span>
                </div>
                <p>
                  {dish.servingSize} · P {Math.round(dish.protein)}g · C {Math.round(dish.carbs)}g · F {Math.round(dish.fat)}g
                </p>
                {dish.highlights.length > 0 && (
                  <div className="cx-nutri-chips">
                    {dish.highlights.map(highlight => <span key={highlight}>{highlight}</span>)}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {data.healthTip && (
            <p className="cx-tip">
              <Lightbulb size={18} />
              <span>{data.healthTip}</span>
            </p>
          )}
          <p className="cx-fineprint">
            Approximate values for standard restaurant portions. % Daily value is based on a 2,000 kcal diet.
            Please ask the staff about allergens.
          </p>
        </>
      )}
    </section>
  );
}
