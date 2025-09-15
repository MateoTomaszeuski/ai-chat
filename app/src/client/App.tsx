import { useState, useEffect } from "react";
import type { Item } from "../lib/itemModels";

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/items");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, quantity }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setItems((prev) => [newItem, ...prev]);
        setName("");
        setQuantity(1);
      }
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full bg-light-blue-50 rounded-xl p-8 shadow-[0_4px_6px_-1px_hsl(200,20%,0%,0.1),0_2px_4px_-1px_hsl(200,20%,0%,0.06)]">
      <h1 className="text-3xl font-semibold text-blue-gray-200 mb-8 text-center">Items Manager</h1>

      <form onSubmit={addItem} className="bg-white p-6 rounded-lg border border-light-blue-100 mb-8">
        <div className="mb-6">
          <label htmlFor="name" className="block font-medium text-blue-gray-400 mb-2 text-sm">
            Item Name:
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            required
            className="w-full p-4 border border-light-blue-100 rounded-md font-sans text-base text-blue-gray-200 bg-white transition-all duration-200 focus:outline-none focus:border-light-blue-300 focus:shadow-[0_0_0_3px_hsl(200,60%,70%,0.1)] placeholder:text-blue-gray-500"
          />
        </div>

        <div className="mb-8">
          <label htmlFor="quantity" className="block font-medium text-blue-gray-400 mb-2 text-sm">
            Quantity:
          </label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min="1"
            max="1000"
            className="w-full p-4 border border-light-blue-100 rounded-md font-sans text-base text-blue-gray-200 bg-white transition-all duration-200 focus:outline-none focus:border-light-blue-300 focus:shadow-[0_0_0_3px_hsl(200,60%,70%,0.1)]"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !name.trim()}
          className="w-full py-4 px-6 bg-light-blue-500 text-white border-0 rounded-md font-sans text-base font-medium cursor-pointer transition-all duration-200 hover:bg-light-blue-600 hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? "Adding..." : "Add Item"}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-light-blue-100 overflow-hidden">
        <h2 className="bg-light-blue-200 p-6 m-0 border-b border-light-blue-100 text-xl font-medium text-blue-gray-200">
          Items ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="p-8 text-center text-blue-gray-500 italic">
            No items yet. Add one above!
          </p>
        ) : (
          <ul className="list-none">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-6 border-b border-light-blue-100 last:border-b-0 transition-colors duration-200 hover:bg-light-blue-75">
                <span className="flex-1 font-medium text-blue-gray-200">{item.name}</span>
                <span className="text-sm text-blue-gray-400 bg-light-blue-50 py-1 px-2 rounded-md">
                  Qty: {item.quantity}
                </span>
                <span className="text-xs text-blue-gray-500 min-w-fit">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
