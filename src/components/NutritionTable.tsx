import type { NutritionItem } from '../types';
import '../styles/NutritionTable.css';

interface NutritionTableProps {
  items: NutritionItem[];
  onClose?: () => void;
  selectedItemId?: number;
}

export default function NutritionTable({ items, onClose, selectedItemId }: NutritionTableProps) {
  const selectedItem = selectedItemId 
    ? items.find(item => item.id === selectedItemId)
    : null;

  if (selectedItem) {
    return (
      <div className="nutrition-modal">
        <div className="nutrition-modal-content">
          <button className="close-btn" onClick={onClose}>✕</button>
          <div className="nutrition-header">
            <span className="nutrition-emoji">{selectedItem.emoji}</span>
            <h3>{selectedItem.name}</h3>
          </div>
          <div className="nutrition-details">
            <div className="nutrition-item">
              <span className="label">🔥 Calories</span>
              <span className="value">{selectedItem.nutrition.calories} kcal</span>
            </div>
            <div className="nutrition-item">
              <span className="label">💪 Protein</span>
              <span className="value">{selectedItem.nutrition.protein}g</span>
            </div>
            <div className="nutrition-item">
              <span className="label">🍞 Carbs</span>
              <span className="value">{selectedItem.nutrition.carbs}g</span>
            </div>
            <div className="nutrition-item">
              <span className="label">🥑 Fat</span>
              <span className="value">{selectedItem.nutrition.fat}g</span>
            </div>
            {selectedItem.nutrition.fiber !== undefined && (
              <div className="nutrition-item">
                <span className="label">🌾 Fiber</span>
                <span className="value">{selectedItem.nutrition.fiber}g</span>
              </div>
            )}
            {selectedItem.nutrition.sodium !== undefined && (
              <div className="nutrition-item">
                <span className="label">🧂 Sodium</span>
                <span className="value">{selectedItem.nutrition.sodium}mg</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="nutrition-section">
      <h2>📊 Nutrition Information</h2>
      <div className="nutrition-table-wrapper">
        <table className="nutrition-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>🔥 Calories</th>
              <th>💪 Protein</th>
              <th>🍞 Carbs</th>
              <th>🥑 Fat</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <span className="item-name">
                    {item.emoji} {item.name}
                  </span>
                </td>
                <td>{item.nutrition.calories} kcal</td>
                <td>{item.nutrition.protein}g</td>
                <td>{item.nutrition.carbs}g</td>
                <td>{item.nutrition.fat}g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
